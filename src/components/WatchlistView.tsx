import { useMemo, useState } from 'react';
import { Bell, Plus, Search, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { PriceAlert, StockQuote, StockSearchResult, WatchlistItem } from '../types/market.ts';
import { formatAlertLabel } from '../utils/alerts.ts';
import { formatINR, formatPercent, formatSignedPoints, makeWatchlistDocId } from '../utils/formatters.ts';
import { filterWatchlistItems } from '../utils/watchlist.ts';
import { SignalBadge } from './SignalBadge.tsx';

interface WatchlistViewProps {
  watchlist: WatchlistItem[];
  quotesById: Record<string, StockQuote>;
  priceAlerts: PriceAlert[];
  loadingWatchlist: boolean;
  loadingQuotes: boolean;
  onAddStarterStock: (stock: StockSearchResult) => Promise<void>;
  onRemoveStock: (itemId: string) => Promise<void>;
  onOpenAlertModal: (item: WatchlistItem) => void;
}

const STARTER_SUGGESTIONS: StockSearchResult[] = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Retail',
    currentPrice: 1351.0,
    dailyChangePct: -1.92,
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    exchange: 'NSE',
    sector: 'IT Services',
    currentPrice: 2460.0,
    dailyChangePct: 3.53,
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking',
    currentPrice: 817.8,
    dailyChangePct: -3.33,
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'BSE',
    sector: 'IT Services',
    currentPrice: 1104.1,
    dailyChangePct: 0.7,
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    sector: 'Banking',
    currentPrice: 1132.65,
    dailyChangePct: -2.79,
  },
];

export function WatchlistView({
  watchlist,
  quotesById,
  priceAlerts,
  loadingWatchlist,
  loadingQuotes,
  onAddStarterStock,
  onRemoveStock,
  onOpenAlertModal,
}: WatchlistViewProps) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredWatchlist = useMemo(
    () => filterWatchlistItems(watchlist, filterQuery),
    [watchlist, filterQuery],
  );
  const hasFilter = filterQuery.trim().length > 0;

  if (loadingWatchlist) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="h-5 w-40 bg-slate-200 rounded mb-6 animate-pulse" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
          Your watchlist is empty
        </h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
          Search for any NSE or BSE stock above, or add one of these popular Indian equities to
          start tracking daily signals and closing prices.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {STARTER_SUGGESTIONS.map((stock) => (
            <button
              key={makeWatchlistDocId(stock.exchange, stock.symbol)}
              type="button"
              onClick={() => onAddStarterStock(stock)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>
                {stock.symbol} ({stock.exchange})
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Personal Stock Watchlist"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Personal Watchlist
          </h2>
          <p className="text-xs text-slate-500">
            {hasFilter ? (
              <>
                Showing <span className="font-mono-num font-semibold text-slate-700">{filteredWatchlist.length}</span> of{' '}
                <span className="font-mono-num">{watchlist.length}</span>{' '}
                {watchlist.length === 1 ? 'stock' : 'stocks'}
              </>
            ) : (
              <>
                {watchlist.length} {watchlist.length === 1 ? 'stock' : 'stocks'} tracked · Signals
                computed from 5D/20D SMA, 14D RSI &amp; 200D long-term trend
              </>
            )}
          </p>
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <label htmlFor="watchlist-filter-input" className="sr-only">
            Filter personal watchlist stocks
          </label>
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="watchlist-filter-input"
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter watchlist (symbol, share name)..."
            className="w-full pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
          />
          {hasFilter && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              aria-label="Clear watchlist filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {filteredWatchlist.length === 0 ? (
        <div
          data-testid="watchlist-filter-empty"
          className="px-6 py-10 text-center text-sm text-slate-600"
        >
          <p className="font-medium text-slate-900">
            No stocks in your watchlist matched "{filterQuery.trim()}".
          </p>
          <button
            type="button"
            onClick={() => setFilterQuery('')}
            className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Clear watchlist search
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                  <th scope="col" className="w-[20%] py-3 pl-5 pr-3">
                    Stock &amp; Share Name
                  </th>
                  <th scope="col" className="w-[12%] py-3 px-3">
                    Exchange
                  </th>
                  <th scope="col" className="w-[12%] py-3 px-3 text-right">
                    Current Price (₹)
                  </th>
                  <th scope="col" className="w-[11%] py-3 px-3 text-right">
                    Daily Change (%)
                  </th>
                  <th scope="col" className="w-[26%] py-3 px-3">
                    Signal &amp; Rationale
                  </th>
                  <th scope="col" className="w-[10%] py-3 px-3">
                    Price Alert
                  </th>
                  <th scope="col" className="w-[9%] py-3 pl-3 pr-5 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWatchlist.map((item) => {
                  const quoteKey = makeWatchlistDocId(item.exchange, item.symbol);
                  const quote = quotesById[quoteKey];
                  const itemAlerts = priceAlerts.filter(
                    (a) => a.symbol === item.symbol && a.exchange === item.exchange,
                  );
                  const isPos = (quote?.dailyChangePct ?? 0) >= 0;
                  const TrendIcon = isPos ? TrendingUp : TrendingDown;

                  return (
                    <tr
                      key={item.id}
                      data-testid={`watchlist-row-${item.symbol}-${item.exchange}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-4 pl-5 pr-3 align-middle">
                        <div className="font-display font-semibold text-sm text-slate-900 truncate">
                          {item.symbol}
                        </div>
                        <div className="text-xs text-slate-600 truncate" title={item.name}>
                          {item.name}
                        </div>
                      </td>

                      <td className="py-4 px-3 align-middle">
                        <div className="text-xs font-semibold text-slate-700 font-mono-num">
                          {item.exchange}
                        </div>
                        <div className="text-xs text-slate-400 truncate" title={item.sector}>
                          {item.sector}
                        </div>
                      </td>

                      <td className="py-4 px-3 text-right align-middle whitespace-nowrap">
                        {quote ? (
                          <>
                            <div className="font-mono-num text-sm font-semibold text-slate-900">
                              {formatINR(quote.currentPrice)}
                            </div>
                            <div className="font-mono-num text-xs text-slate-400">
                              Prev {formatINR(quote.prevClose)}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {loadingQuotes ? 'Loading...' : '—'}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right align-middle whitespace-nowrap">
                        {quote ? (
                          <div
                            className={`inline-flex flex-col items-end font-mono-num ${
                              isPos ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1 text-sm font-semibold">
                              <TrendIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{formatPercent(quote.dailyChangePct)}</span>
                            </span>
                            <span className="text-xs">
                              {formatSignedPoints(quote.dailyChange)} ₹
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-4 px-3 align-middle">
                        {quote ? (
                          <SignalBadge
                            signal={quote.signal}
                            reason={quote.reason}
                            sma5={quote.sma5}
                            sma20={quote.sma20}
                            sma50={quote.sma50}
                            sma200={quote.sma200}
                            oneYearReturnPct={quote.oneYearReturnPct}
                            rsi14={quote.rsi14}
                            longTermVerdict={quote.longTermVerdict}
                            longTermReason={quote.longTermReason}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">Calculating...</span>
                        )}
                      </td>

                      <td className="py-4 px-3 align-middle whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1.5">
                          {itemAlerts.length > 0 && (
                            <div className="space-y-1">
                              {itemAlerts.map((alert) => (
                                <div
                                  key={alert.id}
                                  className={`text-xs font-mono-num whitespace-nowrap ${
                                    alert.status === 'triggered'
                                      ? 'text-emerald-700 font-semibold'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {formatAlertLabel(alert)}{' '}
                                  <span className="font-sans font-normal text-slate-500">
                                    · {alert.status === 'triggered' ? 'Triggered' : 'Active'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenAlertModal(item)}
                            aria-label={`Set price alert for ${item.symbol} (${item.exchange})`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
                          >
                            <Bell className="w-3 h-3" aria-hidden="true" />
                            <span>{itemAlerts.length > 0 ? 'Edit Alert' : 'Set Alert'}</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-4 pl-3 pr-5 text-right align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onRemoveStock(item.id)}
                          aria-label={`Remove ${item.symbol} (${item.exchange}) from watchlist`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-200">
            {filteredWatchlist.map((item) => {
              const quoteKey = makeWatchlistDocId(item.exchange, item.symbol);
              const quote = quotesById[quoteKey];
              const itemAlerts = priceAlerts.filter(
                (a) => a.symbol === item.symbol && a.exchange === item.exchange,
              );
              const isPos = (quote?.dailyChangePct ?? 0) >= 0;
              const TrendIcon = isPos ? TrendingUp : TrendingDown;

              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-sm text-slate-900">
                          {item.symbol}
                        </span>
                        <span className="text-xs font-mono-num text-slate-500">
                          {item.exchange}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{item.name}</p>
                    </div>

                    {quote && (
                      <div className="text-right">
                        <div className="font-mono-num text-sm font-semibold text-slate-900">
                          {formatINR(quote.currentPrice)}
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 font-mono-num text-xs font-semibold ${
                            isPos ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          <TrendIcon className="w-3 h-3" aria-hidden="true" />
                          <span>{formatPercent(quote.dailyChangePct)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {itemAlerts.length > 0 && (
                    <div className="text-xs font-mono-num text-slate-600 flex flex-wrap gap-2">
                      {itemAlerts.map((alert) => (
                        <span
                          key={alert.id}
                          className={
                            alert.status === 'triggered' ? 'text-emerald-700 font-semibold' : ''
                          }
                        >
                          Alert {formatAlertLabel(alert)} (
                          {alert.status === 'triggered' ? 'Triggered' : 'Active'})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    {quote ? (
                      <SignalBadge
                        signal={quote.signal}
                        reason={quote.reason}
                        sma5={quote.sma5}
                        sma20={quote.sma20}
                        sma50={quote.sma50}
                        sma200={quote.sma200}
                        oneYearReturnPct={quote.oneYearReturnPct}
                        rsi14={quote.rsi14}
                        longTermVerdict={quote.longTermVerdict}
                        longTermReason={quote.longTermReason}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Loading signal...</span>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenAlertModal(item)}
                        aria-label={`Set price alert for ${item.symbol} (${item.exchange})`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Alert</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveStock(item.id)}
                        aria-label={`Remove ${item.symbol} (${item.exchange}) from watchlist`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
