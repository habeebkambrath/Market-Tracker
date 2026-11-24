import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen.tsx';
import { MarketIndicesBar } from './components/MarketIndicesBar.tsx';
import { NewsView } from './components/NewsView.tsx';
import { PerformanceView } from './components/PerformanceView.tsx';
import { PriceAlertModal } from './components/PriceAlertModal.tsx';
import { StockSearchPanel } from './components/StockSearchPanel.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { WatchlistView } from './components/WatchlistView.tsx';
import { auth, googleProvider } from './lib/firebase.ts';
import {
  addStockToWatchlist,
  deletePriceAlert,
  ensureUserProfile,
  importPerformanceRowsToFirestore,
  markPriceAlertsTriggered,
  removeStockFromWatchlist,
  subscribePerformanceLogs,
  subscribePriceAlerts,
  subscribeWatchlist,
  syncDailyClosingLogs,
  upsertPriceAlert,
} from './services/firestoreService.ts';
import {
  fetchMarketIndices,
  fetchStockQuotes,
  fetchWatchlistNews,
} from './services/marketApi.ts';
import type {
  AlertCondition,
  Exchange,
  MarketIndex,
  PerformanceLogEntry,
  PriceAlert,
  StockNewsItem,
  StockQuote,
  StockSearchResult,
  ToastNotification,
  WatchlistItem,
} from './types/market.ts';
import { evaluatePriceAlerts } from './utils/alerts.ts';
import type { ImportedPerformanceRow } from './utils/excel.ts';
import {
  formatINR,
  makePerformanceLogDocId,
  makePriceAlertDocId,
  makeWatchlistDocId,
} from './utils/formatters.ts';

type ActiveTab = 'dashboard' | 'performance' | 'news';

const DEMO_USER_ID = 'demo_preview_user';

const INITIAL_DEMO_WATCHLIST: WatchlistItem[] = [
  {
    id: 'NSE_RELIANCE',
    userId: DEMO_USER_ID,
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Retail',
  },
  {
    id: 'NSE_TCS',
    userId: DEMO_USER_ID,
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    exchange: 'NSE',
    sector: 'IT Services',
  },
  {
    id: 'NSE_HDFCBANK',
    userId: DEMO_USER_ID,
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking',
  },
  {
    id: 'BSE_INFY',
    userId: DEMO_USER_ID,
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'BSE',
    sector: 'IT Services',
  },
  {
    id: 'NSE_SBIN',
    userId: DEMO_USER_ID,
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    sector: 'Banking',
  },
];

function isAutostartEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(() => isAutostartEnabled());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loadingIndices, setLoadingIndices] = useState(true);
  const [refreshingMarket, setRefreshingMarket] = useState(false);

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [performanceLogs, setPerformanceLogs] = useState<PerformanceLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [syncingLogs, setSyncingLogs] = useState(false);

  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [alertModalStock, setAlertModalStock] = useState<WatchlistItem | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [watchlistNews, setWatchlistNews] = useState<StockNewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [refreshingNews, setRefreshingNews] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  const lastSyncedSignatureRef = useRef<string>('');
  const notifiedAlertIdsRef = useRef<Set<string>>(new Set());
  const logsRef = useRef<PerformanceLogEntry[]>([]);
  logsRef.current = performanceLogs;

  // 1. Fetch NIFTY 50 & BANK NIFTY indicators on boot
  const loadIndices = useCallback(async (live = false) => {
    try {
      const data = await fetchMarketIndices(live);
      setIndices(data);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Unable to load market indices');
    } finally {
      setLoadingIndices(false);
    }
  }, []);

  useEffect(() => {
    void loadIndices(false);
  }, [loadIndices]);

  // 2. Listen to Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        setDemoMode(false);
        setLoadingWatchlist(true);
        setLoadingLogs(true);
        try {
          await ensureUserProfile(currentUser);
          setProfileReady(true);
        } catch (err) {
          setAppError(err instanceof Error ? err.message : 'Failed to initialize user profile');
          setLoadingWatchlist(false);
          setLoadingLogs(false);
        }
      } else {
        setProfileReady(false);
        setLoadingWatchlist(false);
        setLoadingLogs(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Firestore watchlist & performanceLogs when signed in, or seed Demo Mode
  useEffect(() => {
    if (user && profileReady) {
      const unsubWatchlist = subscribeWatchlist(
        user.uid,
        (items) => {
          setWatchlist(items);
          setLoadingWatchlist(false);
        },
        (err) => {
          setAppError(err.message);
          setLoadingWatchlist(false);
        },
      );

      const unsubLogs = subscribePerformanceLogs(
        user.uid,
        (logs) => {
          setPerformanceLogs(logs);
          setLoadingLogs(false);
        },
        (err) => {
          setAppError(err.message);
          setLoadingLogs(false);
        },
      );

      const unsubAlerts = subscribePriceAlerts(
        user.uid,
        (alerts) => {
          setPriceAlerts(alerts);
        },
        (err) => {
          setAppError(err.message);
        },
      );

      return () => {
        unsubWatchlist();
        unsubLogs();
        unsubAlerts();
      };
    }

    if (demoMode && !user) {
      setWatchlist(INITIAL_DEMO_WATCHLIST);
      setPerformanceLogs([]);
      setPriceAlerts([]);
      setLoadingWatchlist(false);
      setLoadingLogs(false);
      lastSyncedSignatureRef.current = '';
      notifiedAlertIdsRef.current.clear();
    } else if (!user && !demoMode) {
      setWatchlist([]);
      setPerformanceLogs([]);
      setPriceAlerts([]);
      setQuotes([]);
      notifiedAlertIdsRef.current.clear();
    }
  }, [user, profileReady, demoMode]);

  // 4. Fetch quotes & technical signals whenever watchlist changes
  const refreshQuotesForWatchlist = useCallback(
    async (items: WatchlistItem[], live = false) => {
      if (items.length === 0) {
        setQuotes([]);
        return;
      }
      setLoadingQuotes(true);
      try {
        const fetched = await fetchStockQuotes(
          items.map((w) => ({ symbol: w.symbol, exchange: w.exchange })),
          live,
        );
        setQuotes(fetched);
      } catch (err) {
        setAppError(err instanceof Error ? err.message : 'Unable to fetch stock quotes');
      } finally {
        setLoadingQuotes(false);
      }
    },
    [],
  );

  useEffect(() => {
    void refreshQuotesForWatchlist(watchlist, false);
  }, [watchlist, refreshQuotesForWatchlist]);

  // 4b. Fetch latest stock news whenever watchlist changes
  const loadWatchlistNews = useCallback(async (items: WatchlistItem[], live = false) => {
    if (items.length === 0) {
      setWatchlistNews([]);
      setLoadingNews(false);
      return;
    }
    if (live) {
      setRefreshingNews(true);
    } else {
      setLoadingNews(true);
    }
    try {
      const news = await fetchWatchlistNews(
        items.map((w) => ({ symbol: w.symbol, exchange: w.exchange })),
        live,
      );
      setWatchlistNews(news);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Unable to fetch watchlist stock news');
    } finally {
      setLoadingNews(false);
      setRefreshingNews(false);
    }
  }, []);

  useEffect(() => {
    void loadWatchlistNews(watchlist, false);
  }, [watchlist, loadWatchlistNews]);

  // Periodically refresh live NIFTY 50, BANK NIFTY, and watchlist quotes every 60s when visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      void loadIndices(true);
      if (watchlist.length > 0) {
        void refreshQuotesForWatchlist(watchlist, true);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [watchlist, loadIndices, refreshQuotesForWatchlist]);

  // 5. Automatically log day-by-day closing prices for all watchlist stocks
  const syncQuotesToLedger = useCallback(
    async (targetQuotes: StockQuote[], force = false) => {
      if (targetQuotes.length === 0) return;

      const signature = targetQuotes
        .map((q) => `${q.exchange}:${q.symbol}:${q.currentPrice}`)
        .sort()
        .join('|');

      if (!force && signature === lastSyncedSignatureRef.current) return;
      lastSyncedSignatureRef.current = signature;

      if (user && profileReady) {
        setSyncingLogs(true);
        try {
          await syncDailyClosingLogs(user.uid, targetQuotes, logsRef.current);
        } catch (err) {
          setAppError(err instanceof Error ? err.message : 'Failed to log daily closing prices');
        } finally {
          setSyncingLogs(false);
        }
      } else if (demoMode) {
        setPerformanceLogs((prev) => {
          const map = new Map(prev.map((entry) => [entry.id, entry]));
          for (const quote of targetQuotes) {
            for (const dayPoint of quote.historicalCloses.slice(-5)) {
              const id = makePerformanceLogDocId(dayPoint.date, quote.exchange, quote.symbol);
              const existing = map.get(id);
              if (existing && existing.source === 'import') continue;
              map.set(id, {
                id,
                userId: DEMO_USER_ID,
                date: dayPoint.date,
                symbol: quote.symbol,
                exchange: quote.exchange,
                closingPrice: dayPoint.close,
                dailyChangePct: dayPoint.changePct,
                signal: quote.signal,
                reason: quote.reason,
                source: 'auto',
              });
            }
          }
          return Array.from(map.values());
        });
      }
    },
    [user, profileReady, demoMode],
  );

  useEffect(() => {
    if ((user && profileReady) || demoMode) {
      void syncQuotesToLedger(quotes, false);
    }
  }, [quotes, user, profileReady, demoMode, syncQuotesToLedger]);

  const quotesById = useMemo(() => {
    const map: Record<string, StockQuote> = {};
    for (const q of quotes) {
      map[makeWatchlistDocId(q.exchange, q.symbol)] = q;
    }
    return map;
  }, [quotes]);

  // 6. Evaluate price alerts whenever quotes or alerts update, and show toast notifications
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if ((!user || !profileReady) && !demoMode) return;
    const hits = evaluatePriceAlerts(priceAlerts, quotesById);
    if (hits.length === 0) return;

    const freshHits = hits.filter((h) => !notifiedAlertIdsRef.current.has(h.alert.id));
    if (freshHits.length === 0) return;

    for (const hit of freshHits) {
      notifiedAlertIdsRef.current.add(hit.alert.id);
      const toastId = `${hit.alert.id}_${Date.now()}`;
      const op = hit.alert.condition === 'above' ? '≥' : '≤';
      const newToast: ToastNotification = {
        id: toastId,
        title: `Price Alert Hit · ${hit.alert.symbol} (${hit.alert.exchange})`,
        message: `Current price ${formatINR(hit.currentPrice)} reached your target (${op} ${formatINR(hit.alert.targetPrice)}).`,
        tone: 'alert-hit',
        symbol: hit.alert.symbol,
        exchange: hit.alert.exchange,
      };
      setToasts((prev) => [...prev.slice(-3), newToast]);
    }

    if (user && profileReady) {
      void markPriceAlertsTriggered(
        user.uid,
        freshHits.map((h) => ({ alertId: h.alert.id, currentPrice: h.currentPrice })),
      ).catch((err) => {
        setAppError(err instanceof Error ? err.message : 'Failed to update price alert state');
      });
    } else if (demoMode) {
      const hitMap = new Map(freshHits.map((h) => [h.alert.id, h.currentPrice]));
      setPriceAlerts((prev) =>
        prev.map((a) =>
          hitMap.has(a.id)
            ? { ...a, status: 'triggered', triggeredPrice: hitMap.get(a.id)! }
            : a,
        ),
      );
    }
  }, [priceAlerts, quotesById, user, profileReady, demoMode]);

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (user) {
      await signOut(auth);
    }
    setDemoMode(false);
    setActiveTab('dashboard');
  };

  // Market Refresh
  const handleRefreshAll = async () => {
    setRefreshingMarket(true);
    setAppError(null);
    try {
      await Promise.all([
        loadIndices(true),
        refreshQuotesForWatchlist(watchlist, true),
        loadWatchlistNews(watchlist, true),
      ]);
    } finally {
      setRefreshingMarket(false);
    }
  };

  // Watchlist Add/Remove
  const handleAddStock = async (stock: StockSearchResult) => {
    setAppError(null);
    if (user && profileReady) {
      await addStockToWatchlist(user.uid, stock);
      return;
    }

    if (demoMode) {
      const id = makeWatchlistDocId(stock.exchange, stock.symbol);
      setWatchlist((prev) => {
        if (prev.some((w) => w.id === id)) return prev;
        return [
          {
            id,
            userId: DEMO_USER_ID,
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            sector: stock.sector,
          },
          ...prev,
        ];
      });
    }
  };

  const handleRemoveStock = async (itemId: string) => {
    setAppError(null);
    if (user && profileReady) {
      await removeStockFromWatchlist(user.uid, itemId);
      return;
    }

    if (demoMode) {
      setWatchlist((prev) => prev.filter((w) => w.id !== itemId));
    }
  };

  // Performance Sync & Import
  const handleSyncNow = async () => {
    setSyncingLogs(true);
    try {
      await syncQuotesToLedger(quotes, true);
    } finally {
      setSyncingLogs(false);
    }
  };

  const handleImportRows = async (rows: ImportedPerformanceRow[]): Promise<number> => {
    if (user && profileReady) {
      return importPerformanceRowsToFirestore(user.uid, rows, performanceLogs);
    }

    if (demoMode) {
      setPerformanceLogs((prev) => {
        const map = new Map(prev.map((entry) => [entry.id, entry]));
        for (const row of rows) {
          const id = makePerformanceLogDocId(row.date, row.exchange, row.symbol);
          map.set(id, {
            id,
            userId: DEMO_USER_ID,
            date: row.date,
            symbol: row.symbol,
            exchange: row.exchange,
            closingPrice: row.closingPrice,
            dailyChangePct: row.dailyChangePct,
            signal: row.signal,
            reason: row.reason,
            source: 'import',
          });
        }
        return Array.from(map.values());
      });
      return rows.length;
    }

    return 0;
  };

  // Price Alert Handlers
  const handleSavePriceAlert = async (
    symbol: string,
    exchange: Exchange,
    condition: AlertCondition,
    targetPrice: number,
  ) => {
    const id = makePriceAlertDocId(exchange, symbol, condition);
    notifiedAlertIdsRef.current.delete(id);

    if (user && profileReady) {
      await upsertPriceAlert(user.uid, symbol, exchange, condition, targetPrice);
      return;
    }

    if (demoMode) {
      setPriceAlerts((prev) => {
        const next: PriceAlert = {
          id,
          userId: DEMO_USER_ID,
          symbol,
          exchange,
          condition,
          targetPrice,
          status: 'active',
          triggeredPrice: 0,
        };
        const exists = prev.some((a) => a.id === id);
        return exists ? prev.map((a) => (a.id === id ? next : a)) : [next, ...prev];
      });
    }
  };

  const handleDeletePriceAlert = async (alertId: string) => {
    notifiedAlertIdsRef.current.delete(alertId);
    if (user && profileReady) {
      await deletePriceAlert(user.uid, alertId);
      return;
    }

    if (demoMode) {
      setPriceAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading Market Tracker...</div>
      </div>
    );
  }

  if (!user && !demoMode) {
    return (
      <AuthScreen
        indices={indices}
        authLoading={authLoading}
        authError={authError}
        onGoogleSignIn={handleGoogleSignIn}
        onEnterDemo={() => setDemoMode(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Bar Contract: 3 clean single-line zones on desktop; compact 2-tier on <640px */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
          >
            Market Tracker
          </button>

          {/* Zone 2: Primary Navigation Tabs (Desktop) */}
          <nav aria-label="Primary sections" className="hidden sm:flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Dashboard &amp; Watchlist
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('performance')}
              aria-current={activeTab === 'performance' ? 'page' : undefined}
              className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'performance'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Performance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('news')}
              aria-current={activeTab === 'news' ? 'page' : undefined}
              className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'news'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              News
            </button>
          </nav>

          {/* Zone 3: User Session & Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <>
                <span className="hidden sm:inline text-xs text-slate-600 max-w-[160px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                <span className="sm:hidden">{authLoading ? 'Signing in...' : 'Sign In'}</span>
                <span className="hidden sm:inline">
                  {authLoading ? 'Signing in...' : 'Sign in with Google'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Strip (keeps total sticky height <= 96px, under 15% of mobile viewport) */}
        <nav
          aria-label="Mobile sections"
          className="sm:hidden grid grid-cols-3 border-t border-slate-100 bg-white"
        >
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500'
            }`}
          >
            Watchlist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            aria-current={activeTab === 'performance' ? 'page' : undefined}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'performance'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500'
            }`}
          >
            Performance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('news')}
            aria-current={activeTab === 'news' ? 'page' : undefined}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'news'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500'
            }`}
          >
            News
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {demoMode && !user && (
          <div className="mb-6 px-4 py-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-600">
              <span className="font-semibold text-slate-900">Demo Preview Mode</span>
              <span aria-hidden="true" className="mx-2 text-slate-300">·</span>
              <span>
                Changes are stored in this browser session. Sign in with Google to save your
                watchlist and Excel closing logs in Firestore.
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-slate-600 hover:text-slate-900 font-medium underline underline-offset-2 whitespace-nowrap"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {appError && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4 text-xs text-red-800"
          >
            <span>{appError}</span>
            <button
              type="button"
              onClick={() => setAppError(null)}
              className="font-semibold underline underline-offset-2 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <MarketIndicesBar
          indices={indices}
          loading={loadingIndices}
          refreshing={refreshingMarket}
          onRefresh={handleRefreshAll}
        />

        {activeTab === 'dashboard' ? (
          <div>
            <StockSearchPanel watchlist={watchlist} onAddStock={handleAddStock} />
            <WatchlistView
              watchlist={watchlist}
              quotesById={quotesById}
              priceAlerts={priceAlerts}
              loadingWatchlist={loadingWatchlist}
              loadingQuotes={loadingQuotes}
              onAddStarterStock={handleAddStock}
              onRemoveStock={handleRemoveStock}
              onOpenAlertModal={(item) => setAlertModalStock(item)}
            />
          </div>
        ) : activeTab === 'performance' ? (
          <PerformanceView
            logs={performanceLogs}
            watchlist={watchlist}
            news={watchlistNews}
            loading={loadingLogs}
            loadingNews={loadingNews}
            syncing={syncingLogs}
            onSyncNow={handleSyncNow}
            onImportRows={handleImportRows}
            onOpenNewsTab={() => setActiveTab('news')}
          />
        ) : (
          <NewsView
            news={watchlistNews}
            watchlist={watchlist}
            loading={loadingNews}
            refreshing={refreshingNews}
            onRefresh={() => loadWatchlistNews(watchlist, true)}
          />
        )}
      </main>

      <PriceAlertModal
        stock={
          alertModalStock
            ? {
                symbol: alertModalStock.symbol,
                name: alertModalStock.name,
                exchange: alertModalStock.exchange,
                currentPrice:
                  quotesById[makeWatchlistDocId(alertModalStock.exchange, alertModalStock.symbol)]
                    ?.currentPrice,
              }
            : null
        }
        existingAlerts={priceAlerts}
        onClose={() => setAlertModalStock(null)}
        onSaveAlert={handleSavePriceAlert}
        onDeleteAlert={handleDeletePriceAlert}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Market Tracker · NSE &amp; BSE Equity Analytics</span>
          <span>Prices and technical signals are for informational tracking.</span>
        </div>
      </footer>
    </div>
  );
}
