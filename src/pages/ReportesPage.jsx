import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, ShoppingBag, Receipt, Wallet, ArrowDownRight, Download } from 'lucide-react';

const fmtMXN = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(Number(v) || 0);

const last30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

export default function ReportesPage() {
  const [desde, setDesde] = useState(last30Days());
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [loteFilter, setLoteFilter] = useState('ALL');
  const [lotes, setLotes] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ventas }, { data: compras }, { data: gastos }] = await Promise.all([
        supabase.from('bd_ventas').select(`
          id, fecha, lote, cliente, factura,
          bd_producto_ventas ( producto, cantidad, precio, total ),
          bd_abonos ( monto )
        `),
        supabase.from('bd_compras').select(`
          lote, fecha,
          bd_producto_compras ( producto, cantidad, total )
        `),
        supabase.from('bd_gastos').select('fecha, lote, categoria, descripcion, monto'),
      ]);

      const lotesSet = new Set([
        ...(ventas || []).map((v) => v.lote),
        ...(compras || []).map((c) => c.lote),
        ...(gastos || []).map((g) => g.lote),
      ]);
      setLotes(Array.from(lotesSet).filter(Boolean).sort());

      setData({ ventas: ventas || [], compras: compras || [], gastos: gastos || [] });
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const inPeriod = (fecha) => {
    if (!fecha) return true;
    return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
  };

  const inLote = (lote) => loteFilter === 'ALL' || lote === loteFilter;

  const report = useMemo(() => {
    if (!data) return null;

    const ventas = data.ventas.filter((v) => inPeriod(v.fecha) && inLote(v.lote));
    const compras = data.compras.filter((c) => inPeriod(c.fecha) && inLote(c.lote));
    const gastos = data.gastos.filter((g) => inPeriod(g.fecha) && inLote(g.lote));

    let totalVentas = 0;
    let totalCobrado = 0;
    const productosVendidos = {};
    const ventasPorDia = {};
    const cuentasCobrar = [];

    ventas.forEach((v) => {
      const totalVenta = (v.bd_producto_ventas || []).reduce((a, i) => a + (Number(i.total) || 0), 0);
      const totalAbonado = (v.bd_abonos || []).reduce((a, b) => a + (Number(b.monto) || 0), 0);
      totalVentas += totalVenta;
      totalCobrado += totalAbonado;

      const saldo = totalVenta - totalAbonado;
      if (saldo > 0) cuentasCobrar.push({ ...v, totalVenta, totalAbonado, saldo });

      (v.bd_producto_ventas || []).forEach((i) => {
        const nombre = i.producto || 'Producto';
        productosVendidos[nombre] = (productosVendidos[nombre] || 0) + (Number(i.total) || 0);
      });

      const day = (v.fecha || '').slice(0, 10);
      if (day) ventasPorDia[day] = (ventasPorDia[day] || 0) + totalVenta;
    });

    let totalCompras = 0;
    const comprasPorLote = {};
    compras.forEach((c) => {
      const total = (c.bd_producto_compras || []).reduce((a, i) => a + (Number(i.total) || 0), 0);
      totalCompras += total;
      comprasPorLote[c.lote] = (comprasPorLote[c.lote] || 0) + total;
    });

    let totalGastos = 0;
    const gastosPorCategoria = {};
    gastos.forEach((g) => {
      const monto = Number(g.monto) || 0;
      totalGastos += monto;
      const cat = g.categoria || 'Sin categoría';
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + monto;
    });

    const utilidad = totalVentas - (totalCompras + totalGastos);

    const topProductos = Object.entries(productosVendidos).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topGastos = Object.entries(gastosPorCategoria).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxProd = topProductos.length ? topProductos[0][1] : 1;
    const maxGasto = topGastos.length ? topGastos[0][1] : 1;

    const dias = Object.entries(ventasPorDia).sort((a, b) => a[0].localeCompare(b[0]));
    const maxDia = dias.length ? Math.max(...dias.map((d) => d[1])) : 1;

    return {
      resumen: {
        totalVentas,
        totalCobrado,
        porCobrar: Math.max(0, totalVentas - totalCobrado),
        totalCompras,
        totalGastos,
        utilidad,
        nVentas: ventas.length,
        nCuentas: cuentasCobrar.length,
      },
      cuentasCobrar: cuentasCobrar.sort((a, b) => b.saldo - a.saldo).slice(0, 10),
      topProductos,
      topGastos,
      ventasPorDia: dias,
      comprasPorLote: Object.entries(comprasPorLote).sort((a, b) => b[1] - a[1]),
      maxProd,
      maxGasto,
      maxDia,
    };
  }, [data, desde, hasta, loteFilter]);

  const exportCSV = () => {
    if (!report) return;
    const rows = report.cuentasCobrar.map((c) => ({
      factura: c.factura || c.id,
      cliente: c.cliente,
      lote: c.lote,
      fecha: c.fecha,
      total: c.totalVenta,
      abonado: c.totalAbonado,
      saldo: c.saldo,
    }));
    const header = ['factura', 'cliente', 'lote', 'fecha', 'total', 'abonado', 'saldo'];
    const csv = [header.join(','), ...rows.map((r) => header.map((h) => r[h]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cuentas_por_cobrar.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Reportes y Analítica
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Análisis financiero consolidado por rango de fechas y lote.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Lote</label>
            <select value={loteFilter} onChange={(e) => setLoteFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none">
              <option value="ALL">Todos</option>
              {lotes.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <button
            onClick={exportCSV}
            disabled={!report}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Exportar CxC
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Generando reportes...</div>
      ) : report ? (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[
              { label: 'Ingresos por Ventas', value: fmtMXN(report.resumen.totalVentas), icon: Receipt, bg: 'bg-emerald-50 text-emerald-600' },
              { label: 'Total Cobrado', value: fmtMXN(report.resumen.totalCobrado), icon: Wallet, bg: 'bg-teal-50 text-teal-600' },
              { label: 'Por Cobrar', value: fmtMXN(report.resumen.porCobrar), icon: TrendingUp, bg: 'bg-amber-50 text-amber-600' },
              { label: 'Compras (Inversión)', value: fmtMXN(report.resumen.totalCompras), icon: ShoppingBag, bg: 'bg-blue-50 text-blue-600' },
              { label: 'Gastos', value: fmtMXN(report.resumen.totalGastos), icon: ArrowDownRight, bg: 'bg-rose-50 text-rose-600' },
              {
                label: 'Utilidad Neta',
                value: fmtMXN(report.resumen.utilidad),
                icon: TrendingUp,
                bg: 'bg-emerald-100 text-emerald-700',
                highlight: true,
              },
            ].map((card) => (
              <div key={card.label} className={`bg-white p-6 rounded-2xl border shadow-sm ${card.highlight ? 'border-2 border-emerald-500' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${card.bg}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Ventas por día */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 text-sm mb-4">Ventas por Día</h3>
              {report.ventasPorDia.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">Sin datos en el período.</p>
              ) : (
                <div className="flex items-end gap-1.5 h-40">
                  {report.ventasPorDia.map(([dia, total]) => (
                    <div key={dia} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[9px] text-slate-500 font-semibold opacity-0 group-hover:opacity-100">
                        {fmtMXN(total)}
                      </span>
                      <div
                        className="w-full bg-emerald-500/80 hover:bg-emerald-600 rounded-t-md transition-all"
                        style={{ height: `${Math.max(4, (total / report.maxDia) * 100)}%` }}
                        title={`${dia}: ${fmtMXN(total)}`}
                      />
                      <span className="text-[9px] text-slate-400">{dia.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gastos por categoría */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 text-sm mb-4">Gastos por Categoría</h3>
              {report.topGastos.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">Sin gastos registrados.</p>
              ) : (
                <div className="space-y-3">
                  {report.topGastos.map(([cat, total]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                        <span>{cat}</span>
                        <span className="font-bold">{fmtMXN(total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500/80 rounded-full" style={{ width: `${(total / report.maxGasto) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top productos */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 text-sm">Productos Más Vendidos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {report.topProductos.length === 0 ? (
                      <tr><td className="p-6 text-center text-slate-400 text-sm">Sin ventas en el período.</td></tr>
                    ) : (
                      report.topProductos.map(([nombre, total], i) => (
                        <tr key={nombre} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-medium text-slate-700">
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mr-2">
                              {i + 1}
                            </span>
                            {nombre}
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-600 tabular-nums">{fmtMXN(total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compras por lote */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 text-sm">Compras por Lote</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {report.comprasPorLote.length === 0 ? (
                      <tr><td className="p-6 text-center text-slate-400 text-sm">Sin compras en el período.</td></tr>
                    ) : (
                      report.comprasPorLote.map(([lote, total]) => (
                        <tr key={lote} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <span className="inline-flex items-center font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {lote}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-blue-600 tabular-nums">{fmtMXN(total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cuentas por cobrar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Cuentas por Cobrar ({report.resumen.nCuentas})</h3>
              <span className="inline-flex items-center font-semibold text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                {fmtMXN(report.resumen.porCobrar)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider">Cliente</th>
                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider">Lote</th>
                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider">Factura</th>
                    <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Total</th>
                    <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Abonado</th>
                    <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.cuentasCobrar.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-400 text-sm">Sin saldos pendientes. ¡Todo cobrado!</td></tr>
                  ) : (
                    report.cuentasCobrar.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-medium text-slate-700">{c.cliente}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center font-mono text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {c.lote}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{c.factura || `Venta #${c.id}`}</td>
                        <td className="p-4 text-right font-medium text-slate-700 tabular-nums">{fmtMXN(c.totalVenta)}</td>
                        <td className="p-4 text-right font-medium text-emerald-600 tabular-nums">{fmtMXN(c.totalAbonado)}</td>
                        <td className="p-4 text-right font-bold text-amber-600 tabular-nums">{fmtMXN(c.saldo)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-slate-400 text-sm">No hay datos.</div>
      )}
    </div>
  );
}
