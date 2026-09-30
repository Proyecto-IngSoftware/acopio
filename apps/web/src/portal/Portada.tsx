import { useSearchParams } from 'react-router';
import { useEmergenciasVigentes } from '../api/emergencias';
import { Esqueleto } from '../componentes/Esqueleto';
import { EstadoError } from '../componentes/EstadoError';
import { AvisoSinDinero } from './bloques/AvisoSinDinero';
import { BalanceRecepcion } from './bloques/BalanceRecepcion';
import { ComoApoyar } from './bloques/ComoApoyar';
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
      <section className="flex flex-col gap-space-md bg-primary px-margin pt-space-md pb-space-lg text-on-primary">
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
            <div className="flex flex-col gap-space-xs">
              <h1 className="text-headline-lg-mobile tracking-tight">
                Revisa qué hace falta antes de donar.
              </h1>
              <p className="leading-relaxed text-primary-fixed-dim">
                Antes de comprar suministros o movilizarte, revisa la necesidad real de cada centro
                para evitar cuellos de botella en bodega.
              </p>
            </div>
          </>
        )}
      </section>

      <div className="flex flex-col gap-space-lg px-margin py-space-lg">
        {elegida && <BalanceRecepcion />}
        <ComoApoyar />
        <RastrearFolio />
        {elegida && (
          <>
            <SeccionVacia id="jornadas" titulo="Jornadas de Voluntariado">
              Todavía no hay jornadas publicadas. Aquí podrás reservar un cupo.
            </SeccionVacia>
            <SeccionVacia id="reporte" titulo="Reporte en Terreno">
              Todavía no hay reportes. Aquí verás las novedades de las entidades que atienden la
              emergencia.
            </SeccionVacia>
          </>
        )}
        <AvisoSinDinero />
      </div>
    </div>
  );
}
