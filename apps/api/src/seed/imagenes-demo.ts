import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { PrismaService } from '../comun/prisma/prisma.service';
import type { AlmacenamientoService } from '../modulos/almacenamiento/almacenamiento.service';
import { ICONOS } from './iconos-material';

/**
 * Imágenes de la demo. Cada causa lleva una ilustración de su categoría: el ícono de Material
 * Symbols que usa la app, sobre una baldosa blanca y un fondo claro de la paleta (maqueta
 * P03-causas/maqueta-plataformas-y-mapa.html). Cada entidad lleva un logotipo abstracto. Sin texto
 * (el contenedor puede no tener fuentes) y sin emblemas de las organizaciones reales.
 */
const TONOS: Record<string, { tinta: string; fondo: string; icono: string }> = {
  PERSONAS: { tinta: '#085046', fondo: '#b0efe1', icono: ICONOS.personas },
  ANIMALES: { tinta: '#6e3900', fondo: '#ffdcc3', icono: ICONOS.animales },
  ADULTOS_MAYORES: { tinta: '#085046', fondo: '#e7e5e4', icono: ICONOS.adultosMayores },
  RESCATISTAS: { tinta: '#8f1100', fondo: '#ffdad3', icono: ICONOS.rescatistas },
};

/** La carpeta de la ilustración vigente: una causa con otra clave se vuelve a dibujar. */
const VERSION_ILUSTRACION = 'ilustracion-v2';

function svgCausa(categoria: string, ancho = 1200, alto = 675) {
  const { tinta, fondo, icono } = TONOS[categoria] ?? TONOS.PERSONAS!;
  const lado = Math.min(ancho, alto);
  const baldosa = lado * 0.42;
  const x = (ancho - baldosa) / 2;
  const y = (alto - baldosa) / 2;
  const escala = (baldosa * 0.62) / 960;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <rect width="${ancho}" height="${alto}" fill="${fondo}"/>
  <circle cx="${ancho * 0.88}" cy="${alto * 0.16}" r="${lado * 0.34}" fill="${tinta}" opacity="0.08"/>
  <circle cx="${ancho * 0.1}" cy="${alto * 0.92}" r="${lado * 0.4}" fill="${tinta}" opacity="0.07"/>
  <rect x="${x}" y="${y}" width="${baldosa}" height="${baldosa}" rx="${baldosa * 0.22}" fill="#ffffff"/>
  <g transform="translate(${x + baldosa * 0.19},${y + baldosa * 0.81}) scale(${escala})" fill="${tinta}"><path d="${icono}"/></g>
</svg>`;
}

const COLORES_LOGO = ['#0F6E6E', '#4B3F8A', '#9A2A1F', '#7A4E1D'];

/** Un cuadrado redondeado con un corazón: abstracto, no imita el emblema de nadie. */
function svgLogo(indice: number) {
  const color = COLORES_LOGO[indice % COLORES_LOGO.length]!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" rx="80" fill="${color}"/>
  <path d="M200 300 C120 240 90 200 90 160 C90 120 120 95 155 95 C175 95 192 105 200 122 C208 105 225 95 245 95 C280 95 310 120 310 160 C310 200 280 240 200 300 Z" fill="#FFFFFF"/>
</svg>`;
}

const png = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer();

/**
 * Sube las imágenes que falten: la de cada causa «(demo)» sin la ilustración vigente y el logotipo de cada
 * entidad de esas causas que no tenga. Idempotente: lo que ya tiene imagen no se toca.
 */
export async function sembrarImagenesDemo(
  prisma: PrismaService,
  almacenamiento: AlmacenamientoService,
) {
  const causas = await prisma.causa.findMany({
    where: { titulo: { endsWith: '(demo)' } },
    include: { entidad: true },
    orderBy: { titulo: 'asc' },
  });
  let subidas = 0;
  const entidades = [...new Map(causas.map((c) => [c.entidad_id, c.entidad])).values()];
  for (const [i, e] of entidades.entries()) {
    if (e.logo_key) continue;
    const { clave } = await almacenamiento.guardarImagen(
      `entidades/${e.id}`,
      await png(svgLogo(i)),
    );
    await prisma.entidad.update({ where: { id: e.id }, data: { logo_key: clave } });
    subidas++;
  }
  for (const c of causas) {
    if (c.imagen_key?.includes(`/${VERSION_ILUSTRACION}/`)) continue;
    const { clave } = await almacenamiento.guardarImagen(
      `causas/${c.id}/${VERSION_ILUSTRACION}`,
      await png(svgCausa(c.categoria)),
    );
    await prisma.causa.update({ where: { id: c.id }, data: { imagen_key: clave } });
    subidas++;
  }
  return subidas;
}

/** Las fotos de las plataformas, por dominio: la imagen de vista previa de cada sitio o una captura de su portada (LEEME.md). */
const CARPETA_PLATAFORMAS = join(__dirname, 'imagenes-plataformas');

/**
 * Sube la foto de cada plataforma activa que no tenga imagen y cuyo dominio tenga archivo en
 * `imagenes-plataformas/`. Las demás se ven con el ícono de su categoría. Idempotente.
 */
export async function sembrarImagenesPlataformas(
  prisma: PrismaService,
  almacenamiento: AlmacenamientoService,
) {
  const plataformas = await prisma.plataforma.findMany({
    where: { activa: true, imagen_key: null },
  });
  let subidas = 0;
  for (const p of plataformas) {
    const datos = await readFile(join(CARPETA_PLATAFORMAS, `${new URL(p.url).hostname}.jpg`)).catch(
      () => null,
    );
    if (!datos) continue;
    const { clave } = await almacenamiento.guardarImagen(`plataformas/${p.id}`, datos);
    await prisma.plataforma.update({ where: { id: p.id }, data: { imagen_key: clave } });
    subidas++;
  }
  return subidas;
}
