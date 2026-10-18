import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  instanteBogota,
  LIMITES_TURNOS,
  validarJornada,
  type PerfilVoluntario,
} from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { Transacciones } from '../../comun/prisma/transacciones';
import { AcopiosService } from '../acopios/acopios.service';
import { EntidadDao } from '../acopios/dao/entidad.dao';
import { RELOJ, type Reloj } from '../acopios/geocodificacion';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { AvisosTurnos } from './avisos-turnos';
import { JornadaDao } from './dao/jornada.dao';
import { ReservaDao } from './dao/reserva.dao';
import {
  entidadVerificada,
  presentarJornadaGestion,
  presentarJornadaPublica,
  type FilaJornada,
} from './turnos.vistas';

export interface Requisitos {
  edadMinima?: number;
  ropaCerrada: boolean;
  carga: boolean;
}

interface Contenido {
  titulo: string;
  descripcion: string;
  queLlevar?: string | null;
  cupoMaximo: number;
  requisitos: Requisitos;
  perfilRequerido?: PerfilVoluntario | null;
  direccion?: string;
  municipio?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface DatosJornada extends Contenido {
  acopioId?: string;
  entidadId?: string;
  fechas: string[];
  horaInicio: string;
  horaFin: string;
}

export interface CambiosJornada extends Partial<Contenido> {
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
}

export type PestanaGestion = 'proximas' | 'en-curso' | 'pasadas';

const MS_HORA = 3_600_000;

/** Jornadas desde la consola (RF-TUR-001, RF-TUR-005). El Operador, en sus acopios. */
@Injectable()
export class JornadasService {
  constructor(
    private readonly dao: JornadaDao,
    private readonly reservas: ReservaDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly acopios: AcopiosService,
    private readonly entidades: EntidadDao,
    private readonly avisos: AvisosTurnos,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async crear(usuario: UsuarioAutenticado, d: DatosJornada) {
    const ahora = this.ahora();
    exigirValida(validarJornada(d, ahora));
    if (d.entidadId) {
      if (usuario.rol !== 'ADMIN') {
        throw new ErrorDominio(
          'SOLO_ADMIN_ENTIDAD',
          'Solo el Administrador crea jornadas de una entidad',
          403,
        );
      }
    } else {
      await this.alcance.exigir(usuario, 'ACOPIO', d.acopioId!);
    }
    const serieId = d.fechas.length > 1 ? randomUUID() : null;
    return this.transacciones.ejecutar(async (tx) => {
      if (d.entidadId) await this.exigirEntidadVerificada(d.entidadId, tx);
      else await this.acopios.exigirAbierto(d.acopioId!, tx);
      const creadas = [];
      for (const fecha of [...d.fechas].sort()) {
        const j = await this.dao.crear(
          {
            acopio_id: d.entidadId ? null : d.acopioId!,
            entidad_id: d.entidadId ?? null,
            ...(d.entidadId ? lugarPropio(d) : {}),
            ...contenido(d),
            inicio: instanteBogota(fecha, d.horaInicio),
            fin: instanteBogota(fecha, d.horaFin),
            serie_id: serieId,
            creada_por: usuario.id,
          },
          tx,
        );
        creadas.push(await this.registrar(tx, usuario, 'jornada.creada', null, j, ahora));
      }
      return creadas;
    });
  }

  /** Mover la jornada pide las mismas 13 horas de anticipación que crearla. */
  async editar(usuario: UsuarioAutenticado, id: string, c: CambiosJornada) {
    const ahora = this.ahora();
    const antes = await this.exigirGestionable(usuario, id);
    const datos: Record<string, unknown> = { ...contenido(c, true) };
    if (c.fecha !== undefined) {
      exigirValida(
        validarJornada(
          { fechas: [c.fecha], horaInicio: c.horaInicio!, horaFin: c.horaFin! },
          ahora,
        ),
      );
      datos.inicio = instanteBogota(c.fecha, c.horaInicio!);
      datos.fin = instanteBogota(c.fecha, c.horaFin!);
    }
    if (antes.entidad_id) Object.assign(datos, lugarPropio(c, true));
    return this.transacciones.ejecutar(async (tx) => {
      // Desde aquí se compara contra `vigente`: otra edición pudo cambiar la fila antes del bloqueo
      const vigente = await this.releerBloqueada(id, tx);
      const cambiaLugar =
        (datos.direccion !== undefined && datos.direccion !== vigente.direccion) ||
        (datos.municipio !== undefined && datos.municipio !== vigente.municipio);
      if (
        cambiaLugar &&
        vigente.inicio.getTime() - ahora.getTime() <= LIMITES_TURNOS.horasCierre * MS_HORA
      ) {
        throw new ErrorDominio(
          'JORNADA_INVALIDA',
          'Faltan 12 horas o menos: ya no se puede cambiar el lugar',
          422,
        );
      }
      if (c.cupoMaximo !== undefined) {
        const ocupados = await this.reservas.ocupados(id, tx);
        if (c.cupoMaximo < ocupados + vigente.cupos_ajuste_manual) {
          throw new ErrorDominio(
            'CUPO_MENOR_QUE_OCUPADOS',
            `El cupo no puede quedar por debajo de ${ocupados + vigente.cupos_ajuste_manual}: ya hay reservas y ajuste manual`,
            409,
          );
        }
      }
      let despues = await this.dao.actualizar(id, datos, tx);
      const movida =
        despues.inicio.getTime() !== vigente.inicio.getTime() ||
        despues.fin.getTime() !== vigente.fin.getTime() ||
        despues.direccion !== vigente.direccion ||
        despues.municipio !== vigente.municipio;
      if (movida) {
        // La hora del cambio: P8 avisa a quien reservó antes (P-070)
        despues = await this.dao.actualizar(id, { movida_en: ahora }, tx);
        await this.avisos.cambiada(tx, await this.reservas.activas(id, tx), despues);
      }
      return this.registrar(tx, usuario, 'jornada.editada', vigente, despues, ahora);
    });
  }

  cerrar(usuario: UsuarioAutenticado, id: string) {
    return this.cambiarEstado(usuario, id, 'jornada.cerrada', () => ({ estado: 'CERRADA' }));
  }

  reabrir(usuario: UsuarioAutenticado, id: string) {
    return this.cambiarEstado(usuario, id, 'jornada.reabierta', (j, ahora) => {
      if (j.inicio.getTime() - ahora.getTime() <= LIMITES_TURNOS.horasCierre * MS_HORA) {
        throw new ErrorDominio(
          'REABRIR_FUERA_DE_PLAZO',
          'Faltan 12 horas o menos para el inicio: ya no se aceptan reservas',
          409,
        );
      }
      return { estado: 'ABIERTA' };
    });
  }

  cancelar(usuario: UsuarioAutenticado, id: string, motivo: string) {
    return this.cambiarEstado(
      usuario,
      id,
      'jornada.cancelada',
      (_j, ahora) => ({
        estado: 'CANCELADA',
        motivo_cancelacion: motivo.trim(),
        cancelada_en: ahora,
      }),
      async (tx, j) => this.avisos.jornadaCancelada(tx, await this.reservas.activas(id, tx), j),
    );
  }

  async borrar(usuario: UsuarioAutenticado, id: string) {
    const antes = await this.exigirGestionable(usuario, id);
    await this.transacciones.ejecutar(async (tx) => {
      await this.dao.bloquear(id, tx);
      if ((await this.reservas.total(id, tx)) > 0) {
        throw new ErrorDominio(
          'JORNADA_CON_RESERVAS',
          'La jornada tuvo reservas: cancélala en lugar de borrarla',
          409,
        );
      }
      await this.dao.borrar(id, tx);
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'jornada.borrada',
        entidad: 'jornada',
        entidadId: id,
        ubicacionId: antes.acopio_id,
        antes: presentarJornadaGestion(antes, this.ahora()),
      });
    });
  }

  async ajustar(usuario: UsuarioAutenticado, id: string, cupos: number) {
    const ahora = this.ahora();
    // Solo revisa el acceso: el cupo y el ajuste se leen después del bloqueo
    await this.exigirGestionable(usuario, id);
    return this.transacciones.ejecutar(async (tx) => {
      const vigente = await this.releerBloqueada(id, tx);
      const ocupados = await this.reservas.ocupados(id, tx);
      if (cupos > vigente.cupo_maximo - ocupados) {
        throw new ErrorDominio(
          'AJUSTE_SIN_CUPO',
          `Con ${ocupados} reservas, el ajuste llega como máximo a ${Math.max(0, vigente.cupo_maximo - ocupados)}`,
          409,
        );
      }
      const despues = await this.dao.actualizar(
        id,
        { cupos_ajuste_manual: cupos, ajuste_actualizado_en: ahora },
        tx,
      );
      return this.registrar(tx, usuario, 'jornada.ajustada', vigente, despues, ahora);
    });
  }

  async listarGestion(
    usuario: UsuarioAutenticado,
    filtro: { pestana?: PestanaGestion; acopio?: string },
  ) {
    const ahora = this.ahora();
    const ids = await this.alcance.idsAsignados(usuario, 'ACOPIO');
    const dueno =
      ids === null
        ? filtro.acopio
          ? { acopio_id: filtro.acopio }
          : {}
        : { acopio_id: { in: filtro.acopio ? ids.filter((i) => i === filtro.acopio) : ids } };
    const tiempo =
      filtro.pestana === 'proximas'
        ? { inicio: { gt: ahora } }
        : filtro.pestana === 'en-curso'
          ? { inicio: { lte: ahora }, fin: { gt: ahora } }
          : filtro.pestana === 'pasadas'
            ? { fin: { lte: ahora } }
            : {};
    const filas = await this.dao.buscar(
      { ...dueno, ...tiempo },
      filtro.pestana === 'pasadas' ? 'desc' : 'asc',
    );
    return filas.map((j) => presentarJornadaGestion(j, ahora));
  }

  /**
   * P7: las que no han terminado, abiertas o cerradas. Las de una entidad sin verificar no
   * salen (T-09). `desde` y `hasta` son días de Bogotá, inclusivos.
   */
  async listarPublicas(f: {
    desde?: string;
    hasta?: string;
    acopio?: string;
    entidad?: string;
    perfil?: PerfilVoluntario;
  }) {
    const ahora = this.ahora();
    const inicio: { gte?: Date; lt?: Date } = {};
    if (f.desde) inicio.gte = instanteBogota(f.desde, '00:00');
    if (f.hasta) inicio.lt = new Date(instanteBogota(f.hasta, '00:00').getTime() + 24 * MS_HORA);
    const filas = await this.dao.buscar({
      estado: { in: ['ABIERTA', 'CERRADA'] },
      fin: { gt: ahora },
      inicio,
      ...(f.acopio ? { acopio_id: f.acopio } : {}),
      ...(f.entidad ? { entidad_id: f.entidad } : {}),
      ...(f.perfil ? { perfil_requerido: f.perfil } : {}),
      OR: [{ acopio_id: { not: null } }, { entidad: { verificacion: 'VERIFICADA' } }],
    });
    return filas.map((j) => presentarJornadaPublica(j, ahora));
  }

  /** Cualquier estado, para quien llega con un enlace viejo; no la de una entidad sin sello. */
  async obtenerPublica(id: string) {
    const j = await this.dao.porId(id);
    if (!j || !entidadVerificada(j)) {
      throw new ErrorDominio('JORNADA_NO_ENCONTRADA', 'La jornada no existe', 404);
    }
    return presentarJornadaPublica(j, this.ahora());
  }

  /** La jornada, si quien llama puede gestionarla. Lo usan también las reservas. */
  async exigirAcceso(usuario: UsuarioAutenticado, id: string): Promise<FilaJornada> {
    const j = await this.dao.porId(id);
    if (!j) throw new ErrorDominio('JORNADA_NO_ENCONTRADA', 'La jornada no existe', 404);
    if (j.entidad_id) {
      if (usuario.rol !== 'ADMIN') {
        throw new ForbiddenException('Las jornadas de una entidad las gestiona el Administrador');
      }
    } else {
      await this.alcance.exigir(usuario, 'ACOPIO', j.acopio_id!);
    }
    return j;
  }

  private async exigirGestionable(usuario: UsuarioAutenticado, id: string) {
    const j = await this.exigirAcceso(usuario, id);
    if (j.estado === 'CANCELADA') {
      throw new ErrorDominio('JORNADA_CANCELADA', 'La jornada está cancelada', 409);
    }
    return j;
  }

  /** Cupo y ajuste se leen después del bloqueo: antes, otra edición pudo cambiarlos. */
  private async releerBloqueada(id: string, tx: ClienteBd) {
    await this.dao.bloquear(id, tx);
    const j = await this.dao.porId(id, tx);
    if (!j) throw new ErrorDominio('JORNADA_NO_ENCONTRADA', 'La jornada no existe', 404);
    if (j.estado === 'CANCELADA') {
      throw new ErrorDominio('JORNADA_CANCELADA', 'La jornada está cancelada', 409);
    }
    return j;
  }

  private async cambiarEstado(
    usuario: UsuarioAutenticado,
    id: string,
    accion: string,
    cambio: (j: FilaJornada, ahora: Date) => Record<string, unknown>,
    despuesDe?: (tx: ClienteBd, j: FilaJornada) => Promise<void>,
  ) {
    const ahora = this.ahora();
    const antes = await this.exigirGestionable(usuario, id);
    const datos = cambio(antes, ahora);
    return this.transacciones.ejecutar(async (tx) => {
      const despues = await this.dao.actualizar(id, datos, tx);
      if (despuesDe) await despuesDe(tx, despues);
      return this.registrar(tx, usuario, accion, antes, despues, ahora);
    });
  }

  private async exigirEntidadVerificada(id: string, tx: ClienteBd) {
    const e = await this.entidades.porId(id, tx);
    if (!e) throw new ErrorDominio('ENTIDAD_NO_ENCONTRADA', 'La entidad no existe', 404);
    if (e.verificacion !== 'VERIFICADA') {
      throw new ErrorDominio(
        'ENTIDAD_NO_VERIFICADA',
        'Solo una entidad verificada puede pedir voluntarios',
        409,
      );
    }
  }

  /** Escribe la bitácora con la vista de gestión, que no trae datos de inscritos (T-08). */
  private async registrar(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    accion: string,
    antes: FilaJornada | null,
    despues: FilaJornada,
    ahora: Date,
  ) {
    const vista = presentarJornadaGestion(despues, ahora);
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id,
      accion,
      entidad: 'jornada',
      entidadId: despues.id,
      ubicacionId: despues.acopio_id,
      antes: antes ? presentarJornadaGestion(antes, ahora) : undefined,
      despues: vista,
    });
    return vista;
  }

  private ahora() {
    return new Date(this.reloj.ahora());
  }
}

function exigirValida(error: string | null) {
  if (error) throw new ErrorDominio('JORNADA_INVALIDA', error, 422);
}

/** Columnas de contenido; con `parcial`, solo las que vienen. */
function contenido(c: Partial<Contenido>, parcial = false) {
  const campos = {
    titulo: c.titulo?.trim(),
    descripcion: c.descripcion?.trim(),
    que_llevar: c.queLlevar === undefined ? undefined : c.queLlevar?.trim() || null,
    cupo_maximo: c.cupoMaximo,
    requisitos: c.requisitos as object | undefined,
    perfil_requerido: c.perfilRequerido === undefined ? undefined : (c.perfilRequerido ?? null),
  };
  return quitarIndefinidos(campos, parcial) as {
    titulo: string;
    descripcion: string;
    cupo_maximo: number;
    requisitos: object;
  };
}

function lugarPropio(c: Partial<Contenido>, parcial = false) {
  return quitarIndefinidos(
    {
      direccion: c.direccion?.trim(),
      municipio: c.municipio?.trim(),
      lat: c.lat,
      lng: c.lng,
    },
    parcial,
  );
}

function quitarIndefinidos(o: Record<string, unknown>, parcial: boolean) {
  return Object.fromEntries(
    Object.entries(o)
      .filter(([, v]) => !parcial || v !== undefined)
      .map(([k, v]) => [k, v === undefined ? null : v]),
  );
}
