import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSMA,
  calculateRSI,
  computeLongTermOutlook,
  computeTechnicalSignal,
} from './indicators.ts';

test('calculateSMA computes moving average over trailing period', () => {
  assert.equal(calculateSMA([100, 110, 120, 130, 140], 5), 120);
  assert.equal(calculateSMA([100, 110, 120, 130, 140], 3), 130);
  assert.equal(calculateSMA([], 5), 0);
});

test('calculateRSI returns low RSI for strong downtrend and high RSI for strong uptrend', () => {
  const downtrend = [300, 295, 290, 286, 280, 275, 271, 266, 261, 255, 250, 245, 240, 236, 230];
  const rsiLow = calculateRSI(downtrend, 14);
  assert.ok(rsiLow < 30, `Expected oversold RSI < 30, got ${rsiLow}`);

  const uptrend = [200, 205, 211, 218, 224, 230, 236, 243, 250, 257, 265, 272, 280, 289, 298];
  const rsiHigh = calculateRSI(uptrend, 14);
  assert.ok(rsiHigh > 70, `Expected overbought RSI > 70, got ${rsiHigh}`);
});

test('computeTechnicalSignal produces Buy, Sell, and Hold with clear reasons', () => {
  const oversold = [500, 492, 484, 476, 469, 461, 453, 446, 439, 431, 424, 417, 410, 404, 396];
  const buyResult = computeTechnicalSignal(oversold);
  assert.equal(buyResult.signal, 'Buy');
  assert.match(buyResult.reason, /RSI oversold/i);

  const overbought = [400, 408, 415, 423, 431, 440, 449, 458, 467, 476, 485, 495, 505, 515, 526];
  const sellResult = computeTechnicalSignal(overbought);
  assert.equal(sellResult.signal, 'Sell');
  assert.match(sellResult.reason, /RSI overbought/i);

  const sideways = [
    1000, 1002, 998, 1001, 999, 1003, 997, 1000, 1002, 998, 1001, 999, 1002, 998, 1000,
    1001, 999, 1000, 1002, 1000,
  ];
  const holdResult = computeTechnicalSignal(sideways);
  assert.equal(holdResult.signal, 'Hold');
  assert.match(holdResult.reason, /Neutral/i);
});

test('computeLongTermOutlook evaluates Good, Weak, and Mixed long-term verdicts from 200D SMA and 1Y return', () => {
  const steadyUptrend = Array.from({ length: 220 }, (_, i) => Number((1000 + i * 2).toFixed(2)));
  const good = computeLongTermOutlook(steadyUptrend);
  assert.equal(good.longTermVerdict, 'Good for Long Term');
  assert.ok(good.oneYearReturnPct > 0);
  assert.ok(good.sma50 > good.sma200);
  assert.match(good.longTermReason, /Above 200D SMA/i);

  const steadyDowntrend = Array.from({ length: 220 }, (_, i) => Number((1500 - i * 2).toFixed(2)));
  const weak = computeLongTermOutlook(steadyDowntrend);
  assert.equal(weak.longTermVerdict, 'Weak for Long Term');
  assert.ok(weak.oneYearReturnPct < 0);
  assert.ok(weak.sma50 < weak.sma200);
  assert.match(weak.longTermReason, /Below 200D SMA/i);

  const flatNearSma = Array.from({ length: 220 }, (_, i) => 1000 + (i % 2 === 0 ? 4 : -4));
  const mixed = computeLongTermOutlook(flatNearSma);
  assert.equal(mixed.longTermVerdict, 'Mixed Long-Term');
  assert.match(mixed.longTermReason, /Near 200D SMA/i);
});
