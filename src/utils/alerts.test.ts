import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePriceAlerts, formatAlertLabel, isAlertConditionMet } from './alerts.ts';
import type { PriceAlert, StockQuote } from '../types/market.ts';

function makeQuote(symbol: string, exchange: 'NSE' | 'BSE', currentPrice: number): StockQuote {
  return {
    symbol,
    name: symbol,
    exchange,
    sector: 'Equity',
    currentPrice,
    prevClose: currentPrice,
    dailyChange: 0,
    dailyChangePct: 0,
    dayHigh: currentPrice,
    dayLow: currentPrice,
    volume: 1000,
    sma5: currentPrice,
    sma20: currentPrice,
    sma50: currentPrice,
    sma200: currentPrice,
    oneYearReturnPct: 0,
    rsi14: 50,
    signal: 'Hold',
    reason: 'Neutral',
    longTermVerdict: 'Mixed Long-Term',
    longTermReason: 'Near 200D SMA',
    historicalCloses: [],
  };
}

test('isAlertConditionMet evaluates above and below thresholds accurately', () => {
  const aboveAlert: PriceAlert = {
    id: 'NSE_RELIANCE_above',
    userId: 'u1',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    condition: 'above',
    targetPrice: 1300,
    status: 'active',
    triggeredPrice: 0,
  };
  assert.equal(isAlertConditionMet(aboveAlert, 1299.99), false);
  assert.equal(isAlertConditionMet(aboveAlert, 1300), true);
  assert.equal(isAlertConditionMet(aboveAlert, 1325.5), true);

  const belowAlert: PriceAlert = {
    ...aboveAlert,
    id: 'NSE_RELIANCE_below',
    condition: 'below',
    targetPrice: 1250,
  };
  assert.equal(isAlertConditionMet(belowAlert, 1250.01), false);
  assert.equal(isAlertConditionMet(belowAlert, 1250), true);
  assert.equal(isAlertConditionMet(belowAlert, 1210), true);
});

test('evaluatePriceAlerts triggers only active matching alerts', () => {
  const quotesById: Record<string, StockQuote> = {
    NSE_RELIANCE: makeQuote('RELIANCE', 'NSE', 1280),
    NSE_TCS: makeQuote('TCS', 'NSE', 4100),
    BSE_INFY: makeQuote('INFY', 'BSE', 1920),
  };

  const alerts: PriceAlert[] = [
    {
      id: 'NSE_RELIANCE_above',
      userId: 'u1',
      symbol: 'RELIANCE',
      exchange: 'NSE',
      condition: 'above',
      targetPrice: 1275,
      status: 'active',
      triggeredPrice: 0,
    },
    {
      id: 'NSE_TCS_below',
      userId: 'u1',
      symbol: 'TCS',
      exchange: 'NSE',
      condition: 'below',
      targetPrice: 4000,
      status: 'active',
      triggeredPrice: 0,
    },
    {
      id: 'BSE_INFY_above',
      userId: 'u1',
      symbol: 'INFY',
      exchange: 'BSE',
      condition: 'above',
      targetPrice: 1900,
      status: 'triggered',
      triggeredPrice: 1915,
    },
  ];

  const hits = evaluatePriceAlerts(alerts, quotesById);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].alert.id, 'NSE_RELIANCE_above');
  assert.equal(hits[0].currentPrice, 1280);
});

test('formatAlertLabel formats target condition with INR symbol', () => {
  const label = formatAlertLabel({
    id: 'NSE_SBIN_below',
    userId: 'u1',
    symbol: 'SBIN',
    exchange: 'NSE',
    condition: 'below',
    targetPrice: 800,
    status: 'active',
    triggeredPrice: 0,
  });
  assert.match(label, /≤/);
  assert.match(label, /800\.00/);
});
