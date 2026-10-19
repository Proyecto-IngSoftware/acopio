import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { CategoriasService } from '../../../catalogo/categorias.service';
import { clave, ReferenciasDao } from '../../dao/referencias.dao';
import { opcional, texto } from '../columnas';
import type { FilaCsv, FormatoCsv } from '../formato-csv';

const GRUPOS = [
  'ALIMENTOS',
  'AGUA_Y_BEBIDAS',
  'ASEO_PERSONAL',
  'ASEO_DEL_HOGAR',
  'SALUD',
  'ROPA_Y_ABRIGO',
  'BEBE',
  'ADULTO_MAYOR',
  'ANIMALES',
  'HERRAMIENTAS',
] as const;

const esquema = z.object({
  nombre: texto('Falta el nombre'),
  grupo: z.enum(GRUPOS, { error: `Usa uno de: ${GRUPOS.join(', ')}` }),
  unidad_base: z.enum(['KILOGRAMO', 'LITRO', 'UNIDAD'], { error: 'Usa KILOGRAMO, LITRO o UNIDAD' }),
  perecedero: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v === 'si' || v === 'sí')
    .optional(),
  sinonimos: opcional.transform((v) =>
    v
      ? v
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  ),
});
type Fila = z.infer<typeof esquema>;

/** Categorías del catálogo maestro (RF-CAT-001). */
@Injectable()
export class CategoriasFormato implements FormatoCsv<Fila> {
  readonly tipo = 'categorias';
  readonly descripcion = 'Categorías del catálogo maestro, con su grupo y su unidad';
  readonly esquema = esquema;
  readonly columnas = [
    { nombre: 'nombre', obligatoria: true, descripcion: 'Nombre único', ejemplo: 'Arroz' },
    { nombre: 'grupo', obligatoria: true, descripcion: GRUPOS.join(', '), ejemplo: 'ALIMENTOS' },
    {
      nombre: 'unidad_base',
      obligatoria: true,
      descripcion: 'KILOGRAMO, LITRO o UNIDAD',
      ejemplo: 'KILOGRAMO',
    },
    { nombre: 'perecedero', obligatoria: false, descripcion: 'si o no', ejemplo: 'no' },
    {
      nombre: 'sinonimos',
      obligatoria: false,
      descripcion: 'Separados por |',
      ejemplo: 'arroz blanco|arroz integral',
    },
  ];

  constructor(
    private readonly categorias: CategoriasService,
    private readonly referencias: ReferenciasDao,
  ) {}

  async revisar(filas: FilaCsv<Fila>[], tx: ClienteBd) {
    const existentes = await this.referencias.categorias(
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
          {
            numero: f.numero,
            columna: 'nombre',
            mensaje: 'Ya existe una categoría con ese nombre',
          },
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
      await this.categorias.crearEnTransaccion(tx, usuario, {
        nombre: f.nombre,
        grupo: f.grupo,
        unidadBase: f.unidad_base,
        perecedero: f.perecedero ?? false,
        sinonimos: f.sinonimos,
      });
  }
}
