/** Sin tamaño, Chrome da 640 × 480 y un EAN a la distancia de una caja queda con menos de un
 *  píxel por barra: la cámara abre y nunca lee (#40). El enfoque continuo se ignora donde no lo
 *  hay. */
const RESTRICCIONES: MediaTrackConstraints = {
  facingMode: 'environment',
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
};

/** Abre la cámara trasera en `video` y llama `alLeer` con cada código que lee. Devuelve cómo
 *  apagarla. `@zxing/browser` se descarga aquí, al tocar «Escanear», y no antes (§6). */
export async function abrirCamara(
  video: HTMLVideoElement,
  alLeer: (codigo: string) => void,
): Promise<() => void> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const lector = new BrowserMultiFormatReader();
  const controles = await lector.decodeFromConstraints(
    { video: RESTRICCIONES },
    video,
    (resultado) => {
      if (resultado) alLeer(resultado.getText());
    },
  );
  return () => controles.stop();
}
