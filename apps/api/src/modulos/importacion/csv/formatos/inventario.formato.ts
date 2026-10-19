import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { UsuarioAutenticado } from '../../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../../comun/prisma/cliente-bd';
import { AcopiosService } from '../../../acopios/acopios.service';
import { MovimientosService } from '../../../inventario/movimientos.service';
import { clave, ReferenciasDao } from '../../dao/referencias.dao';
import { faltantes, numero, texto } from '../columnas';
import type { FilaCsv, FormatoCsv } from '../formato-csv';

const esquema = z.object({
  acopio: texto('Falta el acopio'),
  categoria: texto('Falta la categoría'),
  cantidad: numero('Falta la cantidad').pipe(
    z.number().positive('La cantidad debe ser mayor que cero'),
  ),
  vence_en: z.iso
    .date('Usa AAAA-MM-DD')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
type Fila = z.infer<typeof esquema>;

/** Inventario inicial: cada fila es una ENTRADA; el saldo lo calcula la base (ADR-0002, ADR-0015). */
@Injectable()
export class InventarioFormato implements FormatoCsv<Fila> {
  readonly tipo = 'inventario';
  readonly descripcion =
    'Inventario inicial por acopio y categoría; cada fila entra como un movimiento de entrada';
  readonly esquema = esquema;
  readonly columnas = [
    {
      nombre: 'acopio',
      obligatoria: true,
      descripcion: 'Nombre de un acopio que usa Acopio',
      ejemplo: 'Acopio Chapinero',
    },
    {
      nombre: 'categoria',
      obligatoria: true,
      descripcion: 'Nombre de una categoría del catálogo',
      ejemplo: 'Arroz',
    },
    {
      nombre: 'cantidad',
      obligatoria: true,
      descripcion: 'En la unidad de la categoría',
      ejemplo: '25',
    },
    {
      nombre: 'vence_en',
      obligatoria: false,
      descripcion: 'Vencimiento de un perecedero',
      ejemplo: '2026-12-31',
    },
  ];

  constructor(
    private readonly movimientos: MovimientosService,
    private readonly acopios: AcopiosService,
    private readonly referencias: ReferenciasDao,
  ) {}

  async revisar(filas: FilaCsv<Fila>[], tx: ClienteBd) {
    const [acopios, categorias] = await Promise.all([
      this.referencias.acopiosOperados(
        filas.map((f) => f.datos.acopio),
        tx,
      ),
      this.referencias.categorias(
        filas.map((f) => f.datos.categoria),
        tx,
      ),
    ]);
    return [
      ...faltantes(
        filas,
        'acopio',
        (f) => f.acopio,
        (n) => acopios.has(clave(n)),
        (n) => `«${n}» no es un acopio que use Acopio`,
      ),
      ...faltantes(
        filas,
        'categoria',
        (f) => f.categoria,
        (n) => categorias.has(clave(n)) && !categorias.get(clave(n))!.archivada,
        (n) => `No hay una categoría activa «${n}»`,
      ),
    ];
  }

  async aplicar(filas: Fila[], usuario: UsuarioAutenticado, tx: ClienteBd) {
    const [acopios, categorias] = await Promise.all([
      this.referencias.acopiosOperados(
        filas.map((f) => f.acopio),
        tx,
      ),
      this.referencias.categorias(
        filas.map((f) => f.categoria),
        tx,
      ),
    ]);
    const ahora = new Date();
    for (const f of filas) {
      const acopioId = acopios.get(clave(f.acopio))!.id;
      await this.acopios.exigirAbierto(acopioId, tx);
      await this.movimientos.entradaEnTransaccion(tx, usuario, acopioId, {
        categoriaId: categorias.get(clave(f.categoria))!.id,
        cantidad: f.cantidad,
        venceEn: f.vence_en ? new Date(`${f.vence_en}T00:00:00Z`) : null,
        ocurridoEn: ahora,
        origenOffline: false,
      });
    }
  }
}
