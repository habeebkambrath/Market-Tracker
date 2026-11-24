import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react';
import type { LongTermVerdict, SignalType } from '../types/market.ts';

interface SignalBadgeProps {
  signal: SignalType;
  reason: string;
  sma5?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  oneYearReturnPct?: number;
  rsi14?: number;
  longTermVerdict?: LongTermVerdict;
  longTermReason?: string;
  compact?: boolean;
}

export function SignalBadge({
  signal,
  reason,
  sma5,
  sma20,
  sma50,
  sma200,
  oneYearReturnPct,
  rsi14,
  longTermVerdict,
  longTermReason,
  compact = false,
}: SignalBadgeProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;

  const toneClasses =
    signal === 'Buy'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : signal === 'Sell'
        ? 'bg-red-50 text-red-800 border-red-200'
        : 'bg-amber-50 text-amber-800 border-amber-200';

  const longTermColor =
    longTermVerdict === 'Good for Long Term'
      ? 'text-emerald-700'
      : longTermVerdict === 'Weak for Long Term'
        ? 'text-red-700'
        : 'text-amber-700';

  const Icon =
    signal === 'Buy' ? ArrowUpRight : signal === 'Sell' ? ArrowDownRight : Minus;

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="relative inline-flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border rounded-md whitespace-nowrap ${toneClasses}`}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{signal}</span>
        </span>
        <button
          type="button"
          onClick={() => setPinned((prev) => !prev)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onBlur={() => setPinned(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPinned(false);
              setHovered(false);
            }
          }}
          aria-label={`Signal rationale for ${signal}: ${reason}${longTermVerdict ? `. Long term: ${longTermVerdict}` : ''}`}
          aria-expanded={open}
          className="p-1 text-slate-400 hover:text-slate-700 rounded focus-visible:outline-2 focus-visible:outline-slate-900 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {open && (
          <div
            role="tooltip"
            className="absolute z-30 left-0 top-full mt-1.5 w-72 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-lg"
          >
            <p className="font-semibold text-white mb-1">{signal} Signal Rationale</p>
            <p className="text-slate-200 leading-relaxed">{reason}</p>

            {longTermVerdict && (
              <div className="mt-2 pt-2 border-t border-slate-700">
                <p className="font-semibold text-white mb-0.5">
                  Long-Term Outlook: {longTermVerdict}
                </p>
                {longTermReason && (
                  <p className="text-slate-300 leading-relaxed">{longTermReason}</p>
                )}
              </div>
            )}

            {typeof rsi14 === 'number' && typeof sma5 === 'number' && typeof sma20 === 'number' && (
              <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-3 gap-2 font-mono-num text-[11px] text-slate-300">
                <div>
                  <div className="text-slate-400">RSI (14)</div>
                  <div className="text-white font-medium">{rsi14.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-slate-400">SMA 5</div>
                  <div className="text-white font-medium">₹{sma5.toFixed(0)}</div>
                </div>
                <div>
                  <div className="text-slate-400">SMA 20</div>
                  <div className="text-white font-medium">₹{sma20.toFixed(0)}</div>
                </div>
                {typeof sma50 === 'number' && typeof sma200 === 'number' && (
                  <>
                    <div>
                      <div className="text-slate-400">SMA 50</div>
                      <div className="text-white font-medium">₹{sma50.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">SMA 200</div>
                      <div className="text-white font-medium">₹{sma200.toFixed(0)}</div>
                    </div>
                    {typeof oneYearReturnPct === 'number' && (
                      <div>
                        <div className="text-slate-400">1Y Return</div>
                        <div className="text-white font-medium">
                          {oneYearReturnPct >= 0 ? '+' : ''}
                          {oneYearReturnPct.toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <span className="text-xs text-slate-500 max-w-[260px] leading-snug">
          {reason}
        </span>
      )}

      {!compact && longTermVerdict && (
        <div className="mt-1 pt-1.5 border-t border-slate-100 max-w-[260px] space-y-0.5">
          <div className={`text-xs font-semibold leading-snug ${longTermColor}`}>
            {longTermVerdict}
          </div>
          {longTermReason && (
            <div className="text-[11px] font-mono-num text-slate-500 leading-snug">
              {longTermReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
