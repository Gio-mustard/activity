'use client';

/**
 * Puerta de administrador.
 *
 * No hay cuentas: quien tenga el codigo de admin de la sala entra. El codigo
 * se guarda en localStorage de este navegador, asi que el docente lo teclea
 * una sola vez; si abre la consola en otra maquina, se lo vuelve a pedir.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppHeader, Page } from './brand';
import { Button, Card, Field, Input, Toast } from './ui';
import { api, adminHeaders, loadAdminCode, saveAdminCode } from '@/lib/client';

export function AdminGate({ code, children }: { code: string; children: (adminCode: string) => ReactNode }) {
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(
    async (candidate: string) => {
      const result = await api(`/api/activities/${code}`, { headers: adminHeaders(candidate) });
      return result.ok;
    },
    [code],
  );

  useEffect(() => {
    const stored = loadAdminCode(code);
    if (!stored) {
      setChecking(false);
      return;
    }
    verify(stored).then((valid) => {
      if (valid) setAdminCode(stored);
      setChecking(false);
    });
  }, [code, verify]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const candidate = draft.trim().toUpperCase();
    setError(null);
    setChecking(true);
    const valid = await verify(candidate);
    setChecking(false);
    if (!valid) {
      setError('Ese codigo no abre esta sala.');
      return;
    }
    saveAdminCode(code, candidate);
    setAdminCode(candidate);
  }

  if (adminCode) return <>{children(adminCode)}</>;

  return (
    <>
      <AppHeader code={code} />
      <Page>
        <Card className="mx-auto max-w-md">
          <h1 className="text-headline-md">Codigo de administrador</h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Este navegador todavia no tiene permiso sobre la sala <strong className="font-mono">{code}</strong>.
            Pega el codigo que te dio la app al crear la actividad.
          </p>
          <form onSubmit={submit} className="mt-space-md space-y-space-sm">
            <Field label="Codigo de administrador" required>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                placeholder="K4TP-9RMZ"
                className="font-mono tracking-widest"
                autoFocus
                autoComplete="off"
              />
            </Field>
            <Button type="submit" variant="primary" size="lg" block hard disabled={checking || !draft.trim()}>
              {checking ? 'Verificando...' : 'Entrar a la consola'}
            </Button>
          </form>
        </Card>
      </Page>
      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}
