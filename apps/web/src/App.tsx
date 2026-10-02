import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { reintentarConsulta } from './api/cliente';
import { opcionesAcopiosPublicos } from './api/red';
import { SubirAlNavegar } from './componentes/SubirAlNavegar';
import { filtroDelMapa } from './portal/mapa/filtro';
import { Rutas } from './rutas';
import { SesionProveedor } from './sesion/Sesion';

const consultas = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: reintentarConsulta } },
});

// El mapa suele ser la primera visita, por un enlace compartido: los acopios se piden al
// arrancar, mientras baja la pantalla, y no cuando ya está dibujada (§9 del Bloque 1)
if (location.pathname === '/mapa') {
  const parametros = new URLSearchParams(location.search);
  void consultas.prefetchQuery(opcionesAcopiosPublicos(filtroDelMapa(parametros)));
}

export function App() {
  return (
    <QueryClientProvider client={consultas}>
      <BrowserRouter>
        <SesionProveedor>
          <SubirAlNavegar />
          <Rutas />
        </SesionProveedor>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
