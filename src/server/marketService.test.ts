import test from 'node:test';
import assert from 'node:assert/strict';
import { INDIAN_STOCKS_CATALOG } from './indianStocksCatalog.ts';
import {
  marketDataProvider,
  parseYahooChartToMarketIndex,
  parseYahooChartToStockQuote,
} from './marketService.ts';
import { makeWatchlistDocId } from '../utils/formatters.ts';

const BLUEPRINT_SYMBOL_REGEX = /^[A-Z0-9.\-&]+$/;
const FIRESTORE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

test('catalog has 100+ Indian equities including GAIL and COCHINSHIP and passes Firestore schema limits', () => {
  assert.ok(INDIAN_STOCKS_CATALOG.length >= 100, `Expected >=100 stocks, got ${INDIAN_STOCKS_CATALOG.length}`);

  const seenSymbols = new Set<string>();
  for (const stock of INDIAN_STOCKS_CATALOG) {
    assert.ok(!seenSymbols.has(stock.symbol), `Duplicate symbol in catalog: ${stock.symbol}`);
    seenSymbols.add(stock.symbol);

    assert.ok(stock.symbol.length >= 1 && stock.symbol.length <= 24, `Invalid symbol length: ${stock.symbol}`);
    assert.match(stock.symbol, BLUEPRINT_SYMBOL_REGEX, `Symbol violates blueprint regex: ${stock.symbol}`);
    assert.ok(stock.name.length >= 1 && stock.name.length <= 120, `Invalid name length: ${stock.name}`);
    assert.ok(stock.sector.length >= 1 && stock.sector.length <= 60, `Invalid sector length: ${stock.sector}`);
    assert.ok(stock.basePrice > 0 && stock.basePrice <= 10000000, `Invalid basePrice for ${stock.symbol}`);

    const nseDocId = makeWatchlistDocId('NSE', stock.symbol);
    assert.match(nseDocId, FIRESTORE_ID_REGEX, `Invalid Firestore docId: ${nseDocId}`);
  }
});

test('parseYahooChartToMarketIndex parses live NIFTY 50 value and daily change accurately', () => {
  const samplePayload = {
    chart: {
      result: [
        {
          meta: {
            symbol: '^NSEI',
            regularMarketPrice: 25349.65,
            regularMarketDayHigh: 25820.1,
            regularMarketDayLow: 25310.4,
            regularMarketTime: 1795429649,
            chartPreviousClose: 22600,
          },
          timestamp: [1795257000, 1795343400, 1795429649],
          indicators: {
            quote: [
              {
                close: [25514.3, 25800.6, 25349.65],
              },
            ],
          },
        },
      ],
    },
  };

  const parsed = parseYahooChartToMarketIndex(samplePayload, 'NIFTY_50', 'NIFTY 50', 'NSE:NIFTY50');
  assert.ok(parsed);
  assert.equal(parsed.value, 25349.65);
  assert.equal(parsed.prevClose, 25800.6);
  assert.equal(parsed.change, -450.95);
  assert.equal(parsed.changePercent, -1.75);
  assert.equal(parsed.dayHigh, 25820.1);
  assert.equal(parsed.dayLow, 25310.4);
});

test('parseYahooChartToStockQuote parses COCHINSHIP.BO at 1092.70 with technical indicators', () => {
  const closes = [
    1180, 1175, 1170, 1168, 1162, 1158, 1155, 1150, 1148, 1145,
    1142, 1140, 1138, 1136, 1134, 1132, 1130, 1128, 1125, 1092.7,
  ];
  const baseTs = 1793697000;
  const timestamps = closes.map((_, i) => baseTs + i * 86400);

  const samplePayload = {
    chart: {
      result: [
        {
          meta: {
            symbol: 'COCHINSHIP.BO',
            regularMarketPrice: 1092.7,
            regularMarketDayHigh: 1138.75,
            regularMarketDayLow: 1088,
            regularMarketVolume: 148966,
            regularMarketTime: timestamps[timestamps.length - 1],
            shortName: 'Cochin Shipyard Limited',
          },
          timestamp: timestamps,
          indicators: {
            quote: [{ close: closes }],
          },
        },
      ],
    },
  };

  const quote = parseYahooChartToStockQuote(samplePayload, 'COCHINSHIP', 'BSE');
  assert.ok(quote);
  assert.equal(quote.symbol, 'COCHINSHIP');
  assert.equal(quote.exchange, 'BSE');
  assert.equal(quote.name, 'Cochin Shipyard Ltd.');
  assert.equal(quote.currentPrice, 1092.7);
  assert.equal(quote.prevClose, 1125);
  assert.equal(quote.dailyChange, -32.3);
  assert.equal(quote.dailyChangePct, -2.87);
  assert.ok(quote.sma5 > 0 && quote.sma20 > 0);
  assert.ok(quote.rsi14 >= 0 && quote.rsi14 <= 100);
  assert.ok(['Buy', 'Sell', 'Hold'].includes(quote.signal));
  assert.equal(quote.historicalCloses.length, 20);
});

test('searching GAIL and COCHINSHIP returns NSE and BSE entries', async () => {
  const gailResults = await marketDataProvider.searchStocks('GAIL', 'ALL');
  const gailEntries = gailResults.filter((r) => r.symbol === 'GAIL');
  assert.equal(gailEntries.length, 2);
  assert.deepEqual(
    gailEntries.map((r) => r.exchange).sort(),
    ['BSE', 'NSE'],
  );

  const cochinResults = await marketDataProvider.searchStocks('COCHINSHIP', 'ALL');
  const cochinEntries = cochinResults.filter((r) => r.symbol === 'COCHINSHIP');
  assert.equal(cochinEntries.length, 2);
  assert.ok(cochinEntries.every((c) => c.currentPrice > 0));
});

test('searching popular NSE/BSE shares and company names works accurately', async () => {
  for (const sym of ['ONGC', 'HAL', 'ETERNAL', 'DMART', 'TMCV', 'M&M']) {
    const res = await marketDataProvider.searchStocks(sym, 'NSE');
    assert.ok(
      res.some((r) => r.symbol === sym && r.exchange === 'NSE'),
      `Expected ${sym} (NSE) in search results`,
    );
  }

  const gasMatches = await marketDataProvider.searchStocks('Gas', 'NSE');
  assert.ok(gasMatches.some((r) => r.symbol === 'GAIL'), 'Searching "Gas" should include GAIL');

  const aeroMatches = await marketDataProvider.searchStocks('Aeronautics', 'NSE');
  assert.ok(aeroMatches.some((r) => r.symbol === 'HAL'), 'Searching "Aeronautics" should include HAL');
});

test('real listed NSE/BSE ticker outside local catalog resolves while unlisted names return empty', async () => {
  const searchResults = await marketDataProvider.searchStocks('KPRMILL', 'ALL');
  const kprEntries = searchResults.filter((r) => r.symbol === 'KPRMILL');
  assert.equal(kprEntries.length, 2);

  const unlistedNameResults = await marketDataProvider.searchStocks('HABEEB', 'ALL');
  assert.equal(unlistedNameResults.length, 0);

  const unlistedRandomResults = await marketDataProvider.searchStocks('NOTLISTED99', 'ALL');
  assert.equal(unlistedRandomResults.length, 0);

  const quotes = await marketDataProvider.getQuotes(
    [
      { symbol: 'GAIL', exchange: 'NSE' },
      { symbol: 'COCHINSHIP', exchange: 'BSE' },
      { symbol: 'KPRMILL', exchange: 'NSE' },
      { symbol: 'HABEEB', exchange: 'NSE' },
    ],
    false,
  );

  assert.equal(quotes.length, 3);
  for (const quote of quotes) {
    assert.ok(quote.currentPrice > 0);
    assert.ok(quote.sma5 > 0);
    assert.ok(quote.sma20 > 0);
    assert.ok(quote.rsi14 >= 0 && quote.rsi14 <= 100);
    assert.ok(['Buy', 'Sell', 'Hold'].includes(quote.signal));
    assert.ok(quote.reason.length > 0);
    assert.ok(
      ['Good for Long Term', 'Mixed Long-Term', 'Weak for Long Term'].includes(
        quote.longTermVerdict,
      ),
    );
    assert.ok(quote.longTermReason.length > 0);
    assert.ok(quote.historicalCloses.length >= 1);
  }
});
