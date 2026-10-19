import { Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../../comun/errores/error-dominio';
import type { FormatoCsv } from './formato-csv';
import { AcopiosFormato } from './formatos/acopios.formato';
import { CategoriasFormato } from './formatos/categorias.formato';
import { CausasFormato } from './formatos/causas.formato';
import { InventarioFormato } from './formatos/inventario.formato';
import { JornadasFormato } from './formatos/jornadas.formato';
import { EntidadesFormato } from './formatos/entidades.formato';
import { PlataformasFormato } from './formatos/plataformas.formato';
import { ZonasFormato } from './formatos/zonas.formato';

/** Los formatos de CSV que se pueden cargar, por su tipo (el que va en la URL y en el script). */
@Injectable()
export class RegistroFormatos {
  private readonly formatos: Map<string, FormatoCsv>;

  constructor(
    plataformas: PlataformasFormato,
    entidades: EntidadesFormato,
    acopios: AcopiosFormato,
    zonas: ZonasFormato,
    causas: CausasFormato,
    categorias: CategoriasFormato,
    inventario: InventarioFormato,
    jornadas: JornadasFormato,
  ) {
    const lista = [
      plataformas,
      entidades,
      acopios,
      zonas,
      causas,
      categorias,
      inventario,
      jornadas,
    ] as FormatoCsv[];
    this.formatos = new Map(lista.map((f) => [f.tipo, f]));
  }

  obtener(tipo: string): FormatoCsv {
    const f = this.formatos.get(tipo);
    if (!f) throw new ErrorDominio('FORMATO_CSV_DESCONOCIDO', `No hay un formato «${tipo}»`, 404);
    return f;
  }

  todos(): FormatoCsv[] {
    return [...this.formatos.values()];
  }
}
