export type Exchange = 'NSE' | 'BSE';

export type SignalType = 'Buy' | 'Sell' | 'Hold';

export type LongTermVerdict = 'Good for Long Term' | 'Mixed Long-Term' | 'Weak for Long Term';

export interface MarketIndex {
  id: string;
  name: string;
  symbol: string;
  value: number;
  prevClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  updatedAt: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: Exchange;
  sector: string;
  currentPrice: number;
  dailyChangePct: number;
}

export interface HistoricalClosePoint {
  date: string;
  close: number;
  changePct: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: Exchange;
  sector: string;
  currentPrice: number;
  prevClose: number;
  dailyChange: number;
  dailyChangePct: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  sma5: number;
  sma20: number;
  sma50: number;
  sma200: number;
  oneYearReturnPct: number;
  rsi14: number;
  signal: SignalType;
  reason: string;
  longTermVerdict: LongTermVerdict;
  longTermReason: string;
  historicalCloses: HistoricalClosePoint[];
}

export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  exchange: Exchange;
  sector: string;
  addedAt?: unknown;
}

export interface PerformanceLogEntry {
  id: string;
  userId: string;
  date: string;
  symbol: string;
  exchange: Exchange;
  closingPrice: number;
  dailyChangePct: number;
  signal: SignalType;
  reason: string;
  source: 'auto' | 'import';
}

export type AlertCondition = 'above' | 'below';

export type AlertStatus = 'active' | 'triggered';

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  exchange: Exchange;
  condition: AlertCondition;
  targetPrice: number;
  status: AlertStatus;
  triggeredPrice: number;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  tone: 'alert-hit' | 'info';
  symbol?: string;
  exchange?: Exchange;
}

export type NewsCategory =
  | 'Agreement & Deal'
  | 'Project & Order'
  | 'Earnings & Results'
  | 'Market Update';

export interface StockNewsItem {
  id: string;
  symbol: string;
  exchange: Exchange;
  companyName: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  category: NewsCategory;
}
