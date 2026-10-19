import { Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { PlataformaDao } from './dao/plataforma.dao';

/** Otras plataformas activas, con lo que ve el público en Causas (P3). */
@Injectable()
export class PlataformasService {
  constructor(
    private readonly plataformas: PlataformaDao,
    private readonly almacenamiento: AlmacenamientoService,
  ) {}

  async listar() {
    return (await this.plataformas.activas()).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion,
      url: p.url,
      tieneImagen: p.imagen_key !== null,
      actualizadoEn: p.actualizado_en,
    }));
  }

  async leerImagen(id: string) {
    const p = await this.plataformas.porId(id);
    if (!p?.imagen_key) {
      throw new ErrorDominio('SIN_IMAGEN', 'La plataforma no tiene imagen', 404);
    }
    return this.almacenamiento.leerImagen(p.imagen_key);
  }
}
