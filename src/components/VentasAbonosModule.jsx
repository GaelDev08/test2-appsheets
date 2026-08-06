import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, CreditCard, Plus, Receipt, UserCheck, Calendar, Search, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';

export default function VentasAbonosModule() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchFilter, setSearchFilter] = useState('');
  const [loteFilter, setLoteFilter] = useState('ALL');

  // New Sale Modal State
  const [showVentaModal, setShowVentaModal] = useState(false);
  const [fechaVenta, setFechaVenta] = useState(new Date().toISOString().split('T')[0]);
  const [factura, setFactura] = useState('');
  const [loteVenta, setLoteVenta] = useState('');
  const [cliente, setCliente] = useState('');
  const [notasVenta, setNotasVenta] = useState('');
  const [itemsVenta, setItemsVenta] = useState([
    { producto: '', cantidad: 1, precio: 0, total: 0 }
  ]);

  // New Abono Modal State
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [fechaAbono, setFechaAbono] = useState(new Date().toISOString().split('T')[0]);
  const [notaAbono, setNotaAbono] = useState('');
  const [referenciaAbono, setReferenciaAbono] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Ventas with items & abonos
      const { data: dataVentas, error: errVentas } = await supabase
        .from('bd_ventas')
        .select(`
          id,
          fecha,
          factura,
          lote,
          cliente,
          notas,
          bd_producto_ventas (
            id,
            cantidad,
            producto,
            precio,
            total
          ),
          bd_abonos (
            id,
            fecha,
            monto,
            nota,
            referencia
          )
        `)
        .order('fecha', { ascending: false });

      if (errVentas) console.error('Error cargando ventas:', errVentas);

      // 2. Fetch Catalog Clientes
      const { data: dataClientes } = await supabase.from('cat_clientes').select('*').order('nombre');

      // 3. Fetch unique lotes from compras
      const { data: dataCompras } = await supabase.from('bd_compras').select('lote');
      const uniqueLotes = Array.from(new Set((dataCompras || []).map(c => c.lote).filter(Boolean)));

      setVentas(dataVentas || []);
      setClientes(dataClientes || []);
      setLotes(uniqueLotes);
    } catch (err) {
      console.error('Error cargando modulo ventas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper calculations for a sale
  const getVentaTotals = (v) => {
    const totalVenta = (v.bd_producto_ventas || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const totalAbonado = (v.bd_abonos || []).reduce((sum, ab) => sum + (Number(ab.monto) || 0), 0);
    const saldoPendiente = totalVenta - totalAbonado;

    let estado = 'PENDIENTE';
    if (saldoPendiente <= 0 && totalVenta > 0) {
      estado = 'PAGADO';
    } else if (totalAbonado > 0) {
      estado = 'PARCIAL';
    }

    return { totalVenta, totalAbonado, saldoPendiente: Math.max(0, saldoPendiente), estado };
  };

  // KPI calculations
  const totalVendidoOverall = ventas.reduce((acc, v) => acc + getVentaTotals(v).totalVenta, 0);
  const totalAbonadoOverall = ventas.reduce((acc, v) => acc + getVentaTotals(v).totalAbonado, 0);
  const totalPorCobrarOverall = ventas.reduce((acc, v) => acc + getVentaTotals(v).saldoPendiente, 0);

  // Filtered sales list
  const filteredVentas = ventas.filter(v => {
    const matchesSearch =
      (v.cliente || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (v.factura || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (v.lote || '').toLowerCase().includes(searchFilter.toLowerCase());

    const matchesLote = loteFilter === 'ALL' || v.lote === loteFilter;

    return matchesSearch && matchesLote;
  });

  // Handle Add Item Sale Form
  const handleAddItemVenta = () => {
    setItemsVenta([...itemsVenta, { producto: '', cantidad: 1, precio: 0, total: 0 }]);
  };

  const handleRemoveItemVenta = (idx) => {
    if (itemsVenta.length === 1) return;
    setItemsVenta(itemsVenta.filter((_, i) => i !== idx));
  };

  const handleItemVentaChange = (idx, field, val) => {
    const updated = [...itemsVenta];
    const current = { ...updated[idx], [field]: val };

    if (field === 'cantidad' || field === 'precio') {
      const c = field === 'cantidad' ? Number(val) : Number(current.cantidad);
      const p = field === 'precio' ? Number(val) : Number(current.precio);
      current.total = c * p;
    }

    updated[idx] = current;
    setItemsVenta(updated);
  };

  const handleSaveVenta = async (e) => {
    e.preventDefault();
    if (!cliente.trim() || !loteVenta.trim()) {
      alert('Por favor complete el cliente y el lote de origen.');
      return;
    }

    setIsSaving(true);
    try {
      // Insert Sale Header
      const { data: ventaInserted, error: errHeader } = await supabase
        .from('bd_ventas')
        .insert([{
          fecha: fechaVenta,
          factura: factura.trim(),
          lote: loteVenta.trim(),
          cliente: cliente.trim(),
          notas: notasVenta
        }])
        .select()
        .single();

      if (errHeader) throw errHeader;

      // Insert Items
      // 'total' es una columna GENERATED ALWAYS: la calcula PostgreSQL (cantidad * precio).
      const details = itemsVenta.map(item => ({
        id_venta: ventaInserted.id,
        producto: item.producto || 'Producto Venta',
        cantidad: Number(item.cantidad),
        precio: Number(item.precio)
      }));

      const { error: errDetails } = await supabase.from('bd_producto_ventas').insert(details);
      if (errDetails) throw errDetails;

      setShowVentaModal(false);
      resetVentaForm();
      fetchData();
    } catch (err) {
      console.error('Error guardando venta:', err);
      alert('Error guardando la venta: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetVentaForm = () => {
    setFechaVenta(new Date().toISOString().split('T')[0]);
    setFactura('');
    setLoteVenta('');
    setCliente('');
    setNotasVenta('');
    setItemsVenta([{ producto: '', cantidad: 1, precio: 0, total: 0 }]);
  };

  const handleOpenAbono = (v) => {
    setSelectedVenta(v);
    const { saldoPendiente } = getVentaTotals(v);
    setMontoAbono(saldoPendiente > 0 ? saldoPendiente : '');
    setFechaAbono(new Date().toISOString().split('T')[0]);
    setNotaAbono('');
    setReferenciaAbono('');
    setShowAbonoModal(true);
  };

  const handleSaveAbono = async (e) => {
    e.preventDefault();
    if (!montoAbono || Number(montoAbono) <= 0) {
      alert('Ingrese un monto válido mayor a 0.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('bd_abonos').insert([{
        id_venta: selectedVenta.id,
        fecha: fechaAbono,
        monto: Number(montoAbono),
        nota: notaAbono,
        referencia: referenciaAbono
      }]);

      if (error) throw error;

      setShowAbonoModal(false);
      setSelectedVenta(null);
      fetchData();
    } catch (err) {
      console.error('Error al registrar abono:', err);
      alert('Error al guardar abono: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="text-emerald-600 w-5 h-5" /> Ventas y Cuentas por Cobrar
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Gestión de ventas ligadas a lote, cálculo en tiempo real de saldos pendientes y abonos.
          </p>
        </div>
        <button
          onClick={() => { resetVentaForm(); setShowVentaModal(true); }}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" /> Nueva Venta
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Total Ventas Emitidas</p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              ${totalVendidoOverall.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Total Cobrado (Abonos)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              ${totalAbonadoOverall.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Saldo Por Cobrar</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              ${totalPorCobrarOverall.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por cliente, factura o lote..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase">Filtrar Lote:</label>
            <select
              value={loteFilter}
              onChange={(e) => setLoteFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todos los Lotes</option>
              {lotes.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando registros de ventas...</div>
        ) : filteredVentas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No hay ventas registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-semibold border-b">
                  <th className="p-4">Factura / Fecha</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Lote</th>
                  <th className="p-4 text-right">Total Venta</th>
                  <th className="p-4 text-right">Abonado</th>
                  <th className="p-4 text-right">Saldo Pendiente</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVentas.map((venta) => {
                  const { totalVenta, totalAbonado, saldoPendiente, estado } = getVentaTotals(venta);

                  return (
                    <tr key={venta.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{venta.factura || `Venta #${venta.id}`}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {venta.fecha}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{venta.cliente}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {venta.lote}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        ${totalVenta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-600">
                        ${totalAbonado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-bold text-amber-600">
                        ${saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        {estado === 'PAGADO' && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> PAGADO
                          </span>
                        )}
                        {estado === 'PARCIAL' && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PARCIAL
                          </span>
                        )}
                        {estado === 'PENDIENTE' && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> PENDIENTE
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenAbono(venta)}
                          disabled={saldoPendiente <= 0}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition inline-flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Abonar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Venta */}
      {showVentaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-emerald-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" /> Registrar Nueva Venta
              </h3>
              <button onClick={() => setShowVentaModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveVenta} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={fechaVenta}
                    onChange={(e) => setFechaVenta(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Factura / Folio</label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-0012"
                    value={factura}
                    onChange={(e) => setFactura(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del cliente"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Lote Origen *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. LOTE-2026-A"
                    value={loteVenta}
                    onChange={(e) => setLoteVenta(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-semibold text-indigo-700"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="border rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 text-sm">Productos Vendidos</h4>
                  <button
                    type="button"
                    onClick={handleAddItemVenta}
                    className="text-xs bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg"
                  >
                    + Agregar Ítem
                  </button>
                </div>

                {itemsVenta.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-xl border">
                    <input
                      type="text"
                      placeholder="Producto"
                      value={item.producto}
                      onChange={(e) => handleItemVentaChange(idx, 'producto', e.target.value)}
                      className="flex-1 text-sm border p-2 rounded-lg"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Cant"
                      value={item.cantidad}
                      onChange={(e) => handleItemVentaChange(idx, 'cantidad', e.target.value)}
                      className="w-20 text-sm border p-2 rounded-lg text-center"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Precio"
                      value={item.precio}
                      onChange={(e) => handleItemVentaChange(idx, 'precio', e.target.value)}
                      className="w-28 text-sm border p-2 rounded-lg text-right"
                    />
                    <div className="w-28 text-right font-bold text-slate-800 py-2">
                      ${(item.cantidad * item.precio || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowVentaModal(false)} className="px-4 py-2 text-sm text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-xl">
                  {isSaving ? 'Guardando...' : 'Guardar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Abono */}
      {showAbonoModal && selectedVenta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Registrar Abono</h3>
                <p className="text-xs text-slate-400">Cliente: {selectedVenta.cliente} | Lote: {selectedVenta.lote}</p>
              </div>
              <button onClick={() => setShowAbonoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveAbono} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Monto del Abono ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-lg font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha de Abono *</label>
                <input
                  type="date"
                  required
                  value={fechaAbono}
                  onChange={(e) => setFechaAbono(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Referencia / Comprobante</label>
                <input
                  type="text"
                  placeholder="Ej. Transferencia #98231"
                  value={referenciaAbono}
                  onChange={(e) => setReferenciaAbono(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Notas</label>
                <input
                  type="text"
                  placeholder="Nota adicional..."
                  value={notaAbono}
                  onChange={(e) => setNotaAbono(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAbonoModal(false)} className="px-4 py-2 text-sm text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-xl">
                  {isSaving ? 'Guardando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
