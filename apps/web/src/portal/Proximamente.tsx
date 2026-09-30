import { EnlaceBoton } from '../componentes/Boton';

export function Proximamente() {
  return (
    <section className="flex flex-col items-start gap-space-md px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile text-on-surface">Próximamente</h1>
      <p className="text-on-surface-variant">
        Esta sección todavía no está lista. La estamos construyendo.
      </p>
      <EnlaceBoton a="/" variante="secundario">
        Volver al inicio
      </EnlaceBoton>
    </section>
  );
}
