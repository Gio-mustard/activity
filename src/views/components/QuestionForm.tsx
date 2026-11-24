'use client';

/**
 * Formulario de pregunta / mini-reto.
 *
 * Los tres tipos comparten estructura y se diferencian en como se califican:
 *  - open     : el equipo pulsa, responde en voz alta y el docente da veredicto.
 *  - multiple : cada equipo elige una opcion en su telefono, se califica solo.
 *  - boolean  : igual que multiple, con opciones fijas Verdadero/Falso.
 */
import { useState } from 'react';
import type { AdminQuestion, Difficulty, QuestionType } from '@/lib/types';
import type { QuestionInput } from '@/controllers/activityController';
import { Button, Card, Field, Input, Select, Textarea, cx } from './ui';
import { Icon } from '@/lib/icons';

const TYPE_LABELS: { value: QuestionType; label: string; hint: string }[] = [
  { value: 'open', label: 'Abierta', hint: 'Pulsador + respuesta verbal' },
  { value: 'multiple', label: 'Opcion multiple', hint: 'Se califica sola' },
  { value: 'boolean', label: 'Verdadero / Falso', hint: 'Ronda relampago' },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function emptyState(initial?: AdminQuestion): QuestionInput {
  return {
    type: initial?.type ?? 'open',
    prompt: initial?.prompt ?? '',
    context: initial?.context ?? '',
    topic: initial?.topic ?? '',
    difficulty: initial?.difficulty ?? 'media',
    options:
      initial?.type === 'multiple' && initial.options.length
        ? initial.options.map((o) => ({ ...o }))
        : [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
            { key: 'D', text: '' },
          ],
    correctOptionKey: initial?.correctOptionKey ?? null,
    suggestedAnswer: initial?.suggestedAnswer ?? '',
    evaluationCriteria: initial?.evaluationCriteria ?? '',
    keywords: initial?.keywords ?? [],
    seconds: initial?.seconds ?? 45,
    points: initial?.points ?? 100,
    penalty: initial?.penalty ?? 20,
    reboundSeconds: initial?.reboundSeconds ?? 15,
    floorSeconds: 15,
    lockTeamAfterWrong: initial?.lockTeamAfterWrong ?? true,
  };
}

export function QuestionForm({
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: AdminQuestion;
  saving?: boolean;
  onSubmit: (input: QuestionInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<QuestionInput>(() => emptyState(initial));
  const set = <K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isClosed = form.type !== 'open';

  return (
    <Card tone="muted" className="space-y-space-md">
      {/* Tipo de reto */}
      <div>
        <span className="mb-1.5 block text-label-md">Tipo de reto</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPE_LABELS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => set('type', option.value)}
              className={cx(
                'rounded border-2 p-3 text-left transition-colors',
                form.type === option.value
                  ? 'border-primary-container bg-primary-fixed'
                  : 'border-outline-variant bg-surface-lowest hover:border-primary-container',
              )}
            >
              <span className="block text-label-md">{option.label}</span>
              <span className="block text-body-sm text-on-surface-variant">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Pregunta" required>
        <Textarea
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="¿Que principio SOLID se vulnera al forzar a un cliente a depender de metodos que no utiliza?"
          maxLength={400}
        />
      </Field>

      <Field label="Contexto" hint="Linea adicional que se muestra bajo la pregunta en el proyector.">
        <Input
          value={form.context ?? ''}
          onChange={(e) => set('context', e.target.value)}
          placeholder="Interfaces monoliticas vs. interfaces segregadas."
          maxLength={240}
        />
      </Field>

      <div className="grid gap-space-sm sm:grid-cols-2">
        <Field label="Tema / etiqueta">
          <Input
            value={form.topic ?? ''}
            onChange={(e) => set('topic', e.target.value)}
            placeholder="ARQUITECTURA-SOLID-ISP"
            maxLength={60}
            className="font-mono text-body-sm"
          />
        </Field>
        <Field label="Dificultad">
          <Select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </Select>
        </Field>
      </div>

      {/* Opciones */}
      {form.type === 'multiple' ? (
        <div>
          <span className="mb-1.5 block text-label-md">
            Opciones <span className="text-on-surface-variant">(marca la correcta)</span>
          </span>
          <div className="space-y-2">
            {(form.options ?? []).map((option, index) => (
              <div key={option.key} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Marcar ${option.key} como correcta`}
                  onClick={() => set('correctOptionKey', option.key)}
                  className={cx(
                    'grid h-10 w-10 shrink-0 place-items-center rounded border-2 text-label-lg',
                    form.correctOptionKey === option.key
                      ? 'border-secondary bg-secondary text-on-secondary'
                      : 'border-outline-variant bg-surface-lowest',
                  )}
                >
                  {form.correctOptionKey === option.key ? <Icon name="check" className="h-4 w-4" /> : option.key}
                </button>
                <Input
                  value={option.text}
                  onChange={(e) => {
                    const next = [...(form.options ?? [])];
                    next[index] = { ...option, text: e.target.value };
                    set('options', next);
                  }}
                  placeholder={`Opcion ${option.key}`}
                  maxLength={160}
                />
                {(form.options?.length ?? 0) > 2 ? (
                  <button
                    type="button"
                    aria-label={`Quitar opcion ${option.key}`}
                    onClick={() => {
                      const next = (form.options ?? [])
                        .filter((_, i) => i !== index)
                        .map((o, i) => ({ ...o, key: LETTERS[i] }));
                      set('options', next);
                      if (form.correctOptionKey === option.key) set('correctOptionKey', null);
                    }}
                    className="shrink-0 rounded p-2 text-on-surface-variant hover:bg-surface-container"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {(form.options?.length ?? 0) < 5 ? (
            <Button
              size="sm"
              icon="plus"
              className="mt-2"
              onClick={() =>
                set('options', [...(form.options ?? []), { key: LETTERS[form.options?.length ?? 0], text: '' }])
              }
            >
              Agregar opcion
            </Button>
          ) : null}
        </div>
      ) : null}

      {form.type === 'boolean' ? (
        <div>
          <span className="mb-1.5 block text-label-md">La afirmacion es...</span>
          <div className="flex gap-2">
            {[
              { key: 'V', label: 'Verdadera' },
              { key: 'F', label: 'Falsa' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => set('correctOptionKey', option.key)}
                className={cx(
                  'flex-1 rounded border-2 py-3 text-label-lg transition-colors',
                  form.correctOptionKey === option.key
                    ? 'border-secondary bg-secondary text-on-secondary'
                    : 'border-outline-variant bg-surface-lowest hover:border-primary-container',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Field
        label={isClosed ? 'Explicacion que se muestra al revelar' : 'Respuesta sugerida (solo la ve el docente)'}
        required={!isClosed}
      >
        <Textarea
          value={form.suggestedAnswer ?? ''}
          onChange={(e) => set('suggestedAnswer', e.target.value)}
          placeholder="Interface Segregation Principle (ISP)"
          maxLength={400}
        />
      </Field>

      {!isClosed ? (
        <Field label="Criterio de aprobacion verbal" hint="Tu guia para decidir si la respuesta cuenta como correcta.">
          <Textarea
            value={form.evaluationCriteria ?? ''}
            onChange={(e) => set('evaluationCriteria', e.target.value)}
            placeholder="Debe explicitar que ninguna clase debe implementar interfaces que no utiliza."
            maxLength={400}
          />
        </Field>
      ) : null}

      {/* Reglas de la pregunta */}
      <div className="grid gap-space-sm border-t-[1.5px] border-outline-variant pt-space-md sm:grid-cols-4">
        <Field label="Segundos">
          <Input
            type="number"
            min={5}
            max={600}
            value={form.seconds}
            onChange={(e) => set('seconds', Number(e.target.value))}
            className="tabular"
          />
        </Field>
        <Field label="Puntos">
          <Input
            type="number"
            min={0}
            value={form.points}
            onChange={(e) => set('points', Number(e.target.value))}
            className="tabular"
          />
        </Field>
        <Field label="Penalizacion">
          <Input
            type="number"
            min={0}
            value={form.penalty}
            onChange={(e) => set('penalty', Number(e.target.value))}
            className="tabular"
          />
        </Field>
        <Field label="Rebote (seg)">
          <Input
            type="number"
            min={0}
            max={300}
            value={form.reboundSeconds}
            onChange={(e) => set('reboundSeconds', Number(e.target.value))}
            className="tabular"
          />
        </Field>
      </div>

      {!isClosed ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded border-[1.5px] border-outline-variant bg-surface-lowest p-3">
          <input
            type="checkbox"
            checked={form.lockTeamAfterWrong ?? true}
            onChange={(e) => set('lockTeamAfterWrong', e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[#4f46e5]"
          />
          <span>
            <span className="block text-label-md">Bloquear al equipo que falla</span>
            <span className="block text-body-sm text-on-surface-variant">
              Si lo desactivas, un equipo que fallo puede volver a pulsar en el rebote de esta pregunta.
            </span>
          </span>
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t-[1.5px] border-outline-variant pt-space-md">
        <Button variant="primary" hard disabled={saving || !form.prompt.trim()} onClick={() => onSubmit(form)}>
          {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Agregar al banco'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
