import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  codigoReserva,
  cuposLibres,
  motivoSinReserva,
  normalizarCorreo,
  puedeMarcarAsistencia,
} from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { restriccionUnicaViolada } from '../../comun/prisma/errores-prisma';
import { Transacciones } from '../../comun/prisma/transacciones';
import { RELOJ, type Reloj } from '../acopios/geocodificacion';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AvisosTurnos } from './avisos-turnos';
import { JornadaDao } from './dao/jornada.dao';
import { ReservaDao, type FilaReserva } from './dao/reserva.dao';
import { JornadasService } from './jornadas.service';
import { entidadVerificada, presentarJornadaPublica } from './turnos.vistas';

export interface DatosReserva {
  nombre: string;
  correo: string;
  telefono?: string;
  perfilDeclarado: boolean;
}

const INTENTOS_CODIGO = 3;

/** sha256 en hexadecimal: el secreto del enlace no se guarda (T-07). */
export const hashSecreto = (secreto: string) => createHash('sha256').update(secreto).digest('hex');

const noEncontrada = () =>
  new ErrorDominio('RESERVA_NO_ENCONTRADA', 'No encontramos esa reserva', 404);

/**
 * Reservas sin cuenta (RF-TUR-003, RF-TUR-004). No escriben en la bitácora: llevan datos
 * personales que se borran a los 30 días, y la bitácora no admite cambios (T-08).
 */
@Injectable()
export class ReservasService {
  constructor(
    private readonly dao: ReservaDao,
    private readonly jornadas: JornadaDao,
    private readonly transacciones: Transacciones,
    private readonly gestion: JornadasService,
    private readonly bitacora: BitacoraService,
    private readonly avisos: AvisosTurnos,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  /** C14: inscritos con su contacto, para quien gestiona la jornada. */
  async inscritos(usuario: UsuarioAutenticado, jornadaId: string) {
    await this.gestion.exigirAcceso(usuario, jornadaId);
    const filas = await this.dao.deJornada(jornadaId);
    return filas.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      correo: r.correo,
      telefono: r.telefono,
      perfilDeclarado: r.perfil_declarado,
      estado: r.estado,
      creadaEn: r.creada_en.toISOString(),
    }));
  }

  /** Desde 2 horas antes del inicio hasta 7 días después del fin. Se puede corregir. */
  async marcarAsistencia(
    usuario: UsuarioAutenticado,
    reservaId: string,
    estado: 'ASISTIO' | 'NO_ASISTIO',
  ) {
    const r = await this.dao.porId(reservaId);
    if (!r) throw noEncontrada();
    await this.gestion.exigirAcceso(usuario, r.jornada_id);
    if (r.estado === 'CANCELADA') {
      throw new ErrorDominio('RESERVA_CANCELADA', 'La reserva está cancelada', 409);
    }
    if (!puedeMarcarAsistencia(r.jornada.inicio, r.jornada.fin, this.ahora())) {
      throw new ErrorDominio(
        'FUERA_DE_PLAZO_ASISTENCIA',
        'La asistencia se marca desde 2 horas antes del inicio hasta 7 días después',
        409,
      );
    }
    return this.transacciones.ejecutar(async (tx) => {
      const despues = await this.dao.actualizar(reservaId, { estado }, tx);
      // Sin nombre ni correo: la bitácora no se puede borrar a los 30 días (T-08)
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'reserva.asistencia',
        entidad: 'reserva',
        entidadId: reservaId,
        ubicacionId: r.jornada.acopio_id,
        antes: { reservaId, jornadaId: r.jornada_id, estado: r.estado },
        despues: { reservaId, jornadaId: r.jornada_id, estado },
      });
      return { id: despues.id, estado: despues.estado };
    });
  }

  async reservar(jornadaId: string, d: DatosReserva) {
    const correo = normalizarCorreo(d.correo);
    const secreto = randomBytes(18).toString('base64url');
    for (let intento = 1; ; intento++) {
      try {
        return await this.intentarReserva(jornadaId, d, correo, secreto);
      } catch (e) {
        const restriccion = restriccionUnicaViolada(e);
        if (restriccion === 'reserva_correo_unico') throw repetida();
        // Dos códigos aleatorios iguales: se intenta con otro
        if (restriccion === 'reserva_codigo_key' && intento < INTENTOS_CODIGO) continue;
        throw e;
      }
    }
  }

  async consultar(codigo: string, secreto: string) {
    return this.presentar(await this.exigir(codigo, secreto));
  }

  /** Libera el cupo al instante. Cancelar dos veces responde igual que la primera. */
  async cancelar(codigo: string, secreto: string) {
    const r = await this.exigir(codigo, secreto);
    if (r.estado === 'CANCELADA') return this.presentar(r);
    const ahora = this.ahora();
    if (ahora >= r.jornada.inicio) {
      throw new ErrorDominio('RESERVA_YA_EMPEZO', 'La jornada ya empezó', 409);
    }
    const cancelada = await this.transacciones.ejecutar(async (tx) => {
      const c = await this.dao.actualizar(r.id, { estado: 'CANCELADA', cancelada_en: ahora }, tx);
      await this.avisos.cancelada(tx, c, c.jornada);
      return c;
    });
    return this.presentar(cancelada);
  }

  private intentarReserva(jornadaId: string, d: DatosReserva, correo: string, secreto: string) {
    const ahora = this.ahora();
    return this.transacciones.ejecutar(async (tx) => {
      await this.jornadas.bloquear(jornadaId, tx);
      const j = await this.jornadas.porId(jornadaId, tx);
      if (!j) throw new ErrorDominio('JORNADA_NO_ENCONTRADA', 'La jornada no existe', 404);
      const libres = cuposLibres(j.cupo_maximo, j._count.reservas, j.cupos_ajuste_manual);
      const motivo = motivoSinReserva(
        { estado: j.estado, inicio: j.inicio, libres, entidadVerificada: entidadVerificada(j) },
        ahora,
      );
      if (motivo === 'ENTIDAD') {
        throw new ErrorDominio('JORNADA_NO_ENCONTRADA', 'La jornada no existe', 404);
      }
      if (motivo === 'LLENA') {
        throw new ErrorDominio(
          'JORNADA_LLENA',
          'Alguien tomó el último cupo antes que tú. Mira otras jornadas cercanas',
          409,
        );
      }
      if (motivo) {
        throw new ErrorDominio(
          'RESERVAS_CERRADAS',
          'Esta jornada ya no recibe reservas: se cierran 12 horas antes del inicio',
          409,
        );
      }
      if (j.perfil_requerido && !d.perfilDeclarado) {
        throw new ErrorDominio(
          'PERFIL_NO_DECLARADO',
          'Esta jornada pide un perfil: confirma que lo tienes',
          422,
        );
      }
      if (await this.dao.activaConCorreo(jornadaId, correo, tx)) throw repetida();
      const r = await this.dao.crear(
        {
          jornada_id: jornadaId,
          nombre: d.nombre.trim(),
          correo,
          telefono: d.telefono?.trim() || null,
          codigo: codigoReserva((n) => randomBytes(n)),
          secreto_hash: hashSecreto(secreto),
          perfil_declarado: d.perfilDeclarado,
          consentimiento_en: ahora,
        },
        tx,
      );
      await this.avisos.confirmada(tx, r, r.jornada, secreto);
      return { codigo: r.codigo, secreto, jornada: presentarJornadaPublica(r.jornada, ahora) };
    });
  }

  /** Un secreto que no coincide responde igual que un código que no existe. */
  private async exigir(codigo: string, secreto: string) {
    const r = await this.dao.porCodigo(codigo.toUpperCase());
    if (!r) throw noEncontrada();
    const esperado = Buffer.from(r.secreto_hash, 'hex');
    const recibido = Buffer.from(hashSecreto(secreto), 'hex');
    if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) {
      throw noEncontrada();
    }
    return r;
  }

  private presentar(r: FilaReserva) {
    return {
      codigo: r.codigo,
      estado: r.estado,
      nombre: r.nombre,
      perfilDeclarado: r.perfil_declarado,
      jornada: presentarJornadaPublica(r.jornada, this.ahora()),
    };
  }

  private ahora() {
    return new Date(this.reloj.ahora());
  }
}

function repetida() {
  return new ErrorDominio(
    'RESERVA_REPETIDA',
    'Ya tienes una reserva en esta jornada con ese correo',
    409,
  );
}
