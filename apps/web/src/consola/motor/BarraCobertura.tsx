/** Barra de 0 a 1 en el color primario, sin semáforo (ADR-0006). La usan C10 y C11. */
export function BarraCobertura({
  valor,
  etiqueta,
  gruesa = false,
}: {
  valor: number;
  etiqueta: string;
  gruesa?: boolean;
}) {
  const porcentaje = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  return (
    <div
      role="meter"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      className={`w-full overflow-hidden rounded-full bg-surface-container ${gruesa ? 'h-2' : 'h-1.5'}`}
    >
      <div
        className="h-full rounded-full bg-primary-container"
        style={{ width: `${Math.max(porcentaje, 1)}%` }}
      />
    </div>
  );
}
