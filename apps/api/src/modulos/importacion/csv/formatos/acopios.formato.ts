import { Injectable } from '@nestjs/common';
import { HORARIO_VACIO } from '@acopio/shared';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { AcopiosService } from '../../../acopios/acopios.service';
import { clave, ReferenciasDao } from '../../dao/referencias.dao';
import { faltantes, latitud, longitud, opcional, texto } from '../columnas';
import type { FilaCsv, FormatoCsv } from '../formato-csv';

const esquema = z.object({
  entidad: texto('Falta la entidad'),
  nombre: texto('Falta el nombre'),
  direccion: texto('Falta la dirección'),
  municipio: texto('Falta el municipio'),
  lat: latitud,
  lng: longitud,
  telefono: opcional,
  indicaciones: opcional,
});
type Fila = z.infer<typeof esquema>;

/** Acopios operados (RF-RED-001). El horario se completa después en la consola. */
@Injectable()
export class AcopiosFormato implements FormatoCsv<Fila> {
  readonly tipo = 'acopios';
  readonly descripcion =
    'Acopios que usan Acopio. La entidad se busca por su nombre; el horario se pone después';
  readonly esquema = esquema;
  readonly columnas = [
    {
      nombre: 'entidad',
      obligatoria: true,
      descripcion: 'Nombre de una entidad que ya existe',
      ejemplo: 'Fundación Manos Unidas',
    },
    {
      nombre: 'nombre',
      obligatoria: true,
      descripcion: 'Nombre del acopio',
      ejemplo: 'Acopio Chapinero',
    },
    {
      nombre: 'direccion',
      obligatoria: true,
      descripcion: 'Dirección',
      ejemplo: 'Carrera 13 # 60-20',
    },
    { nombre: 'municipio', obligatoria: true, descripcion: 'Municipio', ejemplo: 'Bogotá' },
    {
      nombre: 'lat',
      obligatoria: true,
      descripcion: 'Latitud (no se geocodifica por lote)',
      ejemplo: '4.6486',
    },
    { nombre: 'lng', obligatoria: true, descripcion: 'Longitud', ejemplo: '-74.0628' },
    {
      nombre: 'telefono',
      obligatoria: false,
      descripcion: 'Teléfono del acopio',
      ejemplo: '601 555 0101',
    },
    {
      nombre: 'indicaciones',
      obligatoria: false,
      descripcion: 'Cómo entrar',
      ejemplo: 'Puerta lateral, timbre 2',
    },
  ];

  constructor(
    private readonly acopios: AcopiosService,
    private readonly referencias: ReferenciasDao,
  ) {}

  async revisar(filas: FilaCsv<Fila>[], tx: ClienteBd) {
    const entidades = await this.referencias.entidades(
      filas.map((f) => f.datos.entidad),
      tx,
    );
    return faltantes(
      filas,
      'entidad',
      (f) => f.entidad,
      (n) => entidades.has(clave(n)),
      (n) => `No hay una entidad «${n}»`,
    );
  }

  async aplicar(filas: Fila[], usuario: UsuarioAutenticado, tx: ClienteBd) {
    const entidades = await this.referencias.entidades(
      filas.map((f) => f.entidad),
      tx,
    );
    for (const f of filas)
      await this.acopios.crearEnTransaccion(tx, usuario, {
        entidadId: entidades.get(clave(f.entidad))!.id,
        nombre: f.nombre,
        direccion: f.direccion,
        municipio: f.municipio,
        lat: f.lat,
        lng: f.lng,
        telefono: f.telefono,
        indicacionesAcceso: f.indicaciones,
        horario: HORARIO_VACIO,
      });
  }
}
