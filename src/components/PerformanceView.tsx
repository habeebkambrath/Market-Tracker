import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type {
  Exchange,
  NewsCategory,
  PerformanceLogEntry,
  SignalType,
  StockNewsItem,
  WatchlistItem,
} from '../types/market.ts';
import {
  exportPerformanceToXlsx,
  type ImportedPerformanceRow,
  parsePerformanceExcelBuffer,
} from '../utils/excel.ts';
import { formatINR, formatPercent } from '../utils/formatters.ts';
import { buildPerformanceMatrix, makeShareKey } from '../utils/performanceMatrix.ts';

interface PerformanceViewProps {
  logs: PerformanceLogEntry[];
  watchlist: WatchlistItem[];
  news: StockNewsItem[];
  loading: boolean;
  loadingNews: boolean;
  syncing: boolean;
  onSyncNow: () => Promise<void>;
  onImportRows: (rows: ImportedPerformanceRow[]) => Promise<number>;
  onOpenNewsTab: () => void;
}

function getCategoryAccent(category: NewsCategory): string {
  switch (category) {
    case 'Agreement & Deal':
      return 'text-emerald-700';
    case 'Project & Order':
      return 'text-blue-700';
    case 'Earnings & Results':
      return 'text-amber-700';
    default:
      return 'text-slate-600';
  }
}

function formatNewsDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Recent';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function PerformanceView({
  logs,
  watchlist,
  news,
  loading,
  loadingNews,
  syncing,
  onSyncNow,
  onImportRows,
  onOpenNewsTab,
}: PerformanceViewProps) {
  const [symbolFilter, setSymbolFilter] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<Exchange | 'ALL'>('ALL');
  const [signalFilter, setSignalFilter] = useState<SignalType | 'ALL'>('ALL');
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const matrix = useMemo(
    () =>
      buildPerformanceMatrix(logs, watchlist, {
        symbolFilter,
        exchangeFilter,
        signalFilter,
      }),
    [logs, watchlist, symbolFilter, exchangeFilter, signalFilter],
  );

  const stats = useMemo(() => {
    const buyCount = matrix.scopedLogs.filter((l) => l.signal === 'Buy').length;
    const latestDate =
      matrix.scopedLogs.length > 0
        ? [...matrix.scopedLogs].sort((a, b) => b.date.localeCompare(a.date))[0].date
        : '—';
    return {
      totalEntries: matrix.scopedLogs.length,
      trackedSymbols: watchlist.length,
      buyCount,
      latestDate,
    };
  }, [matrix.scopedLogs, watchlist.length]);

  const handleExport = () => {
    const recordsToExport =
      matrix.filteredLogs.length > 0 ? matrix.filteredLogs : matrix.scopedLogs;
    exportPerformanceToXlsx(recordsToExport);
    setStatusMessage({
      type: 'success',
      text: `Exported ${recordsToExport.length} watchlist closing price records to Excel (.xlsx).`,
    });
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setStatusMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const { rows, errors } = parsePerformanceExcelBuffer(buffer);
      if (rows.length === 0) {
        setStatusMessage({
          type: 'error',
          text: errors[0] || 'No valid rows found in the uploaded Excel file.',
        });
        return;
      }

      const importedCount = await onImportRows(rows);
      const warnSuffix =
        errors.length > 0 ? ` (${errors.length} malformed row(s) skipped)` : '';
      const watchlistKeys = new Set(watchlist.map((w) => makeShareKey(w.exchange, w.symbol)));
      const outsideWatchlistCount = rows.filter(
        (r) => !watchlistKeys.has(makeShareKey(r.exchange, r.symbol)),
      ).length;
      const scopeHint =
        outsideWatchlistCount > 0
          ? ' Only shares on your Dashboard Watchlist are shown as columns below.'
          : '';
      setStatusMessage({
        type: 'success',
        text: `Imported ${importedCount} closing price record(s) from ${file.name}${warnSuffix}.${scopeHint}`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to import Excel file.',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <section aria-label="Daily Closing Performance Ledger" className="space-y-6">
      {/* Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs text-slate-500 mb-1">Watchlist Daily Logs</div>
          <div className="font-mono-num text-2xl font-semibold text-slate-900">
            {stats.totalEntries}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500 mb-1">Watchlist Shares</div>
          <div className="font-mono-num text-2xl font-semibold text-slate-900">
            {stats.trackedSymbols}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500 mb-1">Buy Signals Logged</div>
          <div className="font-mono-num text-2xl font-semibold text-emerald-700">
            {stats.buyCount}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500 mb-1">Latest Session Date</div>
          <div className="font-mono-num text-2xl font-semibold text-slate-900">
            {stats.latestDate}
          </div>
        </div>
      </div>

      {/* Actions & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <label htmlFor="perf-symbol-filter" className="sr-only">
                Filter watchlist share columns
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="perf-symbol-filter"
                type="text"
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                placeholder="Filter share column..."
                className="pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 w-48"
              />
            </div>

            <div
              role="group"
              aria-label="Filter performance by exchange"
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
            >
              {(['ALL', 'NSE', 'BSE'] as const).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setExchangeFilter(ex)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    exchangeFilter === ex
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ex === 'ALL' ? 'All' : ex}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Filter performance by signal"
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
            >
              {(['ALL', 'Buy', 'Sell', 'Hold'] as const).map((sig) => (
                <button
                  key={sig}
                  type="button"
                  onClick={() => setSignalFilter(sig)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    signalFilter === sig
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sig === 'ALL' ? 'All Signals' : sig}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncing || watchlist.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Logging...' : "Sync Today's Close"}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelected}
              className="hidden"
              aria-label="Upload Excel file to import historical closing prices"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{importing ? 'Importing...' : 'Import from Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={matrix.scopedLogs.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export to Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            role="status"
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Date-by-Share Column Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Daily Closing Price Database
            </h2>
            <p className="text-xs text-slate-500">
              Showing {matrix.dates.length} trading{' '}
              {matrix.dates.length === 1 ? 'date' : 'dates'} across {matrix.columns.length}{' '}
              dashboard watchlist {matrix.columns.length === 1 ? 'share' : 'shares'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((r) => (
              <div key={r} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-display text-base font-semibold text-slate-900 mb-1">
              No shares in your Dashboard Watchlist
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add stocks on the Dashboard &amp; Watchlist tab to track their daily closing prices by
              date and column here.
            </p>
          </div>
        ) : matrix.columns.length === 0 || matrix.dates.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-display text-base font-semibold text-slate-900 mb-1">
              No closing price records match your filters
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Adjust your share, exchange, or signal filters above, or click Sync Today&apos;s Close.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                  <th
                    scope="col"
                    className="sticky left-0 z-20 bg-[#F8FAFC] border-r border-slate-200 py-3 px-5 w-[132px] min-w-[132px] align-middle"
                  >
                    Date
                  </th>
                  {matrix.columns.map((col) => (
                    <th
                      key={makeShareKey(col.exchange, col.symbol)}
                      scope="col"
                      className="py-3 px-4 min-w-[172px] border-l border-slate-100 align-middle"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-semibold text-slate-900">
                          {col.symbol}
                        </span>
                        <span className="font-mono-num text-[11px] font-medium text-slate-500">
                          {col.exchange}
                        </span>
                      </div>
                      <div
                        className="text-[11px] font-normal text-slate-500 truncate max-w-[160px]"
                        title={col.name}
                      >
                        {col.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {matrix.dates.map((date) => {
                  const rowCells = matrix.cellsByDateAndKey[date] ?? {};
                  return (
                    <tr
                      key={date}
                      data-testid={`perf-date-row-${date}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-white border-r border-slate-200 py-3.5 px-5 font-mono-num text-xs font-semibold text-slate-800 whitespace-nowrap align-middle">
                        {date}
                      </td>

                      {matrix.columns.map((col) => {
                        const shareKey = makeShareKey(col.exchange, col.symbol);
                        const entry = rowCells[shareKey];

                        if (!entry) {
                          return (
                            <td
                              key={shareKey}
                              className="py-3.5 px-4 border-l border-slate-100 text-xs text-slate-300 align-middle"
                            >
                              —
                            </td>
                          );
                        }

                        const isPos = entry.dailyChangePct >= 0;
                        const TrendIcon = isPos ? TrendingUp : TrendingDown;
                        const signalClass =
                          entry.signal === 'Buy'
                            ? 'text-emerald-700'
                            : entry.signal === 'Sell'
                              ? 'text-red-700'
                              : 'text-amber-700';

                        return (
                          <td
                            key={shareKey}
                            data-testid={`perf-cell-${date}-${col.symbol}-${col.exchange}`}
                            title={`${entry.reason} (${entry.source === 'import' ? 'Imported .xlsx' : 'Auto-Logged'})`}
                            className="py-3.5 px-4 border-l border-slate-100 align-middle whitespace-nowrap"
                          >
                            <div className="font-mono-num text-sm font-semibold text-slate-900">
                              {formatINR(entry.closingPrice)}
                            </div>
                            <div className="flex items-center justify-between gap-3 mt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 font-mono-num text-xs font-medium ${
                                  isPos ? 'text-emerald-700' : 'text-red-700'
                                }`}
                              >
                                <TrendIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                                <span>{formatPercent(entry.dailyChangePct)}</span>
                              </span>
                              <span className={`text-[11px] font-semibold ${signalClass}`}>
                                {entry.signal}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Latest Watchlist Stock News & Corporate Updates */}
      <div
        aria-label="Latest Watchlist Stock News"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Latest Watchlist News &amp; Corporate Updates
            </h2>
            <p className="text-xs text-slate-500">
              Recent agreements, new project wins, order updates, and news for your dashboard
              watchlist shares
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNewsTab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            <span>View All in News</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {loadingNews ? (
          <div className="p-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="p-8 text-center">
            <Newspaper className="w-7 h-7 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs text-slate-500">
              Add shares to your Dashboard Watchlist to see their latest agreement and project news.
            </p>
          </div>
        ) : news.length === 0 ? (
          <div className="p-8 text-center">
            <Newspaper className="w-7 h-7 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs text-slate-500">
              No recent news items available right now for your watchlist stocks.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {news.slice(0, 6).map((item) => (
              <li
                key={item.id}
                data-testid={`perf-news-item-${item.symbol}`}
                className="px-5 py-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-display font-semibold text-slate-900">
                      {item.symbol}
                    </span>
                    <span className="font-mono-num text-[11px] font-medium text-slate-500">
                      {item.exchange}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className={`font-semibold ${getCategoryAccent(item.category)}`}>
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono-num">
                    <span>{item.source}</span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span>{formatNewsDate(item.publishedAt)}</span>
                  </div>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-start gap-1.5 text-sm font-medium text-slate-900 hover:text-blue-700 transition-colors"
                >
                  <span>{item.title}</span>
                  <ExternalLink
                    className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 shrink-0 mt-1"
                    aria-hidden="true"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
