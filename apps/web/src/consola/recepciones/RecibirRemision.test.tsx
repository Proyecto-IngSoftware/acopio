import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { GENERAL, HACIA_ZONA, RECEPTORA, ZONA } from './datos-prueba';
import { RecibirPorCodigo, RecibirPorQr } from './RecibirRemision';

const MIAS = [
  {
    tipo: 'ZONA',
    id: ZONA,
    nombre: 'Barrio San Agustín (prueba)',
    municipio: 'Mocoa',
    estado: 'ACTIVA',
  },
];
const LISTA = { 'GET /api/ubicaciones/mias': MIAS, 'GET /api/recepciones': [HACIA_ZONA, GENERAL] };
const FOTO = () => new File(['x'], 'f.jpg', { type: 'image/jpeg' });
const AVISO = /Esta remisión ya no está en camino a tus zonas/;

function porCodigo(codigo = 'R-2026-DEMA2') {
  return render(
    envolver(
      <Routes>
        <Route path="/consola/recepciones/:codigo" element={<RecibirPorCodigo />} />
      </Routes>,
      `/consola/recepciones/${codigo}`,
      clienteFalso(RECEPTORA),
    ),
  );
}

function porQr(token = 'tok1') {
  return render(
    envolver(
      <Routes>
        <Route path="/consola/recepciones/qr/:token" element={<RecibirPorQr />} />
      </Routes>,
      `/consola/recepciones/qr/${token}`,
      clienteFalso(RECEPTORA),
    ),
  );
}

const confirmar = () => screen.getByRole('button', { name: /Confirmar recepción/ });

it('sin foto no deja confirmar y dice por qué', async () => {
  responderSegun(LISTA);
  porCodigo();
  expect(await screen.findByText('Agua potable')).toBeInTheDocument();
  expect(screen.getByText('400 L')).toBeInTheDocument();
  expect(screen.getByText(/ACO-2026-DEMB2/)).toBeInTheDocument();
  expect(confirmar()).toBeDisabled();
  expect(screen.getByText('Toma una foto para confirmar.')).toBeInTheDocument();
});

it('cada foto se sube al elegirla, se ve su miniatura y habilita confirmar', async () => {
  responderSegun({
    ...LISTA,
    'POST /api/remisiones/*/evidencia': { ...HACIA_ZONA, evidencias: 1 },
  });
  porCodigo();
  const entrada = await screen.findByLabelText('Tomar foto');
  expect(entrada).toHaveAttribute('capture', 'environment');
  expect(entrada).toHaveAttribute('accept', 'image/*');
  await userEvent.upload(entrada, FOTO());
  expect(await screen.findByRole('img', { name: 'Foto 1 de lo que llegó' })).toHaveAttribute(
    'src',
    expect.stringMatching(/\/api\/remisiones\/R-2026-DEMA2\/evidencia\/0$/),
  );
  expect(peticiones()).toContain('POST /api/remisiones/R-2026-DEMA2/evidencia');
  expect(confirmar()).toBeEnabled();
  expect(screen.getByLabelText('Otra')).toBeInTheDocument();
});

it('con 5 fotos ya no ofrece otra', async () => {
  responderSegun({ ...LISTA, 'GET /api/recepciones': [{ ...HACIA_ZONA, evidencias: 5 }] });
  porCodigo();
  expect(await screen.findAllByRole('img', { name: /de lo que llegó/ })).toHaveLength(5);
  expect(screen.queryByLabelText('Otra')).not.toBeInTheDocument();
});

it('confirma con la nota y muestra la remisión recibida', async () => {
  responderSegun({
    ...LISTA,
    'GET /api/recepciones': [{ ...HACIA_ZONA, evidencias: 2 }],
    'POST /api/remisiones/*/recibir': { ...HACIA_ZONA, estado: 'RECIBIDA', evidencias: 2 },
  });
  porCodigo();
  await userEvent.type(await screen.findByLabelText('Nota (opcional)'), 'Dos bultos mojados');
  expect(screen.getByText('18 / 280')).toBeInTheDocument();
  await userEvent.click(confirmar());
  expect(await screen.findByRole('heading', { name: 'R-2026-DEMA2 recibida' })).toBeInTheDocument();
  expect(await cuerpoDe('POST /api/remisiones/R-2026-DEMA2/recibir')).toEqual({
    nota: 'Dos bultos mojados',
  });
  expect(screen.getByRole('link', { name: /Ver la ficha de la zona/ })).toHaveAttribute(
    'href',
    `/consola/zonas/${ZONA}`,
  );
  expect(screen.getByRole('link', { name: 'Volver a Por recibir' })).toHaveAttribute(
    'href',
    '/consola/recepciones',
  );
});

it('sigue mostrando «recibida» aunque la lista ya no traiga la remisión (I3-04)', async () => {
  responderSegun({ ...LISTA, 'GET /api/recepciones': [{ ...HACIA_ZONA, evidencias: 1 }] });
  porCodigo();
  await screen.findByText('Agua potable');
  // Después de recibir, la API ya no la lista como pendiente
  responderSegun({
    ...LISTA,
    'GET /api/recepciones': [],
    'POST /api/remisiones/*/recibir': { ...HACIA_ZONA, estado: 'RECIBIDA', evidencias: 1 },
  });
  await userEvent.click(confirmar());
  expect(await screen.findByRole('heading', { name: 'R-2026-DEMA2 recibida' })).toBeInTheDocument();
  // La lista se vuelve a pedir al recibir; la vista no cambia por eso
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.getByRole('heading', { name: 'R-2026-DEMA2 recibida' })).toBeInTheDocument();
  expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
});

it('un despacho general pide la zona antes de confirmar', async () => {
  responderSegun({
    ...LISTA,
    'GET /api/recepciones': [{ ...GENERAL, evidencias: 1 }],
    'POST /api/remisiones/*/recibir': {
      ...GENERAL,
      estado: 'RECIBIDA',
      zona: { id: ZONA, nombre: 'Barrio San Agustín (prueba)' },
    },
  });
  porCodigo('R-2026-DEMA3');
  const zona = await screen.findByLabelText('¿En qué zona la recibes?');
  expect(confirmar()).toBeDisabled();
  expect(screen.getByText('Elige la zona para confirmar.')).toBeInTheDocument();
  await screen.findByRole('option', { name: 'Barrio San Agustín (prueba)' });
  await userEvent.selectOptions(zona, ZONA);
  await userEvent.click(confirmar());
  await screen.findByRole('heading', { name: 'R-2026-DEMA3 recibida' });
  expect(await cuerpoDe('POST /api/remisiones/R-2026-DEMA3/recibir')).toEqual({ zonaId: ZONA });
});

it('un código que ya no está en camino muestra el aviso', async () => {
  responderSegun(LISTA);
  porCodigo('R-2026-ZZZZZ');
  expect(await screen.findByText(AVISO)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Volver a Por recibir' })).toBeInTheDocument();
});

it.each([
  ['404', conEstado(404, { estado: 404, codigo: 'REMISION_NO_ENCONTRADA', mensaje: 'No' })],
  ['403', conEstado(403, { estado: 403, codigo: 'ZONA_NO_ASIGNADA', mensaje: 'No' })],
  ['recibida', { ...HACIA_ZONA, estado: 'RECIBIDA' }],
])('por QR, %s muestra el aviso', async (_caso, respuesta) => {
  responderSegun({ ...LISTA, 'GET /api/recepciones/qr/*': respuesta });
  porQr();
  expect(await screen.findByText(AVISO)).toBeInTheDocument();
});

it('por QR, una remisión en camino abre el formulario', async () => {
  responderSegun({ ...LISTA, 'GET /api/recepciones/qr/*': HACIA_ZONA });
  porQr();
  expect(await screen.findByText('Agua potable')).toBeInTheDocument();
  expect(confirmar()).toBeDisabled();
});

it('si otro Receptor tomó el despacho, lo dice y lleva de vuelta a la lista', async () => {
  responderSegun({
    ...LISTA,
    'GET /api/recepciones': [{ ...HACIA_ZONA, evidencias: 1 }],
    'POST /api/remisiones/*/recibir': conEstado(409, {
      estado: 409,
      codigo: 'REMISION_TOMADA',
      mensaje: 'Otro Receptor ya está recibiendo este despacho',
    }),
  });
  porCodigo();
  await userEvent.click(await screen.findByRole('button', { name: /Confirmar recepción/ }));
  expect(
    await screen.findByText('Otro Receptor ya está recibiendo este despacho'),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Volver a Por recibir' })).toHaveAttribute(
    'href',
    '/consola/recepciones',
  );
  expect(screen.queryByRole('button', { name: /Confirmar recepción/ })).not.toBeInTheDocument();
});

it('si la remisión dejó de estar en camino al confirmar, muestra el aviso y vuelve a pedir la lista', async () => {
  responderSegun({
    ...LISTA,
    'GET /api/recepciones': [{ ...HACIA_ZONA, evidencias: 1 }],
    'POST /api/remisiones/*/recibir': conEstado(409, {
      estado: 409,
      codigo: 'REMISION_ESTADO_INVALIDO',
      mensaje: 'Esta remisión está cancelada: no se puede recibir',
    }),
  });
  porCodigo();
  await userEvent.click(await screen.findByRole('button', { name: /Confirmar recepción/ }));
  expect(await screen.findByText(AVISO)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Confirmar recepción/ })).not.toBeInTheDocument();
  await waitFor(() =>
    expect(peticiones().filter((x) => x === 'GET /api/recepciones').length).toBeGreaterThan(1),
  );
});

it('si la remisión dejó de estar en camino al subir la foto, muestra el aviso', async () => {
  responderSegun({
    ...LISTA,
    'POST /api/remisiones/*/evidencia': conEstado(409, {
      estado: 409,
      codigo: 'REMISION_ESTADO_INVALIDO',
      mensaje: 'Esta remisión está recibida: no se puede subirEvidencia',
    }),
  });
  porCodigo();
  await userEvent.upload(await screen.findByLabelText('Tomar foto'), FOTO());
  expect(await screen.findByText(AVISO)).toBeInTheDocument();
});

it('una foto rechazada muestra el mensaje y conserva las anteriores', async () => {
  responderSegun({
    ...LISTA,
    'GET /api/recepciones': [{ ...HACIA_ZONA, evidencias: 1 }],
    'POST /api/remisiones/*/evidencia': conEstado(413, {
      estado: 413,
      codigo: 'IMAGEN_GRANDE',
      mensaje: 'La foto pesa más de 10 MB',
    }),
  });
  porCodigo();
  await userEvent.upload(await screen.findByLabelText('Otra'), FOTO());
  expect(await screen.findByText('La foto pesa más de 10 MB')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Foto 1 de lo que llegó' })).toBeInTheDocument();
});

it('la nota se corta en 280 caracteres', async () => {
  responderSegun(LISTA);
  porCodigo();
  expect(await screen.findByLabelText('Nota (opcional)')).toHaveAttribute('maxLength', '280');
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ ...LISTA, 'GET /api/recepciones': [{ ...GENERAL, evidencias: 1 }] });
  const { container } = porCodigo('R-2026-DEMA3');
  await screen.findByLabelText('¿En qué zona la recibes?');
  expect(await violacionesGraves(container)).toEqual([]);
});
