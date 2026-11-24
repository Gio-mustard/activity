'use client';

/**
 * CODIGOS QR de la sala.
 *
 * Se generan en el navegador con `qrcode`: la URL de la sala nunca sale hacia
 * un servicio externo de imagenes. Dos piezas:
 *
 * - QrImage: el cuadro reutilizable, en el tamaño que le pidan.
 * - QrPoster: el QR gigante del enlace general, para proyectar.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button, cx } from './ui';

/** Tinta del QR: el azul oscuro de la marca sobre blanco, para que contraste al proyectar. */
const TINTA = { dark: '#131b2e', light: '#ffffff' };

export function QrImage({
  url,
  size = 180,
  alt,
  className,
}: {
  url: string;
  size?: number;
  alt: string;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    QRCode.toDataURL(url, { width: size * 2, margin: 1, color: TINTA })
      .then((value) => {
        if (vigente) setDataUrl(value);
      })
      .catch(() => {
        if (vigente) setDataUrl(null);
      });
    // Si la URL cambia antes de terminar, se descarta el resultado viejo.
    return () => {
      vigente = false;
    };
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        className={cx('grid place-items-center rounded bg-surface-low text-body-sm text-on-surface-variant', className)}
        style={{ width: size, height: size }}
      >
        ...
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={dataUrl} alt={alt} width={size} height={size} className={cx('rounded bg-white', className)} />
  );
}

export function QrPoster({ url, code, onClose }: { url: string; code: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-space-md bg-surface p-gutter-mobile">
      <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Escanea para entrar</p>
      <div className="rounded-lg border-2 border-on-surface bg-surface-lowest p-space-md shadow-hard">
        <QrImage url={url} size={420} alt={`Codigo QR de la sala ${code}`} className="h-[min(60vh,420px)] w-auto" />
      </div>
      <p className="font-mono text-headline-lg-mobile tracking-widest sm:text-headline-lg">{code}</p>
      <p className="max-w-md break-all text-center text-body-sm text-on-surface-variant">{url}</p>
      <Button variant="primary" size="lg" hard icon="close" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  );
}
