import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, TABLES } from './supabaseClient'

const emptyProductForm = { nombre: '', precio: '', cantidad: '' }
const emptyCompraForm = { fecha: '', proveedor: '', observaciones: '' }
const emptyDetalleForm = { producto_id: '', cantidad: '', precio_unitario: '' }

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('es-ES').format(new Date(value))
}

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none ring-violet-500 transition focus:ring-2'

function ErrorBanner({ message }) {
  if (!message) return null

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}

function ProductsModule({ products, loading, error, onRefresh, onClearError }) {
  const [form, setForm] = useState(emptyProductForm)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products

    return products.filter((product) =>
      [product.nombre, product.precio, product.cantidad]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [products, search])

  const stats = useMemo(() => {
    const totalUnits = filteredProducts.reduce(
      (sum, product) => sum + Number(product.cantidad || 0),
      0,
    )
    const totalValue = filteredProducts.reduce(
      (sum, product) =>
        sum + Number(product.precio || 0) * Number(product.cantidad || 0),
      0,
    )

    return { count: filteredProducts.length, totalUnits, totalValue }
  }, [filteredProducts])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLocalError('')
    onClearError()

    if (!form.nombre.trim()) {
      setLocalError('El nombre del producto es obligatorio.')
      return
    }

    const precio = Number(form.precio)
    const cantidad = Number(form.cantidad)

    if (Number.isNaN(precio) || precio < 0) {
      setLocalError('El precio debe ser un numero valido mayor o igual a 0.')
      return
    }

    if (Number.isNaN(cantidad) || cantidad < 0 || !Number.isInteger(cantidad)) {
      setLocalError('La cantidad debe ser un numero entero mayor o igual a 0.')
      return
    }

    setSaving(true)

    const { error: saveError } = await supabase.from(TABLES.productos).insert({
      nombre: form.nombre.trim(),
      precio,
      cantidad,
    })

    if (saveError) {
      setLocalError(saveError.message)
    } else {
      setForm(emptyProductForm)
      await onRefresh()
    }

    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Quieres eliminar este producto del inventario?')) return

    setLocalError('')
    onClearError()

    const { error: deleteError } = await supabase
      .from(TABLES.productos)
      .delete()
      .eq('id', id)

    if (deleteError) {
      setLocalError(deleteError.message)
      return
    }

    await onRefresh()
  }

  const displayError = localError || error

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Productos</p>
          <p className="mt-1 text-2xl font-bold">{stats.count}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Unidades en stock</p>
          <p className="mt-1 text-2xl font-bold">{stats.totalUnits}</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
          <p className="text-sm text-violet-700">Valor total inventario</p>
          <p className="mt-1 text-2xl font-bold text-violet-900">
            {formatCurrency(stats.totalValue)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Nuevo producto</h2>
          <p className="mt-1 text-sm text-slate-500">
            Crea items para usarlos en compras e inventario.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ej. Monitor 24 pulgadas"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Precio
              <input
                name="precio"
                type="number"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={handleChange}
                className={inputClass}
                placeholder="0.00"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Cantidad inicial
              <input
                name="cantidad"
                type="number"
                min="0"
                step="1"
                value={form.cantidad}
                onChange={handleChange}
                className={inputClass}
                placeholder="0"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Agregar producto'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Listado de productos</h2>
              <p className="text-sm text-slate-500">
                {filteredProducts.length} producto
                {filteredProducts.length === 1 ? '' : 's'}
              </p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none ring-violet-500 focus:ring-2 sm:max-w-xs"
            />
          </div>

          <div className="mt-4 space-y-4">
            <ErrorBanner message={displayError} />

            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Cargando productos...
              </p>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <p className="font-semibold">Sin productos registrados</p>
                <p className="mt-2 text-sm text-slate-500">
                  Agrega productos antes de crear detalles de compra.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Producto</th>
                        <th className="px-4 py-3 font-semibold">Precio</th>
                        <th className="px-4 py-3 font-semibold">Stock</th>
                        <th className="px-4 py-3 font-semibold">Valor</th>
                        <th className="px-4 py-3 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((product) => {
                        const lineTotal =
                          Number(product.precio || 0) *
                          Number(product.cantidad || 0)

                        return (
                          <tr key={product.id} className="hover:bg-violet-50/40">
                            <td className="px-4 py-4 font-semibold">
                              {product.nombre}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(product.precio)}
                            </td>
                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                                {product.cantidad}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-semibold text-violet-700">
                              {formatCurrency(lineTotal)}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => handleDelete(product.id)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function PurchasesModule({
  products,
  compras,
  loading,
  error,
  onRefresh,
  onClearError,
}) {
  const [compraForm, setCompraForm] = useState(emptyCompraForm)
  const [detalleForm, setDetalleForm] = useState(emptyDetalleForm)
  const [selectedCompraId, setSelectedCompraId] = useState('')
  const [savingCompra, setSavingCompra] = useState(false)
  const [savingDetalle, setSavingDetalle] = useState(false)
  const [localError, setLocalError] = useState('')

  const selectedCompra = useMemo(
    () => compras.find((compra) => compra.id === selectedCompraId) ?? null,
    [compras, selectedCompraId],
  )

  const detalles = selectedCompra?.detalles_compra ?? []

  const compraTotal = useMemo(
    () =>
      detalles.reduce(
        (sum, detalle) =>
          sum +
          Number(detalle.cantidad || 0) * Number(detalle.precio_unitario || 0),
        0,
      ),
    [detalles],
  )

  const handleCompraChange = (event) => {
    const { name, value } = event.target
    setCompraForm((current) => ({ ...current, [name]: value }))
  }

  const handleDetalleChange = (event) => {
    const { name, value } = event.target
    setDetalleForm((current) => ({ ...current, [name]: value }))

    if (name === 'producto_id') {
      const product = products.find((item) => item.id === value)
      if (product) {
        setDetalleForm((current) => ({
          ...current,
          producto_id: value,
          precio_unitario: String(product.precio ?? ''),
        }))
      }
    }
  }

  const handleCreateCompra = async (event) => {
    event.preventDefault()
    setLocalError('')
    onClearError()

    if (!compraForm.fecha) {
      setLocalError('La fecha de la compra es obligatoria.')
      return
    }

    if (!compraForm.proveedor.trim()) {
      setLocalError('El proveedor es obligatorio.')
      return
    }

    setSavingCompra(true)

    const { data, error: saveError } = await supabase
      .from(TABLES.compras)
      .insert({
        fecha: compraForm.fecha,
        proveedor: compraForm.proveedor.trim(),
        observaciones: compraForm.observaciones.trim(),
      })
      .select('id')
      .single()

    if (saveError) {
      setLocalError(saveError.message)
    } else {
      setCompraForm(emptyCompraForm)
      setSelectedCompraId(data.id)
      await onRefresh()
    }

    setSavingCompra(false)
  }

  const handleAddDetalle = async (event) => {
    event.preventDefault()
    setLocalError('')
    onClearError()

    if (!selectedCompraId) {
      setLocalError('Selecciona una compra antes de agregar productos.')
      return
    }

    if (!detalleForm.producto_id) {
      setLocalError('Selecciona un producto.')
      return
    }

    const cantidad = Number(detalleForm.cantidad)
    const precioUnitario = Number(detalleForm.precio_unitario)

    if (Number.isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) {
      setLocalError('La cantidad debe ser un entero mayor a 0.')
      return
    }

    if (Number.isNaN(precioUnitario) || precioUnitario < 0) {
      setLocalError('El precio unitario debe ser un numero valido.')
      return
    }

    const product = products.find((item) => item.id === detalleForm.producto_id)
    if (!product) {
      setLocalError('El producto seleccionado no existe.')
      return
    }

    setSavingDetalle(true)

    const { error: detalleError } = await supabase
      .from(TABLES.detallesCompra)
      .insert({
        compra_id: selectedCompraId,
        producto_id: detalleForm.producto_id,
        cantidad,
        precio_unitario: precioUnitario,
      })

    if (detalleError) {
      setLocalError(detalleError.message)
      setSavingDetalle(false)
      return
    }

    const newStock = Number(product.cantidad || 0) + cantidad
    const { error: stockError } = await supabase
      .from(TABLES.productos)
      .update({ cantidad: newStock })
      .eq('id', product.id)

    if (stockError) {
      setLocalError(
        `Detalle guardado, pero no se pudo actualizar el stock: ${stockError.message}`,
      )
    } else {
      setDetalleForm(emptyDetalleForm)
    }

    await onRefresh()
    setSavingDetalle(false)
  }

  const handleDeleteCompra = async (compraId) => {
    if (!window.confirm('Quieres eliminar esta compra y sus detalles?')) return

    setLocalError('')
    onClearError()

    const compra = compras.find((item) => item.id === compraId)
    const compraDetalles = compra?.detalles_compra ?? []

    for (const detalle of compraDetalles) {
      const product = products.find((item) => item.id === detalle.producto_id)
      if (product) {
        const newStock = Math.max(
          0,
          Number(product.cantidad || 0) - Number(detalle.cantidad || 0),
        )
        await supabase
          .from(TABLES.productos)
          .update({ cantidad: newStock })
          .eq('id', product.id)
      }
    }

    await supabase.from(TABLES.detallesCompra).delete().eq('compra_id', compraId)

    const { error: deleteError } = await supabase
      .from(TABLES.compras)
      .delete()
      .eq('id', compraId)

    if (deleteError) {
      setLocalError(deleteError.message)
      return
    }

    if (selectedCompraId === compraId) {
      setSelectedCompraId('')
      setDetalleForm(emptyDetalleForm)
    }

    await onRefresh()
  }

  const handleDeleteDetalle = async (detalle) => {
    if (!window.confirm('Quieres eliminar este detalle de la compra?')) return

    setLocalError('')
    onClearError()

    const product = products.find((item) => item.id === detalle.producto_id)
    if (product) {
      const newStock = Math.max(
        0,
        Number(product.cantidad || 0) - Number(detalle.cantidad || 0),
      )
      await supabase
        .from(TABLES.productos)
        .update({ cantidad: newStock })
        .eq('id', product.id)
    }

    const { error: deleteError } = await supabase
      .from(TABLES.detallesCompra)
      .delete()
      .eq('id', detalle.id)

    if (deleteError) {
      setLocalError(deleteError.message)
      return
    }

    await onRefresh()
  }

  const displayError = localError || error

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Nueva compra</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra los datos generales de la compra.
          </p>

          <form onSubmit={handleCreateCompra} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Fecha
              <input
                name="fecha"
                type="date"
                value={compraForm.fecha}
                onChange={handleCompraChange}
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Proveedor
              <input
                name="proveedor"
                value={compraForm.proveedor}
                onChange={handleCompraChange}
                className={inputClass}
                placeholder="Ej. Distribuidora ABC"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Observaciones
              <textarea
                name="observaciones"
                value={compraForm.observaciones}
                onChange={handleCompraChange}
                rows={3}
                className={inputClass}
                placeholder="Notas adicionales de la compra"
              />
            </label>

            <button
              type="submit"
              disabled={savingCompra}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingCompra ? 'Creando compra...' : 'Crear compra'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Compras registradas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona una compra para agregar productos.
          </p>

          <div className="mt-4 space-y-4">
            <ErrorBanner message={displayError} />

            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Cargando compras...
              </p>
            ) : compras.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <p className="font-semibold">Sin compras registradas</p>
                <p className="mt-2 text-sm text-slate-500">
                  Crea una compra para empezar a agregar detalles.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Fecha</th>
                        <th className="px-4 py-3 font-semibold">Proveedor</th>
                        <th className="px-4 py-3 font-semibold">Items</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        <th className="px-4 py-3 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compras.map((compra) => {
                        const items = compra.detalles_compra ?? []
                        const total = items.reduce(
                          (sum, detalle) =>
                            sum +
                            Number(detalle.cantidad || 0) *
                              Number(detalle.precio_unitario || 0),
                          0,
                        )
                        const isSelected = compra.id === selectedCompraId

                        return (
                          <tr
                            key={compra.id}
                            className={
                              isSelected
                                ? 'bg-emerald-50/70'
                                : 'hover:bg-slate-50'
                            }
                          >
                            <td className="px-4 py-4">{formatDate(compra.fecha)}</td>
                            <td className="px-4 py-4 font-medium">
                              {compra.proveedor}
                            </td>
                            <td className="px-4 py-4">{items.length}</td>
                            <td className="px-4 py-4 font-semibold text-emerald-700">
                              {formatCurrency(total)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCompraId(compra.id)}
                                  className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                  {isSelected ? 'Seleccionada' : 'Ver detalle'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCompra(compra.id)}
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedCompra && (
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Detalle de compra</h2>
              <p className="text-sm text-slate-500">
                {formatDate(selectedCompra.fecha)} · {selectedCompra.proveedor}
              </p>
              {selectedCompra.observaciones && (
                <p className="mt-1 text-sm text-slate-600">
                  {selectedCompra.observaciones}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-wide text-emerald-700">
                Total compra
              </p>
              <p className="text-2xl font-bold text-emerald-900">
                {formatCurrency(compraTotal)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
            <form
              onSubmit={handleAddDetalle}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <h3 className="font-semibold">Agregar producto a la compra</h3>

              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Producto
                  <select
                    name="producto_id"
                    value={detalleForm.producto_id}
                    onChange={handleDetalleChange}
                    className={inputClass}
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.nombre} (stock: {product.cantidad})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Cantidad comprada
                  <input
                    name="cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={detalleForm.cantidad}
                    onChange={handleDetalleChange}
                    className={inputClass}
                    placeholder="1"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Precio unitario
                  <input
                    name="precio_unitario"
                    type="number"
                    min="0"
                    step="0.01"
                    value={detalleForm.precio_unitario}
                    onChange={handleDetalleChange}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </label>

                <button
                  type="submit"
                  disabled={savingDetalle || products.length === 0}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingDetalle ? 'Agregando...' : 'Agregar a la compra'}
                </button>
              </div>
            </form>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              {detalles.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="font-semibold">Esta compra aun no tiene productos</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Usa el formulario para agregar items del inventario.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Producto</th>
                        <th className="px-4 py-3 font-semibold">Cantidad</th>
                        <th className="px-4 py-3 font-semibold">Precio unit.</th>
                        <th className="px-4 py-3 font-semibold">Subtotal</th>
                        <th className="px-4 py-3 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detalles.map((detalle) => {
                        const subtotal =
                          Number(detalle.cantidad || 0) *
                          Number(detalle.precio_unitario || 0)

                        return (
                          <tr key={detalle.id} className="hover:bg-emerald-50/40">
                            <td className="px-4 py-4 font-medium">
                              {detalle.productos?.nombre || 'Producto'}
                            </td>
                            <td className="px-4 py-4">{detalle.cantidad}</td>
                            <td className="px-4 py-4">
                              {formatCurrency(detalle.precio_unitario)}
                            </td>
                            <td className="px-4 py-4 font-semibold text-emerald-700">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => handleDeleteDetalle(detalle)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function App() {
  const [activeModule, setActiveModule] = useState('productos')
  const [products, setProducts] = useState([])
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')

    const [productsResult, comprasResult] = await Promise.all([
      supabase
        .from(TABLES.productos)
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from(TABLES.compras)
        .select(
          `
          *,
          detalles_compra (
            *,
            productos ( nombre )
          )
        `,
        )
        .order('created_at', { ascending: false }),
    ])

    if (productsResult.error) {
      setError(productsResult.error.message)
      setProducts([])
    } else {
      setProducts(productsResult.data ?? [])
    }

    if (comprasResult.error) {
      setError((current) => current || comprasResult.error.message)
      setCompras([])
    } else {
      setCompras(comprasResult.data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-white to-violet-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">
                AppSheet V2
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Inventario y compras
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Gestiona productos, compras y detalles conectados entre{' '}
                <code>{TABLES.productos}</code>, <code>{TABLES.compras}</code> y{' '}
                <code>{TABLES.detallesCompra}</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchData}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-50"
            >
              Actualizar todo
            </button>
          </div>

          <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveModule('productos')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeModule === 'productos'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Productos
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('compras')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeModule === 'compras'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compras
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeModule === 'productos' ? (
          <ProductsModule
            products={products}
            loading={loading}
            error={error}
            onRefresh={fetchData}
            onClearError={() => setError('')}
          />
        ) : (
          <PurchasesModule
            products={products}
            compras={compras}
            loading={loading}
            error={error}
            onRefresh={fetchData}
            onClearError={() => setError('')}
          />
        )}
      </main>
    </div>
  )
}

export default App
