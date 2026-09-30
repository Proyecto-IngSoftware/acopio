import { useSearchParams } from 'react-router';
import { Icono } from '../../componentes/Icono';
import { Encabezado } from '../Encabezado';
import { PestanaCanasta } from './PestanaCanasta';
import { PestanaCategorias } from './PestanaCategorias';
import { PestanaEmergencias } from './PestanaEmergencias';

const PESTANAS = [
  { id: 'categorias', texto: 'Categorías', icono: 'category' },
  { id: 'canasta', texto: 'Canasta', icono: 'shopping_basket' },
  { id: 'emergencias', texto: 'Emergencias', icono: 'emergency' },
] as const;
type Pestana = (typeof PESTANAS)[number]['id'];

/** C18 Catálogo maestro (RF-CAT-001, 003, 005). Diseño: docs/03-diseno/stitch/C18-catalogo. */
export function Catalogo() {
  const [parametros, fijarParametros] = useSearchParams();
  const pedida = parametros.get('pestana');
  const activa: Pestana = PESTANAS.some((p) => p.id === pedida)
    ? (pedida as Pestana)
    : 'categorias';

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo="Catálogo maestro"
        subtitulo="Categorías, canasta estándar y emergencias"
      />
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-container p-1">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pestana-${p.id}`}
            aria-selected={activa === p.id}
            aria-controls={`panel-${p.id}`}
            onClick={() => fijarParametros({ pestana: p.id }, { replace: true })}
            className={`flex min-h-[48px] items-center justify-center gap-1 rounded-lg px-1 text-label-md ${
              activa === p.id
                ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                : 'text-on-surface-variant'
            }`}
          >
            <Icono nombre={p.icono} className="text-[18px]" />
            {p.texto}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${activa}`} aria-labelledby={`pestana-${activa}`}>
        {activa === 'categorias' && <PestanaCategorias />}
        {activa === 'canasta' && <PestanaCanasta />}
        {activa === 'emergencias' && <PestanaEmergencias />}
      </div>
    </div>
  );
}
