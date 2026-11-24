import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import { searchIndianStocks } from '../services/marketApi.ts';
import type { Exchange, StockSearchResult, WatchlistItem } from '../types/market.ts';
import { formatINR, formatPercent, makeWatchlistDocId } from '../utils/formatters.ts';

interface StockSearchPanelProps {
  watchlist: WatchlistItem[];
  onAddStock: (stock: StockSearchResult) => Promise<void>;
}

export function StockSearchPanel({ watchlist, onAddStock }: StockSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<Exchange | 'ALL'>('ALL');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const watchlistIds = new Set(
    watchlist.map((w) => makeWatchlistDocId(w.exchange, w.symbol)),
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const items = await searchIndianStocks(query, exchangeFilter);
        if (active) {
          setResults(items);
        }
      } catch (err) {
        if (active) {
          setSearchError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, exchangeFilter]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleAdd = async (stock: StockSearchResult) => {
    const key = makeWatchlistDocId(stock.exchange, stock.symbol);
    setAddingKey(key);
    try {
      await onAddStock(stock);
    } finally {
      setAddingKey(null);
    }
  };

  return (
    <div ref={containerRef} className="relative mb-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <label htmlFor="stock-search-input" className="sr-only">
              Search Indian stocks by NSE or BSE ticker
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="stock-search-input"
              type="text"
              value={query}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder="Search NSE & BSE shares (e.g. COCHINSHIP, GAIL, RELIANCE, TCS, HAL)..."
              className="w-full pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear stock search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter search results by exchange"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto"
          >
            {(['ALL', 'NSE', 'BSE'] as const).map((ex) => {
              const active = exchangeFilter === ex;
              return (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setExchangeFilter(ex);
                    setIsOpen(true);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ex === 'ALL' ? 'All Exchanges' : ex}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          data-testid="stock-search-results"
          className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto"
        >
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {loading
                ? 'Searching Indian equities...'
                : `${results.length} matching ${exchangeFilter === 'ALL' ? 'NSE & BSE' : exchangeFilter} listings`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-900 font-medium"
            >
              Close
            </button>
          </div>

          {searchError ? (
            <div className="p-4 text-sm text-red-700">{searchError}</div>
          ) : results.length === 0 && !loading ? (
            <div data-testid="stock-search-empty" className="p-6 text-center text-sm text-slate-600">
              <p className="font-medium text-slate-900">
                No such share found on Indian stock exchanges (NSE / BSE) for "{query}".
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try a valid listed NSE or BSE symbol or company name (e.g. COCHINSHIP, GAIL, RELIANCE, TCS).
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((stock) => {
                const key = makeWatchlistDocId(stock.exchange, stock.symbol);
                const alreadyAdded = watchlistIds.has(key);
                const isAdding = addingKey === key;
                const pos = stock.dailyChangePct >= 0;
                const TrendIcon = pos ? TrendingUp : TrendingDown;

                return (
                  <li
                    key={key}
                    className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-slate-900 font-display">
                          {stock.symbol}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-xs font-medium text-slate-600">
                          {stock.exchange}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500 truncate">{stock.sector}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{stock.name}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="font-mono-num text-sm font-medium text-slate-900">
                          {formatINR(stock.currentPrice)}
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 font-mono-num text-xs font-medium ${
                            pos ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          <TrendIcon className="w-3 h-3" aria-hidden="true" />
                          <span>{formatPercent(stock.dailyChangePct)}</span>
                        </div>
                      </div>

                      {alreadyAdded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Added</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAdd(stock)}
                          disabled={isAdding}
                          aria-label={`Add ${stock.symbol} (${stock.exchange}) to watchlist`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{isAdding ? 'Adding...' : 'Add'}</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
