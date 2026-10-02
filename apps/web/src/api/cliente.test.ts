import { ErrorApi, reintentarConsulta } from './cliente';

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
