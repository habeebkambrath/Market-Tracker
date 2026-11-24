import { ArrowRight, BarChart3, FileSpreadsheet, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import type { MarketIndex } from '../types/market.ts';
import { formatIndexNumber, formatPercent, formatSignedPoints } from '../utils/formatters.ts';

interface AuthScreenProps {
  indices: MarketIndex[];
  authLoading: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
  onEnterDemo: () => void;
}

export function AuthScreen({
  indices,
  authLoading,
  authError,
  onGoogleSignIn,
  onEnterDemo,
}: AuthScreenProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Market Tracker
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline whitespace-nowrap">
            NSE &amp; BSE Equities · Watchlist &amp; Performance Ledger
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-medium text-slate-500 mb-3">
              Indian Equity Analytics · NSE &amp; BSE
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4 [text-wrap:balance] max-w-xl">
              Track NSE &amp; BSE stocks with disciplined technical signals.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
              Build an isolated personal watchlist, monitor daily Buy, Sell, and Hold indicators
              derived from moving average crossovers and RSI, and sync your closing price history
              directly to Excel.
            </p>

            {authError && (
              <div
                role="alert"
                className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 max-w-md"
              >
                {authError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-10">
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={authLoading}
                className="inline-flex items-center justify-center gap-3 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                <span>{authLoading ? 'Signing in...' : 'Continue with Google'}</span>
              </button>

              <button
                type="button"
                onClick={onEnterDemo}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                <span>Explore Demo Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <span>Private Firestore</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Watchlists and daily logs are isolated per authenticated Google account.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
                  <BarChart3 className="w-4 h-4 text-slate-700" />
                  <span>RSI &amp; SMA Signals</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Automated Buy, Sell, and Hold flags with transparent indicator values.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-slate-700" />
                  <span>Excel (.xlsx) Sync</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Export closing price databases or import historical spreadsheets anytime.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Live Market Snapshot
                </h2>
                <span className="text-xs text-slate-500">NSE Benchmark</span>
              </div>

              <div className="divide-y divide-slate-100">
                {indices.length > 0 ? (
                  indices.map((idx) => {
                    const pos = idx.change >= 0;
                    const Icon = pos ? TrendingUp : TrendingDown;
                    return (
                      <div
                        key={idx.id}
                        className="py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-700">
                            {idx.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold font-mono-num ${
                              pos ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                            {formatPercent(idx.changePercent)}
                          </span>
                        </div>
                        <div className="font-mono-num text-2xl font-semibold text-slate-900 mb-1">
                          {formatIndexNumber(idx.value)}
                        </div>
                        <div className="text-xs font-mono-num text-slate-500">
                          {formatSignedPoints(idx.change)} pts · Range {formatIndexNumber(idx.dayLow)} –{' '}
                          {formatIndexNumber(idx.dayHigh)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-24 bg-slate-100 rounded-lg" />
                    <div className="h-24 bg-slate-100 rounded-lg" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
              Sign in with Google to persist your personal NSE &amp; BSE watchlist and daily
              performance history in Firestore.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
