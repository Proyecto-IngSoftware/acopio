import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { ATRIBUCION, CENTRO_INICIAL, MOSAICOS } from '../../componentes/mapa/MapaLeaflet';
import { altoPunto, anchoPunto, capitalizar, htmlPunto } from '../mapa/marcador';
import { ESTILO_CUPOS, estadoCupos, textoPunto, type GrupoLugar } from './cupos';

function Puntos({
  grupos,
  elegido,
  alElegir,
}: {
  grupos: GrupoLugar[];
  elegido: string | null;
  alElegir: (id: string) => void;
}) {
  const mapa = useMap();
  useEffect(() => {
    const capa = L.layerGroup();
    for (const g of grupos) {
      const { estado, texto } = textoPunto(g);
      const estilo = ESTILO_CUPOS[estado];
      const sel = g.lugar.id === elegido;
      const alto = altoPunto(sel, true);
      const ancho = anchoPunto(sel, texto);
      const mas = g.jornadas.length - 1;
      const titulo = `${g.lugar.nombre}. ${capitalizar(estadoCupos(g.jornadas[0]!)!.texto)}${
        mas > 0 ? ` y ${mas} ${mas === 1 ? 'jornada más' : 'jornadas más'}` : ''
      }`;
      L.marker([g.lugar.lat!, g.lugar.lng!], {
        icon: L.divIcon({
          className: '',
          html: htmlPunto({
            circulo: estilo.circulo,
            icono: 'groups',
            etiqueta: { clases: estilo.clases, icono: estilo.icono, texto },
            elegido: sel,
          }),
          iconSize: [ancho, alto],
          iconAnchor: [ancho / 2, alto],
        }),
        title: titulo,
        alt: titulo,
        keyboard: true,
      })
        .on('click', () => alElegir(g.lugar.id))
        .addTo(capa);
    }
    mapa.addLayer(capa);
    return () => {
      mapa.removeLayer(capa);
    };
  }, [mapa, grupos, elegido, alElegir]);
  return null;
}

/** Abarca todos los lugares; solo se rehace cuando cambian los puntos, no al elegir uno. */
function Encuadre({ grupos }: { grupos: GrupoLugar[] }) {
  const mapa = useMap();
  const clave = grupos.map((g) => `${g.lugar.lat},${g.lugar.lng}`).join(';');
  useEffect(() => {
    const puntos = clave
      ? clave.split(';').map((p) => p.split(',').map(Number) as [number, number])
      : [];
    if (puntos.length > 0)
      mapa.fitBounds(L.latLngBounds(puntos), { padding: [32, 32], maxZoom: 15, animate: false });
  }, [mapa, clave]);
  return null;
}

/** P7 en mapa: un punto por lugar con lo que falta de gente o los cupos que quedan. */
export default function MapaJornadas({
  grupos,
  elegido,
  alElegir,
}: {
  grupos: GrupoLugar[];
  elegido: string | null;
  alElegir: (id: string) => void;
}) {
  return (
    <MapContainer
      center={[CENTRO_INICIAL.lat, CENTRO_INICIAL.lng]}
      zoom={11}
      className="size-full"
      aria-label="Mapa de jornadas. La misma información está en la vista de lista."
    >
      <TileLayer url={MOSAICOS} attribution={ATRIBUCION} />
      <Encuadre grupos={grupos} />
      <Puntos grupos={grupos} elegido={elegido} alElegir={alElegir} />
    </MapContainer>
  );
}
