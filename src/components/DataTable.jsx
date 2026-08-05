import React from 'react';
import { Eye, Pencil, Box } from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

function Badge({ children, color = 'slate' }) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center font-mono text-xs px-2.5 py-1 rounded-md border ${colorMap[color]}`}>
      {children}
    </span>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export default function DataTable({ rows = [], emptyMessage = 'No hay datos para mostrar.', onView }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <Box className="w-4 h-4 text-indigo-600" />
          Rendimiento por Lote
        </h3>
        <Badge>{rows.length} Lotes</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200">
              <th className="p-4 text-[11px] font-semibold uppercase tracking-wider">Lote</th>
              <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Compras (A)</th>
              <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Ventas (B)</th>
              <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Gastos (C)</th>
              <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Utilidad Neta (B-A-C)</th>
              <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Margen (%)</th>
              <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((item, idx) => {
                const utilidad = Number(item.utilidadLote || 0);
                const margen = Number(item.margen || 0);
                return (
                  <tr key={item.lote} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4">
                      <Badge color={utilidad >= 0 ? 'emerald' : 'rose'}>
                        {item.lote}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-medium text-slate-700 tabular-nums">
                      {formatCurrency(item.compras)}
                    </td>
                    <td className="p-4 text-right font-medium text-emerald-600 tabular-nums">
                      {formatCurrency(item.ventas)}
                    </td>
                    <td className="p-4 text-right font-medium text-rose-600 tabular-nums">
                      {formatCurrency(item.gastos)}
                    </td>
                    <td className={`p-4 text-right font-bold tabular-nums ${utilidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(utilidad)}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center font-semibold text-xs px-2 py-1 rounded-full ${
                        margen >= 20 ? 'bg-emerald-100 text-emerald-700' : margen > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {margen.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <ActionButton icon={Eye} label="Ver detalle" onClick={() => onView && onView(item)} />
                        <ActionButton icon={Pencil} label="Editar lote" onClick={() => {}} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
