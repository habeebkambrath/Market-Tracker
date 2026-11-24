import type { LongTermVerdict, SignalType } from '../types/market.ts';

export interface TechnicalAnalysisResult {
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
}

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length === 0 || period <= 0) return 0;
  const slice = prices.slice(-Math.min(period, prices.length));
  const sum = slice.reduce((acc, p) => acc + p, 0);
  return Number((sum / slice.length).toFixed(2));
}

export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < 2) return 50;

  const lookback = Math.min(period, prices.length - 1);
  const startIdx = prices.length - 1 - lookback;

  let gains = 0;
  let losses = 0;

  for (let i = startIdx + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  const avgGain = gains / lookback;
  const avgLoss = losses / lookback;

  if (avgLoss === 0 && avgGain === 0) return 50;
  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(1));
}

export function computeLongTermOutlook(closingPrices: number[]): {
  sma50: number;
  sma200: number;
  oneYearReturnPct: number;
  longTermVerdict: LongTermVerdict;
  longTermReason: string;
} {
  if (closingPrices.length === 0) {
    return {
      sma50: 0,
      sma200: 0,
      oneYearReturnPct: 0,
      longTermVerdict: 'Mixed Long-Term',
      longTermReason: 'Insufficient long-term history to evaluate',
    };
  }

  const currentPrice = closingPrices[closingPrices.length - 1];
  const firstPrice = closingPrices[0];
  const sma50 = calculateSMA(closingPrices, 50);
  const sma200 = calculateSMA(closingPrices, 200);
  const oneYearReturnPct =
    firstPrice > 0 ? Number((((currentPrice - firstPrice) / firstPrice) * 100).toFixed(1)) : 0;

  const returnLabel = `${oneYearReturnPct >= 0 ? '+' : ''}${oneYearReturnPct.toFixed(1)}%`;

  if (currentPrice >= sma200 && sma50 >= sma200 * 0.99 && oneYearReturnPct >= 0) {
    return {
      sma50,
      sma200,
      oneYearReturnPct,
      longTermVerdict: 'Good for Long Term',
      longTermReason: `Above 200D SMA (₹${sma200.toFixed(0)}) · 1Y ${returnLabel}`,
    };
  }

  if (currentPrice < sma200 * 0.98 && sma50 <= sma200) {
    return {
      sma50,
      sma200,
      oneYearReturnPct,
      longTermVerdict: 'Weak for Long Term',
      longTermReason: `Below 200D SMA (₹${sma200.toFixed(0)}) · 1Y ${returnLabel}`,
    };
  }

  return {
    sma50,
    sma200,
    oneYearReturnPct,
    longTermVerdict: 'Mixed Long-Term',
    longTermReason: `Near 200D SMA (₹${sma200.toFixed(0)}) · 1Y ${returnLabel}`,
  };
}

export function computeTechnicalSignal(closingPrices: number[]): TechnicalAnalysisResult {
  const sma5 = calculateSMA(closingPrices, 5);
  const sma20 = calculateSMA(closingPrices, 20);
  const rsi14 = calculateRSI(closingPrices, 14);
  const longTerm = computeLongTermOutlook(closingPrices);

  if (rsi14 <= 35) {
    return {
      sma5,
      sma20,
      rsi14,
      signal: 'Buy',
      reason: `RSI oversold (${rsi14.toFixed(1)}) - Good time to buy`,
      ...longTerm,
    };
  }

  if (rsi14 >= 70) {
    return {
      sma5,
      sma20,
      rsi14,
      signal: 'Sell',
      reason: `RSI overbought (${rsi14.toFixed(1)}) - Consider booking profits`,
      ...longTerm,
    };
  }

  if (sma20 > 0 && sma5 > sma20 * 1.004 && rsi14 < 65) {
    return {
      sma5,
      sma20,
      rsi14,
      signal: 'Buy',
      reason: `Bullish MA crossover (5D ₹${sma5.toFixed(0)} > 20D ₹${sma20.toFixed(0)})`,
      ...longTerm,
    };
  }

  if (sma20 > 0 && sma5 < sma20 * 0.996 && rsi14 > 38) {
    return {
      sma5,
      sma20,
      rsi14,
      signal: 'Sell',
      reason: `Bearish MA crossover (5D ₹${sma5.toFixed(0)} < 20D ₹${sma20.toFixed(0)})`,
      ...longTerm,
    };
  }

  return {
    sma5,
    sma20,
    rsi14,
    signal: 'Hold',
    reason: `Neutral momentum (RSI ${rsi14.toFixed(1)}) - Hold position`,
    ...longTerm,
  };
}
