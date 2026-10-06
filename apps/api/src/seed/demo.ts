import 'reflect-metadata';
import path from 'node:path';
import { config } from 'dotenv';
import { HORARIO_VACIO, type Horario } from '@acopio/shared';
import { PrismaService } from '../comun/prisma/prisma.service';
import { leerEntorno } from '../config/entorno';
import { ProveedorLocal } from '../modulos/identidad/proveedor/proveedor-local';
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

const EMERGENCIA_DEMO = 'd0000000-0000-4000-8000-000000000021';
const ZONA_DEMO = 'd0000000-0000-4000-8000-000000000031';

/** Una cuenta por rol para recorrer la consola. Todas con la misma contraseña. */
const USUARIOS_DEMO = [
  { username: 'operador1', nombre: 'Operadora Chapinero (prueba)', rol: 'OPERADOR', acopio: 0 },
  { username: 'operador2', nombre: 'Operador Kennedy (prueba)', rol: 'OPERADOR', acopio: 1 },
  { username: 'auditor1', nombre: 'Auditora (prueba)', rol: 'AUDITOR', acopio: 0 },
  { username: 'receptor1', nombre: 'Receptor Mocoa (prueba)', rol: 'RECEPTOR', acopio: null },
] as const;

export const CONTRASENA_DEMO = 'demo-acopio-2026';

/**
 * Usuarios por rol, una emergencia con zona y un inventario que muestra cada estado del
 * semáforo, una salida, un ajuste, una entrada sin conexión, «no recibir» y códigos de
 * barras. Solo con el proveedor local: con Supabase las cuentas viven fuera de la base.
 */
export async function sembrarEscenariosDemo(prisma: PrismaService, proveedor: ProveedorLocal) {
  const admin = await prisma.usuario.findFirst({
    where: { rol: 'ADMIN' },
    orderBy: { creado_en: 'asc' },
  });
  if (!admin) throw new Error('Falta el administrador: corre antes `seed`.');

  await prisma.emergencia.upsert({
    where: { id: EMERGENCIA_DEMO },
    update: {},
    create: {
      id: EMERGENCIA_DEMO,
      nombre: 'Inundaciones Putumayo (prueba)',
      tipo: 'Inundación',
      inicio: new Date('2026-09-20T00:00:00Z'),
      destacada_hasta: new Date('2026-12-31T00:00:00Z'),
    },
  });
  await prisma.zona.upsert({
    where: { id: ZONA_DEMO },
    update: {},
    create: {
      id: ZONA_DEMO,
      emergencia_id: EMERGENCIA_DEMO,
      nombre: 'Barrio San Agustín (prueba)',
      municipio: 'Mocoa',
      lat: 1.1515,
      lng: -76.6476,
      poblacion_estimada: 1200,
      poblacion_fuente: 'Dato ficticio de la demo',
      poblacion_fecha: new Date('2026-09-25T00:00:00Z'),
    },
  });

  const ids: Record<string, string> = {};
  for (const u of USUARIOS_DEMO) {
    const existente = await prisma.usuario.findUnique({ where: { username: u.username } });
    if (existente) {
      ids[u.username] = existente.id;
      continue;
    }
    const correo = `${u.username}@demo.acopio.local`;
    const { uid } = await proveedor.crearUsuario(correo, CONTRASENA_DEMO);
    const creado = await prisma.usuario.create({
      data: {
        username: u.username,
        nombre: u.nombre,
        correo,
        rol: u.rol,
        estado: 'ACTIVO',
        supabase_uid: uid,
        tokens_validos_desde: new Date(),
        asignaciones: {
          create: {
            ubicacion_tipo: u.acopio === null ? 'ZONA' : 'ACOPIO',
            ubicacion_id: u.acopio === null ? ZONA_DEMO : ACOPIOS[u.acopio]!.id,
            asignado_por: admin.id,
          },
        },
      },
    });
    ids[u.username] = creado.id;
  }

  await sembrarCasosInventario(prisma, ids.operador1!, ids.operador2!);
  const donador = await sembrarDonadorDemo(prisma, proveedor);
  await sembrarDonacionesDemo(prisma, donador, ids.operador1!);
  return [...USUARIOS_DEMO.map((u) => u.username), DONADOR_DEMO.correo];
}

const DONADOR_DEMO = { correo: 'donador1@demo.acopio.local', nombre: 'Donadora (prueba)' };

/** El Donador entra con correo (C-04): no tiene username. Queda confirmado. */
async function sembrarDonadorDemo(prisma: PrismaService, proveedor: ProveedorLocal) {
  const existente = await prisma.usuario.findUnique({ where: { correo: DONADOR_DEMO.correo } });
  if (existente) return existente.id;
  const { uid } = await proveedor.crearUsuario(DONADOR_DEMO.correo, CONTRASENA_DEMO);
  const creado = await prisma.usuario.create({
    data: {
      nombre: DONADOR_DEMO.nombre,
      correo: DONADOR_DEMO.correo,
      rol: 'DONADOR',
      estado: 'ACTIVO',
      supabase_uid: uid,
      tokens_validos_desde: new Date(),
    },
  });
  return creado.id;
}

/**
 * Una donación preparada, una recibida con diferencia (8 de 10) para la bandeja C8 y una
 * preparada que llegó sin red, con su entrada suelta para vincular. Folios fijos para
 * buscarlos a mano; solo la primera vez.
 */
async function sembrarDonacionesDemo(prisma: PrismaService, donadorId: string, operador1: string) {
  if (await prisma.comprobante.findUnique({ where: { folio: 'ACO-2026-DEMA2' } })) return;
  const chapinero = ACOPIOS[0]!.id;
  const cat = await prisma.categoria.findFirst({
    where: { archivada: false, perecedero: false, unidad_base: 'UNIDAD' },
    orderBy: { nombre: 'asc' },
  });
  if (!cat) return;
  const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000);
  const linea = { categoria_id: cat.id, contenido_unitario: 1, cantidad_declarada: 10 };

  await prisma.comprobante.create({
    data: {
      folio: 'ACO-2026-DEMA2',
      donador_id: donadorId,
      acopio_id: chapinero,
      lineas: { create: [linea] },
    },
  });

  const recibida = await prisma.comprobante.create({
    data: {
      folio: 'ACO-2026-DEMA3',
      donador_id: donadorId,
      acopio_id: chapinero,
      estado: 'PENDIENTE',
      creado_en: hace(30),
      recibido_por: operador1,
      recibido_en: hace(6),
      lineas: {
        create: [
          { ...linea, cantidad_confirmada: 8, motivo_diferencia: 'Dos cajas llegaron rotas' },
        ],
      },
    },
  });
  const entrada = await prisma.movimiento.create({
    data: {
      acopio_id: chapinero,
      categoria_id: cat.id,
      tipo: 'ENTRADA',
      signo: 1,
      cantidad: 8,
      usuario_id: operador1,
      ocurrido_en: hace(6),
    },
  });
  await prisma.comprobanteMovimiento.create({
    data: {
      comprobante_id: recibida.id,
      movimiento_id: entrada.id,
      origen: 'RECEPCION',
      vinculado_por: operador1,
    },
  });

  await prisma.comprobante.create({
    data: {
      folio: 'ACO-2026-DEMA4',
      donador_id: donadorId,
      acopio_id: chapinero,
      creado_en: hace(48),
      lineas: { create: [{ ...linea, cantidad_declarada: 6 }] },
    },
  });
  // La entregaron sin red: el Operador la registró como entrada suelta y la vincula el Auditor
  await prisma.movimiento.create({
    data: {
      acopio_id: chapinero,
      categoria_id: cat.id,
      tipo: 'ENTRADA',
      signo: 1,
      cantidad: 6,
      usuario_id: operador1,
      ocurrido_en: hace(20),
      origen_offline: true,
    },
  });
}

/** Solo la primera vez: se reconoce por los umbrales del acopio de Chapinero. */
async function sembrarCasosInventario(prisma: PrismaService, operador1: string, operador2: string) {
  const chapinero = ACOPIOS[0]!.id;
  if ((await prisma.umbral.count({ where: { acopio_id: chapinero } })) > 0) return;

  // Las mismas seis categorías de sembrarInventarioDemo, con saldos 10, 20, … 60
  const c = await prisma.categoria.findMany({
    where: { archivada: false },
    orderBy: { nombre: 'asc' },
    take: 8,
  });
  if (c.length < 8) return;
  const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000);
  const base = { acopio_id: chapinero, usuario_id: operador1 };

  await prisma.movimiento.create({
    data: {
      ...base,
      categoria_id: c[1]!.id,
      tipo: 'SALIDA',
      signo: -1,
      cantidad: 5,
      motivo_salida: 'ENTREGA_FAMILIAS',
      ocurrido_en: hace(1),
    },
  });
  await prisma.movimiento.create({
    data: {
      ...base,
      categoria_id: c[3]!.id,
      tipo: 'AJUSTE',
      signo: -1,
      cantidad: 4,
      motivo: 'Conteo físico: faltaban 4 en el estante',
      ocurrido_en: hace(2),
    },
  });
  // Llegó sin conexión: el Historial la muestra con sus dos horas
  await prisma.movimiento.create({
    data: {
      ...base,
      categoria_id: c[4]!.id,
      tipo: 'ENTRADA',
      signo: 1,
      cantidad: 8,
      ocurrido_en: hace(3),
      origen_offline: true,
    },
  });

  // Saldos 10, 15, 30, 36, 58 y 60: bajo, cerca, en rango, sobre, sin umbral y sin umbral
  const umbrales: [number, number, number][] = [
    [0, 20, 100],
    [1, 12, 60],
    [2, 10, 50],
    [3, 5, 20],
  ];
  for (const [i, minimo, maximo] of umbrales) {
    await prisma.umbral.create({
      data: {
        acopio_id: chapinero,
        categoria_id: c[i]!.id,
        minimo,
        maximo,
        actualizado_por: operador1,
      },
    });
  }
  await prisma.noRecibir.create({
    data: { acopio_id: chapinero, categoria_id: c[6]!.id, marcado_por: operador1 },
  });

  // EAN-13 con dígito de control válido: uno revisado y otro por revisar en C18
  await prisma.codigoBarras.createMany({
    data: [
      {
        ean: '4006381333931',
        categoria_id: c[2]!.id,
        contenido: 1,
        descripcion: 'Presentación de prueba',
        creado_por: operador1,
        revisado: true,
      },
      { ean: '7501031311309', categoria_id: c[5]!.id, creado_por: operador1 },
    ],
    skipDuplicates: true,
  });

  for (const [i, cantidad] of [
    [0, 25],
    [2, 40],
    [7, 12],
  ] as const) {
    await prisma.movimiento.create({
      data: {
        acopio_id: ACOPIOS[1]!.id,
        categoria_id: c[i]!.id,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad,
        vence_en: c[i]!.perecedero ? new Date(Date.UTC(2026, 11, 15)) : null,
        usuario_id: operador2,
        ocurrido_en: hace(5),
      },
    });
  }
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
    .then(async (r) => {
      console.log(`Demo lista: ${r.entidades} entidades y ${r.acopios} acopios de prueba.`);
      if (entorno.AUTH_PROVEEDOR !== 'local') return;
      const usuarios = await sembrarEscenariosDemo(prisma, new ProveedorLocal(prisma, entorno));
      console.log(`Usuarios de prueba (contraseña ${CONTRASENA_DEMO}): ${usuarios.join(', ')}.`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
