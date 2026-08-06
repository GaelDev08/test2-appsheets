import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Wallet, Calendar, Search, Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/ui/Modal';

export default function GastosModule() {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loteFilter, setLoteFilter] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fecha: today(), lote: '', categoria: '', descripcion: '', monto: '' });
  const [isSaving, setIsSaving] = useState(false);

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: gastosData } = await supabase.from('bd_gastos').select('*').order('fecha', { ascending: false });
      const { data: catData } = await supabase.from('cat_categoria_gastos').select('*').order('nombre');
      const { data: comprasData } = await supabase.from('bd_compras').select('lote');

      setGastos(gastosData || []);
      setCategorias(catData || []);
      setLotes(Array.from(new Set((comprasData || []).map((c) => c.lote).filter(Boolean))));
    } catch (err) {
      console.error('Error cargando gastos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = gastos.filter((g) => {
    const matchesLote = loteFilter === 'ALL' || g.lote === loteFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (g.descripcion || '').toLowerCase().includes(q) ||
      (g.categoria || '').toLowerCase().includes(q) ||
      (g.lote || '').toLowerCase().includes(q);
    return matchesLote && matchesSearch;
  });

  const totalFiltrado = filtered.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const openNew = () => {
    setForm({ fecha: today(), lote: '', categoria: '', descripcion: '', monto: '' });
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (g) => {
    setForm({
      fecha: g.fecha,
      lote: g.lote || '',
      categoria: g.categoria || '',
      descripcion: g.descripcion || '',
      monto: g.monto != null ? String(g.monto) : '',
    });
    setEditing(g);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lote.trim() || !form.monto) {
      alert('Lote y monto son obligatorios.');
      return;
    }

    const categoriaObj = categorias.find((c) => c.nombre === form.categoria);

    const payload = {
      fecha: form.fecha,
      lote: form.lote.trim(),
      categoria: form.categoria.trim(),
      id_categoria: categoriaObj ? categoriaObj.id : null,
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto),
    };

    setIsSaving(true);
    try {
      const result = editing
        ? await supabase.from('bd_gastos').update(payload).eq('id', editing.id)
        : await supabase.from('bd_gastos').insert(payload);

      if (result.error) throw result.error;

      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Error guardando gasto: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`¿Eliminar el gasto de "${g.descripcion || g.lote}" por $${g.monto}?`)) return;
    const { error } = await supabase.from('bd_gastos').delete().eq('id', g.id);
    if (error) {
      alert('No se pudo eliminar: ' + error.message);
      return;
    }
    fetchData();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-rose-500" /> Gastos Operativos
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-normal">Registro y control de gastos por lote.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-md"
        >
          <Plus className="w-5 h-5" /> Nuevo Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gastos Registrados</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{gastos.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Gastos</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">
            ${gastos.reduce((a, g) => a + (Number(g.monto) || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lotes con gastos</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {new Set(gastos.map((g) => g.lote)).size}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total filtrado</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ${totalFiltrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase">Filtrar Lote:</label>
            <select
              value={loteFilter}
              onChange={(e) => setLoteFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos</option>
              {lotes.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por descripción o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Cargando gastos...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No hay gastos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider">Fecha</th>
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider">Lote</th>
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider">Categoría</th>
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider">Descripción</th>
                  <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Monto</th>
                  <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {g.fecha}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {g.lote}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">
                        {g.categoria || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{g.descripcion || '-'}</td>
                    <td className="p-4 text-right font-bold text-rose-600 tabular-nums">
                      ${Number(g.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(g)}
                          title="Editar"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(g)}
                          title="Eliminar"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Gasto' : 'Nuevo Gasto'}
        subtitle={editing ? `Gasto #${editing.id}` : 'Registra un gasto operativo por lote'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha *</label>
              <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Lote *</label>
              <select
                required
                value={form.lote}
                onChange={(e) => setForm({ ...form, lote: e.target.value })}
                className={inputClass}
              >
                <option value="">Selecciona un lote...</option>
                {lotes.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className={inputClass}
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Descripción</label>
            <input
              type="text"
              placeholder="Ej. Combustible para entrega"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Monto ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition disabled:opacity-50">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
