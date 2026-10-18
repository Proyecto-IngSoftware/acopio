import sharp from 'sharp';
import type { PrismaService } from '../comun/prisma/prisma.service';
import type { AlmacenamientoService } from '../modulos/almacenamiento/almacenamiento.service';

/**
 * Imágenes de la demo: una ilustración por categoría de causa y un logotipo por entidad, para
 * que P3 y P4 no muestren recuadros vacíos. Son figuras geométricas generadas aquí, sin texto
 * (el contenedor puede no tener fuentes) y sin emblemas de las organizaciones reales.
 */
const FONDO: Record<string, [string, string]> = {
  PERSONAS: ['#0F6E6E', '#C7E8E8'],
  ANIMALES: ['#7A4E1D', '#F3DFC1'],
  ADULTOS_MAYORES: ['#4B3F8A', '#DCD7F5'],
  RESCATISTAS: ['#9A2A1F', '#F6D5CF'],
};

/** Una canasta para personas, una huella para animales, un bastón para adultos mayores y un casco para rescatistas. */
const FIGURA: Record<string, string> = {
  PERSONAS:
    '<rect x="430" y="300" width="340" height="190" rx="24"/><path d="M470 300 L560 190 M730 300 L640 190" stroke-width="26" stroke-linecap="round" fill="none"/>',
  ANIMALES:
    '<ellipse cx="600" cy="400" rx="110" ry="90"/><circle cx="470" cy="270" r="48"/><circle cx="560" cy="215" r="48"/><circle cx="640" cy="215" r="48"/><circle cx="730" cy="270" r="48"/>',
  ADULTOS_MAYORES:
    '<circle cx="560" cy="210" r="60"/><rect x="510" y="285" width="100" height="220" rx="40"/><path d="M690 250 L690 510 M690 250 Q690 210 650 210" stroke-width="22" stroke-linecap="round" fill="none"/>',
  RESCATISTAS:
    '<path d="M420 420 Q420 230 600 230 Q780 230 780 420 Z"/><rect x="390" y="415" width="420" height="45" rx="20"/><rect x="580" y="200" width="40" height="80" rx="12"/>',
};

function svgCausa(categoria: string) {
  const [oscuro, claro] = FONDO[categoria] ?? FONDO.PERSONAS!;
  const figura = FIGURA[categoria] ?? FIGURA.PERSONAS!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <rect width="1200" height="675" fill="${claro}"/>
  <circle cx="1050" cy="110" r="220" fill="${oscuro}" opacity="0.12"/>
  <circle cx="130" cy="600" r="260" fill="${oscuro}" opacity="0.10"/>
  <g fill="${oscuro}" stroke="${oscuro}">${figura}</g>
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
 * Sube las imágenes que falten: la de cada causa «(demo)» sin imagen y el logotipo de cada
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
    if (c.imagen_key) continue;
    const { clave } = await almacenamiento.guardarImagen(
      `causas/${c.id}`,
      await png(svgCausa(c.categoria)),
    );
    await prisma.causa.update({ where: { id: c.id }, data: { imagen_key: clave } });
    subidas++;
  }
  return subidas;
}
