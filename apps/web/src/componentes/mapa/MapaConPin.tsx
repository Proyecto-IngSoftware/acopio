import { lazy, Suspense, useEffect, useState } from 'react';
import type { Punto } from '../../api/red';
import { Campo } from '../Campo';
import { Esqueleto } from '../Esqueleto';

// Leaflet solo se descarga al abrir una pantalla con mapa (I-02)
const MapaLeaflet = lazy(() => import('./MapaLeaflet'));

interface Props {
  valor: Punto | null;
  alCambiar: (p: Punto) => void;
}

const comoTexto = (n: number | undefined) => (n === undefined ? '' : String(n));

/** Mapa con un pin que se arrastra (C21 y C9), y las coordenadas a mano para teclado. */
export function MapaConPin({ valor, alCambiar }: Props) {
  const [lat, fijarLat] = useState(comoTexto(valor?.lat));
  const [lng, fijarLng] = useState(comoTexto(valor?.lng));

  // Si el pin se mueve en el mapa, los campos lo siguen
  useEffect(() => {
    fijarLat(comoTexto(valor?.lat));
    fijarLng(comoTexto(valor?.lng));
  }, [valor?.lat, valor?.lng]);

  function escribir(nuevoLat: string, nuevoLng: string) {
    fijarLat(nuevoLat);
    fijarLng(nuevoLng);
    const p = { lat: Number(nuevoLat), lng: Number(nuevoLng) };
    if (nuevoLat && nuevoLng && Number.isFinite(p.lat) && Number.isFinite(p.lng)) alCambiar(p);
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="isolate h-56 overflow-hidden rounded-xl border border-outline-variant">
        <Suspense fallback={<Esqueleto etiqueta="Cargando el mapa" className="h-56" />}>
          <MapaLeaflet valor={valor} alCambiar={alCambiar} />
        </Suspense>
      </div>
      <p className="text-body-sm text-on-surface-variant">
        Arrastra el pin o toca el mapa para ajustar la ubicación exacta.
      </p>
      <details className="rounded-xl bg-surface-container-low p-space-sm">
        <summary className="min-h-[44px] cursor-pointer content-center text-label-md text-primary-container">
          Ajustar coordenadas a mano
        </summary>
        <div className="mt-space-sm grid grid-cols-2 gap-space-sm">
          <Campo
            id="pin-lat"
            etiqueta="Latitud"
            inputMode="decimal"
            value={lat}
            onChange={(e) => escribir(e.target.value, lng)}
          />
          <Campo
            id="pin-lng"
            etiqueta="Longitud"
            inputMode="decimal"
            value={lng}
            onChange={(e) => escribir(lat, e.target.value)}
          />
        </div>
      </details>
    </div>
  );
}
