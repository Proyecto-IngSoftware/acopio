import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { cuerpoDe, peticiones, responderSegun } from '../pruebas/utilidades';
import { retoDePrueba } from '../pruebas/datos-captcha';
import { jornadaDe } from '../pruebas/datos-turnos';
import {
  useAjustarCupos,
  useCambiarEstadoJornada,
  useConsultarReserva,
  useCrearJornadas,
  useJornadas,
  useJornadasGestion,
  useMarcarAsistencia,
  useReservar,
} from './turnos';

function conConsultas() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
}

it('useJornadas manda el filtro de perfil en la consulta', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [jornadaDe()] });
  const { result } = renderHook(() => useJornadas({ perfil: 'CONDUCTOR_C2' }), {
    wrapper: conConsultas(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual(['GET /api/turnos/jornadas?perfil=CONDUCTOR_C2']);
});

it('useConsultarReserva manda el secreto en el cuerpo y nunca en la URL', async () => {
  responderSegun({ 'POST /api/turnos/reservas/*/consultar': { codigo: 'ABCD2345' } });
  const { result } = renderHook(() => useConsultarReserva('ABCD2345', 's3cr3t'), {
    wrapper: conConsultas(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual(['POST /api/turnos/reservas/ABCD2345/consultar']);
  expect(peticiones().join(' ')).not.toContain('s3cr3t');
  expect(await cuerpoDe('POST /api/turnos/reservas/ABCD2345/consultar')).toEqual({
    secreto: 's3cr3t',
  });
});

it('useConsultarReserva sin secreto no llama a la API', async () => {
  responderSegun({});
  const { result } = renderHook(() => useConsultarReserva('ABCD2345', null), {
    wrapper: conConsultas(),
  });
  await new Promise((r) => setTimeout(r, 20));
  expect(result.current.fetchStatus).toBe('idle');
  expect(peticiones()).toEqual([]);
});

it('useReservar manda los datos con el consentimiento y la prueba del captcha', async () => {
  responderSegun({
    'GET /api/captcha/reto': await retoDePrueba(),
    'POST /api/turnos/jornadas/*/reservas': { codigo: 'K7QM4XPA', secreto: 'x', jornada: {} },
  });
  const { result } = renderHook(() => useReservar('j1'), { wrapper: conConsultas() });
  result.current.mutate({ nombre: 'Ana', correo: 'ana@correo.co', perfilDeclarado: false });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('POST /api/turnos/jornadas/j1/reservas')).toEqual({
    nombre: 'Ana',
    correo: 'ana@correo.co',
    perfilDeclarado: false,
    consentimiento: true,
  });
  const reserva = vi
    .mocked(globalThis.fetch)
    .mock.calls.map(([p]) => p as Request)
    .find((p) => p.method === 'POST');
  expect(reserva?.headers.get('X-Captcha')).toMatch(/^[A-Za-z0-9+/=]{40,}$/);
});

it('useJornadasGestion pide la pestaña', async () => {
  responderSegun({ 'GET /api/turnos/gestion/jornadas': [] });
  const { result } = renderHook(() => useJornadasGestion('en-curso'), {
    wrapper: conConsultas(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual(['GET /api/turnos/gestion/jornadas?pestana=en-curso']);
});

it('useCrearJornadas manda las fechas', async () => {
  responderSegun({ 'POST /api/turnos/gestion/jornadas': [] });
  const { result } = renderHook(() => useCrearJornadas(), { wrapper: conConsultas() });
  const datos = {
    acopioId: 'a1',
    titulo: 'Armar mercados',
    descripcion: 'Empacar mercados para familias de Mocoa.',
    cupoMaximo: 20,
    requisitos: { ropaCerrada: true, carga: false },
    fechas: ['2026-10-20', '2026-10-21'],
    horaInicio: '14:00',
    horaFin: '18:00',
  };
  result.current.mutate(datos);
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('POST /api/turnos/gestion/jornadas')).toEqual(datos);
});

it('useCambiarEstadoJornada llama a la ruta de la acción, con el motivo al cancelar', async () => {
  responderSegun({ 'POST /api/turnos/gestion/jornadas/*/cancelar': jornadaDe() });
  const { result } = renderHook(() => useCambiarEstadoJornada('j1'), { wrapper: conConsultas() });
  result.current.mutate({ accion: 'cancelar', motivo: 'Se inundó la bodega' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('POST /api/turnos/gestion/jornadas/j1/cancelar')).toEqual({
    motivo: 'Se inundó la bodega',
  });
});

it('useAjustarCupos y useMarcarAsistencia mandan su cuerpo', async () => {
  responderSegun({
    'PUT /api/turnos/gestion/jornadas/*/ajuste': jornadaDe(),
    'PUT /api/turnos/gestion/reservas/*/asistencia': { id: 'r1', estado: 'ASISTIO' },
  });
  const ajuste = renderHook(() => useAjustarCupos('j1'), { wrapper: conConsultas() });
  ajuste.result.current.mutate(2);
  await waitFor(() => expect(ajuste.result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('PUT /api/turnos/gestion/jornadas/j1/ajuste')).toEqual({ cupos: 2 });

  const asistencia = renderHook(() => useMarcarAsistencia(), { wrapper: conConsultas() });
  asistencia.result.current.mutate({ reservaId: 'r1', estado: 'ASISTIO' });
  await waitFor(() => expect(asistencia.result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('PUT /api/turnos/gestion/reservas/r1/asistencia')).toEqual({
    estado: 'ASISTIO',
  });
});
