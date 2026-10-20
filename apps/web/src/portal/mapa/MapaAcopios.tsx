import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { AcopioPublico, ZonaPublica } from '../../api/red';
import { ATRIBUCION, CENTRO_INICIAL, MOSAICOS } from '../../componentes/mapa/MapaLeaflet';
import type { EtiquetaMapa } from './necesidad';
import { claveEncuadre, leerClave } from './encuadre';
import {
  altoPunto,
  anchoPunto,
  etiquetaMarcador,
  htmlGrupo,
  htmlMarcador,
  htmlZona,
  tipoDeGrupo,
  type TipoGrupo,
} from './marcador';

// La píldora mide hasta unos 140 px; el punto, lo que mida su etiqueta o su círculo (anchoPunto).
// El ancla es la base, sobre el punto
const marcador = (
  a: AcopioPublico,
  elegido: boolean,
  etiqueta: EtiquetaMapa | null,
  apagado: boolean,
) => {
  const punto = a.tipo === 'OPERADO' && a.estado !== 'PAUSADO';
  const texto = etiqueta && !apagado ? etiqueta.texto : null;
  const alto = punto ? altoPunto(elegido, !!texto) : 36;
  const ancho = punto ? anchoPunto(elegido, texto) : 140;
  return L.divIcon({
    className: '',
    html: htmlMarcador(a, elegido, etiqueta, apagado),
    iconSize: [ancho, alto],
    iconAnchor: [ancho / 2, alto],
  });
};

// «FALTA: Arroz» se lee «Falta: Arroz»: solo la palabra en mayúsculas del comienzo baja a minúsculas
const capitalizar = (t: string) =>
  t.replace(/^[A-ZÁÉÍÓÚÑ ]+/, (m) => m.charAt(0) + m.slice(1).toLowerCase());

const grupo = (tipo: TipoGrupo) => (c: L.MarkerCluster) =>
  L.divIcon({ className: '', html: htmlGrupo(tipo, c.getChildCount()), iconSize: [40, 40] });

function Marcadores({
  acopios,
  elegido,
  alElegir,
  etiquetas,
  apagados,
}: {
  acopios: AcopioPublico[];
  elegido: string | null;
  alElegir: (id: string) => void;
  etiquetas: Map<string, EtiquetaMapa>;
  apagados: Set<string>;
}) {
  const mapa = useMap();
  useEffect(() => {
    // Una capa de agrupación por tipo: un grupo nunca mezcla acopios con puntos de RedAcopio
    const capas = {
      acopio: L.markerClusterGroup({
        iconCreateFunction: grupo('acopio'),
        showCoverageOnHover: false,
      }),
      referenciado: L.markerClusterGroup({
        iconCreateFunction: grupo('referenciado'),
        showCoverageOnHover: false,
      }),
    };
    for (const a of acopios) {
      const etiqueta = etiquetas.get(a.id) ?? null;
      const titulo = etiqueta
        ? `${etiquetaMarcador(a)}. ${capitalizar(etiqueta.texto)}`
        : etiquetaMarcador(a);
      L.marker([a.lat, a.lng], {
        icon: marcador(a, a.id === elegido, etiqueta, apagados.has(a.id)),
        title: titulo,
        alt: titulo,
        keyboard: true,
      })
        .on('click', () => alElegir(a.id))
        .addTo(capas[tipoDeGrupo(a)]);
    }
    mapa.addLayer(capas.acopio);
    mapa.addLayer(capas.referenciado);
    return () => {
      mapa.removeLayer(capas.acopio);
      mapa.removeLayer(capas.referenciado);
    };
  }, [mapa, acopios, elegido, alElegir, etiquetas, apagados]);
  return null;
}

// La zona: el círculo de su radio y un pin para tocarla. Los colores van en estilos.css
// (.zona-necesidad), con tokens de la marca y no con los del inventario (ADR-0006)
const pinZona = (faltantes: number, elegida: boolean) =>
  L.divIcon({
    className: '',
    html: htmlZona(faltantes, elegida),
    iconSize: [140, 36],
    iconAnchor: [70, 36],
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
        icon: pinZona(z.necesidades.length, z.zonaId === elegida),
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
  etiquetas?: Map<string, EtiquetaMapa>;
  apagados?: Set<string>;
}

const SIN_ZONAS: ZonaPublica[] = [];
const nada = () => {};
const SIN_ETIQUETAS = new Map<string, EtiquetaMapa>();
const SIN_APAGADOS = new Set<string>();

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
  etiquetas = SIN_ETIQUETAS,
  apagados = SIN_APAGADOS,
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
      <Marcadores
        acopios={acopios}
        elegido={elegido}
        alElegir={alElegir}
        etiquetas={etiquetas}
        apagados={apagados}
      />
    </MapContainer>
  );
}
