'use client';

/**
 * QR gigante para proyectar. Se genera en el navegador con `qrcode`,
 * sin mandar la URL de la sala a ningun servicio externo.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui';

export function QrPoster({ url, code, onClose }: { url: string; code: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 720, margin: 1, color: { dark: '#131b2e', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-space-md bg-surface p-gutter-mobile">
      <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Escanea para entrar</p>
      <div className="rounded-lg border-2 border-on-surface bg-surface-lowest p-space-md shadow-hard">
        {dataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={dataUrl} alt={`Codigo QR de la sala ${code}`} className="h-[min(60vh,420px)] w-auto" />
        ) : (
          <div className="grid h-[min(60vh,420px)] w-[min(60vh,420px)] place-items-center text-body-sm text-on-surface-variant">
            Generando codigo...
          </div>
        )}
      </div>
      <p className="font-mono text-headline-lg-mobile tracking-widest sm:text-headline-lg">{code}</p>
      <p className="max-w-md break-all text-center text-body-sm text-on-surface-variant">{url}</p>
      <Button variant="primary" size="lg" hard icon="close" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  );
}
