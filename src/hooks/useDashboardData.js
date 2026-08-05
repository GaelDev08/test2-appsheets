import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export default function useDashboardData() {
  const [kpis, setKpis] = useState({
    inversionTotal: 0,
    ventasTotal: 0,
    cobradoTotal: 0,
    porCobrarTotal: 0,
    gastosTotal: 0,
    utilidadNeta: 0,
  });
  const [lotesMetrics, setLotesMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: dataCompras } = await supabase
        .from('bd_compras')
        .select('lote, bd_producto_compras ( total )');

      const { data: dataVentas } = await supabase
        .from('bd_ventas')
        .select('lote, bd_producto_ventas ( total ), bd_abonos ( monto )');

      const { data: dataGastos } = await supabase.from('bd_gastos').select('lote, monto');

      let totalInversion = 0;
      let totalVentas = 0;
      let totalCobrado = 0;
      let totalGastos = 0;

      const lotesMap = {};

      const getLotObj = (lote) => {
        const key = lote || 'Sin Lote';
        if (!lotesMap[key]) lotesMap[key] = { lote: key, compras: 0, ventas: 0, gastos: 0 };
        return lotesMap[key];
      };

      (dataCompras || []).forEach((c) => {
        const lote = getLotObj(c.lote);
        const compra = (c.bd_producto_compras || []).reduce(
          (acc, curr) => acc + (Number(curr.total) || 0),
          0,
        );
        lote.compras += compra;
        totalInversion += compra;
      });

      (dataVentas || []).forEach((v) => {
        const lote = getLotObj(v.lote);
        const venta = (v.bd_producto_ventas || []).reduce(
          (acc, curr) => acc + (Number(curr.total) || 0),
          0,
        );
        const abono = (v.bd_abonos || []).reduce(
          (acc, curr) => acc + (Number(curr.monto) || 0),
          0,
        );
        lote.ventas += venta;
        totalVentas += venta;
        totalCobrado += abono;
      });

      (dataGastos || []).forEach((g) => {
        const lote = getLotObj(g.lote);
        const monto = Number(g.monto) || 0;
        lote.gastos += monto;
        totalGastos += monto;
      });

      setKpis({
        inversionTotal: totalInversion,
        ventasTotal: totalVentas,
        cobradoTotal: totalCobrado,
        porCobrarTotal: Math.max(0, totalVentas - totalCobrado),
        gastosTotal: totalGastos,
        utilidadNeta: totalVentas - (totalInversion + totalGastos),
      });

      const lotesList = Object.values(lotesMap).map((l) => {
        const utilidadLote = l.ventas - (l.compras + l.gastos);
        const margen = l.ventas > 0 ? (utilidadLote / l.ventas) * 100 : 0;
        return { ...l, utilidadLote, margen };
      });

      setLotesMetrics(lotesList);
    } catch (err) {
      console.error('Error cargando Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { kpis, lotesMetrics, loading, fetchDashboardData };
}
