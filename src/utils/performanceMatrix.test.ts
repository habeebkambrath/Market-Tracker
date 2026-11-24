import test from 'node:test';
import assert from 'node:assert/strict';
import type { PerformanceLogEntry, WatchlistItem } from '../types/market.ts';
import { buildPerformanceMatrix, filterLogsToWatchlist } from './performanceMatrix.ts';

const WATCHLIST: WatchlistItem[] = [
  {
    id: 'NSE_RELIANCE',
    userId: 'u1',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Retail',
  },
  {
    id: 'BSE_INFY',
    userId: 'u1',
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'BSE',
    sector: 'IT Services',
  },
];

const LOGS: PerformanceLogEntry[] = [
  {
    id: '2026-11-20_NSE_RELIANCE',
    userId: 'u1',
    date: '2026-11-20',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    closingPrice: 1377.5,
    dailyChangePct: 0.2,
    signal: 'Hold',
    reason: 'Neutral',
    source: 'auto',
  },
  {
    id: '2026-11-23_NSE_RELIANCE',
    userId: 'u1',
    date: '2026-11-23',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    closingPrice: 1351.0,
    dailyChangePct: -1.92,
    signal: 'Sell',
    reason: 'RSI overbought',
    source: 'auto',
  },
  {
    id: '2026-11-23_BSE_INFY',
    userId: 'u1',
    date: '2026-11-23',
    symbol: 'INFY',
    exchange: 'BSE',
    closingPrice: 1104.1,
    dailyChangePct: 0.7,
    signal: 'Buy',
    reason: 'RSI oversold',
    source: 'auto',
  },
  {
    id: '2026-11-23_NSE_WIPRO',
    userId: 'u1',
    date: '2026-11-23',
    symbol: 'WIPRO',
    exchange: 'NSE',
    closingPrice: 550.0,
    dailyChangePct: 1.1,
    signal: 'Buy',
    reason: 'Imported',
    source: 'import',
  },
];

test('filterLogsToWatchlist keeps only stocks currently on dashboard watchlist', () => {
  const scoped = filterLogsToWatchlist(LOGS, WATCHLIST);
  assert.equal(scoped.length, 3);
  assert.equal(
    scoped.some((l) => l.symbol === 'WIPRO'),
    false,
  );
});

test('buildPerformanceMatrix arranges dates descending as rows and watchlist shares as columns', () => {
  const matrix = buildPerformanceMatrix(LOGS, WATCHLIST);

  assert.deepEqual(
    matrix.columns.map((c) => `${c.exchange}:${c.symbol}`),
    ['NSE:RELIANCE', 'BSE:INFY'],
  );
  assert.deepEqual(matrix.dates, ['2026-11-23', '2026-11-20']);
  assert.equal(matrix.cellsByDateAndKey['2026-11-23']['NSE:RELIANCE']?.closingPrice, 1351.0);
  assert.equal(matrix.cellsByDateAndKey['2026-11-23']['BSE:INFY']?.closingPrice, 1104.1);
  assert.equal(matrix.cellsByDateAndKey['2026-11-20']['BSE:INFY'], undefined);
});

test('buildPerformanceMatrix respects symbol, exchange, and signal filters', () => {
  const onlyBse = buildPerformanceMatrix(LOGS, WATCHLIST, { exchangeFilter: 'BSE' });
  assert.deepEqual(
    onlyBse.columns.map((c) => c.symbol),
    ['INFY'],
  );
  assert.deepEqual(onlyBse.dates, ['2026-11-23']);

  const onlyBuy = buildPerformanceMatrix(LOGS, WATCHLIST, { signalFilter: 'Buy' });
  assert.deepEqual(onlyBuy.dates, ['2026-11-23']);
  assert.equal(onlyBuy.cellsByDateAndKey['2026-11-23']['NSE:RELIANCE'], undefined);
  assert.equal(onlyBuy.cellsByDateAndKey['2026-11-23']['BSE:INFY']?.signal, 'Buy');
});
