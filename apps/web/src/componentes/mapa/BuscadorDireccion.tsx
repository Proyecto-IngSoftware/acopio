import { useGeocodificar, type Punto } from '../../api/red';
import { Boton } from '../Boton';
import { Icono } from '../Icono';

interface Props {
  /** La dirección escrita en el formulario. */
  q: string;
  alElegir: (p: Punto) => void;
}

/** «Buscar en el mapa»: la API consulta Nominatim y aquí se elige el resultado (RF-RED-002). */
export function BuscadorDireccion({ q, alElegir }: Props) {
  const buscar = useGeocodificar();
  const texto = q.trim();
  return (
    <div className="flex flex-col gap-space-sm">
      <Boton
        variante="secundario"
        className="w-full"
        disabled={texto.length < 3 || buscar.isPending}
        onClick={() => buscar.mutate(texto)}
      >
        <Icono nombre="search" className="text-[20px]" />
        {buscar.isPending ? 'Buscando…' : 'Buscar en el mapa'}
      </Boton>
      {buscar.error && (
        <p role="alert" className="text-body-sm text-error">
          {buscar.error.message}
        </p>
      )}
      {buscar.data && buscar.data.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">
          No encontramos esa dirección. Ubica el pin a mano en el mapa.
        </p>
      )}
      {buscar.data && buscar.data.length > 0 && (
        <ul className="flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {buscar.data.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                onClick={() => {
                  alElegir({ lat: r.lat, lng: r.lng });
                  buscar.reset();
                }}
                className="flex min-h-[48px] w-full items-center gap-space-sm px-space-md py-space-xs text-left text-body-sm text-on-surface"
              >
                <Icono nombre="location_on" className="text-[20px] text-primary-container" />
                {r.etiqueta}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
