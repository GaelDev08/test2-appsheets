import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ComprasModule from './components/ComprasModule';
import VentasAbonosModule from './components/VentasAbonosModule';
import GastosModule from './pages/GastosModule';
import ProductosPage from './pages/ProductosPage';
import ClientesPage from './pages/ClientesPage';
import ProveedoresPage from './pages/ProveedoresPage';
import ReportesPage from './pages/ReportesPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const renderPage = () => {
    const key = `key-${refreshKey}`;
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage key={key} />;
      case 'compras':
        return <ComprasModule key={key} />;
      case 'ventas':
        return <VentasAbonosModule key={key} />;
      case 'gastos':
        return <GastosModule key={key} />;
      case 'productos':
        return <ProductosPage key={key} />;
      case 'clientes':
        return <ClientesPage key={key} />;
      case 'proveedores':
        return <ProveedoresPage key={key} />;
      case 'reportes':
        return <ReportesPage key={key} />;
      default:
        return <DashboardPage key={key} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          setSidebarOpen={setSidebarOpen}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 min-w-0">{renderPage()}</main>

        <footer className="px-4 lg:px-8 py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/60">
          Sistema de Control de Inventario, Lotes y Finanzas v2.0 &bull; React + Tailwind CSS + Supabase
        </footer>
      </div>
    </div>
  );
}
