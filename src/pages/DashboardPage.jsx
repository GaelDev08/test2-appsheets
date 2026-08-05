import React from 'react';
import KPIGrid from '../components/KPIGrid';
import DataTable from '../components/DataTable';
import useDashboardData from '../hooks/useDashboardData';
import { LayoutDashboard, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { kpis, lotesMetrics, loading } = useDashboardData();

  const handleViewLote = (item) => {
    console.log('Ver detalle del lote:', item);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-900">
          <LayoutDashboard className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg lg:text-xl font-bold tracking-tight">Panel de Control</h1>
        </div>
        <p className="text-sm text-slate-500 font-normal">
          Resumen financiero consolidado: inversión, ingresos, cuentas por cobrar y rentabilidad por lote.
        </p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Calculando KPIs financieros...</div>
      ) : (
        <KPIGrid kpis={kpis} />
      )}

      {/* Data Table */}
      <DataTable rows={lotesMetrics} onView={handleViewLote} />
    </div>
  );
}
