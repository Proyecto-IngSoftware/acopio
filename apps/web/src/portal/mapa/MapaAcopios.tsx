import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { AcopioPublico, ZonaPublica } from '../../api/red';
import { ATRIBUCION, CENTRO_INICIAL, MOSAICOS } from '../../componentes/mapa/MapaLeaflet';
import { claveEncuadre, leerClave } from './encuadre';
import { etiquetaMarcador, htmlMarcador } from './marcador';

const marcador = (a: AcopioPublico, elegido: boolean) =>
  L.divIcon({
    className: '',
    html: htmlMarcador(a, elegido),
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
        title: etiquetaMarcador(a),
        alt: etiquetaMarcador(a),
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

// La zona: el círculo de su radio y un pin para tocarla. Los colores van en estilos.css
// (.zona-necesidad), con tokens de la marca y no con los del inventario (ADR-0006)
const pinZona = (elegida: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="flex size-8 items-center justify-center rounded-full border-2 border-primary-container bg-surface-container-lowest text-primary-container shadow-md ${elegida ? 'ring-4 ring-primary' : ''}"><span aria-hidden="true" class="material-symbols-outlined text-[18px]">campaign</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

function Zonas({
  zonas,
  elegida,
  alElegir,
}: {
  zonas: ZonaPublica[];
  elegida: string | null;
  alElegir: (id: string) => void;
}) {
  const mapa = useMap();
  useEffect(() => {
    const capa = L.layerGroup();
    for (const z of zonas) {
      const centro: [number, number] = [z.centro.lat, z.centro.lng];
      L.circle(centro, {
        radius: z.radioKm * 1000,
        className: `zona-necesidad${z.zonaId === elegida ? ' zona-necesidad-elegida' : ''}`,
      })
        .on('click', () => alElegir(z.zonaId))
        .addTo(capa);
      L.marker(centro, {
        icon: pinZona(z.zonaId === elegida),
        title: 'Zona con necesidad',
        alt: 'Zona con necesidad',
        keyboard: true,
      })
        .on('click', () => alElegir(z.zonaId))
        .addTo(capa);
    }
    mapa.addLayer(capa);
    return () => {
      mapa.removeLayer(capa);
    };
  }, [mapa, zonas, elegida, alElegir]);
  return null;
}

/** Abarca los acopios y los centros de las zonas con necesidad, salvo con «Cerca de mí».
 *  Solo se rehace cuando cambian los puntos (claveEncuadre), no en cada render. */
function Encuadre({
  acopios,
  zonas,
  centro,
}: {
  acopios: AcopioPublico[];
  zonas: ZonaPublica[];
  centro: { lat: number; lng: number } | null;
}) {
  const mapa = useMap();
  const clave = claveEncuadre(acopios, zonas, centro);
  useEffect(() => {
    const { centro: punto, puntos } = leerClave(clave);
    // Sin animación: Leaflet descarta un zoom pedido mientras anima el anterior, y las zonas
    // suelen llegar justo después de los acopios
    if (punto) mapa.setView(punto, 14, { animate: false });
    else if (puntos.length > 0)
      mapa.fitBounds(L.latLngBounds(puntos), { padding: [32, 32], maxZoom: 15, animate: false });
  }, [mapa, clave]);
  return null;
}

interface Props {
  acopios: AcopioPublico[];
  cerca: { lat: number; lng: number } | null;
  elegido: string | null;
  alElegir: (id: string) => void;
  zonas?: ZonaPublica[];
  zonaElegida?: string | null;
  alElegirZona?: (id: string) => void;
}

const SIN_ZONAS: ZonaPublica[] = [];
const nada = () => {};

/** Mapa público de acopios (P5), con marcadores agrupados (RF-RED-002) y las zonas con
 *  necesidad (HU-13.1). */
export default function MapaAcopios({
  acopios,
  cerca,
  elegido,
  alElegir,
  zonas = SIN_ZONAS,
  zonaElegida = null,
  alElegirZona = nada,
}: Props) {
  return (
    <MapContainer
      center={[CENTRO_INICIAL.lat, CENTRO_INICIAL.lng]}
      zoom={11}
      className="size-full"
      aria-label="Mapa de acopios. La misma información está en la vista de lista."
    >
      <TileLayer url={MOSAICOS} attribution={ATRIBUCION} />
      <Encuadre acopios={acopios} zonas={zonas} centro={cerca} />
      <Zonas zonas={zonas} elegida={zonaElegida} alElegir={alElegirZona} />
      <Marcadores acopios={acopios} elegido={elegido} alElegir={alElegir} />
    </MapContainer>
  );
}
