import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { BitacoraService } from '../../../auditoria/bitacora.service';
import { PlataformaDao } from '../../dao/plataforma.dao';
import type { FormatoCsv } from '../formato-csv';

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
  ) {}

  async revisar() {
    return [];
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
