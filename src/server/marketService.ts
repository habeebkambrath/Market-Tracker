import type {
  Exchange,
  HistoricalClosePoint,
  MarketIndex,
  StockQuote,
  StockSearchResult,
} from '../types/market.ts';
import { computeTechnicalSignal } from '../utils/indicators.ts';
import {
  INDIAN_STOCKS_CATALOG,
  resolveCatalogEntry,
  type CatalogStockEntry,
} from './indianStocksCatalog.ts';

const VALID_CUSTOM_TICKER = /^[A-Z0-9.\-&]{2,20}$/;
const YAHOO_TICKER_SYMBOL = /^[A-Z0-9.\-&]{1,24}$/;
const CACHE_TTL_MS = 20_000;
const FETCH_TIMEOUT_MS = 5000;

const SYMBOL_ALIASES: Record<string, string> = {
  ZOMATO: 'ETERNAL',
  TATAMOTORS: 'TMCV',
};

interface YahooChartMeta {
  symbol?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  regularMarketTime?: number;
  shortName?: string;
  longName?: string;
}

export interface YahooChartResult {
  meta?: YahooChartMeta;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
    }>;
  };
}

interface YahooChartPayload {
  chart?: {
    result?: YahooChartResult[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  sector?: string;
  sectorDisp?: string;
  industry?: string;
  score?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatISTDate(ms: number): string {
  return istDateFormatter.format(new Date(ms));
}

function getRecentTradingDates(count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.unshift(istDateFormatter.format(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
}

function extractChronologicalBars(
  result: YahooChartResult,
): { date: string; close: number }[] {
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const byDate = new Map<string, number>();

  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const close = closes[i];
    if (typeof ts !== 'number' || typeof close !== 'number' || !Number.isFinite(close) || close <= 0) {
      continue;
    }
    const date = formatISTDate(ts * 1000);
    byDate.set(date, Number(close.toFixed(2)));
  }

  const bars = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, close]) => ({ date, close }));

  const metaPrice = result.meta?.regularMarketPrice;
  const metaTime = result.meta?.regularMarketTime;
  if (typeof metaPrice === 'number' && Number.isFinite(metaPrice) && metaPrice > 0) {
    const roundedMetaPrice = Number(metaPrice.toFixed(2));
    const metaDate =
      typeof metaTime === 'number' && Number.isFinite(metaTime)
        ? formatISTDate(metaTime * 1000)
        : bars[bars.length - 1]?.date ?? formatISTDate(Date.now());

    if (bars.length === 0) {
      bars.push({ date: metaDate, close: roundedMetaPrice });
    } else if (bars[bars.length - 1].date === metaDate) {
      bars[bars.length - 1] = { date: metaDate, close: roundedMetaPrice };
    } else if (metaDate > bars[bars.length - 1].date) {
      bars.push({ date: metaDate, close: roundedMetaPrice });
    }
  }

  return bars;
}

export function parseYahooChartToMarketIndex(
  raw: unknown,
  id: 'NIFTY_50' | 'BANK_NIFTY',
  name: string,
  displaySymbol: string,
): MarketIndex | null {
  const payload = raw as YahooChartPayload | null;
  const result = payload?.chart?.result?.[0];
  if (!result || !result.meta) return null;

  const bars = extractChronologicalBars(result);
  const meta = result.meta;
  const currentValue =
    typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0
      ? Number(meta.regularMarketPrice.toFixed(2))
      : bars[bars.length - 1]?.close;

  if (typeof currentValue !== 'number' || !Number.isFinite(currentValue) || currentValue <= 0) {
    return null;
  }

  const rawPrevClose =
    typeof meta.previousClose === 'number' && meta.previousClose > 0
      ? meta.previousClose
      : bars.length >= 2
        ? bars[bars.length - 2].close
        : typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0
          ? meta.chartPreviousClose
          : currentValue;

  const prevClose = Number(rawPrevClose.toFixed(2));
  const change = Number((currentValue - prevClose).toFixed(2));
  const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

  const dayHigh =
    typeof meta.regularMarketDayHigh === 'number' && meta.regularMarketDayHigh > 0
      ? Number(meta.regularMarketDayHigh.toFixed(2))
      : Number(Math.max(currentValue, prevClose).toFixed(2));
  const dayLow =
    typeof meta.regularMarketDayLow === 'number' && meta.regularMarketDayLow > 0
      ? Number(meta.regularMarketDayLow.toFixed(2))
      : Number(Math.min(currentValue, prevClose).toFixed(2));

  const updatedAt =
    typeof meta.regularMarketTime === 'number' && Number.isFinite(meta.regularMarketTime)
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString();

  return {
    id,
    name,
    symbol: displaySymbol,
    value: currentValue,
    prevClose,
    change,
    changePercent,
    dayHigh,
    dayLow,
    updatedAt,
  };
}

export function parseYahooChartToStockQuote(
  raw: unknown,
  symbol: string,
  exchange: Exchange,
  fallbackMeta?: { name?: string; sector?: string },
): StockQuote | null {
  const payload = raw as YahooChartPayload | null;
  const result = payload?.chart?.result?.[0];
  if (!result || !result.meta) return null;

  const meta = result.meta;
  const bars = extractChronologicalBars(result);
  if (bars.length === 0) return null;

  const currentPrice =
    typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0
      ? Number(meta.regularMarketPrice.toFixed(2))
      : bars[bars.length - 1].close;

  const rawPrevClose =
    typeof meta.previousClose === 'number' && meta.previousClose > 0
      ? meta.previousClose
      : bars.length >= 2
        ? bars[bars.length - 2].close
        : typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0
          ? meta.chartPreviousClose
          : currentPrice;

  const prevClose = Number(rawPrevClose.toFixed(2));
  const dailyChange = Number((currentPrice - prevClose).toFixed(2));
  const dailyChangePct = prevClose > 0 ? Number(((dailyChange / prevClose) * 100).toFixed(2)) : 0;

  const dayHigh =
    typeof meta.regularMarketDayHigh === 'number' && meta.regularMarketDayHigh > 0
      ? Number(meta.regularMarketDayHigh.toFixed(2))
      : Number(Math.max(currentPrice, prevClose).toFixed(2));
  const dayLow =
    typeof meta.regularMarketDayLow === 'number' && meta.regularMarketDayLow > 0
      ? Number(meta.regularMarketDayLow.toFixed(2))
      : Number(Math.min(currentPrice, prevClose).toFixed(2));

  const recentSliceStart = Math.max(0, bars.length - 20);
  const historicalCloses: HistoricalClosePoint[] = bars.slice(recentSliceStart).map((bar, idx) => {
    const absoluteIdx = recentSliceStart + idx;
    const priorClose =
      absoluteIdx > 0 ? bars[absoluteIdx - 1].close : meta.chartPreviousClose ?? bar.close;
    const pct =
      priorClose > 0 ? Number((((bar.close - priorClose) / priorClose) * 100).toFixed(2)) : 0;
    return {
      date: bar.date,
      close: bar.close,
      changePct: pct,
    };
  });

  const closingSeries = bars.map((b) => b.close);
  const analysis = computeTechnicalSignal(closingSeries);

  const catalogHit = INDIAN_STOCKS_CATALOG.find((c) => c.symbol === symbol);
  const resolvedName = (
    fallbackMeta?.name ||
    catalogHit?.name ||
    meta.longName ||
    meta.shortName ||
    `${symbol} India Ltd.`
  )
    .trim()
    .slice(0, 120);
  const resolvedSector = (fallbackMeta?.sector || catalogHit?.sector || 'Listed Equity')
    .trim()
    .slice(0, 60);

  return {
    symbol,
    name: resolvedName,
    exchange,
    sector: resolvedSector,
    currentPrice,
    prevClose,
    dailyChange,
    dailyChangePct,
    dayHigh,
    dayLow,
    volume:
      typeof meta.regularMarketVolume === 'number' && meta.regularMarketVolume >= 0
        ? Math.round(meta.regularMarketVolume)
        : 0,
    sma5: analysis.sma5,
    sma20: analysis.sma20,
    sma50: analysis.sma50,
    sma200: analysis.sma200,
    oneYearReturnPct: analysis.oneYearReturnPct,
    rsi14: analysis.rsi14,
    signal: analysis.signal,
    reason: analysis.reason,
    longTermVerdict: analysis.longTermVerdict,
    longTermReason: analysis.longTermReason,
    historicalCloses,
  };
}

function buildSampleQuote(def: CatalogStockEntry, exchange: Exchange, liveJitter = false): StockQuote {
  const resolved = def.dailyReturnsPct ? def : resolveCatalogEntry(def.symbol);
  const returns = resolved.dailyReturnsPct!;
  const volumeBase = resolved.volumeBase ?? 2500000;

  const exchangeMultiplier = exchange === 'BSE' ? 1.0009 : 1.0;
  const dates = getRecentTradingDates(returns.length);

  let price = resolved.basePrice * exchangeMultiplier;
  const historicalCloses: HistoricalClosePoint[] = [];

  for (let i = 0; i < returns.length; i++) {
    const pct = returns[i];
    price = Number((price * (1 + pct / 100)).toFixed(2));
    historicalCloses.push({
      date: dates[i],
      close: price,
      changePct: pct,
    });
  }

  if (liveJitter) {
    const tickSeed = Math.sin(Date.now() / 6000 + resolved.symbol.charCodeAt(0)) * 0.0018;
    const adjusted = Number(
      (historicalCloses[historicalCloses.length - 1].close * (1 + tickSeed)).toFixed(2),
    );
    const prev = historicalCloses[historicalCloses.length - 2].close;
    const newPct = Number((((adjusted - prev) / prev) * 100).toFixed(2));
    historicalCloses[historicalCloses.length - 1] = {
      ...historicalCloses[historicalCloses.length - 1],
      close: adjusted,
      changePct: newPct,
    };
  }

  const closingSeries = historicalCloses.map((p) => p.close);
  const currentPrice = closingSeries[closingSeries.length - 1];
  const prevClose = closingSeries[closingSeries.length - 2];
  const dailyChange = Number((currentPrice - prevClose).toFixed(2));
  const dailyChangePct = Number((((currentPrice - prevClose) / prevClose) * 100).toFixed(2));
  const dayHigh = Number((Math.max(currentPrice, prevClose) * 1.0085).toFixed(2));
  const dayLow = Number((Math.min(currentPrice, prevClose) * 0.9915).toFixed(2));

  const analysis = computeTechnicalSignal(closingSeries);

  return {
    symbol: resolved.symbol,
    name: resolved.name,
    exchange,
    sector: resolved.sector,
    currentPrice,
    prevClose,
    dailyChange,
    dailyChangePct,
    dayHigh,
    dayLow,
    volume: exchange === 'NSE' ? volumeBase : Math.round(volumeBase * 0.14),
    sma5: analysis.sma5,
    sma20: analysis.sma20,
    sma50: analysis.sma50,
    sma200: analysis.sma200,
    oneYearReturnPct: analysis.oneYearReturnPct,
    rsi14: analysis.rsi14,
    signal: analysis.signal,
    reason: analysis.reason,
    longTermVerdict: analysis.longTermVerdict,
    longTermReason: analysis.longTermReason,
    historicalCloses,
  };
}

function buildFallbackIndices(liveJitter = false): MarketIndex[] {
  const niftyPrev = 25800.6;
  const bankNiftyPrev = 64635.2;

  const jitterA = liveJitter ? Math.sin(Date.now() / 7000) * 18.4 : 0;
  const jitterB = liveJitter ? Math.cos(Date.now() / 8000) * 42.6 : 0;

  const niftyValue = Number((25349.65 + jitterA).toFixed(2));
  const niftyChange = Number((niftyValue - niftyPrev).toFixed(2));
  const niftyPct = Number(((niftyChange / niftyPrev) * 100).toFixed(2));

  const bankNiftyValue = Number((62585.35 + jitterB).toFixed(2));
  const bankNiftyChange = Number((bankNiftyValue - bankNiftyPrev).toFixed(2));
  const bankNiftyPct = Number(((bankNiftyChange / bankNiftyPrev) * 100).toFixed(2));

  const updatedAt = new Date().toISOString();

  return [
    {
      id: 'NIFTY_50',
      name: 'NIFTY 50',
      symbol: 'NSE:NIFTY50',
      value: niftyValue,
      prevClose: niftyPrev,
      change: niftyChange,
      changePercent: niftyPct,
      dayHigh: Number((Math.max(niftyValue, niftyPrev) + 64.2).toFixed(2)),
      dayLow: Number((Math.min(niftyValue, niftyPrev) - 48.9).toFixed(2)),
      updatedAt,
    },
    {
      id: 'BANK_NIFTY',
      name: 'BANK NIFTY',
      symbol: 'NSE:NIFTYBANK',
      value: bankNiftyValue,
      prevClose: bankNiftyPrev,
      change: bankNiftyChange,
      changePercent: bankNiftyPct,
      dayHigh: Number((Math.max(bankNiftyValue, bankNiftyPrev) + 195.4).toFixed(2)),
      dayLow: Number((Math.min(bankNiftyValue, bankNiftyPrev) - 160.8).toFixed(2)),
      updatedAt,
    },
  ];
}

export interface MarketDataProvider {
  getIndices(liveRefresh?: boolean): Promise<MarketIndex[]>;
  searchStocks(query: string, exchangeFilter?: Exchange | 'ALL'): Promise<StockSearchResult[]>;
  getQuotes(keys: { symbol: string; exchange: Exchange }[], liveRefresh?: boolean): Promise<StockQuote[]>;
}

class LiveIndianMarketProvider implements MarketDataProvider {
  private chartCache = new Map<string, CacheEntry<YahooChartPayload>>();
  private searchCache = new Map<string, CacheEntry<YahooSearchQuote[]>>();

  private async fetchYahooChart(
    yahooSymbol: string,
    bypassCache = false,
  ): Promise<YahooChartPayload | null> {
    const now = Date.now();
    if (!bypassCache) {
      const cached = this.chartCache.get(yahooSymbol);
      if (cached && cached.expiresAt > now) {
        return cached.value;
      }
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1y&interval=1d`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      const json = (await response.json()) as YahooChartPayload;
      if (!json?.chart?.result?.[0]) {
        return null;
      }
      this.chartCache.set(yahooSymbol, {
        value: json,
        expiresAt: now + CACHE_TTL_MS,
      });
      return json;
    } catch {
      return null;
    }
  }

  private async fetchYahooSearch(query: string): Promise<YahooSearchQuote[]> {
    const key = query.trim().toUpperCase();
    const now = Date.now();
    const cached = this.searchCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=16&newsCount=0`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as { quotes?: YahooSearchQuote[] };
      const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
      this.searchCache.set(key, {
        value: quotes,
        expiresAt: now + 60_000,
      });
      return quotes;
    } catch {
      return [];
    }
  }

  private async fetchLiveStockQuote(
    symbol: string,
    exchange: Exchange,
    bypassCache: boolean,
    fallbackMeta?: { name?: string; sector?: string },
  ): Promise<StockQuote | null> {
    const cleanSymbol = symbol.trim().toUpperCase();
    const lookupSymbol = SYMBOL_ALIASES[cleanSymbol] ?? cleanSymbol;
    const suffix = exchange === 'BSE' ? '.BO' : '.NS';
    const payload = await this.fetchYahooChart(`${lookupSymbol}${suffix}`, bypassCache);
    if (!payload) return null;
    return parseYahooChartToStockQuote(payload, cleanSymbol, exchange, fallbackMeta);
  }

  async getIndices(liveRefresh = false): Promise<MarketIndex[]> {
    const fallback = buildFallbackIndices(liveRefresh);
    const [niftyPayload, bankNiftyPayload] = await Promise.all([
      this.fetchYahooChart('^NSEI', liveRefresh),
      this.fetchYahooChart('^NSEBANK', liveRefresh),
    ]);

    const nifty = niftyPayload
      ? parseYahooChartToMarketIndex(niftyPayload, 'NIFTY_50', 'NIFTY 50', 'NSE:NIFTY50')
      : null;
    const bankNifty = bankNiftyPayload
      ? parseYahooChartToMarketIndex(bankNiftyPayload, 'BANK_NIFTY', 'BANK NIFTY', 'NSE:NIFTYBANK')
      : null;

    return [nifty ?? fallback[0], bankNifty ?? fallback[1]];
  }

  async searchStocks(
    query: string,
    exchangeFilter: Exchange | 'ALL' = 'ALL',
  ): Promise<StockSearchResult[]> {
    const normalized = query.trim().toUpperCase();
    const exchanges: Exchange[] =
      exchangeFilter === 'ALL' ? ['NSE', 'BSE'] : [exchangeFilter];

    interface SearchCandidate {
      symbol: string;
      exchange: Exchange;
      name: string;
      sector: string;
      score: number;
      isCatalogOrYahoo: boolean;
    }

    const candidates = new Map<string, SearchCandidate>();
    const addCandidate = (candidate: SearchCandidate) => {
      const key = `${candidate.exchange}:${candidate.symbol}`;
      const existing = candidates.get(key);
      if (!existing || candidate.score > existing.score) {
        candidates.set(key, candidate);
      }
    };

    if (normalized) {
      const aliasedTarget = SYMBOL_ALIASES[normalized];
      for (const entry of INDIAN_STOCKS_CATALOG) {
        const sym = entry.symbol.toUpperCase();
        const name = entry.name.toUpperCase();
        const sector = entry.sector.toUpperCase();

        let score = 0;
        if (sym === normalized || (aliasedTarget && sym === aliasedTarget)) score = 120;
        else if (sym.startsWith(normalized)) score = 95;
        else if (sym.includes(normalized)) score = 70;
        else if (name.startsWith(normalized)) score = 60;
        else if (name.includes(normalized)) score = 50;
        else if (sector.includes(normalized)) score = 25;

        if (score > 0) {
          for (const ex of exchanges) {
            addCandidate({
              symbol: entry.symbol,
              exchange: ex,
              name: entry.name,
              sector: entry.sector,
              score: score + (ex === 'NSE' ? 1 : 0),
              isCatalogOrYahoo: true,
            });
          }
        }
      }

      if (normalized.length >= 2) {
        const yahooHits = await this.fetchYahooSearch(query);
        for (const hit of yahooHits) {
          if (hit.quoteType && hit.quoteType !== 'EQUITY' && hit.quoteType !== 'ETF') continue;
          const rawSym = hit.symbol?.toUpperCase() ?? '';
          const isNSE = rawSym.endsWith('.NS');
          const isBSE = rawSym.endsWith('.BO');
          if (!isNSE && !isBSE) continue;

          const ex: Exchange = isNSE ? 'NSE' : 'BSE';
          if (exchangeFilter !== 'ALL' && ex !== exchangeFilter) continue;

          const baseSymbol = rawSym.slice(0, -3);
          if (!YAHOO_TICKER_SYMBOL.test(baseSymbol)) continue;

          const hitName = (hit.longname || hit.shortname || '').trim().slice(0, 120);
          if (!hitName) continue;
          const hitSector = (hit.industry || hit.sectorDisp || hit.sector || 'Listed Equity').slice(0, 60);
          let score = 55;
          if (baseSymbol === normalized) score = 115;
          else if (baseSymbol.startsWith(normalized)) score = 90;
          else if (hitName.toUpperCase().includes(normalized)) score = 65;

          addCandidate({
            symbol: baseSymbol,
            exchange: ex,
            name: hitName,
            sector: hitSector,
            score: score + (ex === 'NSE' ? 1 : 0),
            isCatalogOrYahoo: true,
          });
        }
      }

      // If not found in catalog or search results, only probe Yahoo Finance directly for exact valid ticker syntax;
      // never fabricate a synthetic stock or price for unlisted names/strings.
      const hasExact = Array.from(candidates.values()).some((c) => c.symbol === normalized);
      if (!hasExact && VALID_CUSTOM_TICKER.test(normalized)) {
        for (const ex of exchanges) {
          addCandidate({
            symbol: normalized,
            exchange: ex,
            name: '',
            sector: 'Listed Equity',
            score: 85 + (ex === 'NSE' ? 1 : 0),
            isCatalogOrYahoo: false,
          });
        }
      }
    } else {
      for (const entry of INDIAN_STOCKS_CATALOG.slice(0, 10)) {
        for (const ex of exchanges) {
          addCandidate({
            symbol: entry.symbol,
            exchange: ex,
            name: entry.name,
            sector: entry.sector,
            score: ex === 'NSE' ? 11 : 10,
            isCatalogOrYahoo: true,
          });
        }
      }
    }

    const topCandidates = Array.from(candidates.values())
      .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
      .slice(0, 16);

    const quotes = await Promise.all(
      topCandidates.map(async (c): Promise<StockSearchResult | null> => {
        const live = await this.fetchLiveStockQuote(
          c.symbol,
          c.exchange,
          false,
          c.name ? { name: c.name, sector: c.sector } : undefined,
        );
        if (live) {
          return {
            symbol: live.symbol,
            name: live.name,
            exchange: live.exchange,
            sector: live.sector,
            currentPrice: live.currentPrice,
            dailyChangePct: live.dailyChangePct,
          };
        }

        // Only fall back to catalog sample data if this is a verified NSE/BSE catalog stock
        const catalogEntry = INDIAN_STOCKS_CATALOG.find((entry) => entry.symbol === c.symbol);
        if (!catalogEntry) {
          return null;
        }

        const sample = buildSampleQuote(catalogEntry, c.exchange, false);
        return {
          symbol: sample.symbol,
          name: c.name || sample.name,
          exchange: sample.exchange,
          sector: c.sector || sample.sector,
          currentPrice: sample.currentPrice,
          dailyChangePct: sample.dailyChangePct,
        };
      }),
    );

    return quotes.filter((q): q is StockSearchResult => q !== null);
  }

  async getQuotes(
    keys: { symbol: string; exchange: Exchange }[],
    liveRefresh = false,
  ): Promise<StockQuote[]> {
    const resolvedQuotes = await Promise.all(
      keys.map(async ({ symbol, exchange }) => {
        const upperSym = symbol.trim().toUpperCase();
        if (!upperSym) return null;

        const catalogEntry = INDIAN_STOCKS_CATALOG.find((c) => c.symbol === upperSym);
        const live = await this.fetchLiveStockQuote(upperSym, exchange, liveRefresh, catalogEntry);
        if (live) {
          return live;
        }

        if (catalogEntry) {
          return buildSampleQuote(catalogEntry, exchange, liveRefresh);
        }
        return null;
      }),
    );

    return resolvedQuotes.filter((q): q is StockQuote => q !== null);
  }
}

export const marketDataProvider: MarketDataProvider = new LiveIndianMarketProvider();
