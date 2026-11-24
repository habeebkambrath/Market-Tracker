import type { Exchange } from '../types/market.ts';

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatIndexNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignedPoints(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function sanitizeIdSegment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
}

export function makeWatchlistDocId(exchange: Exchange, symbol: string): string {
  return `${exchange}_${sanitizeIdSegment(symbol)}`;
}

export function makePerformanceLogDocId(date: string, exchange: Exchange, symbol: string): string {
  return `${sanitizeIdSegment(date)}_${exchange}_${sanitizeIdSegment(symbol)}`;
}

export function makePriceAlertDocId(
  exchange: Exchange,
  symbol: string,
  condition: 'above' | 'below',
): string {
  return `${exchange}_${sanitizeIdSegment(symbol)}_${condition}`;
}

export function getTodayISODate(): string {
  // IST (Asia/Kolkata) calendar date for Indian stock market sessions
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}
