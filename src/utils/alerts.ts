import type { PriceAlert, StockQuote } from '../types/market.ts';
import { formatINR, makeWatchlistDocId } from './formatters.ts';

export interface TriggeredAlertHit {
  alert: PriceAlert;
  currentPrice: number;
}

export function isAlertConditionMet(alert: PriceAlert, currentPrice: number): boolean {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return false;
  if (alert.condition === 'above') {
    return currentPrice >= alert.targetPrice;
  }
  return currentPrice <= alert.targetPrice;
}

export function evaluatePriceAlerts(
  alerts: PriceAlert[],
  quotesById: Record<string, StockQuote>,
): TriggeredAlertHit[] {
  const hits: TriggeredAlertHit[] = [];

  for (const alert of alerts) {
    if (alert.status !== 'active') continue;
    const quoteKey = makeWatchlistDocId(alert.exchange, alert.symbol);
    const quote = quotesById[quoteKey];
    if (!quote) continue;

    if (isAlertConditionMet(alert, quote.currentPrice)) {
      hits.push({
        alert,
        currentPrice: quote.currentPrice,
      });
    }
  }

  return hits;
}

export function formatAlertLabel(alert: PriceAlert): string {
  const symbol = alert.condition === 'above' ? '≥' : '≤';
  return `${symbol} ${formatINR(alert.targetPrice)}`;
}
