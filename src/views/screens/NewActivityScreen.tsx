'use client';

/**
 * PANTALLA: crear actividad.
 * Pide lo minimo para abrir la sala; todo lo demas se edita despues en
 * Configuracion de Actividad.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppFooter, AppHeader, Page } from '@/views/components/brand';
import { Button, Card, Field, Input, NumberStepper, Textarea, Toast } from '@/views/components/ui';
import { api, rememberRoom, saveAdminCode } from '@/lib/client';
import { MAX_TEAM_CAPACITY } from '@/lib/teams';

export function NewActivityScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [teamCount, setTeamCount] = useState(4);
  const [teamCapacity, setTeamCapacity] = useState(5);
  const [withSamples, setWithSamples] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const result = await api<{ joinCode: string; adminCode: string }>('/api/activities', {
      method: 'POST',
      body: JSON.stringify({ title, unit, description, teamCount, teamCapacity, withSamples }),
    });

    setSaving(false);
    if (!result.ok || !result.data) {
      setError(result.error ?? 'No se pudo crear la actividad.');
      return;
    }

    saveAdminCode(result.data.joinCode, result.data.adminCode);
    rememberRoom(result.data.joinCode, title);
    router.push(`/admin/${result.data.joinCode}/configuracion`);
  }

  return (
    <>
      <AppHeader />
      <Page>
        <h1 className="text-headline-lg-mobile sm:text-headline-lg">Nueva actividad</h1>
        <p className="mt-1 mb-space-lg text-body-md text-on-surface-variant">
          Se creara la sala con sus codigos de acceso. Los equipos y las preguntas los ajustas enseguida.
        </p>

        <form onSubmit={submit}>
          <Card className="space-y-space-md">
            <Field label="Titulo de la dinamica" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dinamica: Arquitectura de Software y Patrones GoF"
                required
                maxLength={120}
                autoFocus
              />
            </Field>

            <Field label="Unidad o tema" hint="Aparece como etiqueta arriba del titulo.">
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unidad 3 · Patrones y modelado"
                maxLength={80}
              />
            </Field>

            <Field label="Descripcion">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Competencia gamificada por relevos en tiempo real con penalizacion asimetrica."
                maxLength={300}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-space-md border-t-[1.5px] border-outline-variant pt-space-md">
              <NumberStepper label="Equipos" value={teamCount} min={1} max={8} onChange={setTeamCount} />
              <NumberStepper
                label="Cupo por equipo"
                value={teamCapacity}
                min={1}
                max={MAX_TEAM_CAPACITY}
                onChange={setTeamCapacity}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded border-[1.5px] border-outline-variant bg-surface-low p-3">
              <input
                type="checkbox"
                checked={withSamples}
                onChange={(e) => setWithSamples(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[#4f46e5]"
              />
              <span>
                <span className="block text-label-md">Incluir 4 preguntas de ejemplo</span>
                <span className="block text-body-sm text-on-surface-variant">
                  SOLID, patrones GoF y arquitectura hexagonal. Puedes borrarlas o editarlas despues.
                </span>
              </span>
            </label>

            <Button type="submit" variant="primary" size="lg" block hard disabled={saving || !title.trim()} iconRight="arrowRight">
              {saving ? 'Creando sala...' : 'Crear y configurar'}
            </Button>
          </Card>
        </form>
      </Page>
      <AppFooter />
      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}
