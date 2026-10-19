import { Inject, Injectable } from '@nestjs/common';
import { validarJornada } from '@acopio/shared';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { RELOJ, type Reloj } from '../../../acopios/geocodificacion';
import { JornadasService } from '../../../turnos/jornadas.service';
import { clave, ReferenciasDao } from '../../dao/referencias.dao';
import { entero, opcional, texto } from '../columnas';
import type { FilaCsv, FormatoCsv } from '../formato-csv';

const PERFILES = [
  'VETERINARIO',
  'MEDICO',
  'PSICOLOGO',
  'CUIDADOR_ADULTO_MAYOR',
  'CONDUCTOR_C2',
] as const;

const esquema = z.object({
  acopio: texto('Falta el acopio'),
  titulo: texto('Falta el título'),
  descripcion: texto('Falta la descripción'),
  fecha: z.iso.date('Usa AAAA-MM-DD'),
  hora_inicio: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'Usa HH:MM'),
  hora_fin: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'Usa HH:MM'),
  cupo_maximo: entero('Falta el cupo').pipe(z.number().min(1, 'El cupo es al menos 1')),
  que_llevar: opcional,
  perfil_requerido: opcional.pipe(
    z.enum(PERFILES, { error: `Usa uno de: ${PERFILES.join(', ')}` }).nullable(),
  ),
});
type Fila = z.infer<typeof esquema>;

/** Las reglas de fechas de la consola (RF-TUR-001), con el error llevado a su columna. */
const columnaDe = (mensaje: string) =>
  /anticipaci|fecha|días/i.test(mensaje)
    ? 'fecha'
    : /fin|dura/i.test(mensaje)
      ? 'hora_fin'
      : 'hora_inicio';

/** Jornadas de voluntariado en acopios (RF-TUR-001). Una fila es una fecha. */
@Injectable()
export class JornadasFormato implements FormatoCsv<Fila> {
  readonly tipo = 'jornadas';
  readonly descripcion =
    'Jornadas de voluntariado en acopios, con las reglas de anticipación de la consola';
  readonly esquema = esquema;
  readonly columnas = [
    {
      nombre: 'acopio',
      obligatoria: true,
      descripcion: 'Nombre de un acopio que usa Acopio',
      ejemplo: 'Acopio Chapinero',
    },
    {
      nombre: 'titulo',
      obligatoria: true,
      descripcion: 'Título',
      ejemplo: 'Clasificar ropa donada',
    },
    {
      nombre: 'descripcion',
      obligatoria: true,
      descripcion: 'Qué se hace',
      ejemplo: 'Separar por talla',
    },
    {
      nombre: 'fecha',
      obligatoria: true,
      descripcion: 'Con 13 horas de anticipación',
      ejemplo: '2026-10-25',
    },
    {
      nombre: 'hora_inicio',
      obligatoria: true,
      descripcion: 'HH:MM, hora de Bogotá',
      ejemplo: '08:00',
    },
    { nombre: 'hora_fin', obligatoria: true, descripcion: 'HH:MM', ejemplo: '12:00' },
    { nombre: 'cupo_maximo', obligatoria: true, descripcion: 'Personas', ejemplo: '10' },
    { nombre: 'que_llevar', obligatoria: false, descripcion: 'Qué traer', ejemplo: 'Guantes' },
    {
      nombre: 'perfil_requerido',
      obligatoria: false,
      descripcion: PERFILES.join(', '),
      ejemplo: '',
    },
  ];

  constructor(
    private readonly jornadas: JornadasService,
    private readonly referencias: ReferenciasDao,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async revisar(filas: FilaCsv<Fila>[], tx: ClienteBd) {
    const acopios = await this.referencias.acopiosOperados(
      filas.map((f) => f.datos.acopio),
      tx,
    );
    const ahora = new Date(this.reloj.ahora());
    return filas.flatMap((f) => {
      if (!acopios.has(clave(f.datos.acopio)))
        return [
          {
            numero: f.numero,
            columna: 'acopio',
            mensaje: `«${f.datos.acopio}» no es un acopio que use Acopio`,
          },
        ];
      if (acopios.get(clave(f.datos.acopio))!.estado === 'CERRADO')
        return [
          { numero: f.numero, columna: 'acopio', mensaje: `«${f.datos.acopio}» está cerrado` },
        ];
      const error = validarJornada(
        { fechas: [f.datos.fecha], horaInicio: f.datos.hora_inicio, horaFin: f.datos.hora_fin },
        ahora,
      );
      return error ? [{ numero: f.numero, columna: columnaDe(error), mensaje: error }] : [];
    });
  }

  async aplicar(filas: Fila[], usuario: UsuarioAutenticado, tx: ClienteBd) {
    const acopios = await this.referencias.acopiosOperados(
      filas.map((f) => f.acopio),
      tx,
    );
    for (const f of filas)
      await this.jornadas.crearEnTransaccion(tx, usuario, {
        acopioId: acopios.get(clave(f.acopio))!.id,
        titulo: f.titulo,
        descripcion: f.descripcion,
        queLlevar: f.que_llevar,
        cupoMaximo: f.cupo_maximo,
        requisitos: { ropaCerrada: false, carga: false },
        perfilRequerido: f.perfil_requerido,
        fechas: [f.fecha],
        horaInicio: f.hora_inicio,
        horaFin: f.hora_fin,
      });
  }
}
