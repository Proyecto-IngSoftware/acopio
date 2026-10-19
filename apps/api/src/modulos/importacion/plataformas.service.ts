import { Injectable } from '@nestjs/common';
import { PlataformaDao } from './dao/plataforma.dao';

/** P14: las otras plataformas activas, con lo que ve el público. */
@Injectable()
export class PlataformasService {
  constructor(private readonly plataformas: PlataformaDao) {}

  async listar() {
    return (await this.plataformas.activas()).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion,
      url: p.url,
    }));
  }
}
