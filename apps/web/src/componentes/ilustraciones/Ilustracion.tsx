export type NombreIlustracion = 'cajas' | 'calendario' | 'mapa' | 'caja-folio';

interface Props {
  nombre: NombreIlustracion;
  className?: string;
}

// Dibujos planos de la línea visual (ADR-0022), copiados del lienzo aprobado el 2026-10-21 con
// cada color cambiado por su token. Ninguno se anima.
const NOMBRES: Record<NombreIlustracion, string> = {
  cajas: 'Cajas de ayuda ordenadas en una bodega',
  calendario: 'Calendario con una planta que brota',
  mapa: 'Mapa de curvas de nivel con un punto marcado',
  'caja-folio': 'Caja con una etiqueta de folio',
};

const VISTA: Record<NombreIlustracion, string> = {
  cajas: '0 0 168 120',
  calendario: '0 0 96 88',
  mapa: '0 0 96 88',
  'caja-folio': '0 0 72 64',
};

function Cajas() {
  return (
    <>
      <ellipse cx="84" cy="110" rx="74" ry="7" className="fill-primary-container" />
      <rect x="20" y="52" width="58" height="56" rx="5" className="fill-surface-tint" />
      <rect
        x="44"
        y="52"
        width="10"
        height="56"
        className="fill-primary-fixed-dim"
        opacity="0.55"
      />
      <rect x="84" y="62" width="64" height="46" rx="5" className="fill-primary-fixed-dim" />
      <rect
        x="110"
        y="62"
        width="12"
        height="46"
        className="fill-primary-container"
        opacity="0.35"
      />
      <rect x="40" y="14" width="56" height="40" rx="5" className="fill-primary-fixed" />
      <rect x="62" y="14" width="12" height="40" className="fill-surface-tint" opacity="0.35" />
      <circle cx="132" cy="30" r="16" className="fill-tertiary-fixed" />
      <path
        d="M124 30 l6 6 l11 -12"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-tertiary-container"
      />
    </>
  );
}

function Calendario() {
  return (
    <>
      <rect x="6" y="12" width="64" height="66" rx="8" className="fill-surface-container" />
      <rect x="6" y="12" width="64" height="18" rx="8" className="fill-primary-container" />
      <rect x="6" y="22" width="64" height="8" className="fill-primary-container" />
      <rect x="20" y="6" width="5" height="14" rx="2.5" className="fill-surface-tint" />
      <rect x="51" y="6" width="5" height="14" rx="2.5" className="fill-surface-tint" />
      <circle cx="20" cy="42" r="3.5" className="fill-outline-variant" />
      <circle cx="34" cy="42" r="3.5" className="fill-outline-variant" />
      <circle cx="48" cy="42" r="3.5" className="fill-outline-variant" />
      <circle cx="20" cy="56" r="3.5" className="fill-outline-variant" />
      <circle cx="34" cy="56" r="7" className="fill-primary-fixed" />
      <circle cx="34" cy="56" r="3.5" className="fill-primary-container" />
      <circle cx="20" cy="68" r="3.5" className="fill-outline-variant" />
      <path
        d="M74 84 C74 70 74 62 74 54"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        className="stroke-surface-tint"
      />
      <path d="M74 64 C62 62 58 52 60 46 C68 46 74 54 74 64 Z" className="fill-primary-fixed-dim" />
      <path d="M74 58 C84 56 90 46 88 38 C80 38 74 46 74 58 Z" className="fill-primary-fixed" />
      <rect x="64" y="78" width="20" height="8" rx="3" className="fill-tertiary-fixed" />
    </>
  );
}

function Mapa() {
  return (
    <>
      <rect width="96" height="88" rx="12" className="fill-primary-fixed" />
      <g fill="none" strokeWidth="1.3" opacity="0.5" className="stroke-surface-tint">
        <path d="M-4 20 C20 8 40 30 64 18 S90 6 100 22" />
        <path d="M-4 46 C22 34 44 58 68 46 S92 32 100 50" />
        <path d="M-4 74 C24 62 48 86 72 74 S94 60 100 78" />
      </g>
      <path
        d="M46 26 C66 22 82 38 76 54 C70 70 42 74 32 60 C22 46 28 30 46 26 Z"
        opacity="0.8"
        className="fill-primary-fixed-dim"
      />
      <ellipse cx="52" cy="76" rx="14" ry="4" opacity="0.25" className="fill-primary-container" />
      <path
        d="M52 74 C52 74 34 54 34 40 C34 30 42 22 52 22 C62 22 70 30 70 40 C70 54 52 74 52 74 Z"
        className="fill-primary-container"
      />
      <circle cx="52" cy="40" r="7" className="fill-primary-fixed" />
    </>
  );
}

function CajaFolio() {
  return (
    <>
      <path d="M8 22 L36 10 L64 22 L36 34 Z" className="fill-primary-fixed" />
      <path d="M8 22 L36 34 L36 60 L8 48 Z" className="fill-surface-tint" />
      <path d="M64 22 L36 34 L36 60 L64 48 Z" className="fill-primary-fixed-dim" />
      <g transform="rotate(-22 52 43)">
        <rect
          x="44"
          y="38"
          width="16"
          height="11"
          rx="2"
          className="fill-surface-container-lowest"
        />
        <rect x="47" y="42" width="9" height="2" rx="1" className="fill-primary-container" />
      </g>
    </>
  );
}

const DIBUJO: Record<NombreIlustracion, () => React.JSX.Element> = {
  cajas: Cajas,
  calendario: Calendario,
  mapa: Mapa,
  'caja-folio': CajaFolio,
};

/** Ilustración de un estado vacío o de una pieza sin foto. */
export function Ilustracion({ nombre, className = '' }: Props) {
  const Dibujo = DIBUJO[nombre];
  return (
    <svg role="img" aria-label={NOMBRES[nombre]} viewBox={VISTA[nombre]} className={className}>
      <Dibujo />
    </svg>
  );
}
