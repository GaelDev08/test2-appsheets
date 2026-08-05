import React, { useState } from 'react';
import DashboardKPI from './components/DashboardKPI';
import ComprasModule from './components/ComprasModule';
import VentasAbonosModule from './components/VentasAbonosModule';
import { LayoutDashboard, ShoppingBag, Receipt, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans">
      {/* Navbar Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-inner">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wide text-white">
                Sistema ERP Inventario & Lotes <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase ml-1">v2.0</span>
              </h1>
              <p className="text-xs text-slate-400">Control de Compras, Ventas, Abonos y Gastos por Lote</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard KPIs
            </button>

            <button
              onClick={() => setActiveTab('compras')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'compras'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> Compras y Lotes
            </button>

            <button
              onClick={() => setActiveTab('ventas')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'ventas'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Receipt className="w-4 h-4" /> Ventas y Cuentas por Cobrar
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-4">
        {activeTab === 'dashboard' && <DashboardKPI />}
        {activeTab === 'compras' && <ComprasModule />}
        {activeTab === 'ventas' && <VentasAbonosModule />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Sistema de Control de Inventario, Lotes y Finanzas v2.0 &bull; Impulsado por React, Tailwind CSS y Supabase.
      </footer>
    </div>
  );
}
