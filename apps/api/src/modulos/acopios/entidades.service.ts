import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { restriccionUnicaViolada } from '../../comun/prisma/errores-prisma';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { Entidad } from '../../generado/prisma/client';
import { BitacoraService } from '../auditoria/bitacora.service';

export interface DatosEntidad {
  nombre: string;
  tipo: string;
  nit?: string | null;
  sitioWeb?: string | null;
  telefono?: string | null;
  correo?: string | null;
  descripcion?: string | null;
}

/** Entidades responsables de acopios (RF-RED-005). Sin verificación todavía (B-01). */
@Injectable()
export class EntidadesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar() {
    const filas = await this.prisma.entidad.findMany({ orderBy: { nombre: 'asc' } });
    return filas.map(presentarEntidad);
  }

  async crear(admin: UsuarioAutenticado, datos: DatosEntidad) {
    return this.prisma
      .$transaction(async (tx) => {
        const e = await tx.entidad.create({
          data: { ...aFila(datos), nombre: datos.nombre.trim(), tipo: datos.tipo.trim() },
        });
        await this.bitacora.registrar(tx, {
          usuarioId: admin.id,
          accion: 'entidad.creada',
          entidad: 'entidad',
          entidadId: e.id,
          despues: presentarEntidad(e),
        });
        return presentarEntidad(e);
      })
      .catch(traducirDuplicado);
  }

  async actualizar(admin: UsuarioAutenticado, id: string, cambios: Partial<DatosEntidad>) {
    return this.prisma
      .$transaction(async (tx) => {
        const antes = await tx.entidad.findUnique({ where: { id } });
        if (!antes) throw new ErrorDominio('ENTIDAD_NO_ENCONTRADA', 'La entidad no existe', 404);
        const despues = await tx.entidad.update({ where: { id }, data: aFila(cambios) });
        await this.bitacora.registrar(tx, {
          usuarioId: admin.id,
          accion: 'entidad.actualizada',
          entidad: 'entidad',
          entidadId: id,
          antes: presentarEntidad(antes),
          despues: presentarEntidad(despues),
        });
        return presentarEntidad(despues);
      })
      .catch(traducirDuplicado);
  }
}

function aFila(d: Partial<DatosEntidad>) {
  return {
    nombre: d.nombre?.trim(),
    tipo: d.tipo?.trim(),
    nit: d.nit,
    sitio_web: d.sitioWeb,
    telefono: d.telefono,
    correo: d.correo,
    descripcion: d.descripcion,
  };
}

export function presentarEntidad(e: Entidad) {
  return {
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo,
    nit: e.nit,
    sitioWeb: e.sitio_web,
    telefono: e.telefono,
    correo: e.correo,
    descripcion: e.descripcion,
    verificacion: e.verificacion,
  };
}

function traducirDuplicado(error: unknown): never {
  if (restriccionUnicaViolada(error) !== null) {
    throw new ErrorDominio('ENTIDAD_DUPLICADA', 'Ya existe una entidad con ese nombre', 409);
  }
  throw error;
}
