import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClear, duration = 2500 }) {
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => onClear && onClear(), duration);
    return () => clearTimeout(id);
  }, [message, duration, onClear]);

  if (!message) return null;

  const tone = {
    info: 'bg-slate-900 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-600 text-white',
  }[type] || 'bg-slate-900 text-white';

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`px-4 py-2 rounded-lg shadow-lg text-sm ${tone}`}>{message}</div>
    </div>
  );
}
