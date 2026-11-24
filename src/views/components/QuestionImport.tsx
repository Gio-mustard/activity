'use client';

/**
 * Alta de un banco de preguntas desde un JSON.
 *
 * Dos caminos al mismo sitio: elegir un archivo o pegar el texto. El JSON se
 * revisa aqui antes de mandarlo, para que un error de sintaxis se vea al
 * instante y no despues de un viaje al servidor. El servidor vuelve a
 * validarlo: esta revision es comodidad, no seguridad.
 */
import { useRef, useState } from 'react';
import { Button, Card, Textarea } from './ui';
import { Icon } from '@/lib/icons';

export function QuestionImport({
  onImport,
  busy,
}: {
  /** Devuelve el error a mostrar, o null si entro bien. */
  onImport: (bundle: unknown) => Promise<string | null>;
  busy?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<number | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  /**
   * Endereza las comillas tipograficas.
   *
   * iOS y macOS cambian " por “ ” al escribir, y entonces el JSON deja de
   * serlo. El docente no tiene por que saber eso: si al enderezarlas el texto
   * si parsea, se usa, y nadie se entera del problema.
   */
  function enderezarComillas(valor: string) {
    return valor.replace(/[\u201C\u201D\u201E\u201F]/g, '"').replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  }

  /** Cuenta las preguntas sin importar si viene lista suelta u objeto. */
  function contar(valor: unknown): number | null {
    const lista = Array.isArray(valor) ? valor : (valor as { questions?: unknown })?.questions;
    return Array.isArray(lista) ? lista.length : null;
  }

  async function leerArchivo(file: File) {
    setError(null);
    setListo(null);
    const contenido = await file.text();
    setTexto(contenido);
  }

  async function importar() {
    setError(null);
    setListo(null);

    let valor: unknown;
    try {
      valor = JSON.parse(texto);
    } catch {
      try {
        valor = JSON.parse(enderezarComillas(texto));
      } catch {
        setError('El texto no es JSON valido. Revisa comas, comillas y llaves.');
        return;
      }
    }

    const cuantas = contar(valor);
    if (cuantas === null) {
      setError('El JSON debe ser una lista de preguntas o un objeto con la clave "questions".');
      return;
    }

    const fallo = await onImport(valor);
    if (fallo) {
      setError(fallo);
      return;
    }

    setListo(cuantas);
    setTexto('');
    if (archivo.current) archivo.current.value = '';
  }

  return (
    <Card className="p-space-md">
      <p className="flex items-center gap-2 text-label-lg">
        <Icon name="upload" className="h-5 w-5 text-primary" />
        Importar desde JSON
      </p>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Las preguntas se agregan al final del banco. Si una sola viene mal, no entra ninguna.
      </p>

      <input
        ref={archivo}
        type="file"
        accept="application/json,.json"
        aria-label="Archivo JSON con las preguntas"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void leerArchivo(file);
        }}
        className="mt-space-sm block w-full text-body-sm file:mr-3 file:rounded file:border-[1.5px] file:border-outline-variant file:bg-surface-low file:px-3 file:py-1.5 file:text-label-sm"
      />

      <Textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setError(null);
          setListo(null);
        }}
        placeholder='O pega aqui el JSON: { "questions": [ ... ] }'
        className="mt-space-sm min-h-28 font-mono text-body-sm"
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
      />

      {error ? (
        <p className="mt-space-sm rounded border-[1.5px] border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container">
          {error}
        </p>
      ) : null}

      {listo !== null ? (
        <p className="mt-space-sm rounded border-[1.5px] border-secondary bg-secondary-container/50 px-3 py-2 text-body-sm">
          Entraron {listo} {listo === 1 ? 'pregunta' : 'preguntas'}.
        </p>
      ) : null}

      <Button
        className="mt-space-md"
        variant="primary"
        hard
        block
        icon="upload"
        disabled={busy || texto.trim().length === 0}
        onClick={importar}
      >
        {busy ? 'Importando...' : 'Importar preguntas'}
      </Button>
    </Card>
  );
}
