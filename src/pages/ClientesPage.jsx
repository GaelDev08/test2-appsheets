import React from 'react';
import CatalogCrud from '../components/CatalogCrud';
import { Users } from 'lucide-react';

const fields = [
  { name: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ej. Juan Pérez' },
  { name: 'telefono', label: 'Teléfono', type: 'text', placeholder: 'Ej. 555-123-4567' },
];

export default function ClientesPage() {
  return (
    <CatalogCrud
      tableName="cat_clientes"
      title="Clientes"
      description="Catálogo de clientes para asignar a las ventas."
      icon={Users}
      fields={fields}
      searchKeys={['nombre', 'telefono']}
    />
  );
}
