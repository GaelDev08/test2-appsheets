# LOTES ERP v2.0 — Sistema de Control de Inventario, Lotes y Finanzas

Sistema ERP web para el control integral de **Compras, Ventas, Abonos, Gastos y Rentabilidad por Lote**, evolucionado desde una estructura previa de hojas de cálculo (Excel) hacia una aplicación full-stack con base de datos relacional, integridad referencial y cálculos financieros automatizados.

![Stack](https://img.shields.io/badge/React%2019-Vite-61DAFB) ![Tailwind](https://img.shields.io/badge/TailwindCSS-v4-38B2AC) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000)

---

## 📌 Contexto del Proyecto

El proyecto nace de la necesidad de migrar un control manual basado en Excel a una aplicación moderna. La Versión 1.0 trabajaba con tablas planas e independientes. La **Versión 2.0** introduce:

- **Integridad relacional real**: claves foráneas (`ON DELETE CASCADE` / `SET NULL`) entre cabeceras y detalles.
- **Cálculos automatizados**: la base de datos calcula los totales de línea mediante columnas `GENERATED ALWAYS AS (cantidad * precio)`.
- **Cuentas por cobrar**: saldo pendiente calculado en tiempo real (`Total Venta − Σ Abonos`).
- **Rentabilidad por lote**: utilidad neta automática (`Ventas − (Compras + Gastos)`).
- **Catálogos maestros**: Productos, Clientes, Proveedores y Categorías de gasto reutilizables en los formularios.
- **Interfaz empresarial responsive**: sidebar lateral, dashboard de KPIs, tablas profesionales y modales maestro-detalle.

---

## 🧰 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 19 + Vite 8 |
| **Estilos** | Tailwind CSS v4 |
| **Backend / BaaS** | Supabase (PostgreSQL + REST API + Auth + RLS) |
| **Cliente de datos** | `@supabase/supabase-js` |
| **Estado/Server data** | `@tanstack/react-query` |
| **Iconografía** | `lucide-react` |
| **Despliegue** | Vercel |

### Dependencias

```bash
npm install @supabase/supabase-js @tanstack/react-query lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

---

## 📁 Estructura del Proyecto

```
├── public/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx            # Navegación lateral + drawer móvil
│   │   ├── Header.jsx             # Buscador global, notificaciones, actualizar
│   │   ├── KPIGrid.jsx            # Tarjetas de métricas con tendencias
│   │   ├── DataTable.jsx          # Tabla de rendimiento por lote
│   │   ├── CatalogCrud.jsx        # CRUD genérico de catálogos
│   │   ├── ComprasModule.jsx      # Compras/Lotes maestro-detalle
│   │   ├── VentasAbonosModule.jsx # Ventas, cuentas por cobrar y abonos
│   │   └── ui/
│   │       └── Modal.jsx          # Modal reutilizable
│   ├── hooks/
│   │   └── useDashboardData.js    # KPIs y rentabilidad por lote
│   ├── lib/
│   │   └── supabase.js            # Cliente de Supabase
│   ├── pages/
│   │   ├── DashboardPage.jsx      # Panel de control
│   │   ├── ProductosPage.jsx      # Catálogo de productos
│   │   ├── ClientesPage.jsx       # Catálogo de clientes
│   │   ├── ProveedoresPage.jsx    # Catálogo de proveedores
│   │   ├── GastosModule.jsx       # Gastos operativos
│   │   └── ReportesPage.jsx       # Reportes y analítica
│   ├── App.jsx                    # Layout y enrutamiento por secciones
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
```

---

## 🗂️ Módulos del Sistema

### 1. Panel de Control (`DashboardPage.jsx`)
- 6 KPIs financieros: Inversión, Ingresos, Cobrado, Por Cobrar, Gastos y **Utilidad Neta Consolidada** (destacada).
- Tabla de **rendimiento por lote** con utilidad neta y margen (%). → `useDashboardData.js`

### 2. Compras y Lotes (`ComprasModule.jsx`)
- Registro **maestro-detalle**: cabecera (fecha, lote, proveedor, notas) + N productos.
- Selección de productos desde el **catálogo** (precio auto-completado) y de **proveedor**.
- Resumen de **inversión acumulada por lote**.
- **Editar** y **eliminar** compras (detalles en cascada).

### 3. Ventas y Abonos (`VentasAbonosModule.jsx`)
- Venta ligada a lote y **cliente del catálogo**.
- Panel de **cuentas por cobrar**: `Total Venta − Σ Abonos = Saldo Pendiente` con estados PAGADO / PARCIAL / PENDIENTE.
- Registro, listado y **eliminación de abonos**.
- **Editar** y **eliminar** ventas (abonos en cascada).

### 4. Gastos Operativos (`GastosModule.jsx`)
- CRUD completo de gastos por lote con categoría (`cat_categoria_gastos`), descripción y monto.
- Filtros por lote y búsqueda, KPIs de totales.

### 5. Catálogos (CRUD genérico `CatalogCrud.jsx`)
- **Productos** → `cat_productos`
- **Clientes** → `cat_clientes`
- **Proveedores** → `cat_proveedores`
- Búsqueda, alta, edición y eliminación con confirmación.

### 6. Reportes y Analítica (`ReportesPage.jsx`)
- Filtros por **rango de fechas** y **lote**.
- KPIs del período, ventas por día, gastos por categoría, top productos, compras por lote.
- **Cuentas por cobrar** consolidado con **exportación CSV**.

---

## 🗄️ Esquema de Base de Datos (Supabase)

| Tabla | Descripción | FK |
|-------|-------------|----|
| `cat_productos` | Productos del catálogo | — |
| `cat_clientes` | Clientes | — |
| `cat_proveedores` | Proveedores | — |
| `cat_categoria_gastos` | Categorías de gasto | — |
| `bd_compras` | Cabecera de compra (lote) | → `cat_proveedores` |
| `bd_producto_compras` | Líneas de compra | → `bd_compras` (CASCADE) |
| `bd_ventas` | Cabecera de venta | → `cat_clientes` |
| `bd_producto_ventas` | Líneas de venta | → `bd_ventas` (CASCADE) |
| `bd_abonos` | Abonos de venta | → `bd_ventas` (CASCADE) |
| `bd_gastos` | Gastos por lote | → `cat_categoria_gastos` |

> Las columnas `total` de las tablas de detalle son `GENERATED ALWAYS AS (cantidad * precio) STORED`.

El script SQL completo (tablas, FKs, vistas, índices y políticas RLS) se encuentra en la sección **Script SQL para Supabase** del proyecto.

---

## 🚀 Configuración Local

### 1. Variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_PUBLICA
```

### 2. Instalar y ejecutar

```bash
npm install
npm run dev
```

### 3. Compilación de producción

```bash
npm run build
npm run preview
```

---

## 🌐 Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel: **Add New → Project** → selecciona el repo.
3. Configuración:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Agrega las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy**. 🚀

---

## 🛠️ Notas de Desarrollo

- Las columnas `total` son calculadas por la base de datos: **no enviar `total` en los inserts** (`cannot insert a non-DEFAULT value`).
- Al eliminar una compra/venta, los detalles y abonos se eliminan automáticamente por `ON DELETE CASCADE`.
- Para usar proveedores, ejecuta la migración SQL que crea `cat_proveedores` y agrega `id_proveedor` a `bd_compras`.
