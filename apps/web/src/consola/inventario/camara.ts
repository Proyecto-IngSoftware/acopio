/** Abre la cámara trasera en `video` y llama `alLeer` con cada código que lee. Devuelve cómo
 *  apagarla. `@zxing/browser` se descarga aquí, al tocar «Escanear», y no antes (§6). */
export async function abrirCamara(
  video: HTMLVideoElement,
  alLeer: (codigo: string) => void,
): Promise<() => void> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const lector = new BrowserMultiFormatReader();
  const controles = await lector.decodeFromConstraints(
    { video: { facingMode: 'environment' } },
    video,
    (resultado) => {
      if (resultado) alLeer(resultado.getText());
    },
  );
  return () => controles.stop();
}
