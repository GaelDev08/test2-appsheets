import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, ShoppingBag, Layers, Calendar, Trash2, Eye, X, Pencil } from 'lucide-react';

export default function ComprasModule() {
  const [compras, setCompras] = useState([]);
  const [productosCat, setProductosCat] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [editCompra, setEditCompra] = useState(null);
  const [lotesSummary, setLotesSummary] = useState({});

  // Form State
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [lote, setLote] = useState('');
  const [notas, setNotas] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [items, setItems] = useState([
    { producto_id: '', producto_nombre: '', cantidad: 1, precio: 0, total: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Purchases with products
      const { data: dataCompras, error: errCompras } = await supabase
        .from('bd_compras')
        .select(`
          id,
          fecha,
          lote,
          notas,
          id_proveedor,
          proveedor,
          bd_producto_compras (
            id,
            cantidad,
            producto,
            precio,
            total
          )
        `)
        .order('fecha', { ascending: false });

      if (errCompras) console.error('Error cargando compras:', errCompras);

      // 2. Fetch Products Catalog
      const { data: dataProds, error: errProds } = await supabase
        .from('cat_productos')
        .select('*')
        .order('nombre');

      if (errProds) console.error('Error cargando catálogo de productos:', errProds);

      // 3. Fetch Proveedores Catalog
      const { data: dataProvs, error: errProvs } = await supabase
        .from('cat_proveedores')
        .select('*')
        .order('nombre');

      if (errProvs) console.error('Error cargando catálogo de proveedores:', errProvs);

      const comprasFormatted = dataCompras || [];
      setCompras(comprasFormatted);
      setProductosCat(dataProds || []);
      setProveedores(dataProvs || []);

      // Calculate lot summaries
      const summary = {};
      comprasFormatted.forEach(c => {
        const lotKey = c.lote || 'Sin Lote';
        const compraTotal = (c.bd_producto_compras || []).reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
        if (!summary[lotKey]) {
          summary[lotKey] = { totalInversion: 0, totalCompras: 0 };
        }
        summary[lotKey].totalInversion += compraTotal;
        summary[lotKey].totalCompras += 1;
      });
      setLotesSummary(summary);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { producto_id: '', producto_nombre: '', cantidad: 1, precio: 0, total: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    if (field === 'producto_id') {
      const prodObj = productosCat.find(p => String(p.id) === String(value));
      if (prodObj) {
        current.producto_nombre = prodObj.nombre;
        current.precio = Number(prodObj.precio) || 0;
      } else {
        current.producto_nombre = '';
      }
    }

    if (field === 'cantidad' || field === 'precio') {
      const cant = field === 'cantidad' ? Number(value) : Number(current.cantidad);
      const prec = field === 'precio' ? Number(value) : Number(current.precio);
      current.total = cant * prec;
    }

    updated[index] = current;
    setItems(updated);
  };

  const calculateModalTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.cantidad) * Number(item.precio) || 0), 0);
  };

  const getProveedorPayload = () => {
    const provObj = proveedores.find(p => String(p.id) === String(proveedorId));
    return {
      proveedor: provObj ? provObj.nombre : '',
      id_proveedor: provObj ? provObj.id : null
    };
  };

  const handleSaveCompra = async (e) => {
    e.preventDefault();
    if (!lote.trim()) {
      alert('Por favor ingrese una clave/código de Lote.');
      return;
    }

    setIsSaving(true);
    let compraId = null;
    const provPayload = getProveedorPayload();
    try {
      if (editCompra) {
        // ---- MODO EDICIÓN ----
        // 1. Actualizar encabezado (BDCOMPRA)
        const { error: errHeader } = await supabase
          .from('bd_compras')
          .update({ fecha, lote: lote.trim(), notas, ...provPayload })
          .eq('id', editCompra.id);

        if (errHeader) throw errHeader;

        // 2. Eliminar líneas de detalle previas (para reinsertarlas limpiamente)
        const { error: errDeleteOld } = await supabase
          .from('bd_producto_compras')
          .delete()
          .eq('id_compra', editCompra.id);

        if (errDeleteOld) throw errDeleteOld;

        compraId = editCompra.id;
      } else {
        // ---- MODO NUEVO ----
        // 1. Insertar encabezado (BDCOMPRA)
        const { data: compraInserted, error: errHeader } = await supabase
          .from('bd_compras')
          .insert([{ fecha, lote: lote.trim(), notas, ...provPayload }])
          .select()
          .single();

        if (errHeader) throw errHeader;
        compraId = compraInserted.id;
      }

      // Paso final: insertar las líneas de detalle (BDPRODUCTOCOMPRA)
      // 'total' es GENERATED ALWAYS: lo calcula PostgreSQL (cantidad * precio).
      const detailItems = items.map(item => ({
        id_compra: compraId,
        producto: item.producto_nombre || 'Producto General',
        cantidad: Number(item.cantidad),
        precio: Number(item.precio)
      }));

      const { error: errDetails } = await supabase
        .from('bd_producto_compras')
        .insert(detailItems);

      if (errDetails) throw errDetails;

      // Reset form & reload
      setShowModal(false);
      setEditCompra(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error guardando la compra:', err);
      alert('Ocurrió un error al guardar la compra: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openNewCompra = () => {
    resetForm();
    setEditCompra(null);
    setShowModal(true);
  };

  const openEditCompra = (compra) => {
    setFecha(compra.fecha);
    setLote(compra.lote);
    setNotas(compra.notas || '');
    setProveedorId(compra.id_proveedor != null ? String(compra.id_proveedor) : '');
    setItems(
      (compra.bd_producto_compras || []).map(p => {
        const cat = productosCat.find(x => x.nombre === p.producto);
        return {
          producto_id: cat ? String(cat.id) : '',
          producto_nombre: p.producto,
          cantidad: Number(p.cantidad),
          precio: Number(p.precio),
          total: Number(p.total)
        };
      })
    );
    setEditCompra(compra);
    setShowModal(true);
  };

  const handleDeleteCompra = async (compra) => {
    if (!window.confirm(`¿Eliminar la compra #${compra.id} del lote "${compra.lote}"?\nLos productos y la inversión asociada se eliminarán.`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('bd_compras')
        .delete()
        .eq('id', compra.id);

      if (error) throw error;

      if (selectedCompra?.id === compra.id) setSelectedCompra(null);
      fetchData();
    } catch (err) {
      console.error('Error eliminando la compra:', err);
      alert('Ocurrió un error al eliminar: ' + err.message);
    }
  };

  const resetForm = () => {
    setFecha(new Date().toISOString().split('T')[0]);
    setLote('');
    setNotas('');
    setProveedorId('');
    setItems([{ producto_id: '', producto_nombre: '', cantidad: 1, precio: 0, total: 0 }]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="text-blue-600 w-5 h-5" /> Compras y Lotes
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Gestión maestro-detalle de adquisiciones, acumulación de inversión por lote y productos.
          </p>
        </div>
        <button
          onClick={openNewCompra}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" /> Nueva Compra
        </button>
      </div>

      {/* Lot Investment Cards */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" /> Resumen de Inversión por Lote
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.keys(lotesSummary).length === 0 ? (
            <div className="col-span-full p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay lotes registrados.
            </div>
          ) : (
            Object.entries(lotesSummary).map(([lotKey, data]) => (
              <div key={lotKey} className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Layers className="w-20 h-20 text-white" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/30 text-blue-300 rounded-full border border-blue-400/30">
                  Lote: {lotKey}
                </span>
                <div className="mt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Inversión Acumulada</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    ${data.totalInversion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="mt-3 text-xs text-slate-300 flex justify-between border-t border-slate-700/60 pt-2">
                  <span>Compras asociadas:</span>
                  <span className="font-bold">{data.totalCompras}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700">Historial de Compras de Lotes</h3>
          <span className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-medium">
            Total: {compras.length} registros
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando registros de compras...</div>
        ) : compras.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No se han registrado compras.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-4">ID</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Lote</th>
                  <th className="p-4">Proveedor</th>
                  <th className="p-4">Productos</th>
                  <th className="p-4 text-right">Inversión Total</th>
                  <th className="p-4">Notas</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compras.map((compra) => {
                  const itemsCount = compra.bd_producto_compras?.length || 0;
                  const totalCompra = (compra.bd_producto_compras || []).reduce(
                    (acc, curr) => acc + (Number(curr.total) || 0), 0
                  );

                  return (
                    <tr key={compra.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-mono text-xs font-bold text-slate-500">#{compra.id}</td>
                      <td className="p-4 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {compra.fecha}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {compra.lote}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{compra.proveedor || '-'}</td>
                      <td className="p-4 text-slate-600">
                        <span className="font-semibold text-slate-800">{itemsCount}</span> ítem(s)
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-600 text-base">
                        ${totalCompra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-slate-500 max-w-xs truncate">{compra.notas || '-'}</td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedCompra(compra)}
                            title="Ver detalle"
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditCompra(compra)}
                            title="Editar compra"
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompra(compra)}
                            title="Eliminar compra"
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

      {/* Modal Nueva Compra (Maestro-Detalle) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  {editCompra ? `Editar Compra #${editCompra.id}` : 'Registrar Nueva Compra de Lote'}
                </h3>
                <p className="text-xs text-slate-400">Ingreso maestro-detalle con productos y costos</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCompra} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha de Compra *</label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Lote de Origen / Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. LOTE-2026-A"
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Proveedor</label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  >
                    <option value="">Selecciona un proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Notas / Observaciones</label>
                  <input
                    type="text"
                    placeholder="Ej. Flete incluido, pago a 30 días"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Detail Items Table */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 text-sm">Detalle de Productos Adquiridos</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Producto
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase">Producto</label>
                        <select
                          value={item.producto_id}
                          onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)}
                          className="w-full text-sm font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="">Selecciona un producto...</option>
                          {productosCat.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} — ${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none text-center"
                        />
                      </div>

                      <div className="w-full sm:w-32">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase">Precio Unit ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.precio}
                          onChange={(e) => handleItemChange(idx, 'precio', e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none text-right"
                        />
                      </div>

                      <div className="w-full sm:w-32 text-right">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase">Subtotal</label>
                        <span className="text-sm font-bold text-slate-800 block py-1.5">
                          ${(Number(item.cantidad) * Number(item.precio) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length === 1}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary Footer */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-slate-300">Costo Total del Lote:</span>
                <span className="text-2xl font-black text-emerald-400">
                  ${calculateModalTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : editCompra ? 'Guardar Cambios' : 'Guardar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle */}
      {selectedCompra && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Detalle de Compra #{selectedCompra.id}</h3>
                <p className="text-xs text-slate-400">Lote: <span className="text-indigo-300 font-bold">{selectedCompra.lote}</span> | Fecha: {selectedCompra.fecha}</p>
              </div>
              <button onClick={() => setSelectedCompra(null)} className="text-slate-400 hover:text-white">
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
                  {(selectedCompra.bd_producto_compras || []).map((p, i) => (
                    <tr key={i}>
                      <td className="p-3 font-medium text-slate-800">{p.producto}</td>
                      <td className="p-3 text-center">{p.cantidad}</td>
                      <td className="p-3 text-right">${Number(p.precio).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-slate-800">${Number(p.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedCompra.notas && (
                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border">
                  <strong>Notas:</strong> {selectedCompra.notas}
                </p>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t text-right">
              <button
                onClick={() => setSelectedCompra(null)}
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
