import { CORREO_PRIVACIDAD } from './contacto';

const SECCIONES = [
  {
    titulo: 'Qué guardamos',
    texto:
      'El nombre y el correo de tu cuenta de Donador, lo que preparas y, si la subes, la foto de la factura.',
  },
  {
    titulo: 'Para qué',
    texto:
      'Para conciliar tu donación con lo que entró al acopio. Solo el equipo que la revisa ve tu nombre y la factura. El seguimiento público no muestra quién donó.',
  },
  {
    titulo: 'La foto de la factura',
    texto:
      'La guardamos sin datos de ubicación y la borramos 12 meses después de cerrar la donación.',
  },
];

/** P12: privacidad. Diseño: docs/03-diseno/stitch/P12-privacidad. */
export function Privacidad() {
  const seccion = 'flex flex-col gap-space-xs';
  const titulo = 'text-label-md text-on-surface';
  const texto = 'text-body-md text-on-surface-variant';
  return (
    <section className="flex flex-col gap-space-md px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile text-on-surface">Cómo usamos tus datos</h1>
      {SECCIONES.map((s) => (
        <div key={s.titulo} className={seccion}>
          <h2 className={titulo}>{s.titulo}</h2>
          <p className={texto}>{s.texto}</p>
        </div>
      ))}
      <div className={seccion}>
        <h2 className={titulo}>Tus derechos</h2>
        <p className={texto}>
          Puedes conocer, actualizar y pedir que borremos tus datos (Ley 1581 de 2012).
          {CORREO_PRIVACIDAD && (
            <>
              {' '}
              Escríbenos a{' '}
              <a href={`mailto:${CORREO_PRIVACIDAD}`} className="font-bold text-primary underline">
                {CORREO_PRIVACIDAD}
              </a>
              .
            </>
          )}
        </p>
      </div>
      <div className={seccion}>
        <h2 className={titulo}>Quién responde</h2>
        <p className={texto}>El equipo de Acopio, proyecto de la ETITC.</p>
      </div>
      <p className="text-body-sm text-on-surface-variant">
        Acopio no recibe dinero. Actualizado en octubre de 2026.
      </p>
    </section>
  );
}
