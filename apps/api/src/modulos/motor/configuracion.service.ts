import { Injectable } from '@nestjs/common';
import { emparejar, pesosValidos, type Pesos, type SugerenciaCalculada } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { Transacciones } from '../../comun/prisma/transacciones';
import { BitacoraService } from '../auditoria/bitacora.service';
import { ConfiguracionDao } from './dao/configuracion.dao';
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
    private readonly transacciones: Transacciones,
    private readonly configuracion: ConfiguracionDao,
    private readonly bitacora: BitacoraService,
    private readonly sugerencias: SugerenciasService,
  ) {}

  leer() {
    return this.configuracion.leer();
  }

  async guardar(admin: UsuarioAutenticado, d: DatosConfiguracion) {
    exigirPesos(d.pesos);
    await this.transacciones.ejecutar(async (tx) => {
      const antes = await this.configuracion.leer(tx);
      await this.configuracion.guardar(tx, { ...d, usuarioId: admin.id });
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
    // Una transacción de solo lectura: la configuración y el estado salen de la misma foto
    const { actual, entrada } = await this.transacciones.ejecutar(
      async (tx) => ({
        actual: await this.configuracion.leer(tx),
        entrada: (await this.sugerencias.cargarEntrada(tx, ahora)).entrada,
      }),
      { timeout: 30_000, maxWait: 10_000 },
    );
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
