import '../src/config/zod-es';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LimiteIntentosGuard } from '../src/comun/limite-intentos.guard';
import { PrismaService } from '../src/comun/prisma/prisma.service';
import { configurarApp } from '../src/configurar-app';
import { leerEntorno } from '../src/config/entorno';
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
  return r.body.accessToken as string;
}

let consecutivo = 0;
/** Nombre de usuario único por prueba. */
export function unico(prefijo: string): string {
  consecutivo += 1;
  return `${prefijo}${Date.now().toString(36)}${consecutivo}`;
}

export const ACOPIO_A = '11111111-1111-4111-8111-111111111111';
export const ACOPIO_B = '22222222-2222-4222-8222-222222222222';

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
