import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Plus, Receipt, Calendar, Search, CheckCircle2, Clock, AlertCircle, X, Pencil, Trash2, Eye } from 'lucide-react';

export default function VentasAbonosModule() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productosCat, setProductosCat] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchFilter, setSearchFilter] = useState('');
  const [loteFilter, setLoteFilter] = useState('ALL');

  // New Sale Modal State
  const [showVentaModal, setShowVentaModal] = useState(false);
  const [editVenta, setEditVenta] = useState(null);
  const [fechaVenta, setFechaVenta] = useState(new Date().toISOString().split('T')[0]);
  const [factura, setFactura] = useState('');
  const [loteVenta, setLoteVenta] = useState('');
  const [idCliente, setIdCliente] = useState('');
  const [cliente, setCliente] = useState('');
  const [notasVenta, setNotasVenta] = useState('');
  const [itemsVenta, setItemsVenta] = useState([
    { producto_id: '', producto: '', cantidad: 1, precio: 0, total: 0 }
  ]);

  // Abono Modal State
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [fechaAbono, setFechaAbono] = useState(new Date().toISOString().split('T')[0]);
  const [notaAbono, setNotaAbono] = useState('');
  const [referenciaAbono, setReferenciaAbono] = useState('');

  // Detail view
  const [selectedVentaDetail, setSelectedVentaDetail] = useState(null);

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
          id_cliente,
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

      // 3. Fetch Catalog Productos
      const { data: dataProductos } = await supabase.from('cat_productos').select('*').order('nombre');

      // 4. Fetch unique lotes from compras
      const { data: dataCompras } = await supabase.from('bd_compras').select('lote');
      const uniqueLotes = Array.from(new Set((dataCompras || []).map(c => c.lote).filter(Boolean)));

      setVentas(dataVentas || []);
      setClientes(dataClientes || []);
      setProductosCat(dataProductos || []);
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
    setItemsVenta([...itemsVenta, { producto_id: '', producto: '', cantidad: 1, precio: 0, total: 0 }]);
  };

  const handleRemoveItemVenta = (idx) => {
    if (itemsVenta.length === 1) return;
    setItemsVenta(itemsVenta.filter((_, i) => i !== idx));
  };

  const handleItemVentaChange = (idx, field, val) => {
    const updated = [...itemsVenta];
    const current = { ...updated[idx], [field]: val };

    if (field === 'producto_id') {
      const prodObj = productosCat.find(p => String(p.id) === String(val));
      if (prodObj) {
        current.producto = prodObj.nombre;
        current.precio = Number(prodObj.precio) || 0;
      } else {
        current.producto = '';
      }
    }

    if (field === 'cantidad' || field === 'precio') {
      const c = field === 'cantidad' ? Number(val) : Number(current.cantidad);
      const p = field === 'precio' ? Number(val) : Number(current.precio);
      current.total = c * p;
    }

    updated[idx] = current;
    setItemsVenta(updated);
  };

  const handleClienteChange = (val) => {
    setIdCliente(val);
    const clienteObj = clientes.find(c => String(c.id) === String(val));
    setCliente(clienteObj ? clienteObj.nombre : '');
  };

  const handleSaveVenta = async (e) => {
    e.preventDefault();
    if (!cliente.trim() || !loteVenta.trim()) {
      alert('Por favor complete el cliente y el lote de origen.');
      return;
    }

    setIsSaving(true);
    let ventaId = null;
    try {
      const header = {
        fecha: fechaVenta,
        factura: factura.trim(),
        lote: loteVenta.trim(),
        cliente: cliente.trim(),
        id_cliente: idCliente ? Number(idCliente) : null,
        notas: notasVenta,
      };

      if (editVenta) {
        const { error } = await supabase.from('bd_ventas').update(header).eq('id', editVenta.id);
        if (error) throw error;

        const { error: errDel } = await supabase.from('bd_producto_ventas').delete().eq('id_venta', editVenta.id);
        if (errDel) throw errDel;

        ventaId = editVenta.id;
      } else {
        const { data: ventaInserted, error } = await supabase.from('bd_ventas').insert([header]).select().single();
        if (error) throw error;
        ventaId = ventaInserted.id;
      }

      // Insert Items ('total' es GENERATED ALWAYS)
      const details = itemsVenta.map(item => ({
        id_venta: ventaId,
        producto: item.producto || 'Producto Venta',
        cantidad: Number(item.cantidad),
        precio: Number(item.precio)
      }));

      const { error: errDetails } = await supabase.from('bd_producto_ventas').insert(details);
      if (errDetails) throw errDetails;

      setShowVentaModal(false);
      setEditVenta(null);
      resetVentaForm();
      fetchData();
    } catch (err) {
      console.error('Error guardando venta:', err);
      alert('Error guardando la venta: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openNewVenta = () => {
    resetVentaForm();
    setEditVenta(null);
    setShowVentaModal(true);
  };

  const openEditVenta = (v) => {
    setFechaVenta(v.fecha);
    setFactura(v.factura || '');
    setLoteVenta(v.lote);
    setNotasVenta(v.notas || '');
    if (v.id_cliente != null) {
      setIdCliente(String(v.id_cliente));
    } else {
      const found = clientes.find(c => c.nombre === v.cliente);
      setIdCliente(found ? String(found.id) : '');
    }
    setCliente(v.cliente);
    setItemsVenta(
      (v.bd_producto_ventas || []).map(p => {
        const cat = productosCat.find(x => x.nombre === p.producto);
        return {
          producto_id: cat ? String(cat.id) : '',
          producto: p.producto,
          cantidad: Number(p.cantidad),
          precio: Number(p.precio),
          total: Number(p.total)
        };
      })
    );
    setEditVenta(v);
    setShowVentaModal(true);
  };

  const handleDeleteVenta = async (v) => {
    if (!window.confirm(`¿Eliminar la venta ${v.factura ? v.factura : '#' + v.id}?\nLos abonos asociados se eliminarán en cascada.`)) return;
    const { error } = await supabase.from('bd_ventas').delete().eq('id', v.id);
    if (error) {
      alert('No se pudo eliminar: ' + error.message);
      return;
    }
    if (selectedVentaDetail?.id === v.id) setSelectedVentaDetail(null);
    fetchData();
  };

  const resetVentaForm = () => {
    setFechaVenta(new Date().toISOString().split('T')[0]);
    setFactura('');
    setLoteVenta('');
    setIdCliente('');
    setCliente('');
    setNotasVenta('');
    setItemsVenta([{ producto_id: '', producto: '', cantidad: 1, precio: 0, total: 0 }]);
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

  const handleDeleteAbono = async (abono) => {
    if (!window.confirm('¿Eliminar este abono?')) return;
    const { error } = await supabase.from('bd_abonos').delete().eq('id', abono.id);
    if (error) {
      alert('No se pudo eliminar el abono: ' + error.message);
      return;
    }
    fetchData();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

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
          onClick={openNewVenta}
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
                  <th className="p-4 text-center">Acciones</th>
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
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <button
                            onClick={() => setSelectedVentaDetail(venta)}
                            title="Ver detalle"
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAbono(venta)}
                            disabled={saldoPendiente <= 0}
                            title={saldoPendiente <= 0 ? 'Venta pagada' : 'Registrar abono'}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-30"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditVenta(venta)}
                            title="Editar venta"
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVenta(venta)}
                            title="Eliminar venta"
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar/Editar Venta */}
      {showVentaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-emerald-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                {editVenta ? `Editar Venta #${editVenta.id}` : 'Registrar Nueva Venta'}
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
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Factura / Folio</label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-0012"
                    value={factura}
                    onChange={(e) => setFactura(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Cliente *</label>
                  <select
                    required
                    value={idCliente}
                    onChange={(e) => handleClienteChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecciona un cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Lote Origen *</label>
                  <input
                    type="text"
                    required
                    list="lotes-venta"
                    placeholder="Ej. LOTE-2026-A"
                    value={loteVenta}
                    onChange={(e) => setLoteVenta(e.target.value)}
                    className={`${inputClass} font-semibold text-indigo-700`}
                  />
                  <datalist id="lotes-venta">
                    {lotes.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
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
                    <select
                      value={item.producto_id}
                      onChange={(e) => handleItemVentaChange(idx, 'producto_id', e.target.value)}
                      className="flex-1 text-sm border p-2 rounded-lg bg-white"
                    >
                      <option value="">Selecciona un producto...</option>
                      {productosCat.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.nombre} — ${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </option>
                      ))}
                    </select>
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
                    <button
                      type="button"
                      onClick={() => handleRemoveItemVenta(idx)}
                      disabled={itemsVenta.length === 1}
                      className="p-2 text-rose-500 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowVentaModal(false)} className="px-4 py-2 text-sm text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-xl">
                  {isSaving ? 'Guardando...' : editVenta ? 'Guardar Cambios' : 'Guardar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Abonos */}
      {showAbonoModal && selectedVenta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Abonos de Venta</h3>
                <p className="text-xs text-slate-400">Cliente: {selectedVenta.cliente} | Lote: {selectedVenta.lote}</p>
              </div>
              <button onClick={() => setShowAbonoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Existing abonos */}
              {(selectedVenta.bd_abonos || []).length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-wider">Fecha</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-wider">Monto</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-wider">Ref.</th>
                        <th className="p-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedVenta.bd_abonos || []).map((ab) => (
                        <tr key={ab.id}>
                          <td className="p-3 text-slate-600">{ab.fecha}</td>
                          <td className="p-3 font-bold text-emerald-600">${Number(ab.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-xs text-slate-400">{ab.referencia || '-'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteAbono(ab)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Eliminar abono"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* New abono form */}
              <form onSubmit={handleSaveAbono} className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-700 text-sm">Registrar Nuevo Abono</h4>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Monto del Abono ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-lg font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha de Abono *</label>
                  <input
                    type="date"
                    required
                    value={fechaAbono}
                    onChange={(e) => setFechaAbono(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Referencia / Comprobante</label>
                  <input
                    type="text"
                    placeholder="Ej. Transferencia #98231"
                    value={referenciaAbono}
                    onChange={(e) => setReferenciaAbono(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Notas</label>
                  <input
                    type="text"
                    placeholder="Nota adicional..."
                    value={notaAbono}
                    onChange={(e) => setNotaAbono(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAbonoModal(false)} className="px-4 py-2 text-sm text-slate-600">
                    Cerrar
                  </button>
                  <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-xl">
                    {isSaving ? 'Guardando...' : 'Confirmar Abono'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Venta */}
      {selectedVentaDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Detalle de Venta {selectedVentaDetail.factura ? selectedVentaDetail.factura : '#' + selectedVentaDetail.id}</h3>
                <p className="text-xs text-slate-400">
                  Cliente: <span className="font-bold text-emerald-300">{selectedVentaDetail.cliente}</span> | Lote: <span className="font-bold text-indigo-300">{selectedVentaDetail.lote}</span> | {selectedVentaDetail.fecha}
                </p>
              </div>
              <button onClick={() => setSelectedVentaDetail(null)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b">
                    <th className="p-3 text-left">Producto</th>
                    <th className="p-3 text-center">Cantidad</th>
                    <th className="p-3 text-right">Precio Unit.</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedVentaDetail.bd_producto_ventas || []).map((p, i) => (
                    <tr key={i}>
                      <td className="p-3 font-medium text-slate-800">{p.producto}</td>
                      <td className="p-3 text-center">{p.cantidad}</td>
                      <td className="p-3 text-right">${Number(p.precio).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-slate-800">${Number(p.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedVentaDetail.notas && (
                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border">
                  <strong>Notas:</strong> {selectedVentaDetail.notas}
                </p>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t text-right">
              <button
                onClick={() => setSelectedVentaDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
