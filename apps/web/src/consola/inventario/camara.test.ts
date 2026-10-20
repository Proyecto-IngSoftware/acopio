import { abrirCamara } from './camara';

const decodeFromConstraints = vi.fn();
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromConstraints = decodeFromConstraints;
  },
}));

it('pide la cámara trasera en 1920 × 1080 y con enfoque continuo (#40)', async () => {
  const stop = vi.fn();
  decodeFromConstraints.mockResolvedValue({ stop });
  const apagar = await abrirCamara(document.createElement('video'), () => {});
  expect(decodeFromConstraints).toHaveBeenCalledWith(
    {
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        advanced: [{ focusMode: 'continuous' }],
      },
    },
    expect.anything(),
    expect.any(Function),
  );
  apagar();
  expect(stop).toHaveBeenCalled();
});

it('entrega el texto de cada código que lee', async () => {
  decodeFromConstraints.mockImplementation(async (_r, _v, alResultado) => {
    alResultado(undefined);
    alResultado({ getText: () => '7702001023455' });
    return { stop: () => {} };
  });
  const alLeer = vi.fn();
  await abrirCamara(document.createElement('video'), alLeer);
  expect(alLeer.mock.calls).toEqual([['7702001023455']]);
});
