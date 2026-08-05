import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, ShoppingBag, Receipt, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, PieChart, RefreshCw } from 'lucide-react';

export default function DashboardKPI() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    inversionTotal: 0,
    ventasTotal: 0,
    cobradoTotal: 0,
    porCobrarTotal: 0,
    gastosTotal: 0,
    utilidadNeta: 0
  });

  const [lotesMetrics, setLotesMetrics] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch Compras
      const { data: dataCompras } = await supabase
        .from('bd_compras')
        .select(`
          lote,
          bd_producto_compras ( total )
        `);

      // Fetch Ventas & Abonos
      const { data: dataVentas } = await supabase
        .from('bd_ventas')
        .select(`
          lote,
          bd_producto_ventas ( total ),
          bd_abonos ( monto )
        `);

      // Fetch Gastos
      const { data: dataGastos } = await supabase
        .from('bd_gastos')
        .select(`lote, monto`);

      // 1. Calculate overall totals
      let totalInversion = 0;
      let totalVentas = 0;
      let totalCobrado = 0;
      let totalGastos = 0;

      const lotesMap = {};

      const getLotObj = (lKey) => {
        const key = lKey || 'Sin Lote';
        if (!lotesMap[key]) {
          lotesMap[key] = { lote: key, compras: 0, ventas: 0, gastos: 0 };
        }
        return lotesMap[key];
      };

      // Process Compras
      (dataCompras || []).forEach(c => {
        const lotObj = getLotObj(c.lote);
        const compTotal = (c.bd_producto_compras || []).reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
        lotObj.compras += compTotal;
        totalInversion += compTotal;
      });

      // Process Ventas
      (dataVentas || []).forEach(v => {
        const lotObj = getLotObj(v.lote);
        const venTotal = (v.bd_producto_ventas || []).reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
        const abTotal = (v.bd_abonos || []).reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);

        lotObj.ventas += venTotal;
        totalVentas += venTotal;
        totalCobrado += abTotal;
      });

      // Process Gastos
      (dataGastos || []).forEach(g => {
        const lotObj = getLotObj(g.lote);
        const gMonto = Number(g.monto) || 0;
        lotObj.gastos += gMonto;
        totalGastos += gMonto;
      });

      const totalPorCobrar = Math.max(0, totalVentas - totalCobrado);
      const utilidadGlobal = totalVentas - (totalInversion + totalGastos);

      setKpis({
        inversionTotal: totalInversion,
        ventasTotal: totalVentas,
        cobradoTotal: totalCobrado,
        porCobrarTotal: totalPorCobrar,
        gastosTotal: totalGastos,
        utilidadNeta: utilidadGlobal
      });

      // Convert lotesMap to array
      const lotesList = Object.values(lotesMap).map(l => {
        const utilidadLote = l.ventas - (l.compras + l.gastos);
        const margen = l.ventas > 0 ? (utilidadLote / l.ventas) * 100 : 0;
        return {
          ...l,
          utilidadLote,
          margen
        };
      });

      setLotesMetrics(lotesList);
    } catch (err) {
      console.error('Error cargando Dashboard KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="text-indigo-600 w-7 h-7" /> Executive Dashboard KPIs v2.0
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Resumen financiero consolidado: inversión, ingresos, cuentas por cobrar y rentabilidad por lote.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl transition"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar Datos
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Calculando KPIs financieros...</div>
      ) : (
        <>
          {/* Main Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Inversión Total */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Inversión Total (Compras)</p>
                  <p className="text-2xl font-black text-slate-900 mt-2">
                    ${kpis.inversionTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Card 2: Ingresos por Ventas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Ingresos Totales (Ventas)</p>
                  <p className="text-2xl font-black text-emerald-600 mt-2">
                    ${kpis.ventasTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Card 3: Cobrado Efectivo */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Total Cobrado (Efectivo)</p>
                  <p className="text-2xl font-black text-teal-600 mt-2">
                    ${kpis.cobradoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Card 4: Saldo Por Cobrar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Por Cobrar (Pendiente)</p>
                  <p className="text-2xl font-black text-amber-600 mt-2">
                    ${kpis.porCobrarTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Card 5: Gastos Operativos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Gastos Operativos</p>
                  <p className="text-2xl font-black text-rose-600 mt-2">
                    ${kpis.gastosTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Card 6: Utilidad Neta Global */}
            <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden text-white ${
              kpis.utilidadNeta >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-rose-950 border-rose-900'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Utilidad Neta Consolidada</p>
                  <p className={`text-2xl font-black mt-2 ${kpis.utilidadNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${kpis.utilidadNeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Fórmula: Ventas - (Compras + Gastos)</p>
                </div>
                <div className={`p-3 rounded-2xl ${kpis.utilidadNeta >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {kpis.utilidadNeta >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                </div>
              </div>
            </div>
          </div>

          {/* Profitability Per Lot Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" /> Rendimiento y Utilidad Neta por Lote
              </h3>
            </div>

            {lotesMetrics.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No hay lotes con actividad registrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold border-b">
                      <th className="p-4">Lote</th>
                      <th className="p-4 text-right">Compras (A)</th>
                      <th className="p-4 text-right">Ventas (B)</th>
                      <th className="p-4 text-right">Gastos (C)</th>
                      <th className="p-4 text-right">Utilidad Neta (B - A - C)</th>
                      <th className="p-4 text-right">Margen (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lotesMetrics.map((item) => (
                      <tr key={item.lote} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-indigo-700">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                            {item.lote}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-700">
                          ${item.compras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right text-emerald-600 font-medium">
                          ${item.ventas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right text-rose-600">
                          ${item.gastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`p-4 text-right font-bold text-base ${item.utilidadLote >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ${item.utilidadLote.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.margen >= 20 ? 'bg-emerald-100 text-emerald-800' : item.margen > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.margen.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
