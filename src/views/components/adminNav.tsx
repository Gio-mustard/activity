'use client';

/** Navegacion entre las tres pantallas del docente. Colapsa en movil. */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from './ui';

const TABS = [
  { slug: 'configuracion', label: 'Configuracion de Actividad', short: 'Configurar' },
  { slug: 'consola', label: 'Consola en Vivo', short: 'Consola' },
  { slug: 'podio', label: 'Podio y Resultados', short: 'Podio' },
];

export function AdminTabs({ code }: { code: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-full border-[1.5px] border-outline-variant bg-surface-low p-1 no-scrollbar">
      {TABS.map((tab) => {
        const href = `/admin/${code}/${tab.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={cx(
              'shrink-0 rounded-full px-3 py-1.5 text-label-md transition-colors sm:px-4',
              active ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
