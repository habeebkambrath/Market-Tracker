import { createHash } from 'node:crypto';
import type {
  Exchange,
  NewsCategory,
  StockNewsItem,
} from '../types/market.ts';
import { INDIAN_STOCKS_CATALOG } from './indianStocksCatalog.ts';

const NEWS_CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

interface NewsCacheEntry {
  items: StockNewsItem[];
  expiresAt: number;
}

const newsCache = new Map<string, NewsCacheEntry>();

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .trim();
}

export function cleanCompanyQueryName(name: string, symbol: string): string {
  const cleaned = name
    .replace(/\((formerly[^)]*|India|Zomato|Paytm|Nykaa|Policybazaar|IndiGo|DMart|Eternal)\)/gi, '')
    .replace(/\b(Limited|Ltd|Corporation|Corp|Company|Co)\.?(?=\s|$|,|\))/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,]+$/g, '')
    .trim();
  return cleaned.length >= 3 ? cleaned : symbol;
}

export function categorizeNewsHeadline(title: string): NewsCategory {
  if (
    /\b(agreement|agreements|mou|memorandum|deal|deals|contract|contracts|pact|tie-up|partnership|partners|joint venture|jv|collaborat\w*|sign|signed|signs|acquir\w*|acquisition|strategic alliance)\b/i.test(
      title,
    )
  ) {
    return 'Agreement & Deal';
  }
  if (
    /\b(project|projects|order|orders|bagged|bags|awarded|wins|won|commissioning|commissioned|plant|expansion|capacity|facility|tender|loa|loi|work order)\b/i.test(
      title,
    )
  ) {
    return 'Project & Order';
  }
  if (
    /\b(q[1-4]|fy\d{2}|quarter|quarterly|profit|revenue|dividend|earnings|results|margin|ebitda|guidance)\b/i.test(
      title,
    )
  ) {
    return 'Earnings & Results';
  }
  return 'Market Update';
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function parseGoogleNewsRss(
  xml: string,
  meta: { symbol: string; exchange: Exchange; companyName: string },
  limit = 6,
): StockNewsItem[] {
  const items: StockNewsItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    if (items.length >= limit) break;
    const block = match[1];

    const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const rawLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '';
    const rawPubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
    const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? '';

    const source = decodeXmlEntities(rawSource) || 'Market Wire';
    let title = decodeXmlEntities(rawTitle);
    const link = decodeXmlEntities(rawLink);

    if (!title || !link || !isSafeHttpUrl(link)) continue;

    // Google News appends " - Publisher" to titles; strip duplicate trailing source for cleaner UI
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(` - ${source}`).length).trim();
    } else {
      const lastDash = title.lastIndexOf(' - ');
      if (lastDash > 24 && title.length - lastDash < 40) {
        title = title.slice(0, lastDash).trim();
      }
    }

    const parsedTime = rawPubDate ? Date.parse(decodeXmlEntities(rawPubDate)) : NaN;
    const publishedAt = Number.isFinite(parsedTime)
      ? new Date(parsedTime).toISOString()
      : new Date().toISOString();

    const linkHash = createHash('sha1').update(link).digest('hex').slice(0, 16);

    items.push({
      id: `${meta.exchange}_${meta.symbol}_${linkHash}`,
      symbol: meta.symbol,
      exchange: meta.exchange,
      companyName: meta.companyName,
      title,
      source: source.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      publishedAt,
      url: link,
      category: categorizeNewsHeadline(title),
    });
  }

  return items;
}

async function fetchNewsForSingleStock(
  stock: { symbol: string; exchange: Exchange; name?: string },
  bypassCache: boolean,
): Promise<StockNewsItem[]> {
  const cleanSymbol = stock.symbol.trim().toUpperCase();
  const catalogHit = INDIAN_STOCKS_CATALOG.find((c) => c.symbol === cleanSymbol);
  const companyName = stock.name || catalogHit?.name || cleanSymbol;
  const cacheKey = `${stock.exchange}:${cleanSymbol}`;

  const now = Date.now();
  if (!bypassCache) {
    const cached = newsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.items;
    }
  }

  const queryTerm = cleanCompanyQueryName(companyName, cleanSymbol);
  const searchExpr =
    queryTerm.toUpperCase() === cleanSymbol
      ? `"${cleanSymbol}" (NSE OR BSE OR India) (agreement OR project OR order OR contract OR stock)`
      : `("${queryTerm}" OR "${cleanSymbol} NSE" OR "${cleanSymbol} BSE") (agreement OR project OR order OR contract OR stock OR shares)`;

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchExpr)}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return [];
    }
    const xml = await response.text();
    const parsed = parseGoogleNewsRss(
      xml,
      { symbol: cleanSymbol, exchange: stock.exchange, companyName },
      6,
    );
    newsCache.set(cacheKey, {
      items: parsed,
      expiresAt: now + NEWS_CACHE_TTL_MS,
    });
    return parsed;
  } catch {
    return [];
  }
}

export async function fetchWatchlistStockNews(
  stocks: { symbol: string; exchange: Exchange; name?: string }[],
  bypassCache = false,
): Promise<StockNewsItem[]> {
  if (stocks.length === 0) return [];

  // Deduplicate by symbol if user holds both NSE & BSE for same company, while preserving first exchange label
  const uniqueBySymbol = new Map<string, { symbol: string; exchange: Exchange; name?: string }>();
  for (const s of stocks.slice(0, 20)) {
    const sym = s.symbol.trim().toUpperCase();
    if (!sym || uniqueBySymbol.has(sym)) continue;
    uniqueBySymbol.set(sym, { symbol: sym, exchange: s.exchange, name: s.name });
  }

  const settled = await Promise.allSettled(
    Array.from(uniqueBySymbol.values())
      .slice(0, 12)
      .map((s) => fetchNewsForSingleStock(s, bypassCache)),
  );

  const seenUrls = new Set<string>();
  const allItems: StockNewsItem[] = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      allItems.push(item);
    }
  }

  return allItems.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
