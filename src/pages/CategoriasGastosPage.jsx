import React from 'react';
import CatalogCrud from '../components/CatalogCrud';
import { Tag } from 'lucide-react';

const fields = [
  { name: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ej. Combustible, Fletes, Mantenimiento' },
];

export default function CategoriasGastosPage() {
  return (
    <CatalogCrud
      tableName="cat_categoria_gastos"
      title="Categorías de Gasto"
      description="Catálogo de categorías para clasificar los gastos operativos."
      icon={Tag}
      fields={fields}
      searchKeys={['nombre']}
    />
  );
}
