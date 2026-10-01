import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { AcopioPublico } from '../../api/red';
import { ATRIBUCION, CENTRO_INICIAL, MOSAICOS } from '../../componentes/mapa/MapaLeaflet';

// Marcadores con el color del tema; los pausados en gris con su ícono, no solo color (RNF-11)
const marcador = (a: AcopioPublico, elegido: boolean) =>
  L.divIcon({
    className: '',
    html:
      a.estado === 'PAUSADO'
        ? `<div class="flex size-9 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-outline text-on-primary shadow-md ${elegido ? 'ring-4 ring-primary' : ''}"><span class="material-symbols-outlined text-[18px]">pause_circle</span></div>`
        : `<div class="flex size-9 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary-container text-on-primary shadow-md ${elegido ? 'ring-4 ring-primary' : ''}"><span class="material-symbols-outlined text-[18px]">inventory_2</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const grupo = (c: L.MarkerCluster) =>
  L.divIcon({
    className: '',
    html: `<div class="flex size-10 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary text-on-primary text-label-md font-bold shadow-md">${c.getChildCount()}</div>`,
    iconSize: [40, 40],
  });

function Marcadores({
  acopios,
  elegido,
  alElegir,
}: {
  acopios: AcopioPublico[];
  elegido: string | null;
  alElegir: (id: string) => void;
}) {
  const mapa = useMap();
  useEffect(() => {
    const capa = L.markerClusterGroup({ iconCreateFunction: grupo, showCoverageOnHover: false });
    for (const a of acopios) {
      L.marker([a.lat, a.lng], {
        icon: marcador(a, a.id === elegido),
        title: a.nombre,
        alt: a.nombre,
        keyboard: true,
      })
        .on('click', () => alElegir(a.id))
        .addTo(capa);
    }
    mapa.addLayer(capa);
    return () => {
      mapa.removeLayer(capa);
    };
  }, [mapa, acopios, elegido, alElegir]);
  return null;
}

function Encuadre({
  acopios,
  centro,
}: {
  acopios: AcopioPublico[];
  centro: L.LatLngExpression | null;
}) {
  const mapa = useMap();
  useEffect(() => {
    if (centro) mapa.setView(centro, 14);
    else if (acopios.length > 0)
      mapa.fitBounds(L.latLngBounds(acopios.map((a) => [a.lat, a.lng] as [number, number])), {
        padding: [32, 32],
        maxZoom: 15,
      });
  }, [mapa, acopios, centro]);
  return null;
}

interface Props {
  acopios: AcopioPublico[];
  cerca: { lat: number; lng: number } | null;
  elegido: string | null;
  alElegir: (id: string) => void;
}

/** Mapa público de acopios (P5), con marcadores agrupados (RF-RED-002). */
export default function MapaAcopios({ acopios, cerca, elegido, alElegir }: Props) {
  return (
    <MapContainer
      center={[CENTRO_INICIAL.lat, CENTRO_INICIAL.lng]}
      zoom={11}
      className="size-full"
      aria-label="Mapa de acopios. La misma información está en la vista de lista."
    >
      <TileLayer url={MOSAICOS} attribution={ATRIBUCION} />
      <Encuadre acopios={acopios} centro={cerca ? [cerca.lat, cerca.lng] : null} />
      <Marcadores acopios={acopios} elegido={elegido} alElegir={alElegir} />
    </MapContainer>
  );
}
