import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const config = {
  info:    { cls: 'bg-slate-900 text-white', Icon: Info },
  success: { cls: 'bg-emerald-600 text-white', Icon: CheckCircle2 },
  error:   { cls: 'bg-red-600 text-white', Icon: AlertCircle },
  warning: { cls: 'bg-amber-500 text-white', Icon: AlertTriangle },
};

export default function Toast({ message, type = 'info', onClear, duration = 2800 }) {
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => onClear && onClear(), duration);
    return () => clearTimeout(id);
  }, [message, duration, onClear]);

  if (!message) return null;

  const { cls, Icon } = config[type] || config.info;

  return (
    <div className="fixed top-4 right-4 z-50 toast-enter">
      <div className={`flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl shadow-xl text-sm font-medium ${cls}`}>
        <Icon size={18} className="shrink-0 opacity-90" />
        <span>{message}</span>
        <button
          type="button"
          onClick={onClear}
          className="ml-1 p-1 rounded-lg hover:bg-white/15 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
