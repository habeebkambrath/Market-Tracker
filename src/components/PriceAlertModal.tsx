import { useEffect, useState } from 'react';
import { Bell, Trash2, X } from 'lucide-react';
import type { AlertCondition, Exchange, PriceAlert } from '../types/market.ts';
import { formatAlertLabel } from '../utils/alerts.ts';
import { formatINR } from '../utils/formatters.ts';

interface PriceAlertModalProps {
  stock: {
    symbol: string;
    name: string;
    exchange: Exchange;
    currentPrice?: number;
  } | null;
  existingAlerts: PriceAlert[];
  onClose: () => void;
  onSaveAlert: (
    symbol: string,
    exchange: Exchange,
    condition: AlertCondition,
    targetPrice: number,
  ) => Promise<void>;
  onDeleteAlert: (alertId: string) => Promise<void>;
}

export function PriceAlertModal({
  stock,
  existingAlerts,
  onClose,
  onSaveAlert,
  onDeleteAlert,
}: PriceAlertModalProps) {
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [priceInput, setPriceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (stock) {
      const base = stock.currentPrice ?? 1000;
      const defaultTarget =
        condition === 'above'
          ? (base * 1.02).toFixed(2)
          : (base * 0.98).toFixed(2);
      setPriceInput(defaultTarget);
      setFormError(null);
    }
    // Reset suggested default only when the selected stock or condition changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock?.symbol, stock?.exchange, condition]);

  useEffect(() => {
    if (!stock) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [stock, onClose]);

  if (!stock) return null;

  const stockAlerts = existingAlerts.filter(
    (a) => a.symbol === stock.symbol && a.exchange === stock.exchange,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = Number(priceInput);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10000000) {
      setFormError('Enter a valid target price between ₹0.01 and ₹1,00,00,000.');
      return;
    }

    setSaving(true);
    try {
      await onSaveAlert(stock.symbol, stock.exchange, condition, Number(parsed.toFixed(2)));
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save price alert.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-alert-modal-title"
        className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bell className="w-4 h-4 text-slate-700 shrink-0" aria-hidden="true" />
            <h3
              id="price-alert-modal-title"
              className="font-display text-base font-semibold text-slate-900 truncate"
            >
              Price Alert · {stock.symbol} ({stock.exchange})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close price alert modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {typeof stock.currentPrice === 'number' && (
            <div className="flex items-center justify-between text-xs bg-[#F8FAFC] border border-slate-200 rounded-lg px-3.5 py-2.5">
              <span className="text-slate-500">{stock.name}</span>
              <span className="font-mono-num font-semibold text-slate-900">
                LTP {formatINR(stock.currentPrice)}
              </span>
            </div>
          )}

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Trigger Condition
            </span>
            <div
              role="group"
              aria-label="Alert trigger condition"
              className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg"
            >
              <button
                type="button"
                onClick={() => setCondition('above')}
                className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  condition === 'above'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Above or equal (≥)
              </button>
              <button
                type="button"
                onClick={() => setCondition('below')}
                className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  condition === 'below'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Below or equal (≤)
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="alert-target-price-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Target Price (₹)
            </label>
            <input
              id="alert-target-price-input"
              type="number"
              step="0.01"
              min="0.01"
              max="10000000"
              required
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="e.g. 1300.00"
              className="w-full px-3.5 py-2.5 font-mono-num text-sm text-slate-900 bg-[#F8FAFC] border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
            {typeof stock.currentPrice === 'number' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[
                  { label: '-5%', factor: 0.95 },
                  { label: '-2%', factor: 0.98 },
                  { label: '+2%', factor: 1.02 },
                  { label: '+5%', factor: 1.05 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const nextCondition: AlertCondition =
                        preset.factor >= 1 ? 'above' : 'below';
                      setCondition(nextCondition);
                      setPriceInput((stock.currentPrice! * preset.factor).toFixed(2));
                    }}
                    className="px-2.5 py-1 text-xs font-mono-num text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {formError && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          {stockAlerts.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Configured Alerts for {stock.symbol}
              </div>
              <ul className="divide-y divide-slate-100">
                {stockAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num font-semibold text-slate-900">
                        {formatAlertLabel(alert)}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span
                        className={
                          alert.status === 'triggered'
                            ? 'text-emerald-700 font-medium'
                            : 'text-slate-500'
                        }
                      >
                        {alert.status === 'triggered'
                          ? `Triggered at ${formatINR(alert.triggeredPrice)}`
                          : 'Active'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteAlert(alert.id)}
                      aria-label={`Delete ${formatAlertLabel(alert)} alert for ${alert.symbol}`}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
