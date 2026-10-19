import { Injectable } from '@nestjs/common';
import {
  abiertoAhora,
  distanciaKm,
  erroresHorario,
  type Horario,
  type Punto,
} from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { Transacciones } from '../../comun/prisma/transacciones';
import type { Prisma } from '../../generado/prisma/client';
import type { EstadoAcopio } from '../../generado/prisma/enums';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { AcopioDao, type FilaAcopio } from './dao/acopio.dao';
import { EntidadDao } from './dao/entidad.dao';

export interface DatosAcopio {
  entidadId: string;
  nombre: string;
  direccion: string;
  municipio: string;
  lat: number;
  lng: number;
  telefono?: string | null;
  indicacionesAcceso?: string | null;
  horario: Horario;
  estado?: EstadoAcopio;
}

/** Lo que el Operador asignado puede cambiar de su acopio (B-03). */
export interface DatosOperacion {
  estado?: 'ACTIVO' | 'PAUSADO';
  horario?: Horario;
  indicacionesAcceso?: string | null;
  telefono?: string | null;
}

const json = (h: Horario | undefined) => h as unknown as Prisma.InputJsonValue | undefined;

/** Acopios operados (RF-RED-001 a 003). Uno con historia no se borra: se cierra. */
@Injectable()
export class AcopiosService {
  constructor(
    private readonly dao: AcopioDao,
    private readonly entidades: EntidadDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
  ) {}

  async listarPublicos(filtro: { abiertoAhora?: boolean; cerca?: Punto }, ahora = new Date()) {
    const filas = await this.dao.publicos();
    let vistas = filas.map((f) => presentarAcopio(f, ahora));
    if (filtro.abiertoAhora) vistas = vistas.filter((v) => v.abiertoAhora);
    if (filtro.cerca) {
      const desde = filtro.cerca;
      vistas = vistas
        .map((v) => ({ ...v, distanciaKm: Math.round(distanciaKm(desde, v) * 10) / 10 }))
        .sort((x, y) => x.distanciaKm - y.distanciaKm);
    }
    return vistas;
  }

  async obtenerPublico(id: string) {
    const f = await this.dao.conEntidad(id);
    if (!f || f.estado === 'CERRADO') {
      throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe o ya cerró', 404);
    }
    return presentarAcopio(f);
  }

  async listarGestion(usuario: UsuarioAutenticado) {
    const ids = await this.alcance.idsAsignados(usuario, 'ACOPIO');
    const filas = await this.dao.paraGestion(ids);
    return filas.map(presentarGestion);
  }

  async crear(admin: UsuarioAutenticado, datos: DatosAcopio) {
    exigirHorario(datos.horario);
    return this.transacciones.ejecutar(async (tx) => {
      await this.exigirEntidad(tx, datos.entidadId);
      const f = await this.dao.crear(
        {
          entidad_id: datos.entidadId,
          nombre: datos.nombre.trim(),
          direccion: datos.direccion.trim(),
          municipio: datos.municipio.trim(),
          lat: datos.lat,
          lng: datos.lng,
          telefono: datos.telefono ?? null,
          indicaciones_acceso: datos.indicacionesAcceso ?? null,
          horario: json(datos.horario)!,
          estado: datos.estado ?? 'ACTIVO',
        },
        tx,
      );
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'acopio.creado',
        entidad: 'acopio',
        entidadId: f.id,
        ubicacionId: f.id,
        despues: presentarGestion(f),
      });
      return presentarGestion(f);
    });
  }

  async actualizar(admin: UsuarioAutenticado, id: string, cambios: Partial<DatosAcopio>) {
    if (cambios.horario) exigirHorario(cambios.horario);
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.obtenerFila(tx, id);
      if (cambios.entidadId) await this.exigirEntidad(tx, cambios.entidadId);
      const despues = await this.dao.actualizar(
        id,
        {
          entidad_id: cambios.entidadId,
          nombre: cambios.nombre?.trim(),
          direccion: cambios.direccion?.trim(),
          municipio: cambios.municipio?.trim(),
          lat: cambios.lat,
          lng: cambios.lng,
          telefono: cambios.telefono,
          indicaciones_acceso: cambios.indicacionesAcceso,
          horario: json(cambios.horario),
          estado: cambios.estado,
        },
        tx,
      );
      const cerrado = despues.estado === 'CERRADO' && antes.estado !== 'CERRADO';
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: cerrado ? 'acopio.cerrado' : 'acopio.actualizado',
        entidad: 'acopio',
        entidadId: id,
        ubicacionId: id,
        antes: presentarGestion(antes),
        despues: presentarGestion(despues),
        destacado: cerrado,
      });
      return presentarGestion(despues);
    });
  }

  async operar(usuario: UsuarioAutenticado, id: string, cambios: DatosOperacion) {
    await this.alcance.exigir(usuario, 'ACOPIO', id);
    if (cambios.horario) exigirHorario(cambios.horario);
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.obtenerFila(tx, id);
      if (antes.estado === 'CERRADO') {
        throw new ErrorDominio(
          'ACOPIO_CERRADO',
          'El acopio está cerrado; solo el Administrador lo reabre',
          409,
        );
      }
      const despues = await this.dao.actualizar(
        id,
        {
          estado: cambios.estado,
          horario: json(cambios.horario),
          indicaciones_acceso: cambios.indicacionesAcceso,
          telefono: cambios.telefono,
        },
        tx,
      );
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'acopio.operado',
        entidad: 'acopio',
        entidadId: id,
        ubicacionId: id,
        antes: presentarGestion(antes),
        despues: presentarGestion(despues),
      });
      return presentarGestion(despues);
    });
  }

  /** Para inventario: 404 si no existe, 409 si está cerrado. */
  async exigirAbierto(id: string, bd?: ClienteBd): Promise<void> {
    const f = await this.dao.estado(id, bd);
    if (!f) throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe', 404);
    // Un punto de una fuente externa no usa Acopio: no recibe movimientos, jornadas ni donaciones
    if (f.tipo === 'REFERENCIADO') {
      throw new ErrorDominio(
        'ACOPIO_REFERENCIADO',
        'Este punto viene de una fuente externa y no usa Acopio',
        409,
      );
    }
    if (f.estado === 'CERRADO') {
      throw new ErrorDominio('ACOPIO_CERRADO', 'El acopio está cerrado', 409);
    }
  }

  private async exigirEntidad(tx: ClienteBd, id: string) {
    const e = await this.entidades.porId(id, tx);
    if (!e) throw new ErrorDominio('ENTIDAD_NO_ENCONTRADA', 'La entidad no existe', 404);
  }

  /**
   * Lee el acopio con la fila bloqueada hasta el fin de la transacción: un cierre que
   * llega en medio espera, y quien sigue ve el estado nuevo (revisión final, I-1).
   */
  private async obtenerFila(tx: ClienteBd, id: string) {
    await this.dao.bloquear(id, tx);
    const f = await this.dao.conEntidad(id, tx);
    if (!f) throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe', 404);
    return f;
  }
}

function exigirHorario(h: Horario) {
  const errores = erroresHorario(h);
  if (errores.length) {
    throw new ErrorDominio(
      'HORARIO_INVALIDO',
      `Revisa el horario: ${errores.join('; ')}`,
      422,
      errores.map((mensaje) => ({ campo: 'horario', mensaje })),
    );
  }
}

export function presentarAcopio(f: FilaAcopio, ahora = new Date()) {
  const horario = f.horario as unknown as Horario;
  return {
    id: f.id,
    nombre: f.nombre,
    entidad: f.entidad,
    direccion: f.direccion,
    municipio: f.municipio,
    lat: Number(f.lat),
    lng: Number(f.lng),
    telefono: f.telefono,
    indicacionesAcceso: f.indicaciones_acceso,
    horario,
    estado: f.estado,
    abiertoAhora: f.estado === 'ACTIVO' && abiertoAhora(horario, ahora),
    actualizadoEn: f.actualizado_en,
  };
}

function presentarGestion(f: FilaAcopio) {
  return { ...presentarAcopio(f), creadoEn: f.creado_en };
}
