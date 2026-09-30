import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { SubirAlNavegar } from './componentes/SubirAlNavegar';
import { Rutas } from './rutas';
import { SesionProveedor } from './sesion/Sesion';

const consultas = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

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
