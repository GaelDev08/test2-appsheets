import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ComprasModule from './components/ComprasModule';
import VentasAbonosModule from './components/VentasAbonosModule';
import { Construction } from 'lucide-react';

function PlaceholderPage({ title, description }) {
  return (
    <div className="p-4 lg:p-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
        <Construction className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500 mt-2">{description}</p>
      </div>
    </div>
  );
}

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
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage key={`dash-${refreshKey}`} />;
      case 'compras':
        return <ComprasModule key={`compras-${refreshKey}`} />;
      case 'ventas':
        return <VentasAbonosModule key={`ventas-${refreshKey}`} />;
      case 'inventario':
        return (
          <PlaceholderPage
            title="Inventario General"
            description="Módulo de inventario de productos y stock disponible. Disponible en la próxima iteración."
          />
        );
      case 'gastos':
        return (
          <PlaceholderPage
            title="Gastos Operativos"
            description="Registro y control de gastos por lote. Disponible en la próxima iteración."
          />
        );
      case 'reportes':
        return (
          <PlaceholderPage
            title="Reportes y Analítica"
            description="Reportes consolidados y analítica financiera. Disponible en la próxima iteración."
          />
        );
      default:
        return <DashboardPage key={`dash-${refreshKey}`} />;
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
