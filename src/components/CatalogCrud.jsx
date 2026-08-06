import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import Modal from './ui/Modal';

const emptyForm = (fields) =>
  fields.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {});

export default function CatalogCrud({ tableName, title, description, icon: Icon, fields, searchKeys }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(tableName).select('*').order('id');
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return searchKeys.some((key) => String(row[key] || '').toLowerCase().includes(q));
  });

  const openNew = () => {
    setForm(emptyForm(fields));
    setEditing(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (row) => {
    const f = {};
    fields.forEach((field) => {
      f[field.name] = row[field.name] != null ? String(row[field.name]) : '';
    });
    setForm(f);
    setEditing(row);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const payload = {};
      fields.forEach((field) => {
        const value = form[field.name];
        payload[field.name] = field.type === 'number' && value !== '' ? Number(value) : value.trim();
      });

      let result;
      if (editing) {
        result = await supabase.from(tableName).update(payload).eq('id', editing.id);
      } else {
        result = await supabase.from(tableName).insert(payload);
      }

      if (result.error) throw result.error;

      setShowModal(false);
      fetchRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`¿Eliminar "${row[searchKeys[0]] || row.id}"?\nEsta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from(tableName).delete().eq('id', row.id);
    if (error) {
      alert('No se pudo eliminar: ' + error.message);
      return;
    }
    fetchRows();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Icon className="w-5 h-5 text-indigo-600" /> {title}
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-normal">{description}</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-md"
        >
          <Plus className="w-5 h-5" /> Agregar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h3 className="font-bold text-slate-700 text-sm">
            Registros: <span className="text-blue-600">{filtered.length}</span>
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <div className="px-6 py-3 bg-rose-50 text-rose-700 text-sm border-b border-rose-100">{error}</div>}

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No hay registros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200">
                  {fields.map((f) => (
                    <th key={f.name} className="p-4 text-[11px] font-semibold uppercase tracking-wider">
                      {f.label}
                    </th>
                  ))}
                  <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {fields.map((f) => (
                      <td key={f.name} className="p-4 font-medium text-slate-700">
                        {f.type === 'number' && row[f.name] != null
                          ? Number(row[f.name]).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                          : row[f.name] || '-'}
                      </td>
                    ))}
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(row)}
                          title="Editar"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
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
        title={editing ? `Editar ${title}` : `Nuevo registro en ${title}`}
        size="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">{f.label} *</label>
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                step={f.type === 'number' ? '0.01' : undefined}
                min={f.type === 'number' ? '0' : undefined}
                required
                placeholder={f.placeholder || ''}
                value={form[f.name]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}

          {error && <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-lg border border-rose-100">{error}</div>}

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
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
