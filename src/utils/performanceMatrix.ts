import type {
  Exchange,
  PerformanceLogEntry,
  SignalType,
  WatchlistItem,
} from '../types/market.ts';

export interface PerformanceMatrixOptions {
  symbolFilter?: string;
  exchangeFilter?: Exchange | 'ALL';
  signalFilter?: SignalType | 'ALL';
}

export interface PerformanceMatrixResult {
  columns: WatchlistItem[];
  dates: string[];
  cellsByDateAndKey: Record<string, Record<string, PerformanceLogEntry>>;
  scopedLogs: PerformanceLogEntry[];
  filteredLogs: PerformanceLogEntry[];
}

export function makeShareKey(exchange: Exchange, symbol: string): string {
  return `${exchange}:${symbol.trim().toUpperCase()}`;
}

export function filterLogsToWatchlist(
  logs: PerformanceLogEntry[],
  watchlist: WatchlistItem[],
): PerformanceLogEntry[] {
  const allowed = new Set(watchlist.map((w) => makeShareKey(w.exchange, w.symbol)));
  return logs.filter((entry) => allowed.has(makeShareKey(entry.exchange, entry.symbol)));
}

export function buildPerformanceMatrix(
  logs: PerformanceLogEntry[],
  watchlist: WatchlistItem[],
  options: PerformanceMatrixOptions = {},
): PerformanceMatrixResult {
  const symbolQuery = (options.symbolFilter ?? '').trim().toLowerCase();
  const exchangeFilter = options.exchangeFilter ?? 'ALL';
  const signalFilter = options.signalFilter ?? 'ALL';

  const scopedLogs = filterLogsToWatchlist(logs, watchlist);

  const columns = watchlist.filter((item) => {
    if (exchangeFilter !== 'ALL' && item.exchange !== exchangeFilter) return false;
    if (symbolQuery) {
      const sym = item.symbol.toLowerCase();
      const name = item.name.toLowerCase();
      if (!sym.includes(symbolQuery) && !name.includes(symbolQuery)) return false;
    }
    return true;
  });

  const activeColumnKeys = new Set(columns.map((c) => makeShareKey(c.exchange, c.symbol)));

  const filteredLogs = scopedLogs
    .filter((entry) => {
      if (!activeColumnKeys.has(makeShareKey(entry.exchange, entry.symbol))) return false;
      if (signalFilter !== 'ALL' && entry.signal !== signalFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.symbol.localeCompare(b.symbol);
    });

  const cellsByDateAndKey: Record<string, Record<string, PerformanceLogEntry>> = {};
  const dateSet = new Set<string>();

  for (const entry of filteredLogs) {
    const shareKey = makeShareKey(entry.exchange, entry.symbol);
    dateSet.add(entry.date);
    if (!cellsByDateAndKey[entry.date]) {
      cellsByDateAndKey[entry.date] = {};
    }
    const existing = cellsByDateAndKey[entry.date][shareKey];
    if (!existing || entry.source === 'import') {
      cellsByDateAndKey[entry.date][shareKey] = entry;
    }
  }

  const dates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  return {
    columns,
    dates,
    cellsByDateAndKey,
    scopedLogs,
    filteredLogs,
  };
}
