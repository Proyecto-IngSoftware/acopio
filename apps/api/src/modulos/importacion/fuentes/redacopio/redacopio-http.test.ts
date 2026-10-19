import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGENTE, RedAcopioHttp, TIEMPO_LIMITE_MS } from './redacopio-http';

const copia = (archivo: string) => readFileSync(join(__dirname, 'copia', archivo), 'utf8');

describe('RedAcopio por red', () => {
  it('pide la portada y las herramientas con el User-Agent de Acopio y lee lo mismo que la copia', async () => {
    const pedidos: { url: string; agente: string | null }[] = [];
    const fetchFalso = (async (url: string, init?: RequestInit) => {
      pedidos.push({ url, agente: new Headers(init?.headers).get('user-agent') });
      return new Response(
        copia(url.endsWith('/herramientas') ? 'herramientas.html' : 'portada.html'),
      );
    }) as typeof fetch;
    const lectura = await new RedAcopioHttp(fetchFalso).leer();
    expect(pedidos.map((p) => p.url)).toEqual([
      'https://redacopiobogota.com/',
      'https://redacopiobogota.com/herramientas',
    ]);
    expect(pedidos.every((p) => p.agente === AGENTE)).toBe(true);
    expect(lectura.puntos).toHaveLength(88);
    expect(lectura.plataformas).toHaveLength(9);
  });

  it('el User-Agent nombra a Acopio y trae un contacto', () => {
    expect(AGENTE).toBe('Acopio/1.0 (proyecto académico ETITC; +https://acopio.josephqaz.dev)');
    expect(TIEMPO_LIMITE_MS).toBe(15_000);
  });

  it('una respuesta 500 aborta con FORMATO_FUENTE', async () => {
    const fetchFalso = (async () => new Response('caído', { status: 500 })) as typeof fetch;
    await expect(new RedAcopioHttp(fetchFalso).leer()).rejects.toMatchObject({
      codigo: 'FORMATO_FUENTE',
    });
  });

  it('pasa una señal de aborto para cortar a los 15 s', async () => {
    let senal: AbortSignal | undefined;
    const fetchFalso = (async (_url: string, init?: RequestInit) => {
      senal = init?.signal ?? undefined;
      return new Response(copia('portada.html'));
    }) as typeof fetch;
    await new RedAcopioHttp(fetchFalso).leer().catch(() => undefined);
    expect(senal).toBeInstanceOf(AbortSignal);
  });
});
