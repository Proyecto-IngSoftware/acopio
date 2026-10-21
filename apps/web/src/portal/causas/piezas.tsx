import { ENLACES_DESAPARECIDOS } from '@acopio/shared';
import { Link } from 'react-router';
import { urlImagenCausa, urlLogo, type CategoriaCausa, type CausaPublica } from '../../api/causas';
import { Icono } from '../../componentes/Icono';
import { Ilustracion } from '../../componentes/ilustraciones/Ilustracion';
import { diaConAnio } from '../../formato';

export const NOMBRE_CATEGORIA: Record<CategoriaCausa, string> = {
  PERSONAS: 'Personas',
  ANIMALES: 'Animales',
  ADULTOS_MAYORES: 'Adultos mayores',
  RESCATISTAS: 'Rescatistas',
};

export const NUEVA_PESTANA = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function AvisoNoRecibeDinero({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-sm text-on-surface">
      <Icono nombre="info" className="mt-0.5 text-[20px] text-primary-container" />
      <span>{children}</span>
    </p>
  );
}

export function Categoria({ categoria }: { categoria: CategoriaCausa }) {
  return (
    <span className="self-start rounded-full bg-surface-container px-space-sm py-0.5 text-label-md text-on-surface-variant">
      {NOMBRE_CATEGORIA[categoria]}
    </span>
  );
}

export function Sello({ verificadaEn }: { verificadaEn: string }) {
  return (
    <span className="flex items-center gap-space-xs text-label-md text-primary-container">
      <Icono nombre="verified" relleno className="text-[18px]" />
      Verificada el {diaConAnio(verificadaEn)}
    </span>
  );
}

/** La imagen de la causa o, si no tiene (C-10), una ilustración: el mapa para rescatistas y
 *  las cajas para las demás (línea visual, ADR-0022). Decorativa en los dos casos. */
export function ImagenCausa({ causa }: { causa: CausaPublica }) {
  const url = urlImagenCausa(causa);
  return url ? (
    <img src={url} alt="" className="aspect-video w-full max-w-full object-cover" />
  ) : (
    <div
      aria-hidden="true"
      className="flex aspect-video w-full max-w-full items-center justify-center bg-surface-container-low"
    >
      <Ilustracion
        nombre={causa.categoria === 'RESCATISTAS' ? 'mapa' : 'cajas'}
        className="h-3/4 max-w-[60%]"
      />
    </div>
  );
}

export function LogoEntidad({ entidad }: { entidad: CausaPublica['entidad'] }) {
  const url = urlLogo(entidad);
  const iniciales = entidad.nombre
    .split(/\s+/)
    .filter((p) => /^\p{Lu}/u.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
  return url ? (
    <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-bold text-on-primary"
    >
      {iniciales || entidad.nombre[0]}
    </span>
  );
}

/** Una tarjeta del directorio o de las atendidas; toda la tarjeta abre la ficha. */
export function TarjetaCausa({ causa }: { causa: CausaPublica }) {
  return (
    <article className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <Link to={`/causas/${causa.id}`} className="flex flex-col">
        <ImagenCausa causa={causa} />
        <div className="flex flex-col gap-space-xs p-space-md">
          <Categoria categoria={causa.categoria} />
          <h2 className="text-headline-sm text-on-surface">{causa.titulo}</h2>
          <span className="text-label-md text-on-surface">{causa.entidad.nombre}</span>
          {causa.entidad.verificadaEn && <Sello verificadaEn={causa.entidad.verificadaEn} />}
          {causa.cerroEl && (
            <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
              <Icono nombre="event_available" className="text-[18px]" />
              Cerró el {diaConAnio(causa.cerroEl)}
            </span>
          )}
          <p className="line-clamp-2 text-body-sm text-on-surface-variant">{causa.descripcion}</p>
        </div>
      </Link>
    </article>
  );
}

/** Personas desaparecidas no tiene causas: solo los tres enlaces oficiales (C-07). */
export function Desaparecidas() {
  return (
    <section
      aria-labelledby="desaparecidas"
      className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      <h2
        id="desaparecidas"
        className="flex items-center gap-space-xs text-headline-sm text-on-surface"
      >
        <Icono nombre="person_search" className="text-[22px] text-primary-container" />
        Personas desaparecidas
      </h2>
      <p className="text-body-sm text-on-surface-variant">
        Acopio no guarda datos de personas desaparecidas. Si buscas a alguien o quieres ayudar,
        acude a:
      </p>
      <ul className="flex flex-col">
        {ENLACES_DESAPARECIDOS.map((e) => (
          <li key={e.url} className="border-t border-outline-variant">
            <a
              href={e.url}
              {...NUEVA_PESTANA}
              className="flex min-h-[52px] items-center justify-between gap-space-sm text-label-md text-primary-container"
            >
              {e.nombre}
              <Icono nombre="open_in_new" className="text-[20px]" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Filtro = CategoriaCausa | 'TODAS' | 'DESAPARECIDAS';

/** Los chips de categoría. `desaparecidas` agrega el de personas desaparecidas. */
export function Chips({
  activa,
  alElegir,
  desaparecidas,
}: {
  activa: CategoriaCausa | 'TODAS' | 'DESAPARECIDAS';
  alElegir: (c: CategoriaCausa | 'TODAS' | 'DESAPARECIDAS') => void;
  desaparecidas: boolean;
}) {
  const opciones: [Filtro, string][] = [
    ['TODAS', 'Todas'],
    ['PERSONAS', 'Personas'],
    ['ANIMALES', 'Animales'],
    ['ADULTOS_MAYORES', 'Adultos mayores'],
    ...(desaparecidas ? [['DESAPARECIDAS', 'Personas desaparecidas'] as [Filtro, string]] : []),
    ['RESCATISTAS', 'Rescatistas'],
  ];
  return (
    <div className="-mx-margin flex gap-space-xs overflow-x-auto px-margin [scrollbar-width:none]">
      {opciones.map(([clave, texto]) => (
        <button
          key={clave}
          type="button"
          aria-pressed={activa === clave}
          onClick={() => alElegir(clave)}
          className={`toque min-h-[40px] shrink-0 rounded-full border px-space-md text-label-md ${
            activa === clave
              ? 'border-primary-container bg-primary-container text-on-primary'
              : 'border-outline-variant bg-surface-container-lowest text-on-surface'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}
