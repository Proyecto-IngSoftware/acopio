// Curvas de nivel del lienzo aprobado (ADR-0022). Quietas: la franja no tiene movimiento
// continuo por la regla de batería del sistema de diseño §1.
const CURVAS = [
  'M0 40 C70 18 120 66 190 42 S320 6 470 48',
  'M0 74 C80 50 130 98 205 76 S330 40 470 84',
  'M0 110 C90 86 140 132 215 112 S340 78 470 120',
  'M0 148 C95 126 150 168 225 150 S350 118 470 158',
  'M0 190 C100 168 160 206 235 190 S360 160 470 198',
  'M0 234 C110 212 170 248 245 234 S370 206 470 240',
  'M0 280 C115 258 180 292 255 280 S380 254 470 286',
  'M352 30 C392 26 418 52 410 78 C402 104 360 110 340 90 C320 70 324 34 352 30 Z',
  'M356 46 C380 44 394 60 390 74 C386 88 362 92 352 80 C342 68 340 48 356 46 Z',
];

/** Fondo de la franja de la Portada: un mapa topográfico tenue que no captura toques. */
export function CurvasNivel() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 470 330"
      preserveAspectRatio="xMinYMin slice"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[.16]"
    >
      <g fill="none" strokeWidth="1.2" className="stroke-primary-fixed-dim">
        {CURVAS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
