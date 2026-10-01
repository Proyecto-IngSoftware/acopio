import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Punto } from '../../api/red';

/** Bogotá: punto de partida cuando todavía no hay ubicación. */
export const CENTRO_INICIAL: Punto = { lat: 4.711, lng: -74.0721 };

export const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const MOSAICOS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Un punto de color del tema; sin las imágenes de Leaflet, que el empaquetador no encuentra
const PIN = L.divIcon({
  className: '',
  html: '<div class="size-7 rounded-full border-4 border-surface-container-lowest bg-primary-container shadow-md"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function Seguir({ valor }: { valor: Punto | null }) {
  const mapa = useMap();
  useEffect(() => {
    if (valor) mapa.setView([valor.lat, valor.lng], Math.max(mapa.getZoom(), 16));
  }, [mapa, valor]);
  return null;
}

function AlTocar({ alCambiar }: { alCambiar: (p: Punto) => void }) {
  useMapEvents({ click: (e) => alCambiar({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

interface Props {
  valor: Punto | null;
  alCambiar: (p: Punto) => void;
}

export default function MapaLeaflet({ valor, alCambiar }: Props) {
  const centro = valor ?? CENTRO_INICIAL;
  return (
    <MapContainer
      center={[centro.lat, centro.lng]}
      zoom={valor ? 16 : 11}
      className="size-full"
      aria-label="Mapa para ubicar el pin"
    >
      <TileLayer url={MOSAICOS} attribution={ATRIBUCION} />
      <Seguir valor={valor} />
      <AlTocar alCambiar={alCambiar} />
      {valor && (
        <Marker
          position={[valor.lat, valor.lng]}
          icon={PIN}
          // Leaflet lo vuelve un botón; sin nombre, axe lo marca (aria-command-name)
          title="Ubicación elegida. Arrástrala para ajustarla"
          alt="Ubicación elegida"
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              alCambiar({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
