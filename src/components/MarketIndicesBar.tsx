import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import type { MarketIndex } from '../types/market.ts';
import { formatIndexNumber, formatPercent, formatSignedPoints } from '../utils/formatters.ts';

interface MarketIndicesBarProps {
  indices: MarketIndex[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export function MarketIndicesBar({
  indices,
  loading,
  refreshing,
  onRefresh,
}: MarketIndicesBarProps) {
  return (
    <section aria-label="Indian Market Benchmark Indices" className="mb-8">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Market Overview
          </h2>
          <p className="text-xs text-slate-500">
            NSE Benchmark Indices · Live market feed
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Updating...' : 'Refresh Quotes'}</span>
        </button>
      </div>

      {loading && indices.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-5 h-[124px] animate-pulse"
            >
              <div className="h-4 w-28 bg-slate-200 rounded mb-4" />
              <div className="h-7 w-40 bg-slate-200 rounded mb-3" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indices.map((index) => {
            const isPositive = index.change >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;
            const statusText = isPositive ? 'Gain' : 'Decline';
            const colorClass = isPositive ? 'text-emerald-700' : 'text-red-700';
            const bgTintClass = isPositive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 text-red-800 border-red-200';

            return (
              <div
                key={index.id}
                data-testid={`index-card-${index.id}`}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-slate-900 text-sm font-display">
                        {index.name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{index.symbol}</span>
                    </div>
                    <div className="font-mono-num text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                      {formatIndexNumber(index.value)}
                    </div>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md text-xs font-semibold whitespace-nowrap ${bgTintClass}`}
                  >
                    <TrendIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="sr-only">{statusText}:</span>
                    <span className="font-mono-num">{formatPercent(index.changePercent)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className={`inline-flex items-center gap-1.5 font-medium font-mono-num ${colorClass}`}>
                    <span>{formatSignedPoints(index.change)} pts</span>
                    <span className="text-slate-400 font-sans">today</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 font-mono-num">
                    <span>Low {formatIndexNumber(index.dayLow)}</span>
                    <span aria-hidden="true" className="text-slate-300">/</span>
                    <span>High {formatIndexNumber(index.dayHigh)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
