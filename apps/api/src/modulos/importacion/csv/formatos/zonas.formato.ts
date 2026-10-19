import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { ZonasService } from '../../../acopios/zonas.service';
import { clave, ReferenciasDao } from '../../dao/referencias.dao';
import { entero, faltantes, fecha, latitud, longitud, texto } from '../columnas';
import type { FilaCsv, FormatoCsv } from '../formato-csv';

const esquema = z.object({
  emergencia: texto('Falta la emergencia'),
  nombre: texto('Falta el nombre'),
  municipio: texto('Falta el municipio'),
  lat: latitud,
  lng: longitud,
  poblacion_estimada: entero('Falta la población estimada'),
  poblacion_fuente: texto('Falta de dónde sale la población'),
  poblacion_fecha: fecha('Falta la fecha de la población'),
});
type Fila = z.infer<typeof esquema>;

/** Zonas afectadas de una emergencia (RF-MOT-001). */
@Injectable()
export class ZonasFormato implements FormatoCsv<Fila> {
  readonly tipo = 'zonas';
  readonly descripcion =
    'Zonas afectadas. La emergencia se busca por su nombre y tiene que estar abierta';
  readonly esquema = esquema;
  readonly columnas = [
    {
      nombre: 'emergencia',
      obligatoria: true,
      descripcion: 'Nombre de una emergencia abierta',
      ejemplo: 'Inundaciones Putumayo',
    },
    {
      nombre: 'nombre',
      obligatoria: true,
      descripcion: 'Nombre de la zona',
      ejemplo: 'Barrio San Agustín',
    },
    { nombre: 'municipio', obligatoria: true, descripcion: 'Municipio', ejemplo: 'Mocoa' },
    { nombre: 'lat', obligatoria: true, descripcion: 'Latitud', ejemplo: '1.1478' },
    { nombre: 'lng', obligatoria: true, descripcion: 'Longitud', ejemplo: '-76.6474' },
    {
      nombre: 'poblacion_estimada',
      obligatoria: true,
      descripcion: 'Personas afectadas',
      ejemplo: '1200',
    },
    {
      nombre: 'poblacion_fuente',
      obligatoria: true,
      descripcion: 'De dónde sale la cifra',
      ejemplo: 'Censo de la alcaldía',
    },
    {
      nombre: 'poblacion_fecha',
      obligatoria: true,
      descripcion: 'Fecha de la cifra',
      ejemplo: '2026-09-25',
    },
  ];

  constructor(
    private readonly zonas: ZonasService,
    private readonly referencias: ReferenciasDao,
  ) {}

  async revisar(filas: FilaCsv<Fila>[], tx: ClienteBd) {
    const emergencias = await this.referencias.emergencias(
      filas.map((f) => f.datos.emergencia),
      tx,
    );
    return faltantes(
      filas,
      'emergencia',
      (f) => f.emergencia,
      (n) => emergencias.get(clave(n))?.estado === 'ACTIVA',
      (n) => `No hay una emergencia abierta «${n}»`,
    );
  }

  async aplicar(filas: Fila[], usuario: UsuarioAutenticado, tx: ClienteBd) {
    const emergencias = await this.referencias.emergencias(
      filas.map((f) => f.emergencia),
      tx,
    );
    for (const f of filas)
      await this.zonas.crearEnTransaccion(tx, usuario, {
        emergenciaId: emergencias.get(clave(f.emergencia))!.id,
        nombre: f.nombre,
        municipio: f.municipio,
        lat: f.lat,
        lng: f.lng,
        poblacionEstimada: f.poblacion_estimada,
        poblacionFuente: f.poblacion_fuente,
        poblacionFecha: new Date(`${f.poblacion_fecha}T00:00:00Z`),
      });
  }
}
