import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Dashboard from "@/pages/Dashboard";
import Ingresos from "@/pages/Ingresos";
import Registros from "@/pages/Registros";
import Envios from "@/pages/Envios";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="ingresos" element={<Ingresos />} />
            <Route path="registros" element={<Registros />} />
            <Route path="envios" element={<Envios />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
