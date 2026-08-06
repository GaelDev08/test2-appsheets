import React from 'react';
import CatalogCrud from '../components/CatalogCrud';
import { Package } from 'lucide-react';

const fields = [
  { name: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ej. Harina 1kg' },
  { name: 'precio', label: 'Precio ($)', type: 'number', placeholder: '0.00' },
];

export default function ProductosPage() {
  return (
    <CatalogCrud
      tableName="cat_productos"
      title="Productos / Inventario"
      description="Catálogo de productos disponibles para compras y ventas."
      icon={Package}
      fields={fields}
      searchKeys={['nombre', 'precio']}
    />
  );
}
