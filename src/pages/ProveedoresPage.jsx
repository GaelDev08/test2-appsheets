import React from 'react';
import CatalogCrud from '../components/CatalogCrud';
import { Truck } from 'lucide-react';

const fields = [
  { name: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ej. Distribuidora ABC' },
  { name: 'telefono', label: 'Teléfono', type: 'text', placeholder: 'Ej. 555-987-6543' },
];

export default function ProveedoresPage() {
  return (
    <CatalogCrud
      tableName="cat_proveedores"
      title="Proveedores"
      description="Catálogo de proveedores para asignar a las compras."
      icon={Truck}
      fields={fields}
      searchKeys={['nombre', 'telefono']}
    />
  );
}
