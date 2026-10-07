import { CANTIDAD_MINIMA_POR_DEFECTO, PESOS_POR_DEFECTO } from '@acopio/shared';
import type { PrismaService } from '../comun/prisma/prisma.service';
import type { ProveedorIdentidad } from '../modulos/identidad/proveedor/proveedor-identidad';
import { CANASTA_VERSIONES, CATEGORIAS } from './datos-catalogo';

export interface AdminSemilla {
  username: string;
  nombre: string;
  correo: string;
  contrasena: string;
}

export interface ResumenSeed {
  categorias: number;
  canasta: number;
  adminCreado: boolean;
}

/**
 * Carga el catálogo inicial, las versiones de la canasta y el primer administrador.
 * Idempotente: correrlo dos veces deja lo mismo (criterio de salida del Bloque 0).
 * No toca lo que ya existe: si alguien editó una categoría, el seed no la pisa.
 */
export async function sembrar(
  prisma: PrismaService,
  proveedor: ProveedorIdentidad,
  admin: AdminSemilla,
): Promise<ResumenSeed> {
  for (const c of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: {
        nombre: c.nombre,
        grupo: c.grupo,
        unidad_base: c.unidadBase,
        perecedero: c.perecedero,
        sinonimos: c.sinonimos,
      },
    });
  }

  for (const { vigenteDesde, filas } of CANASTA_VERSIONES) {
    for (const v of filas) {
      const categoria = await prisma.categoria.findUniqueOrThrow({
        where: { nombre: v.categoria },
      });
      await prisma.canastaEstandar.upsert({
        where: {
          categoria_id_vigente_desde: { categoria_id: categoria.id, vigente_desde: vigenteDesde },
        },
        update: {},
        create: {
          categoria_id: categoria.id,
          cantidad_persona_dia: v.cantidadPersonaDia,
          fuente: v.fuente,
          vigente_desde: vigenteDesde,
        },
      });
    }
  }

  // RF-CAT-006: una sola fila global con los pesos por defecto
  await prisma.configuracionMotor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pesos: { ...PESOS_POR_DEFECTO },
      cantidad_minima: CANTIDAD_MINIMA_POR_DEFECTO,
    },
  });

  const adminCreado = await sembrarAdmin(prisma, proveedor, admin);

  return {
    categorias: await prisma.categoria.count(),
    canasta: await prisma.canastaEstandar.count(),
    adminCreado,
  };
}

/**
 * El primer administrador es el único usuario que no nace de una invitación. Su
 * contraseña viene de SEED_ADMIN_CONTRASENA y debe cambiarse de inmediato.
 */
async function sembrarAdmin(
  prisma: PrismaService,
  proveedor: ProveedorIdentidad,
  admin: AdminSemilla,
): Promise<boolean> {
  const existente = await prisma.usuario.findUnique({ where: { username: admin.username } });
  if (existente) return false;
  const { uid } = await proveedor.crearUsuario(admin.correo, admin.contrasena);
  const usuario = await prisma.usuario.create({
    data: {
      username: admin.username,
      nombre: admin.nombre,
      correo: admin.correo,
      rol: 'ADMIN',
      estado: 'ACTIVO',
      supabase_uid: uid,
      tokens_validos_desde: new Date(),
    },
  });
  await prisma.bitacora.create({
    data: {
      usuario_id: null,
      accion: 'seed.admin_creado',
      entidad: 'usuario',
      entidad_id: usuario.id,
      destacado: true,
    },
  });
  return true;
}
