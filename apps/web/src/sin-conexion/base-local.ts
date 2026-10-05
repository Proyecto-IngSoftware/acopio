import { openDB, type DBSchema } from 'idb';
import type { Categoria, CodigoBarras } from '../api/catalogo';
import type { Saldo } from '../api/inventario';
import type { NoRecibe } from '../api/red';

/** Base del teléfono para capturar sin red (O-01): la copia local y la cola de entradas. */
interface EsquemaLocal extends DBSchema {
  categorias: { key: 'vigentes'; value: Categoria[] };
  noRecibir: { key: string; value: NoRecibe[] };
  saldos: { key: string; value: SaldosGuardados };
  codigos: { key: string; value: CodigoBarras };
  cola: { key: string; value: EnCola; indexes: { usuario: string; orden: number } };
}

export interface SaldosGuardados {
  saldos: Saldo[];
  /** Cuándo se copiaron: C4 sin red lo muestra como «último saldo conocido». */
  guardadoEn: string;
}

/** Cuerpo de POST /acopios/:id/entradas tal como se enviará. */
export interface EntradaSinConexion {
  id: string;
  categoriaId: string;
  cantidad: number;
  venceEn?: string;
  ocurridoEn: string;
  origenOffline: true;
}

export interface EnCola {
  /** El mismo `id` del movimiento: reenviar no lo duplica (E-04). */
  id: string;
  usuarioId: string;
  acopioId: string;
  cuerpo: EntradaSinConexion;
  /** Orden de envío: el de registro, salvo una corregida, que vuelve al final. */
  orden: number;
  estado: 'pendiente' | 'rechazada';
  codigo?: string;
  motivo?: string;
}

export const abrir = () =>
  openDB<EsquemaLocal>('acopio-local', 2, {
    upgrade(base, version) {
      if (version < 1) {
        base.createObjectStore('categorias');
        base.createObjectStore('noRecibir');
        base.createObjectStore('saldos');
        base.createObjectStore('codigos');
      }
      if (version < 2) {
        const cola = base.createObjectStore('cola', { keyPath: 'id' });
        cola.createIndex('usuario', 'usuarioId');
        cola.createIndex('orden', 'orden');
      }
    },
  });
