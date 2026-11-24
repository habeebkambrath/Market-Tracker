import { BellRing, X } from 'lucide-react';
import type { ToastNotification } from '../types/market.ts';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Price alert notifications"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          data-testid={`toast-${toast.id}`}
          className="pointer-events-auto bg-slate-900 text-white border border-slate-700 rounded-xl shadow-xl p-4 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
              <BellRing className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xs font-semibold text-white">
                {toast.title}
              </p>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label={`Dismiss notification: ${toast.title}`}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
