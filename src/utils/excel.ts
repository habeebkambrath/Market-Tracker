import * as XLSX from 'xlsx';
import type { Exchange, PerformanceLogEntry, SignalType } from '../types/market.ts';

export interface ImportedPerformanceRow {
  date: string;
  symbol: string;
  exchange: Exchange;
  closingPrice: number;
  dailyChangePct: number;
  signal: SignalType;
  reason: string;
}

export interface ExcelParseResult {
  rows: ImportedPerformanceRow[];
  errors: string[];
}

const SYMBOL_PATTERN = /^[A-Z0-9.\-&]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeExcelDate(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (DATE_PATTERN.test(trimmed)) {
      return trimmed;
    }
    // Support DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    }
  }

  return null;
}

function normalizeExchange(raw: unknown): Exchange | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (upper === 'NSE' || upper === 'BSE') return upper;
  return null;
}

function normalizeSignal(raw: unknown): SignalType {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if (lower === 'buy') return 'Buy';
    if (lower === 'sell') return 'Sell';
    if (lower === 'hold') return 'Hold';
  }
  return 'Hold';
}

function parseNumericField(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[₹,%+\s]/g, '').replace(/,/g, '');
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function pickField(record: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(record);
  for (const candidate of candidates) {
    const target = candidate.toLowerCase();
    const match = entries.find(([k]) => k.trim().toLowerCase() === target);
    if (match !== undefined) return match[1];
  }
  return undefined;
}

export function buildPerformanceWorkbook(logs: PerformanceLogEntry[]): XLSX.WorkBook {
  const sheetRows = logs.map((entry) => ({
    Date: entry.date,
    'Stock Symbol': entry.symbol,
    Exchange: entry.exchange,
    'Closing Price (₹)': Number(entry.closingPrice.toFixed(2)),
    'Daily Change (%)': Number(entry.dailyChangePct.toFixed(2)),
    Signal: entry.signal,
    Reason: entry.reason,
    Source: entry.source === 'import' ? 'Imported' : 'Auto-Logged',
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 10 },
    { wch: 44 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Performance Ledger');
  return workbook;
}

export function exportPerformanceToXlsx(
  logs: PerformanceLogEntry[],
  filename = `Market_Tracker_Performance_${new Date().toISOString().slice(0, 10)}.xlsx`,
): void {
  const workbook = buildPerformanceWorkbook(logs);
  XLSX.writeFile(workbook, filename);
}

export function parsePerformanceExcelBuffer(buffer: ArrayBuffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { rows: [], errors: ['The uploaded Excel workbook contains no sheets.'] };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (rawRecords.length === 0) {
    return { rows: [], errors: ['The Excel sheet has no data rows.'] };
  }

  const rows: ImportedPerformanceRow[] = [];
  const errors: string[] = [];

  rawRecords.forEach((record, index) => {
    const rowNumber = index + 2; // 1-indexed header + row offset

    const rawDate = pickField(record, ['Date', 'Trade Date', 'Closing Date']);
    const rawSymbol = pickField(record, ['Stock Symbol', 'Symbol', 'Ticker']);
    const rawExchange = pickField(record, ['Exchange', 'Market']);
    const rawPrice = pickField(record, ['Closing Price (₹)', 'Closing Price', 'Close', 'Price']);
    const rawChange = pickField(record, ['Daily Change (%)', 'Daily Change', 'Change %', 'Change']);
    const rawSignal = pickField(record, ['Signal', 'Recommendation']);
    const rawReason = pickField(record, ['Reason', 'Notes', 'Signal Reason']);

    const date = normalizeExcelDate(rawDate);
    if (!date) {
      errors.push(`Row ${rowNumber}: Invalid or missing Date (expected YYYY-MM-DD).`);
      return;
    }

    const symbol = typeof rawSymbol === 'string' ? rawSymbol.trim().toUpperCase().slice(0, 24) : '';
    if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
      errors.push(`Row ${rowNumber}: Invalid Stock Symbol "${String(rawSymbol)}".`);
      return;
    }

    const exchange = normalizeExchange(rawExchange) ?? 'NSE';
    const closingPrice = parseNumericField(rawPrice);
    if (closingPrice === null || closingPrice <= 0 || closingPrice > 10000000) {
      errors.push(`Row ${rowNumber}: Closing Price must be a positive number.`);
      return;
    }

    const dailyChangeRaw = parseNumericField(rawChange);
    const dailyChangePct =
      dailyChangeRaw !== null && dailyChangeRaw >= -100 && dailyChangeRaw <= 1000
        ? Number(dailyChangeRaw.toFixed(2))
        : 0;

    const signal = normalizeSignal(rawSignal);
    const reasonText =
      typeof rawReason === 'string' && rawReason.trim().length > 0
        ? rawReason.trim().slice(0, 200)
        : 'Imported from Excel ledger';

    rows.push({
      date,
      symbol,
      exchange,
      closingPrice: Number(closingPrice.toFixed(2)),
      dailyChangePct,
      signal,
      reason: reasonText,
    });
  });

  return { rows, errors };
}
