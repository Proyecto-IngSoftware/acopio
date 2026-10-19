import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { EntidadesService } from '../../../acopios/entidades.service';
import { clave, ReferenciasDao } from '../../dao/referencias.dao';
import { opcional, texto } from '../columnas';
import type { FilaCsv, FormatoCsv } from '../formato-csv';

const esquema = z.object({
  nombre: texto('Falta el nombre'),
  tipo: texto('Falta el tipo'),
  nit: opcional,
  sitio_web: opcional,
  telefono: opcional,
  correo: opcional,
  descripcion: opcional,
});
type Fila = z.infer<typeof esquema>;

/** Entidades (RF-RED-005). Entran sin verificar: verificar es un acto del Administrador. */
@Injectable()
export class EntidadesFormato implements FormatoCsv<Fila> {
  readonly tipo = 'entidades';
  readonly descripcion = 'Fundaciones, ONG y alcaldías. Entran sin verificar';
  readonly esquema = esquema;
  readonly columnas = [
    {
      nombre: 'nombre',
      obligatoria: true,
      descripcion: 'Nombre único',
      ejemplo: 'Fundación Manos Unidas',
    },
    {
      nombre: 'tipo',
      obligatoria: true,
      descripcion: 'Fundación, ONG, Iglesia, Alcaldía…',
      ejemplo: 'Fundación',
    },
    { nombre: 'nit', obligatoria: false, descripcion: 'NIT, si lo tiene', ejemplo: '900123456-7' },
    {
      nombre: 'sitio_web',
      obligatoria: false,
      descripcion: 'Sitio oficial',
      ejemplo: 'https://manosunidas.org',
    },
    {
      nombre: 'telefono',
      obligatoria: false,
      descripcion: 'Teléfono de contacto',
      ejemplo: '601 555 0100',
    },
    {
      nombre: 'correo',
      obligatoria: false,
      descripcion: 'Correo de contacto',
      ejemplo: 'contacto@manosunidas.org',
    },
    {
      nombre: 'descripcion',
      obligatoria: false,
      descripcion: 'Qué hace',
      ejemplo: 'Atiende familias damnificadas',
    },
  ];

  constructor(
    private readonly entidades: EntidadesService,
    private readonly referencias: ReferenciasDao,
  ) {}

  async revisar(filas: FilaCsv<Fila>[], tx: ClienteBd) {
    const existentes = await this.referencias.entidades(
      filas.map((f) => f.datos.nombre),
      tx,
    );
    const vistos = new Set<string>();
    return filas.flatMap((f) => {
      const k = clave(f.datos.nombre);
      const repetida = vistos.has(k);
      vistos.add(k);
      if (existentes.has(k))
        return [
          { numero: f.numero, columna: 'nombre', mensaje: 'Ya existe una entidad con ese nombre' },
        ];
      if (repetida)
        return [
          { numero: f.numero, columna: 'nombre', mensaje: 'El nombre se repite en el archivo' },
        ];
      return [];
    });
  }

  async aplicar(filas: Fila[], usuario: UsuarioAutenticado, tx: ClienteBd) {
    for (const f of filas)
      await this.entidades.crearEnTransaccion(tx, usuario, {
        nombre: f.nombre,
        tipo: f.tipo,
        nit: f.nit,
        sitioWeb: f.sitio_web,
        telefono: f.telefono,
        correo: f.correo,
        descripcion: f.descripcion,
      });
  }
}
