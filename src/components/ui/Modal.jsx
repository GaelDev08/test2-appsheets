import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, size = 'max-w-lg' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${size} overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
