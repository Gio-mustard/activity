'use client';

/**
 * Plantilla y respaldo del banco en JSON.
 *
 * La plantilla responde a "y como debe venir el archivo": trae un ejemplo de
 * los tres tipos con todos los campos escritos. El respaldo baja el banco que
 * ya existe EN ESA MISMA FORMA, asi que sirve de ejemplo real y se puede
 * volver a importar sin editar nada.
 */
import { useState } from 'react';
import { copyText } from '@/lib/client';
import { QUESTION_BUNDLE_TEMPLATE, bundleFromQuestions } from '@/lib/questionBundle';
import type { AdminQuestion } from '@/lib/types';
import { Button, Card } from './ui';
import { Icon } from '@/lib/icons';

/** Baja un JSON como archivo sin pasar por el servidor. */
function descargar(nombre: string, valor: unknown) {
  const blob = new Blob([JSON.stringify(valor, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export function QuestionTemplate({ code, questions }: { code: string; questions: AdminQuestion[] }) {
  const [copiado, setCopiado] = useState<'plantilla' | 'banco' | null>(null);

  async function copiar(que: 'plantilla' | 'banco', valor: unknown) {
    if (await copyText(JSON.stringify(valor, null, 2))) {
      setCopiado(que);
      setTimeout(() => setCopiado(null), 1600);
    }
  }

  const banco = bundleFromQuestions(questions);
  const vacio = questions.length === 0;

  return (
    <Card className="p-space-md">
      <p className="flex items-center gap-2 text-label-lg">
        <Icon name="download" className="h-5 w-5 text-primary" />
        Estructura del JSON
      </p>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Obligatorios: <strong className="font-mono">type</strong> (open, multiple o boolean) y{' '}
        <strong className="font-mono">prompt</strong>. En multiple van <strong className="font-mono">options</strong> y{' '}
        <strong className="font-mono">correctOptionKey</strong>; en boolean, <strong className="font-mono">correctOptionKey</strong>{' '}
        con V o F. Lo demas es opcional y toma el valor por omision de la actividad.
      </p>

      <div className="mt-space-md grid gap-2 sm:grid-cols-2">
        <Button icon={copiado === 'plantilla' ? 'check' : 'copy'} onClick={() => copiar('plantilla', QUESTION_BUNDLE_TEMPLATE)}>
          {copiado === 'plantilla' ? 'Copiada' : 'Copiar plantilla'}
        </Button>
        <Button icon="download" onClick={() => descargar(`amai-plantilla.json`, QUESTION_BUNDLE_TEMPLATE)}>
          Descargar plantilla
        </Button>
      </div>

      <p className="mt-space-md border-t-[1.5px] border-outline-variant pt-space-sm text-body-sm text-on-surface-variant">
        Tu banco actual, en esa misma forma: se vuelve a importar sin tocarlo.
      </p>

      <div className="mt-space-sm grid gap-2 sm:grid-cols-2">
        <Button
          icon={copiado === 'banco' ? 'check' : 'copy'}
          disabled={vacio}
          onClick={() => copiar('banco', banco)}
        >
          {copiado === 'banco' ? 'Copiado' : `Copiar banco (${questions.length})`}
        </Button>
        <Button icon="download" disabled={vacio} onClick={() => descargar(`amai-${code}-preguntas.json`, banco)}>
          Exportar banco
        </Button>
      </div>
    </Card>
  );
}
