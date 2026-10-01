import 'reflect-metadata';
import path from 'node:path';
import { config } from 'dotenv';
import { HORARIO_VACIO, type Horario } from '@acopio/shared';
import { PrismaService } from '../comun/prisma/prisma.service';
import { leerEntorno } from '../config/entorno';
import type { Prisma } from '../generado/prisma/client';

const semana: Horario = {
  ...HORARIO_VACIO,
  lun: [{ abre: '08:00', cierra: '17:00' }],
  mar: [{ abre: '08:00', cierra: '17:00' }],
  mie: [{ abre: '08:00', cierra: '17:00' }],
  jue: [{ abre: '08:00', cierra: '17:00' }],
  vie: [{ abre: '08:00', cierra: '17:00' }],
  sab: [{ abre: '09:00', cierra: '13:00' }],
};

const ENTIDADES = [
  {
    id: 'd0000000-0000-4000-8000-000000000001',
    nombre: 'Fundación Manos Unidas (prueba)',
    tipo: 'Fundación',
  },
  {
    id: 'd0000000-0000-4000-8000-000000000002',
    nombre: 'Parroquia San José (prueba)',
    tipo: 'Iglesia',
  },
];
const ACOPIOS = [
  {
    id: 'd0000000-0000-4000-8000-000000000011',
    entidad: 0,
    nombre: 'Acopio Chapinero (prueba)',
    direccion: 'Carrera 13 # 60-20',
    lat: 4.6486,
    lng: -74.0628,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000012',
    entidad: 0,
    nombre: 'Acopio Kennedy (prueba)',
    direccion: 'Avenida 1 de Mayo # 72-10',
    lat: 4.6097,
    lng: -74.1498,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000013',
    entidad: 1,
    nombre: 'Acopio Suba (prueba)',
    direccion: 'Calle 145 # 91-19',
    lat: 4.7411,
    lng: -74.0835,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000014',
    entidad: 1,
    nombre: 'Acopio Usme (prueba)',
    direccion: 'Carrera 14 # 76-50 sur',
    lat: 4.4734,
    lng: -74.1263,
  },
];

/** Datos ficticios para ver el mapa en local. No va a producción; no toca el seed real. */
export async function sembrarDemo(prisma: PrismaService) {
  for (const e of ENTIDADES) {
    await prisma.entidad.upsert({ where: { id: e.id }, update: {}, create: e });
  }
  for (const x of ACOPIOS) {
    await prisma.acopio.upsert({
      where: { id: x.id },
      update: {},
      create: {
        id: x.id,
        entidad_id: ENTIDADES[x.entidad]!.id,
        nombre: x.nombre,
        direccion: x.direccion,
        municipio: 'Bogotá',
        lat: x.lat,
        lng: x.lng,
        horario: semana as unknown as Prisma.InputJsonValue,
      },
    });
  }
  await sembrarInventarioDemo(prisma, ACOPIOS[0]!.id);
  return { entidades: ENTIDADES.length, acopios: ACOPIOS.length };
}

/** Inventario de ejemplo para C3 en un acopio, solo si aún no tiene movimientos. */
async function sembrarInventarioDemo(prisma: PrismaService, acopioId: string) {
  if ((await prisma.movimiento.count({ where: { acopio_id: acopioId } })) > 0) return;
  // El movimiento necesita un usuario: el primer administrador, el del seed real
  const admin = await prisma.usuario.findFirst({
    where: { rol: 'ADMIN' },
    orderBy: { creado_en: 'asc' },
  });
  if (!admin) return;
  const categorias = await prisma.categoria.findMany({
    where: { archivada: false },
    orderBy: { nombre: 'asc' },
    take: 6,
  });
  for (const [i, c] of categorias.entries()) {
    await prisma.movimiento.create({
      data: {
        acopio_id: acopioId,
        categoria_id: c.id,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad: (i + 1) * 10,
        vence_en: c.perecedero ? new Date(Date.UTC(2026, 11, 1 + i)) : null,
        usuario_id: admin.id,
        ocurrido_en: new Date(),
      },
    });
  }
}

/** `bun run --filter @acopio/api seed:demo`. Corre como dueño de la base. */
if (require.main === module) {
  config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });
  const entorno = leerEntorno({ ...process.env, DATABASE_URL: process.env.DATABASE_URL_OWNER });
  const prisma = new PrismaService(entorno);
  sembrarDemo(prisma)
    .then((r) =>
      console.log(`Demo lista: ${r.entidades} entidades y ${r.acopios} acopios de prueba.`),
    )
    .finally(() => prisma.$disconnect());
}
