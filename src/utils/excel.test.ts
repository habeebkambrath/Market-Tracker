import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { buildPerformanceWorkbook, parsePerformanceExcelBuffer } from './excel.ts';
import type { PerformanceLogEntry } from '../types/market.ts';

test('buildPerformanceWorkbook and parsePerformanceExcelBuffer round-trip logs cleanly', () => {
  const sampleLogs: PerformanceLogEntry[] = [
    {
      id: '2026-11-24_NSE_RELIANCE',
      userId: 'user123',
      date: '2026-11-24',
      symbol: 'RELIANCE',
      exchange: 'NSE',
      closingPrice: 1294.5,
      dailyChangePct: 1.42,
      signal: 'Buy',
      reason: 'Bullish MA crossover',
      source: 'auto',
    },
    {
      id: '2026-11-24_BSE_TCS',
      userId: 'user123',
      date: '2026-11-24',
      symbol: 'TCS',
      exchange: 'BSE',
      closingPrice: 4120.75,
      dailyChangePct: -0.65,
      signal: 'Hold',
      reason: 'Neutral momentum',
      source: 'import',
    },
  ];

  const wb = buildPerformanceWorkbook(sampleLogs);
  const arrayBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const parsed = parsePerformanceExcelBuffer(arrayBuf);

  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].symbol, 'RELIANCE');
  assert.equal(parsed.rows[0].exchange, 'NSE');
  assert.equal(parsed.rows[0].closingPrice, 1294.5);
  assert.equal(parsed.rows[0].signal, 'Buy');
  assert.equal(parsed.rows[1].symbol, 'TCS');
  assert.equal(parsed.rows[1].exchange, 'BSE');
  assert.equal(parsed.rows[1].dailyChangePct, -0.65);
});

test('parsePerformanceExcelBuffer rejects malformed rows without throwing', () => {
  const ws = XLSX.utils.json_to_sheet([
    { Date: 'not-a-date', 'Stock Symbol': 'INFY', Exchange: 'NSE', 'Closing Price (₹)': 1800 },
    { Date: '24-11-2026', 'Stock Symbol': 'SBIN', Exchange: 'NSE', 'Closing Price (₹)': '₹825.40', 'Daily Change (%)': '+2.10%', Signal: 'Buy' },
    { Date: '2026-11-24', 'Stock Symbol': 'HDFCBANK', Exchange: 'NSE', 'Closing Price (₹)': -100 },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  const parsed = parsePerformanceExcelBuffer(buf);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].date, '2026-11-24');
  assert.equal(parsed.rows[0].symbol, 'SBIN');
  assert.equal(parsed.rows[0].closingPrice, 825.4);
  assert.equal(parsed.rows[0].dailyChangePct, 2.1);
  assert.equal(parsed.errors.length, 2);
});
