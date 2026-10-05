import { consultarCodigo } from '../api/catalogo';
import { responderSegun } from '../pruebas/utilidades';
import { buscarCodigoVisto } from './datos-locales';

describe('códigos de barras vistos', () => {
  it('un código que la API reconoce queda en el teléfono para el escáner sin red', async () => {
    const codigo = {
      ean: '7702001045231',
      categoriaId: 'c1',
      categoria: 'Agua potable',
      contenido: 0.6,
    };
    responderSegun({ 'GET /api/codigos-barras/7702001045231': codigo });

    await consultarCodigo('7702001045231');

    expect(await buscarCodigoVisto('7702001045231')).toEqual(codigo);
  });

  it('si el teléfono no deja guardar, el código se reconoce igual', async () => {
    const codigo = {
      ean: '7702001045231',
      categoriaId: 'c1',
      categoria: 'Agua potable',
      contenido: 0.6,
    };
    responderSegun({ 'GET /api/codigos-barras/7702001045231': codigo });
    // Navegación privada o almacenamiento bloqueado: IndexedDB no está
    globalThis.indexedDB = undefined as unknown as IDBFactory;

    await expect(consultarCodigo('7702001045231')).resolves.toEqual(codigo);
  });
});
