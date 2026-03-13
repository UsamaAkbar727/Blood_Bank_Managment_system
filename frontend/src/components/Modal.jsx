import React from 'react';

export default function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 rounded-full p-2 focus:outline-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">{footer}</div>}
      </div>
    </div>
  );
}
