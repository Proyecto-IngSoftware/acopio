import { Injectable } from '@nestjs/common';
import { emparejar, pesosValidos, type Pesos, type SugerenciaCalculada } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { leerConfiguracion } from './configuracion';
import { SugerenciasService } from './sugerencias.service';

export interface DatosConfiguracion {
  pesos: Pesos;
  cantidadMinima: number;
}

const exigirPesos = (p: Pesos) => {
  if (!pesosValidos(p))
    throw new ErrorDominio('PESOS_NO_SUMAN_UNO', 'Los cuatro pesos deben sumar 1');
};

/** RF-CAT-006: pesos globales del motor. Cambiarlos no toca las sugerencias decididas. */
@Injectable()
export class ConfiguracionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly sugerencias: SugerenciasService,
  ) {}

  leer() {
    return leerConfiguracion(this.prisma);
  }

  async guardar(admin: UsuarioAutenticado, d: DatosConfiguracion) {
    exigirPesos(d.pesos);
    await this.prisma.$transaction(async (tx) => {
      const antes = await leerConfiguracion(tx);
      await tx.configuracionMotor.upsert({
        where: { id: 1 },
        update: {
          pesos: { ...d.pesos },
          cantidad_minima: d.cantidadMinima,
          actualizado_por: admin.id,
          actualizado_en: new Date(),
        },
        create: {
          id: 1,
          pesos: { ...d.pesos },
          cantidad_minima: d.cantidadMinima,
          actualizado_por: admin.id,
        },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'motor.configuracion',
        entidad: 'configuracion_motor',
        antes: { pesos: antes.pesos, cantidadMinima: antes.cantidadMinima },
        despues: { pesos: d.pesos, cantidadMinima: d.cantidadMinima },
      });
    });
    return this.leer();
  }

  /** El ranking con los pesos guardados y con los propuestos, sin guardar nada. */
  async vistaPrevia(d: DatosConfiguracion, ahora = new Date()) {
    exigirPesos(d.pesos);
    const actual = await leerConfiguracion(this.prisma);
    const { entrada } = await this.sugerencias.cargarEntrada(this.prisma, ahora);
    const nombre = (lista: { id: string; nombre: string }[], id: string) =>
      lista.find((x) => x.id === id)?.nombre ?? '';
    const vista = (s: SugerenciaCalculada) => ({
      acopio: nombre(entrada.acopios, s.acopioId),
      zona: nombre(entrada.zonas, s.zonaId),
      categoria: nombre(entrada.categorias, s.categoriaId),
      cantidad: s.cantidad,
      puntaje: s.puntaje,
    });
    return {
      actual: emparejar(entrada, actual.pesos, actual.cantidadMinima).slice(0, 50).map(vista),
      propuesta: emparejar(entrada, d.pesos, d.cantidadMinima).slice(0, 50).map(vista),
    };
  }
}
