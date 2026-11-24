'use client';

/**
 * PANTALLA DE INICIO.
 * Dos caminos: el docente crea una sala, el alumno entra con su codigo.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppFooter, AppHeader, Page } from '@/views/components/brand';
import { Button, Card, Field, Input, Pill, Toast } from '@/views/components/ui';
import { Icon } from '@/lib/icons';
import { normalizeCode } from '@/lib/codes';
import { api, recentRooms, rememberRoom, saveAdminCode } from '@/lib/client';
import type { AdminAccess } from '@/controllers/activityController';

export function HomeScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [rooms, setRooms] = useState<{ code: string; title: string }[]>([]);

  // Vuelta a una sala ya creada, desde otro navegador o tras limpiar el equipo.
  const [managing, setManaging] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setRooms(recentRooms()), []);

  function enter(event: React.FormEvent) {
    event.preventDefault();
    const clean = normalizeCode(code);
    if (clean) router.push(`/unirse/${clean}`);
  }

  /**
   * Acepta el codigo de administrador o el de la sala. Con el primero entra
   * directo; con el segundo, la consola le pedira el de administrador.
   */
  async function openRoom(event: React.FormEvent) {
    event.preventDefault();
    setOpening(true);
    setError(null);

    const result = await api<AdminAccess>('/api/admin/resolve', {
      method: 'POST',
      body: JSON.stringify({ code: adminInput }),
    });

    setOpening(false);
    if (!result.ok || !result.data) {
      setError(result.error ?? 'No se pudo abrir la sala.');
      return;
    }

    const { joinCode, adminCode, title, status } = result.data;
    if (adminCode) saveAdminCode(joinCode, adminCode);
    rememberRoom(joinCode, title);
    // En vivo se vuelve a la consola; en borrador, a terminar de configurar.
    router.push(`/admin/${joinCode}/${status === 'live' ? 'consola' : 'configuracion'}`);
  }

  return (
    <>
      <AppHeader />
      <Page>
        <div className="mb-space-lg">
          <Pill tone="primary">Fundamentos de Ingenieria de Software</Pill>
          <h1 className="mt-space-sm text-headline-xl-mobile sm:text-headline-xl">
            Competencia por equipos, <span className="text-primary">en tiempo real</span> y asi.
          </h1>
          <div className="py-8">

          </div>
        </div>

        <div className="grid gap-space-md sm:grid-cols-2">
          <Card>
            <h2 className="flex items-center gap-2 text-headline-sm">
              <Icon name="user" className="h-5 w-5 text-primary" />
              Soy participante
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Escribe el codigo que proyecta tu profesor, o el de tu equipo para entrar directo.
            </p>
            <form onSubmit={enter} className="mt-space-md space-y-space-sm">
              <Field label="Codigo de acceso">
                {/* El anillo doble late hasta que alguien enfoca el campo:
                    es donde arranca todo el flujo del alumno, y al abrir la
                    pagina conviene que la vista caiga ahi. Son decorativos. */}
                <span className="ripple-host">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="FSW-7KQ2"
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="font-mono tracking-widest"
                    inputMode="text"
                  />
                  <span aria-hidden className="ripple-ring" />
                  <span aria-hidden className="ripple-ring ripple-ring-delayed" />
                </span>
              </Field>
              <Button type="submit" variant="primary" size="lg" block hard iconRight="arrowRight" disabled={!code.trim()}>
                Entrar a la sala
              </Button>
            </form>
          </Card>

          <Card tone="muted" className='flex flex-col  justify-between '>
            <div>
              <h2 className="flex items-center gap-2 text-headline-sm">
                <Icon name="settings" className="h-5 w-5 text-primary" />
                Soy administrador
              </h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Crea la actividad, arma los equipos y el banco de preguntas antes de la clase.
              </p>
            </div>
            <div className="mt-space-md space-y-space-sm">
              <Link href="/admin/nueva">
                <Button variant="primary" size="lg" block hard icon="plus">
                  Crear actividad
                </Button>
              </Link>

              {!managing ? (
                <Button block icon="key" onClick={() => setManaging(true)}>
                  Administrar una sala existente
                </Button>
              ) : (
                <form onSubmit={openRoom} className="space-y-space-sm">
                  <Field
                    label="Codigo de administrador"
                    hint="Tambien sirve el codigo de la sala; en ese caso te pedira el de administrador al entrar."
                  >
                    <Input
                      value={adminInput}
                      onChange={(e) => setAdminInput(e.target.value.toUpperCase())}
                      placeholder="K4TP-9RMZ"
                      autoCapitalize="characters"
                      autoComplete="off"
                      className="font-mono tracking-widest"
                      autoFocus
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      hard
                      className="flex-1"
                      disabled={opening || !adminInput.trim()}
                      iconRight="arrowRight"
                    >
                      {opening ? 'Abriendo...' : 'Abrir sala'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setManaging(false);
                        setAdminInput('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {rooms.length > 0 ? (
              <div className="mt-space-md border-t-[1.5px] border-outline-variant pt-space-md">
                <p className="mb-2 text-label-sm uppercase text-on-surface-variant">Tus salas recientes</p>
                <ul className="space-y-1.5">
                  {rooms.map((room) => (
                    <li key={room.code}>
                      <Link
                        href={`/admin/${room.code}/configuracion`}
                        className="flex items-center justify-between rounded border-[1.5px] border-outline-variant bg-surface-lowest px-3 py-2 text-body-sm hover:border-primary-container"
                      >
                        <span className="truncate">{room.title}</span>
                        <span className="ml-2 shrink-0 font-mono text-label-sm text-primary">{room.code}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>
      </Page>
      <AppFooter />
      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}
