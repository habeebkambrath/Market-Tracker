import { useMemo, useState } from 'react';
import { ExternalLink, Newspaper, RefreshCw, Search } from 'lucide-react';
import type { NewsCategory, StockNewsItem, WatchlistItem } from '../types/market.ts';

interface NewsViewProps {
  news: StockNewsItem[];
  watchlist: WatchlistItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

const CATEGORY_OPTIONS: (NewsCategory | 'ALL')[] = [
  'ALL',
  'Agreement & Deal',
  'Project & Order',
  'Earnings & Results',
  'Market Update',
];

function formatNewsDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Recent';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

export function NewsView({
  news,
  watchlist,
  loading,
  refreshing,
  onRefresh,
}: NewsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'ALL'>('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');

  const uniqueSymbols = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of watchlist) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        list.push(item.symbol);
      }
    }
    return list.sort();
  }, [watchlist]);

  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return news.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedSymbol !== 'ALL' && item.symbol !== selectedSymbol) {
        return false;
      }
      if (q) {
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.symbol.toLowerCase().includes(q) ||
          item.companyName.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [news, searchQuery, selectedCategory, selectedSymbol]);

  return (
    <section aria-label="Watchlist Stock News Feed" className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Watchlist Stock News &amp; Corporate Updates
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest agreements, new projects, order wins, earnings, and market updates for your{' '}
              {watchlist.length} watchlist {watchlist.length === 1 ? 'share' : 'shares'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing || watchlist.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh News'}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <label htmlFor="news-search-input" className="sr-only">
                Search watchlist stock news
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="news-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search headline or stock..."
                className="pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 w-56"
              />
            </div>

            <div>
              <label htmlFor="news-stock-select" className="sr-only">
                Filter news by watchlist stock
              </label>
              <select
                id="news-stock-select"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="ALL">All Watchlist Stocks</option>
                {uniqueSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter news by update category"
            className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg gap-0.5"
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? 'All Updates' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="p-10 text-center">
            <Newspaper className="w-8 h-8 text-slate-300 mx-auto mb-3" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-slate-900 mb-1">
              No stocks in your watchlist
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add NSE or BSE shares on the Dashboard &amp; Watchlist tab to follow their latest
              agreements, new projects, and market news here.
            </p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="p-10 text-center">
            <Newspaper className="w-8 h-8 text-slate-300 mx-auto mb-3" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-slate-900 mb-1">
              No matching stock news found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try clearing your category or stock filter, or click Refresh News to check for new
              updates.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredNews.map((item) => (
              <li
                key={item.id}
                data-testid={`news-item-${item.symbol}`}
                className="p-5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
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
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-num">
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
                  className="group inline-flex items-start gap-2 text-sm font-medium text-slate-900 hover:text-blue-700 transition-colors"
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
