import { distanciaKm } from '@acopio/shared';
import { Link } from 'react-router';
import type { AcopioPublico } from '../../api/red';
import { Icono } from '../../componentes/Icono';
import { km } from '../mapa/TarjetaAcopio';
import { EstadoSegunFuente, antiguedadFuente, esReferenciado } from '../mapa/referenciado';
import { BOTON, Tarjeta } from './piezas';

// El nivel con texto y no solo color (RNF-11); «no» es lo que el punto pide no llevar
const NIVELES: Record<string, { texto: string; clases: string }> = {
  urgente: { texto: 'Urgente', clases: 'border-error text-error' },
  normal: { texto: 'Normal', clases: 'border-outline-variant text-on-surface-variant' },
  no: { texto: 'No reciben', clases: 'border-outline-variant text-on-surface-variant' },
};

const REDES: Record<string, string> = {
  instagram: 'Ver Instagram',
  facebook: 'Ver Facebook',
  web: 'Ver sitio web',
  website: 'Ver sitio web',
};

/** P6 Ficha de un punto de RedAcopio (pieza E): solo lo que trae su fuente, con su
 *  nombre, su enlace y su antigüedad (RF-RED-003). Sin inventario, jornadas ni donaciones. */
export function FichaReferenciado({
  punto,
  cerca,
}: {
  punto: AcopioPublico;
  cerca: string | null;
}) {
  if (!esReferenciado(punto)) return null;
  const f = punto.fuente;
  const [lat, lng] = (cerca ?? '').split(',').map(Number);
  const distancia =
    cerca && Number.isFinite(lat) && Number.isFinite(lng)
      ? distanciaKm({ lat: lat!, lng: lng! }, punto)
      : null;
  const volver = `/mapa${cerca ? `?cerca=${encodeURIComponent(cerca)}` : ''}`;
  const enlace = `${window.location.origin}/acopios/${punto.id}`;
  const { phone: telefono, notes: nota, ...otros } = f.contacto;
  const redes = Object.entries(otros).filter(([, v]) => /^https?:\/\//.test(v));

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Link
        to={volver}
        className="-ml-space-xs flex min-h-[44px] w-fit items-center gap-space-xs px-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[20px]" />
        Volver al mapa
      </Link>

      <div className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface">{punto.nombre}</h1>
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
            <Icono nombre="link" className="text-[16px]" />
            Punto de {f.nombre}
          </span>
          <EstadoSegunFuente punto={punto} />
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {antiguedadFuente(f)}
          {f.url && (
            <>
              {' · '}
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary-container underline"
              >
                Ver en {f.nombreCorto}
                <Icono nombre="open_in_new" className="text-[16px]" />
              </a>
            </>
          )}
        </p>
      </div>

      <Tarjeta titulo="Ubicación" icono="location_on">
        <p className="text-body-md text-on-surface">
          {punto.direccion}
          <br />
          {punto.municipio}
        </p>
        {distancia !== null && (
          <p className="text-label-md text-primary-container">A {km(distancia)} de ti</p>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${punto.lat},${punto.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BOTON} border-[1.5px] border-outline-variant bg-surface-container-lowest text-on-surface`}
        >
          <Icono nombre="directions" className="text-[20px]" />
          Cómo llegar
        </a>
      </Tarjeta>

      {f.horario && (
        <Tarjeta titulo="Horario de atención" icono="schedule">
          <p className="text-body-md text-on-surface">{f.horario}</p>
        </Tarjeta>
      )}

      {f.necesidades.length > 0 && (
        <Tarjeta titulo="Lo que piden" icono="inventory_2">
          <p className="text-body-sm text-on-surface-variant">Texto de la fuente, sin cambios.</p>
          <ul className="flex flex-col gap-space-xs">
            {f.necesidades.map((n) => {
              const nivel = NIVELES[n.nivel] ?? { texto: n.nivel, clases: NIVELES.normal!.clases };
              return (
                <li
                  key={`${n.nivel}-${n.texto}`}
                  className="flex items-center justify-between gap-space-sm rounded-lg border border-outline-variant bg-surface-container-low px-space-sm py-space-xs text-body-md text-on-surface"
                >
                  {n.texto}
                  <span
                    className={`shrink-0 rounded-md border px-space-xs text-label-md ${nivel.clases}`}
                  >
                    {nivel.texto}
                  </span>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}

      {(telefono || nota || redes.length > 0) && (
        <Tarjeta titulo="Contacto y acceso" icono="call">
          {telefono && (
            <div className="flex items-center justify-between gap-space-sm">
              <span className="text-body-md text-on-surface tabular-nums">{telefono}</span>
              <a
                href={`tel:${telefono.replace(/\s+/g, '')}`}
                className="inline-flex min-h-[48px] items-center gap-space-xs rounded-xl bg-primary-container px-space-md text-label-md text-on-primary"
              >
                <Icono nombre="call" className="text-[20px]" />
                Llamar
              </a>
            </div>
          )}
          {redes.map(([red, url]) => (
            <a
              key={red}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center gap-space-xs border-t border-outline-variant pt-space-sm text-label-md text-primary-container"
            >
              <Icono nombre="share" className="text-[20px]" />
              {REDES[red] ?? `Ver ${red}`}
            </a>
          ))}
          {nota && (
            <p className="flex items-start gap-space-xs rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
              <Icono nombre="info" className="text-[18px]" />
              {nota}
            </p>
          )}
        </Tarjeta>
      )}

      <p className="flex items-start gap-space-sm rounded-xl border border-primary-fixed bg-primary-fixed/40 p-space-md text-body-md text-on-surface">
        <Icono nombre="info" className="text-[22px] text-primary-container" />
        Este punto no usa Acopio: no muestra inventario ni recibe donaciones preparadas aquí.
      </p>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${punto.nombre}: ${enlace}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${BOTON} border-[1.5px] border-primary-container bg-surface-container-lowest text-primary-container`}
      >
        <Icono nombre="share" className="text-[20px]" />
        Compartir por WhatsApp
      </a>
    </div>
  );
}
