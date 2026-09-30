import '../src/config/zod-es';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LimiteIntentosGuard } from '../src/comun/limite-intentos.guard';
import { PrismaService } from '../src/comun/prisma/prisma.service';
import { configurarApp } from '../src/configurar-app';
import { leerEntorno } from '../src/config/entorno';
import { GEOCODIFICADOR, GeocodificadorFalso } from '../src/modulos/acopios/geocodificacion';
import {
  PROVEEDOR_IDENTIDAD,
  type ProveedorIdentidad,
} from '../src/modulos/identidad/proveedor/proveedor-identidad';
import { sembrar } from '../src/seed/sembrar';
import { entornoPruebas } from './entorno-pruebas';

export const ADMIN = {
  username: 'admin',
  nombre: 'Administración',
  correo: 'admin@acopio.test',
  contrasena: 'la contraseña del administrador',
};

export interface AppPrueba {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  prisma: PrismaService;
  cerrar: () => Promise<void>;
}

/** Levanta la API completa contra la base de pruebas, con el seed aplicado. */
export async function crearAppPrueba(
  opciones: { limiteDeIntentos?: boolean } = {},
): Promise<AppPrueba> {
  Object.assign(process.env, entornoPruebas());
  let constructor = Test.createTestingModule({ imports: [AppModule] });
  // CI no sale a internet: Nominatim siempre con el adaptador falso
  constructor = constructor.overrideProvider(GEOCODIFICADOR).useValue(new GeocodificadorFalso());
  if (!opciones.limiteDeIntentos) {
    constructor = constructor
      .overrideProvider(LimiteIntentosGuard)
      .useValue({ canActivate: () => true });
  }
  const modulo = await constructor.compile();
  const app = modulo.createNestApplication({ logger: false });
  configurarApp(app, leerEntorno());
  await app.init();

  const prisma = app.get(PrismaService);
  // El seed corre como dueño; en las pruebas basta con el rol de la API, que puede insertar
  await sembrar(prisma, app.get<ProveedorIdentidad>(PROVEEDOR_IDENTIDAD), ADMIN);
  await sembrarRed(prisma);
  // Cada suite parte con el administrador del seed activo, pase lo que pase en otra
  await prisma.usuario.update({ where: { username: ADMIN.username }, data: { estado: 'ACTIVO' } });

  return {
    app,
    http: () => request(app.getHttpServer()),
    prisma,
    cerrar: () => app.close(),
  };
}

export async function iniciarSesion(
  a: AppPrueba,
  usuario: string,
  contrasena: string,
): Promise<string> {
  const r = await a.http().post('/api/auth/sesion').send({ usuario, contrasena }).expect(200);
  // El token llega en la cookie (ADR-0014); las pruebas lo usan como Bearer
  const cookie = ([] as string[]).concat(r.headers['set-cookie'] ?? []).join(';');
  const token = /acopio_sesion=([^;]+)/.exec(cookie)?.[1];
  if (!token) throw new Error('El inicio de sesión no devolvió la cookie');
  return decodeURIComponent(token);
}

let consecutivo = 0;
/** Nombre de usuario único por prueba. */
export function unico(prefijo: string): string {
  consecutivo += 1;
  return `${prefijo}${Date.now().toString(36)}${consecutivo}`;
}

export const ACOPIO_A = '11111111-1111-4111-8111-111111111111';
export const ACOPIO_B = '22222222-2222-4222-8222-222222222222';
export const ENTIDAD_PRUEBA = '44444444-4444-4444-8444-444444444444';
export const EMERGENCIA_PRUEBA = '55555555-5555-4555-8555-555555555555';
export const ZONA_A = '33333333-3333-4333-8333-333333333333';

/** Horario de lunes a sábado, 8 a 17, para los acopios de prueba. */
export const HORARIO_PRUEBA = {
  dom: [],
  lun: [{ abre: '08:00', cierra: '17:00' }],
  mar: [{ abre: '08:00', cierra: '17:00' }],
  mie: [{ abre: '08:00', cierra: '17:00' }],
  jue: [{ abre: '08:00', cierra: '17:00' }],
  vie: [{ abre: '08:00', cierra: '17:00' }],
  sab: [{ abre: '08:00', cierra: '17:00' }],
};

/**
 * Entidad, dos acopios, una emergencia y una zona con identificadores fijos. Cada
 * suite los deja como nuevos: activos y sin «no recibir».
 */
async function sembrarRed(prisma: PrismaService): Promise<void> {
  await prisma.entidad.upsert({
    where: { id: ENTIDAD_PRUEBA },
    update: {},
    create: { id: ENTIDAD_PRUEBA, nombre: 'Entidad de prueba', tipo: 'Fundación' },
  });
  for (const [id, nombre, lat, lng] of [
    [ACOPIO_A, 'Acopio A', 4.60971, -74.08175],
    [ACOPIO_B, 'Acopio B', 4.7, -74.05],
  ] as const) {
    await prisma.acopio.upsert({
      where: { id },
      update: { nombre, estado: 'ACTIVO', horario: HORARIO_PRUEBA },
      create: {
        id,
        entidad_id: ENTIDAD_PRUEBA,
        nombre,
        direccion: 'Calle 1 # 2-3',
        municipio: 'Bogotá',
        lat,
        lng,
        horario: HORARIO_PRUEBA,
      },
    });
  }
  await prisma.noRecibir.deleteMany({ where: { acopio_id: { in: [ACOPIO_A, ACOPIO_B] } } });
  await prisma.emergencia.upsert({
    where: { id: EMERGENCIA_PRUEBA },
    update: { estado: 'ACTIVA', cerrada_en: null, motivo_cierre: null },
    create: {
      id: EMERGENCIA_PRUEBA,
      nombre: 'Emergencia de prueba',
      tipo: 'Inundación',
      inicio: new Date('2026-09-01T00:00:00Z'),
      destacada_hasta: new Date('2099-12-31T00:00:00Z'),
    },
  });
  await prisma.zona.upsert({
    where: { id: ZONA_A },
    update: {},
    create: {
      id: ZONA_A,
      emergencia_id: EMERGENCIA_PRUEBA,
      nombre: 'Zona A',
      municipio: 'Bogotá',
      lat: 4.5,
      lng: -74.1,
      poblacion_estimada: 1200,
      poblacion_fuente: 'Censo de prueba',
      poblacion_fecha: new Date('2026-09-01T00:00:00Z'),
    },
  });
}

/** Crea un usuario por la API y canjea su invitación. Devuelve su id y su token. */
export async function crearUsuarioActivo(
  a: AppPrueba,
  tokenAdmin: string,
  datos: {
    rol: 'ADMIN' | 'OPERADOR' | 'AUDITOR' | 'RECEPTOR';
    asignaciones?: { tipo: 'ACOPIO' | 'ZONA'; ubicacionId: string }[];
  },
) {
  const username = unico(datos.rol.toLowerCase());
  const contrasena = 'una frase larga para las pruebas';
  const creado = await a
    .http()
    .post('/api/usuarios')
    .set('authorization', `Bearer ${tokenAdmin}`)
    .send({
      username,
      nombre: `Persona ${username}`,
      rol: datos.rol,
      correo: `${username}@acopio.test`,
      asignaciones: datos.asignaciones ?? [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    })
    .expect(201);
  const token = (creado.body.invitacion.enlace as string).split('/').pop()!;
  await a.http().post(`/api/invitaciones/${token}/canje`).send({ contrasena }).expect(200);
  return {
    id: creado.body.usuario.id as string,
    username,
    contrasena,
    token: await iniciarSesion(a, username, contrasena),
  };
}
