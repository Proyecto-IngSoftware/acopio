import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { CausasService } from '../../../acopios/causas.service';
import { clave, ReferenciasDao } from '../../dao/referencias.dao';
import { faltantes, fecha, opcional, texto } from '../columnas';
import type { FilaCsv, FormatoCsv } from '../formato-csv';

const esquema = z.object({
  entidad: texto('Falta la entidad'),
  categoria: z.enum(['PERSONAS', 'ANIMALES', 'ADULTOS_MAYORES', 'RESCATISTAS'], {
    error: 'Usa PERSONAS, ANIMALES, ADULTOS_MAYORES o RESCATISTAS',
  }),
  titulo: texto('Falta el título'),
  descripcion: texto('Falta la descripción'),
  url_oficial: texto('Falta el enlace oficial'),
  cierra_el: fecha('Falta la fecha de cierre'),
  paso_1: texto('Falta al menos un paso'),
  paso_2: opcional,
  paso_3: opcional,
  paso_4: opcional,
  paso_5: opcional,
});
type Fila = z.infer<typeof esquema>;

/** Causas de entidades verificadas (RF-RED-007). Las reglas de enlace y cierre son las de C22. */
@Injectable()
export class CausasFormato implements FormatoCsv<Fila> {
  readonly tipo = 'causas';
  readonly descripcion =
    'Causas de entidades verificadas, con sus pasos para donar en el sitio oficial';
  readonly esquema = esquema;
  readonly columnas = [
    {
      nombre: 'entidad',
      obligatoria: true,
      descripcion: 'Nombre de una entidad verificada',
      ejemplo: 'Cruz Roja Colombiana',
    },
    {
      nombre: 'categoria',
      obligatoria: true,
      descripcion: 'PERSONAS, ANIMALES, ADULTOS_MAYORES o RESCATISTAS',
      ejemplo: 'PERSONAS',
    },
    {
      nombre: 'titulo',
      obligatoria: true,
      descripcion: 'Título de la causa',
      ejemplo: 'Kits escolares para Mocoa',
    },
    {
      nombre: 'descripcion',
      obligatoria: true,
      descripcion: 'Qué se busca',
      ejemplo: 'Útiles para 200 niños',
    },
    {
      nombre: 'url_oficial',
      obligatoria: true,
      descripcion: 'Enlace https al sitio de la entidad',
      ejemplo: 'https://cruzroja.org.co/donar',
    },
    {
      nombre: 'cierra_el',
      obligatoria: true,
      descripcion: 'Fecha de cierre, hasta 6 meses',
      ejemplo: '2026-12-15',
    },
    {
      nombre: 'paso_1',
      obligatoria: true,
      descripcion: 'Primer paso para donar',
      ejemplo: 'Entra al sitio oficial',
    },
    {
      nombre: 'paso_2',
      obligatoria: false,
      descripcion: 'Paso 2 (hasta paso_5)',
      ejemplo: 'Elige el monto',
    },
  ];

  constructor(
    private readonly causas: CausasService,
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
      (n) => entidades.get(clave(n))?.verificacion === 'VERIFICADA',
      (n) => `«${n}» no existe o no está verificada; una causa solo sale de una entidad verificada`,
    );
  }

  async aplicar(filas: Fila[], usuario: UsuarioAutenticado, tx: ClienteBd) {
    const entidades = await this.referencias.entidades(
      filas.map((f) => f.entidad),
      tx,
    );
    for (const f of filas)
      await this.causas.crearEnTransaccion(
        tx,
        usuario,
        {
          entidadId: entidades.get(clave(f.entidad))!.id,
          categoria: f.categoria,
          titulo: f.titulo,
          descripcion: f.descripcion,
          pasos: [f.paso_1, f.paso_2, f.paso_3, f.paso_4, f.paso_5].filter((p): p is string => !!p),
          urlOficial: f.url_oficial,
          cierraEl: f.cierra_el,
        },
        true,
      );
  }
}
