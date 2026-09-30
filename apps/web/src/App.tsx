import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { Rutas } from './rutas';

const consultas = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

export function App() {
  return (
    <QueryClientProvider client={consultas}>
      <BrowserRouter>
        <Rutas />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
