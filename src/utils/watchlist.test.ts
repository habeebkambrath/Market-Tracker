import test from 'node:test';
import assert from 'node:assert/strict';
import type { WatchlistItem } from '../types/market.ts';
import { filterWatchlistItems } from './watchlist.ts';

const SAMPLE_ITEMS: WatchlistItem[] = [
  {
    id: 'NSE_RELIANCE',
    userId: 'u1',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Retail',
  },
  {
    id: 'BSE_COCHINSHIP',
    userId: 'u1',
    symbol: 'COCHINSHIP',
    name: 'Cochin Shipyard Ltd.',
    exchange: 'BSE',
    sector: 'Defence',
  },
  {
    id: 'NSE_GAIL',
    userId: 'u1',
    symbol: 'GAIL',
    name: 'GAIL (India) Ltd.',
    exchange: 'NSE',
    sector: 'Oil & Gas',
  },
];

test('filterWatchlistItems returns all items when query is empty or whitespace', () => {
  assert.equal(filterWatchlistItems(SAMPLE_ITEMS, '').length, 3);
  assert.equal(filterWatchlistItems(SAMPLE_ITEMS, '   ').length, 3);
});

test('filterWatchlistItems matches by ticker symbol, share name, exchange, and sector case-insensitively', () => {
  assert.deepEqual(
    filterWatchlistItems(SAMPLE_ITEMS, 'gail').map((i) => i.symbol),
    ['GAIL'],
  );
  assert.deepEqual(
    filterWatchlistItems(SAMPLE_ITEMS, 'shipyard').map((i) => i.symbol),
    ['COCHINSHIP'],
  );
  assert.deepEqual(
    filterWatchlistItems(SAMPLE_ITEMS, 'bse').map((i) => i.symbol),
    ['COCHINSHIP'],
  );
  assert.deepEqual(
    filterWatchlistItems(SAMPLE_ITEMS, 'oil').map((i) => i.symbol),
    ['GAIL'],
  );
  assert.equal(filterWatchlistItems(SAMPLE_ITEMS, 'NONEXISTENT').length, 0);
});
