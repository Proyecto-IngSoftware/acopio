import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useCausa, type CausaPublica } from '../../api/causas';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { diaConAnio } from '../../formato';
import {
  AvisoNoRecibeDinero,
  Categoria,
  ImagenCausa,
  LogoEntidad,
  NUEVA_PESTANA,
  Sello,
} from './piezas';

/** P4 Ficha de causa (RF-RED-008, HU-02). */
export function Ficha() {
  const { id } = useParams();
  const { data, isPending, error } = useCausa(id!);

  if (isPending) return <Esqueleto etiqueta="Cargando la causa" className="m-margin h-64" />;
  if (error || !data) {
    return (
      <div className="flex flex-col gap-space-md px-margin py-space-lg">
        <h1 className="text-headline-lg-mobile text-on-surface">Esta causa no existe</h1>
        <p className="text-body-md text-on-surface-variant">
          Puede que el enlace esté incompleto. En el directorio están las causas activas.
        </p>
        <EnlaceBoton a="/causas">Ver las causas</EnlaceBoton>
      </div>
    );
  }
  return <Contenido causa={data} />;
}

function Contenido({ causa }: { causa: CausaPublica }) {
  const [saliendo, fijarSaliendo] = useState(false);
  const atendida = causa.cerroEl !== null;
  const tituloPasos = atendida ? 'Cómo se donaba' : 'Cómo donar';

  return (
    <article className="flex flex-col">
      <Link
        to="/causas"
        className="flex min-h-[44px] items-center gap-space-xs px-margin text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[22px]" />
        Causas
      </Link>
      <ImagenCausa causa={causa} />
      <div className="flex flex-col gap-space-md px-margin py-space-md">
        {atendida && causa.cerroEl && causa.urlOficial && (
          <p className="flex items-start gap-space-sm rounded-xl bg-surface-container p-space-sm text-body-sm text-on-surface">
            <Icono
              nombre="event_available"
              className="mt-0.5 text-[20px] text-on-surface-variant"
            />
            Esta causa cerró el {diaConAnio(causa.cerroEl)}. Puede que la entidad ya no esté
            recibiendo donaciones para ella.
          </p>
        )}
        <Categoria categoria={causa.categoria} />
        <h1 className="text-headline-lg-mobile text-balance text-on-surface">{causa.titulo}</h1>

        <section
          aria-label="Entidad responsable"
          className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
        >
          <div className="flex items-center gap-space-sm">
            <LogoEntidad entidad={causa.entidad} />
            <div className="flex flex-col">
              <span className="text-label-md text-on-surface">{causa.entidad.nombre}</span>
              {causa.entidad.verificadaEn && <Sello verificadaEn={causa.entidad.verificadaEn} />}
            </div>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            {causa.entidad.verificadaEn
              ? 'Verificada por el equipo de Acopio.'
              : 'Esta entidad ya no está verificada por Acopio.'}
          </p>
        </section>

        <section className="flex flex-col gap-space-xs">
          <h2 className="text-headline-sm text-on-surface">Sobre la causa</h2>
          <p className="text-body-md whitespace-pre-line text-on-surface-variant">
            {causa.descripcion}
          </p>
        </section>

        <section className="flex flex-col gap-space-sm">
          <h2 id="pasos" className="text-headline-sm text-on-surface">
            {tituloPasos}
          </h2>
          <ol aria-label={tituloPasos} className="flex flex-col gap-space-sm">
            {causa.pasos.map((paso, i) => (
              <li key={i} className="flex items-start gap-space-sm text-body-md text-on-surface">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md text-on-primary">
                  {i + 1}
                </span>
                {paso}
              </li>
            ))}
          </ol>
        </section>

        <AvisoNoRecibeDinero>
          Acopio no recibe dinero. El pago se hace solo en el sitio oficial de la entidad.
        </AvisoNoRecibeDinero>

        {causa.urlOficial && (
          <Boton
            variante={atendida ? 'secundario' : 'primario'}
            onClick={() => fijarSaliendo(true)}
          >
            Ir al sitio oficial
            <Icono nombre="open_in_new" className="text-[20px]" />
          </Boton>
        )}
      </div>
      {saliendo && causa.urlOficial && (
        <HojaSalida
          url={causa.urlOficial}
          dominio={causa.dominio ?? causa.urlOficial}
          alCerrar={() => fijarSaliendo(false)}
        />
      )}
    </article>
  );
}

/** Avisa que se sale de Acopio, con el dominio de destino a la vista (RF-RED-008). */
function HojaSalida({
  url,
  dominio,
  alCerrar,
}: {
  url: string;
  dominio: string;
  alCerrar: () => void;
}) {
  return (
    <Hoja titulo="Vas a salir de Acopio" alCerrar={alCerrar}>
      <p className="text-body-md text-on-surface-variant">
        Te llevamos a <strong className="break-all text-on-surface">{dominio}</strong>. Acopio no
        recibe dinero ni ve tus pagos: lo que hagas allá queda entre tú y la entidad.
      </p>
      <a
        href={url}
        {...NUEVA_PESTANA}
        onClick={alCerrar}
        className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-primary-container px-space-md text-label-md text-on-primary"
      >
        Continuar al sitio
      </a>
      <Boton variante="secundario" onClick={alCerrar}>
        Quedarme aquí
      </Boton>
    </Hoja>
  );
}
