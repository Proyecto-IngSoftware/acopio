import { api, desenvolver, ErrorApi, reintentarConsulta } from './cliente';

describe('reintentarConsulta', () => {
  it('reintenta una vez sin red o con un error del servidor', () => {
    expect(reintentarConsulta(0, new ErrorApi(0, 'SIN_RED', 'sin red'))).toBe(true);
    expect(reintentarConsulta(0, new ErrorApi(503, 'ERROR', 'caído'))).toBe(true);
    expect(reintentarConsulta(1, new ErrorApi(0, 'SIN_RED', 'sin red'))).toBe(false);
  });

  it('no reintenta un 4xx: la respuesta no va a cambiar', () => {
    expect(reintentarConsulta(0, new ErrorApi(403, 'PROHIBIDO', 'no'))).toBe(false);
    expect(reintentarConsulta(0, new ErrorApi(404, 'NO_ENCONTRADO', 'no'))).toBe(false);
  });
});

describe('desenvolver', () => {
  it('un 204 sin cuerpo es un éxito, no un error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      desenvolver(
        api.DELETE('/api/turnos/gestion/jornadas/{id}', { params: { path: { id: 'j1' } } }),
      ),
    ).resolves.toBeUndefined();
  });

  it('un error sin cuerpo sigue siendo un error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    await expect(
      desenvolver(
        api.DELETE('/api/turnos/gestion/jornadas/{id}', { params: { path: { id: 'j1' } } }),
      ),
    ).rejects.toBeInstanceOf(ErrorApi);
  });
});
