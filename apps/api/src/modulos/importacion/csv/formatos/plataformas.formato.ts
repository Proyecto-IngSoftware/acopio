import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { BitacoraService } from '../../../auditoria/bitacora.service';
import { PlataformaDao } from '../../dao/plataforma.dao';
import { ReferenciasDao, clave } from '../../dao/referencias.dao';
import type { FilaCsv, FormatoCsv } from '../formato-csv';

const esquema = z.object({
  nombre: z.string().min(1, 'Falta el nombre'),
  categoria: z.string().min(1, 'Falta la categoría'),
  descripcion: z.string().min(1, 'Falta la descripción'),
  url: z.url({ protocol: /^https$/, error: 'Debe ser un enlace https://' }),
});
type Fila = z.infer<typeof esquema>;

/** Otras plataformas que coordinan ayuda, sumadas a mano (P14). */
@Injectable()
export class PlataformasFormato implements FormatoCsv<Fila> {
  readonly tipo = 'plataformas';
  readonly descripcion =
    'Otras plataformas que coordinan ayuda. No son causas: Acopio no las verifica';
  readonly esquema = esquema;
  readonly columnas = [
    {
      nombre: 'nombre',
      obligatoria: true,
      descripcion: 'Nombre de la plataforma',
      ejemplo: 'Donando Talento',
    },
    {
      nombre: 'categoria',
      obligatoria: true,
      descripcion: 'Qué tipo de ayuda coordina',
      ejemplo: 'Voluntariado profesional',
    },
    {
      nombre: 'descripcion',
      obligatoria: true,
      descripcion: 'Una frase sobre lo que hace',
      ejemplo: 'Conecta profesionales con proyectos',
    },
    {
      nombre: 'url',
      obligatoria: true,
      descripcion: 'Su sitio, con https://',
      ejemplo: 'https://donandotalento.com/',
    },
  ];

  constructor(
    private readonly plataformas: PlataformaDao,
    private readonly bitacora: BitacoraService,
    private readonly referencias: ReferenciasDao,
  ) {}

  /** Un nombre que ya está en la lista, o repetido en el archivo, la duplicaría en P14. */
  async revisar(filas: FilaCsv<Fila>[], tx: ClienteBd) {
    const existentes = await this.referencias.plataformas(
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
          { numero: f.numero, columna: 'nombre', mensaje: 'Esa plataforma ya está en la lista' },
        ];
      if (repetida)
        return [
          { numero: f.numero, columna: 'nombre', mensaje: 'El nombre se repite en el archivo' },
        ];
      return [];
    });
  }

  async aplicar(filas: Fila[], usuario: UsuarioAutenticado, tx: ClienteBd) {
    for (const [i, f] of filas.entries()) {
      const p = await this.plataformas.crear({ ...f, orden: 100 + i }, tx);
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'plataforma.creada',
        entidad: 'plataforma',
        entidadId: p.id,
        despues: p,
      });
    }
  }
}
