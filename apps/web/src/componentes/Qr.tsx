import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  texto: string;
  alt: string;
  className?: string;
}

/** Un código QR como imagen `data:` de un SVG: no se inserta HTML. */
export function Qr({ texto, alt, className = 'h-48 w-48' }: Props) {
  const [src, fijarSrc] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void QRCode.toString(texto, { type: 'svg', margin: 1 }).then((svg) => {
      if (vivo) fijarSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    });
    return () => {
      vivo = false;
    };
  }, [texto]);
  if (!src) return <div className={className} />;
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} rounded-xl border border-outline-variant bg-surface-container-lowest p-space-xs`}
    />
  );
}
