import type { WatchlistItem } from '../types/market.ts';

export function filterWatchlistItems(
  items: WatchlistItem[],
  query: string,
): WatchlistItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) => {
    const symbol = item.symbol.toLowerCase();
    const name = item.name.toLowerCase();
    const exchange = item.exchange.toLowerCase();
    const sector = item.sector.toLowerCase();

    return (
      symbol.includes(normalized) ||
      name.includes(normalized) ||
      exchange.includes(normalized) ||
      sector.includes(normalized)
    );
  });
}
