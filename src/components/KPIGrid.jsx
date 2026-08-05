import React from 'react';
import { TrendingUp, TrendingDown, ShoppingBag, Receipt, DollarSign, Wallet, PiggyBank } from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

function KpiCard({ icon: Icon, label, value, trend, trendDirection, iconBg, isHighlight }) {
  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;
  const isPositive = trendDirection === 'up';

  return (
    <div
      className={`bg-white rounded-2xl p-6 border shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${
        isHighlight
          ? 'border-2 border-emerald-500 ring-1 ring-emerald-500/20 relative overflow-hidden'
          : 'border-slate-200'
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/5 rounded-full" />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${isHighlight ? 'text-emerald-700' : 'text-slate-500'}`}>
            {label}
          </p>
          <p className={`mt-2 text-2xl font-bold truncate ${isHighlight ? 'text-emerald-900' : 'text-slate-900'}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-2xl shrink-0 ${iconBg || 'bg-slate-100 text-slate-600'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
        {trend && (
          <>
            <span className={`inline-flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trend}
            </span>
            <span className="text-slate-400 font-normal">vs. Mes Anterior</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function KPIGrid({ kpis }) {
  const cards = [
    {
      icon: ShoppingBag,
      label: 'Inversión Total en Compras',
      value: formatCurrency(kpis?.inversionTotal),
      trend: '+2.4%',
      trendDirection: 'up',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Receipt,
      label: 'Ingresos Totales por Ventas',
      value: formatCurrency(kpis?.ventasTotal),
      trend: '+8.1%',
      trendDirection: 'up',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: DollarSign,
      label: 'Total Cobrado en Abonos',
      value: formatCurrency(kpis?.cobradoTotal),
      trend: '+12.3%',
      trendDirection: 'up',
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      icon: Wallet,
      label: 'Saldo Pendiente por Cobrar',
      value: formatCurrency(kpis?.porCobrarTotal),
      trend: '-3.2%',
      trendDirection: 'down',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      icon: PiggyBank,
      label: 'Gastos Operativos',
      value: formatCurrency(kpis?.gastosTotal),
      trend: '+1.1%',
      trendDirection: 'up',
      iconBg: 'bg-rose-50 text-rose-600',
    },
    {
      icon: TrendingUp,
      label: 'Utilidad Neta Consolidada',
      value: formatCurrency(kpis?.utilidadNeta),
      trend: '+5.7%',
      trendDirection: 'up',
      iconBg: 'bg-emerald-100 text-emerald-700',
      isHighlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
