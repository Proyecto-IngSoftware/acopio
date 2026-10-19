import 'reflect-metadata';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { config } from 'dotenv';
import { codigoReserva, HORARIO_VACIO, hoyBogota, sumarMeses, type Horario } from '@acopio/shared';
import { PrismaService } from '../comun/prisma/prisma.service';
import { leerEntorno } from '../config/entorno';
import type { ProveedorIdentidad } from '../modulos/identidad/proveedor/proveedor-identidad';
import type { Prisma } from '../generado/prisma/client';
import { AlmacenS3 } from '../modulos/almacenamiento/almacen-s3';
import { AlmacenamientoService } from '../modulos/almacenamiento/almacenamiento.service';
import { contrasenaDemo, crearCuentaDemo, proveedorDelSeed } from './credenciales';
import { sembrarImagenesDemo } from './imagenes-demo';
import { AcopioDao } from '../modulos/acopios/dao/acopio.dao';
import { relojReal } from '../modulos/acopios/geocodificacion';
import { BitacoraService } from '../modulos/auditoria/bitacora.service';
import { EjecucionDao } from '../modulos/importacion/dao/ejecucion.dao';
import { PlataformaDao } from '../modulos/importacion/dao/plataforma.dao';
import { RedAcopioArchivo } from '../modulos/importacion/fuentes/redacopio/redacopio-archivo';
import { ImportadorReferenciadosService } from '../modulos/importacion/importador-referenciados.service';
import { Transacciones } from '../comun/prisma/transacciones';

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
    telefono: '601 555 0101',
    indicaciones: 'Entrada por la puerta lateral de la calle 60. Toca el timbre del local 2.',
    lat: 4.6486,
    lng: -74.0628,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000012',
    entidad: 0,
    nombre: 'Acopio Kennedy (prueba)',
    direccion: 'Avenida 1 de Mayo # 72-10',
    telefono: '601 555 0102',
    indicaciones: 'Recibimos en el parqueadero del salón comunal, al fondo a la derecha.',
    lat: 4.6097,
    lng: -74.1498,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000013',
    entidad: 1,
    nombre: 'Acopio Suba (prueba)',
    direccion: 'Calle 145 # 91-19',
    telefono: '601 555 0103',
    indicaciones: 'Bodega detrás de la parroquia; si está cerrada, llama antes de llegar.',
    lat: 4.7411,
    lng: -74.0835,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000014',
    entidad: 1,
    nombre: 'Acopio Usme (prueba)',
    direccion: 'Carrera 14 # 76-50 sur',
    telefono: '601 555 0104',
    indicaciones: 'Portón verde junto a la tienda. Hay rampa para descargar.',
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
    // Teléfono e indicaciones también en una demo ya sembrada: son los que llenan «Cómo entrar»
    const contacto = { telefono: x.telefono, indicaciones_acceso: x.indicaciones };
    await prisma.acopio.upsert({
      where: { id: x.id },
      update: contacto,
      create: {
        ...contacto,
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

/**
 * Una cuenta por rol para recorrer la consola, cada una con el correo de maqueta de un
 * integrante del equipo (P-042). Todas con la misma contraseña.
 */
const USUARIOS_DEMO = [
  {
    username: 'operador1',
    nombre: 'Joseph · Operador Chapinero (prueba)',
    correo: 'joseph@acopio.co',
    rol: 'OPERADOR',
    acopio: 0,
  },
  {
    username: 'operador2',
    nombre: 'Brayan · Operador Kennedy (prueba)',
    correo: 'brayan@acopio.co',
    rol: 'OPERADOR',
    acopio: 1,
  },
  {
    username: 'auditor1',
    nombre: 'Michael · Auditor (prueba)',
    correo: 'michael@acopio.co',
    rol: 'AUDITOR',
    acopio: 0,
  },
  {
    username: 'receptor1',
    nombre: 'Alejandra · Receptora Mocoa (prueba)',
    correo: 'alejandra@acopio.co',
    rol: 'RECEPTOR',
    acopio: null,
  },
] as const;

/**
 * Usuarios por rol, una emergencia con zona y un inventario que muestra cada estado del
 * semáforo, una salida, un ajuste, una entrada sin conexión, «no recibir» y códigos de
 * barras. Las cuentas se crean con el proveedor configurado (local o Supabase).
 */
export async function sembrarEscenariosDemo(
  prisma: PrismaService,
  proveedor: ProveedorIdentidad,
  contrasena: string,
) {
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
    const correo = u.correo;
    const { uid } = await crearCuentaDemo(proveedor, correo, contrasena);
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
  const donador = await sembrarDonadorDemo(prisma, proveedor, contrasena);
  await sembrarDonacionesDemo(prisma, donador, ids.operador1!);
  await sembrarMotorDemo(prisma, ids.operador1!);
  await sembrarRemisionesDemo(prisma, ids.operador2!, ids.receptor1!, donador);
  await sembrarCausasDemo(prisma, admin.id);
  await sembrarTurnosDemo(prisma, admin.id);
  return [...USUARIOS_DEMO.map((u) => u.username), DONADOR_DEMO.correo];
}

const DONADOR_DEMO = { correo: 'donador1@demo.acopio.local', nombre: 'Donadora (prueba)' };

/** El Donador entra con correo (C-04): no tiene username. Queda confirmado. */
async function sembrarDonadorDemo(
  prisma: PrismaService,
  proveedor: ProveedorIdentidad,
  contrasena: string,
) {
  const existente = await prisma.usuario.findUnique({ where: { correo: DONADOR_DEMO.correo } });
  if (existente) return existente.id;
  const { uid } = await crearCuentaDemo(proveedor, DONADOR_DEMO.correo, contrasena);
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

const ZONA_DEMO_2 = 'd0000000-0000-4000-8000-000000000032';

/**
 * Excedentes de agua y arroz en Kennedy y Suba, con umbrales, y una segunda zona más
 * pequeña: el primer recálculo propone traslados a las dos. Solo la primera vez.
 */
async function sembrarMotorDemo(prisma: PrismaService, operador: string) {
  if (await prisma.zona.findUnique({ where: { id: ZONA_DEMO_2 } })) return;
  await prisma.zona.create({
    data: {
      id: ZONA_DEMO_2,
      emergencia_id: EMERGENCIA_DEMO,
      nombre: 'Vereda El Pepino (prueba)',
      municipio: 'Mocoa',
      lat: 1.1301,
      lng: -76.6603,
      poblacion_estimada: 400,
      poblacion_fuente: 'Dato ficticio de la demo',
      poblacion_fecha: new Date('2026-09-25T00:00:00Z'),
    },
  });
  const categorias = await prisma.categoria.findMany({
    where: { nombre: { in: ['Agua potable', 'Arroz'] } },
  });
  for (const [i, acopio] of [ACOPIOS[1]!, ACOPIOS[2]!].entries()) {
    for (const c of categorias) {
      const esAgua = c.nombre === 'Agua potable';
      await prisma.movimiento.create({
        data: {
          acopio_id: acopio.id,
          categoria_id: c.id,
          tipo: 'ENTRADA',
          signo: 1,
          cantidad: esAgua ? 3000 + i * 1000 : 800 + i * 200,
          usuario_id: operador,
          ocurrido_en: new Date(),
        },
      });
      await prisma.umbral.upsert({
        where: { acopio_id_categoria_id: { acopio_id: acopio.id, categoria_id: c.id } },
        update: {},
        create: {
          acopio_id: acopio.id,
          categoria_id: c.id,
          minimo: esAgua ? 200 : 50,
          maximo: esAgua ? 1000 : 300,
          actualizado_por: operador,
        },
      });
    }
  }
}

/**
 * Etapa 2 del motor: una remisión en tránsito desde Kennedy hacia San Agustín con un folio
 * conciliado vinculado, un despacho general en tránsito y dos reportes de la Receptora.
 * Cada remisión lleva su SALIDA de traslado, como si se hubiera despachado por la API.
 */
async function sembrarRemisionesDemo(
  prisma: PrismaService,
  operador: string,
  receptora: string,
  donador: string,
) {
  const agua = await prisma.categoria.findFirstOrThrow({ where: { nombre: 'Agua potable' } });
  const arroz = await prisma.categoria.findFirstOrThrow({ where: { nombre: 'Arroz' } });
  const kennedy = ACOPIOS[1]!.id;
  const ahora = new Date();
  const despachar = async (
    codigo: string,
    zonaId: string | null,
    categoriaId: string,
    cantidad: number,
  ) => {
    // La remisión, su despacho y su salida van juntos: si una corrida falla en medio, no
    // queda una remisión en tránsito sin salida que la siguiente daría por hecha
    const existente = await prisma.remision.findUnique({ where: { codigo } });
    if (existente) return existente;
    return prisma.$transaction(async (tx) => {
      const r = await tx.remision.create({
        data: {
          codigo,
          acopio_origen_id: kennedy,
          zona_destino_id: zonaId,
          responsable: 'Camión de la Defensa Civil (prueba)',
          qr_token: `demo-${codigo}`,
          creada_por: operador,
          lineas: { create: { categoria_id: categoriaId, cantidad_planeada: cantidad } },
        },
      });
      // Las líneas solo se escriben en BORRADOR (linea_remision_editable): se despacha después
      await tx.remision.update({
        where: { id: r.id },
        data: { estado: 'EN_TRANSITO', despachada_por: operador, despachada_en: ahora },
      });
      await tx.movimiento.create({
        data: {
          acopio_id: kennedy,
          categoria_id: categoriaId,
          tipo: 'SALIDA',
          signo: -1,
          cantidad,
          motivo_salida: 'TRASLADO',
          nota: `Remisión ${codigo}`,
          remision_id: r.id,
          usuario_id: operador,
          ocurrido_en: ahora,
        },
      });
      return r;
    });
  };
  const conZona = await despachar('R-2026-DEMA2', ZONA_DEMO, agua.id, 400);
  await despachar('R-2026-DEMA3', null, arroz.id, 60);

  // El folio, su vínculo y los reportes se revisan por separado: se completan en otra corrida

  const folio =
    (await prisma.comprobante.findUnique({ where: { folio: 'ACO-2026-DEMB2' } })) ??
    (await prisma.comprobante.create({
      data: {
        folio: 'ACO-2026-DEMB2',
        donador_id: donador,
        acopio_id: kennedy,
        estado: 'CONCILIADO',
        recibido_por: operador,
        recibido_en: ahora,
        verificado_en: ahora,
        cerrado_en: ahora,
        lineas: {
          create: {
            categoria_id: agua.id,
            contenido_unitario: 1,
            cantidad_declarada: 100,
            cantidad_confirmada: 100,
          },
        },
      },
    }));
  const vinculo = { remision_id: conZona.id, comprobante_id: folio.id };
  if (
    !(await prisma.remisionComprobante.findUnique({
      where: { remision_id_comprobante_id: vinculo },
    }))
  )
    await prisma.remisionComprobante.create({ data: { ...vinculo, vinculado_por: operador } });

  if (await prisma.reporteNecesidad.count({ where: { zona_id: ZONA_DEMO } })) return;

  for (const [categoriaId, nota] of [
    [agua.id, 'Las familias del coliseo no tienen agua desde ayer'],
    [arroz.id, 'Faltan alimentos para la olla comunitaria'],
  ] as const) {
    await prisma.reporteNecesidad.create({
      data: { zona_id: ZONA_DEMO, categoria_id: categoriaId, reportado_por: receptora, nota },
    });
  }
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
/**
 * Pieza E: los puntos de RedAcopio y sus plataformas, leídos de la copia guardada. Reimportar no
 * cambia nada si la copia es la misma.
 */
export function importarRedAcopioDemo(prisma: PrismaService) {
  const importador = new ImportadorReferenciadosService(
    new AcopioDao(prisma),
    new PlataformaDao(prisma),
    new EjecucionDao(prisma),
    new Transacciones(prisma),
    new BitacoraService(prisma),
    relojReal,
  );
  return importador.ejecutar(new RedAcopioArchivo(), null);
}

if (require.main === module) {
  config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });
  // Antes de abrir la base: en producción, sin la variable, no se toca nada
  const contrasena = contrasenaDemo(process.env);
  const entorno = leerEntorno({ ...process.env, DATABASE_URL: process.env.DATABASE_URL_OWNER });
  const prisma = new PrismaService(entorno);
  sembrarDemo(prisma)
    .then(async (r) => {
      console.log(`Demo lista: ${r.entidades} entidades y ${r.acopios} acopios de prueba.`);
      const proveedor = proveedorDelSeed(prisma, entorno);
      const usuarios = await sembrarEscenariosDemo(prisma, proveedor, contrasena);
      console.log(`Usuarios de prueba: ${usuarios.join(', ')}.`);
      // Sin almacén la demo sirve igual: las causas se ven con el recuadro de siempre
      try {
        const almacenamiento = new AlmacenamientoService(new AlmacenS3(entorno));
        const subidas = await sembrarImagenesDemo(prisma, almacenamiento);
        console.log(`Imágenes de la demo: ${subidas} nuevas.`);
      } catch (error: unknown) {
        console.warn(
          `No se subieron las imágenes de la demo: ${error instanceof Error ? error.message : error}`,
        );
      }
      // Como las imágenes: si la copia de RedAcopio no se puede leer, la demo arranca sin esos puntos
      try {
        const red = await importarRedAcopioDemo(prisma);
        console.log(
          red.resultado === 'OK'
            ? `RedAcopio desde la copia: ${red.creados} nuevos, ${red.actualizados} actualizados, ${red.cerrados} cerrados.`
            : `RedAcopio desde la copia: la lectura abortó (${red.motivo}).`,
        );
      } catch (error: unknown) {
        console.warn(`No se importó RedAcopio: ${error instanceof Error ? error.message : error}`);
      }
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

const ENTIDADES_CAUSAS = [
  {
    nombre: 'Cruz Roja Colombiana',
    tipo: 'ONG',
    sitio_web: 'https://www.cruzrojacolombiana.org',
  },
  {
    nombre: 'UNICEF Colombia',
    tipo: 'ONG',
    sitio_web: 'https://www.unicef.org/colombia',
  },
] as const;

/** Causas de la demo: [entidad, categoría, título, meses hasta el cierre, ¿atendida?]. */
const CAUSAS_DEMO = [
  [0, 'PERSONAS', 'Mercados para familias damnificadas (demo)', 1, false],
  [1, 'PERSONAS', 'Kits escolares para niños de Mocoa (demo)', 2, false],
  [0, 'RESCATISTAS', 'Equipos para rescatistas de Salgar (demo)', 4, false],
  [1, 'ANIMALES', 'Alimento para animales rescatados (demo)', -1, true],
] as const;

/**
 * Dos organizaciones reconocidas, verificadas por el administrador, con causas de ejemplo
 * (pieza C, §7). Los títulos dicen «(demo)» y los enlaces van al sitio principal de cada
 * una: el servidor de pruebas es público y no se inventan rutas de donación. Si la entidad ya existe, no se
 * toca; las causas se crean solo si su entidad está verificada.
 */
export async function sembrarCausasDemo(
  prisma: PrismaService,
  adminId: string,
  ahora = new Date(),
) {
  const hoy = hoyBogota(ahora);
  const entidades = [];
  for (const e of ENTIDADES_CAUSAS) {
    entidades.push(
      await prisma.entidad.upsert({
        where: { nombre: e.nombre },
        update: {},
        create: {
          nombre: e.nombre,
          tipo: e.tipo,
          sitio_web: e.sitio_web,
          descripcion: 'Entidad de la demostración de Acopio',
          verificacion: 'VERIFICADA',
          verificada_por: adminId,
          verificada_en: ahora,
        },
      }),
    );
  }
  for (const [i, categoria, titulo, meses, atendida] of CAUSAS_DEMO) {
    const entidad = entidades[i]!;
    if (entidad.verificacion !== 'VERIFICADA') continue;
    if (await prisma.causa.findFirst({ where: { titulo, entidad_id: entidad.id } })) continue;
    await prisma.causa.create({
      data: {
        entidad_id: entidad.id,
        categoria,
        titulo,
        descripcion:
          'Causa de ejemplo para la demostración de Acopio. Para donar de verdad, entra al sitio oficial de la organización.',
        pasos: [
          `Entra al sitio oficial de ${entidad.nombre}.`,
          'Busca la sección de donaciones.',
          'Elige el monto y el medio de pago.',
          'Guarda el comprobante que te envía la organización.',
        ],
        url_oficial: ENTIDADES_CAUSAS[i]!.sitio_web,
        cierra_el: new Date(`${sumarMeses(hoy, meses)}T00:00:00Z`),
        publicada_en: ahora,
        creada_por: adminId,
        ...(atendida && { archivada_en: ahora, archivo_motivo: 'VENCIDA' as const }),
      },
    });
  }
}

const MS_HORA_DEMO = 3_600_000;

/**
 * Jornadas de voluntariado (Bloque 5, §7), relativas a `ahora`: una llena, una con cupos, una
 * con las reservas ya cerradas y una de la Cruz Roja que pide conductores. Si ya hay una jornada
 * vigente con el mismo título no se crea otra. Las reservas usan correos de la demo y un secreto
 * aleatorio que nadie conoce.
 */
export async function sembrarTurnosDemo(
  prisma: PrismaService,
  adminId: string,
  ahora = new Date(),
) {
  const dia = (n: number, hora: number) => {
    const base = Date.parse(`${hoyBogota(ahora)}T00:00:00-05:00`);
    return new Date(base + n * 24 * MS_HORA_DEMO + hora * MS_HORA_DEMO);
  };
  const cruzRoja = await prisma.entidad.findUnique({ where: { nombre: 'Cruz Roja Colombiana' } });
  const acopios = await prisma.acopio.findMany({
    where: { id: { in: ACOPIOS.map((a) => a.id) } },
    select: { id: true },
  });
  const [primero, segundo] = [acopios[0]?.id, acopios[1]?.id ?? acopios[0]?.id];
  const jornadas: {
    titulo: string;
    reservas: number;
    datos: Omit<Prisma.JornadaUncheckedCreateInput, 'titulo' | 'creada_por'>;
  }[] = [];
  const comun = {
    descripcion: 'Clasificar lo que llegó y armar los kits para las familias (dato de prueba)',
    que_llevar: 'Guantes, agua y ropa cómoda',
    requisitos: { ropaCerrada: true, carga: false },
  };
  if (primero) {
    jornadas.push(
      {
        titulo: 'Clasificar ropa donada (demo)',
        reservas: 3,
        datos: { ...comun, acopio_id: primero, inicio: dia(2, 8), fin: dia(2, 12), cupo_maximo: 3 },
      },
      {
        titulo: 'Armar mercados (demo)',
        reservas: 2,
        datos: {
          ...comun,
          acopio_id: primero,
          inicio: dia(3, 14),
          fin: dia(3, 18),
          cupo_maximo: 20,
        },
      },
    );
  }
  if (segundo) {
    const pronto = new Date(ahora.getTime() + 6 * MS_HORA_DEMO);
    jornadas.push({
      titulo: 'Descargar el camión de agua (demo)',
      reservas: 4,
      datos: {
        ...comun,
        requisitos: { ropaCerrada: true, carga: true },
        acopio_id: segundo,
        inicio: pronto,
        fin: new Date(pronto.getTime() + 3 * MS_HORA_DEMO),
        cupo_maximo: 8,
      },
    });
  }
  if (cruzRoja?.verificacion === 'VERIFICADA') {
    jornadas.push({
      titulo: 'Conductores para llevar kits a Mocoa (demo)',
      reservas: 1,
      datos: {
        ...comun,
        descripcion: 'Llevar kits de aseo y mercados a los puntos de entrega (dato de prueba)',
        entidad_id: cruzRoja.id,
        direccion: 'Punto de encuentro de la demostración',
        municipio: 'Bogotá',
        perfil_requerido: 'CONDUCTOR_C2',
        inicio: dia(3, 6),
        fin: dia(3, 14),
        cupo_maximo: 6,
      },
    });
  }
  for (const j of jornadas) {
    const vigente = await prisma.jornada.findFirst({
      where: { titulo: j.titulo, fin: { gt: ahora } },
    });
    if (vigente) continue;
    const creada = await prisma.jornada.create({
      data: { ...j.datos, titulo: j.titulo, creada_por: adminId },
    });
    for (let i = 1; i <= j.reservas; i++) {
      await prisma.reserva.create({
        data: {
          jornada_id: creada.id,
          nombre: `Voluntario ${i} (prueba)`,
          correo: `voluntario${i}@demo.acopio.local`,
          codigo: codigoReserva((n) => randomBytes(n)),
          secreto_hash: createHash('sha256').update(randomBytes(18)).digest('hex'),
          perfil_declarado: Boolean(j.datos.perfil_requerido),
          consentimiento_en: ahora,
        },
      });
    }
  }
}
