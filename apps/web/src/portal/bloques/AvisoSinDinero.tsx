import { Icono } from '../../componentes/Icono';

/** RF-HOM-001: aviso permanente de que la plataforma no recibe dinero. */
export function AvisoSinDinero() {
  return (
    <footer className="flex flex-col gap-space-xs rounded-xl bg-surface-container-high p-space-md text-on-surface">
      <div className="flex items-start gap-space-xs">
        <Icono nombre="verified_user" className="mt-0.5 text-[20px] text-primary-container" />
        <div className="flex flex-col">
          <p className="text-label-md font-bold text-on-surface">
            Canal Oficial Sin Intermediación Financiera
          </p>
          <p className="pt-0.5 text-body-sm text-on-surface-variant">
            Esta plataforma no capta ni administra fondos monetarios directamente. Todas las
            donaciones dinerarias se completan en las cuentas bancarias institucionales certificadas
            de las entidades de socorro.
          </p>
        </div>
      </div>
      <p className="pt-space-xs text-[0.65rem] tracking-wider text-on-surface-variant uppercase">
        Cumplimiento Ley 1581 de 2012 de Protección de Datos Personales · República de Colombia
      </p>
    </footer>
  );
}
