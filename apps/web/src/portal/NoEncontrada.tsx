import { EnlaceBoton } from '../componentes/Boton';

export function NoEncontrada() {
  return (
    <section className="flex flex-col items-start gap-space-md px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile text-on-surface">No encontramos esta página</h1>
      <p className="text-on-surface-variant">
        El enlace puede estar mal escrito o la página ya no existe.
      </p>
      <EnlaceBoton a="/" variante="secundario">
        Volver al inicio
      </EnlaceBoton>
    </section>
  );
}
