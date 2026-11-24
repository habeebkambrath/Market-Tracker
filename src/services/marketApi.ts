import type {
  Exchange,
  MarketIndex,
  StockNewsItem,
  StockQuote,
  StockSearchResult,
} from '../types/market.ts';

export async function fetchMarketIndices(live = false): Promise<MarketIndex[]> {
  const url = live ? '/api/market/indices?live=1' : '/api/market/indices';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to load market indices');
  }
  const data = (await res.json()) as { indices: MarketIndex[] };
  return data.indices;
}

export async function searchIndianStocks(
  query: string,
  exchange: Exchange | 'ALL' = 'ALL',
): Promise<StockSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    exchange,
  });
  const res = await fetch(`/api/stocks/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to search Indian stocks');
  }
  const data = (await res.json()) as { results: StockSearchResult[] };
  return data.results;
}

export async function fetchStockQuotes(
  items: { symbol: string; exchange: Exchange }[],
  live = false,
): Promise<StockQuote[]> {
  if (items.length === 0) return [];
  const symbolsParam = items.map((i) => `${i.exchange}:${i.symbol}`).join(',');
  const params = new URLSearchParams({ symbols: symbolsParam });
  if (live) params.set('live', '1');
  const res = await fetch(`/api/stocks/quotes?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load stock quotes');
  }
  const data = (await res.json()) as { quotes: StockQuote[] };
  return data.quotes;
}

export async function fetchWatchlistNews(
  items: { symbol: string; exchange: Exchange }[],
  live = false,
): Promise<StockNewsItem[]> {
  if (items.length === 0) return [];
  const symbolsParam = items.map((i) => `${i.exchange}:${i.symbol}`).join(',');
  const params = new URLSearchParams({ symbols: symbolsParam });
  if (live) params.set('live', '1');
  const res = await fetch(`/api/stocks/news?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load watchlist stock news');
  }
  const data = (await res.json()) as { news: StockNewsItem[] };
  return data.news;
}
