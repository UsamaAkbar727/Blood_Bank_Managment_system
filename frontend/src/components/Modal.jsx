import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-brand-50/30">
          <h3 id="modal-title" className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
