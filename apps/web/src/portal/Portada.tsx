import { useSearchParams } from 'react-router';
import { useEmergenciasVigentes } from '../api/emergencias';
import { useNecesidades } from '../api/inventario';
import { Esqueleto } from '../componentes/Esqueleto';
import { EstadoError } from '../componentes/EstadoError';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { AvisoSinDinero } from './bloques/AvisoSinDinero';
import { BalanceRecepcion } from './bloques/BalanceRecepcion';
import { ComoApoyar } from './bloques/ComoApoyar';
import { CurvasNivel } from './bloques/CurvasNivel';
import {
  acopiosConFaltantes,
  categoriasQueFaltan,
  tituloFranja,
  useCuenta,
} from './bloques/franja';
import { JornadasPortada } from './bloques/JornadasPortada';
import { RastrearFolio } from './bloques/RastrearFolio';
import { SeccionVacia } from './bloques/SeccionVacia';
import { SelectorEmergencia } from './bloques/SelectorEmergencia';

/** P01. Diseño: docs/03-diseno/stitch/P01-portada, vista «Ciclo 1» de la maqueta. */
export function Portada() {
  const { data, error, isPending, refetch } = useEmergenciasVigentes();
  const [parametros, fijarParametros] = useSearchParams();

  const emergencias = data ?? [];
  // Un id desconocido en la URL cae en la primera emergencia vigente
  const elegida = emergencias.find((e) => e.id === parametros.get('emergencia')) ?? emergencias[0];

  return (
    <div className="flex w-full flex-col">
      <section className="relative flex flex-col gap-[18px] overflow-hidden bg-primary px-margin pt-space-md pb-7 text-on-primary">
        <CurvasNivel />
        {isPending && <Esqueleto etiqueta="Cargando emergencias" className="h-32" />}

        {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}

        {!isPending && !error && !elegida && (
          <div className="flex flex-col gap-space-xs">
            <h1 className="text-headline-lg-mobile tracking-tight">No hay emergencias activas</h1>
            <p className="leading-relaxed text-primary-fixed-dim">
              Cuando se declare una, aquí verás qué hace falta y dónde entregarlo.
            </p>
          </div>
        )}

        {elegida && (
          <>
            <SelectorEmergencia
              emergencias={emergencias}
              elegida={elegida}
              alElegir={(id) => fijarParametros({ emergencia: id }, { replace: true })}
            />
            <div className="relative flex flex-col gap-2.5">
              <p className="flex items-center gap-space-xs text-[13px] text-primary-fixed">
                <span aria-hidden="true" className="latido h-2 w-2 rounded-full bg-primary-fixed" />
                Datos de los acopios
              </p>
              <TituloFranja />
              <p className="leading-relaxed text-primary-fixed-dim">
                Antes de comprar suministros o movilizarte, revisa la necesidad real de cada centro
                para evitar cuellos de botella en bodega.
              </p>
            </div>
          </>
        )}
      </section>

      <div className="flex flex-col gap-space-lg px-margin py-space-lg">
        {!isPending && !error && !elegida && (
          <EstadoVacio titulo="Sin emergencias activas" ilustracion="cajas">
            Mientras tanto, puedes conocer los acopios del mapa o las causas verificadas.
          </EstadoVacio>
        )}
        {elegida && <BalanceRecepcion />}
        <ComoApoyar />
        <RastrearFolio />
        {elegida && (
          <>
            <JornadasPortada />
            <SeccionVacia
              id="reporte"
              titulo="Reporte en terreno"
              vacio="Todavía no hay reportes"
              ilustracion="mapa"
            >
              Aquí verás las novedades de las entidades que atienden la emergencia.
            </SeccionVacia>
          </>
        )}
        <AvisoSinDinero />
      </div>
    </div>
  );
}

/** «Hoy faltan N categorías en M acopios.», con la N que cuenta desde 0. Las dos cifras salen
 *  de las necesidades, así no se contradicen. Mientras cargan, o si fallan, queda el título
 *  fijo. */
function TituloFranja() {
  const necesidades = useNecesidades();
  const categorias = categoriasQueFaltan(necesidades.data ?? []);
  const cuenta = useCuenta(categorias);
  const clase = 'text-headline-lg-mobile font-extrabold tracking-tight';
  if (!necesidades.data) return <h1 className={clase}>Revisa qué hace falta antes de donar.</h1>;
  const frase = tituloFranja(categorias, acopiosConFaltantes(necesidades.data));
  // El lector de pantalla oye la frase final; la cifra que cuenta es solo para la vista
  // Solo la primera cifra cuenta: en «falta 1 categoría en 1 acopio» la segunda es otra
  const corte = categorias === 0 ? frase.length : frase.indexOf(` ${categorias} `) + 1;
  const antes = frase.slice(0, corte);
  const despues = categorias === 0 ? '' : frase.slice(corte + String(categorias).length);
  return (
    <h1 className={clase}>
      <span className="sr-only">{frase}</span>
      <span aria-hidden="true">
        {antes}
        {categorias > 0 && <span className="text-primary-fixed tabular-nums">{cuenta}</span>}
        {despues}
      </span>
    </h1>
  );
}
