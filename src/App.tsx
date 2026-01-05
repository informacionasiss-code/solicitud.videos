import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { PortalDashboard } from "@/pages/portal/PortalDashboard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "sonner";

import Dashboard from "@/pages/Dashboard";
import Ingresos from "@/pages/Ingresos";
import Registros from "@/pages/Registros";
import Envios from "@/pages/Envios";
import PPUAgrupados from "@/pages/PPUAgrupados";
import BusesSinDisco from "@/pages/BusesSinDisco";

const queryClient = new QueryClient();

function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">Error de Configuración</h1>
          <p className="mb-4 text-sm text-slate-600">
            La aplicación no encuentra las variables de entorno de Supabase.
          </p>
          <div className="rounded bg-slate-100 p-3 text-xs font-mono text-slate-700">
            <p>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? 'Configurado' : 'Faltante'}</p>
            <p>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado' : 'Faltante'}</p>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Si estás en Render, verifica "Environment Variables" y asegúrate de hacer un "Clear Cache & Deploy".
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Portal Routes */}
            <Route path="/portal" element={<PublicLayout />}>
              <Route index element={<PortalDashboard />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="ingresos" element={<Ingresos />} />
              <Route path="registros" element={<Registros />} />
              <Route path="agrupados" element={<PPUAgrupados />} />
              <Route path="envios" element={<Envios />} />
              <Route path="buses-sin-disco" element={<BusesSinDisco />} />
            </Route>

            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/portal" replace />} />
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              fontFamily: 'var(--font-sans)',
            },
            className: 'glass'
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
