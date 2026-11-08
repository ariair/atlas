'use client';

// Top bar for the app pages: wordmark, page links, and a skip link to the main content.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AtlasMark from './AtlasMark';

// Study joins this list when its page ships (prompt 4A); linking it now would lead to a 404.
const LINKS = [
  { href: '/world', label: 'map' },
  { href: '/upload', label: 'upload' },
  { href: '/deadlines', label: 'deadlines' },
  { href: '/settings', label: 'settings' },
];

export default function AppNav() {
  const pathname = usePathname();
  return (
    <header className="relative z-20 border-b border-white/[0.06] bg-ground/80 backdrop-blur-md">
      <a
        href="#main"
        className="btn btn-primary absolute left-4 top-2 z-50 -translate-y-24 focus:translate-y-0"
      >
        skip to main content
      </a>
      <nav aria-label="Main" className="flex h-14 items-center gap-3 px-3 sm:gap-6 sm:px-5">
        <Link href="/" className="flex min-h-11 min-w-11 items-center justify-center gap-2.5 rounded-md text-[1.375rem] font-semibold tracking-[-0.02em]">
          <AtlasMark />
          <span className="sr-only sm:not-sr-only">atlas</span>
        </Link>
        <ul className="flex h-full items-stretch gap-0 sm:gap-1">
          {LINKS.map(({ href, label }) => {
            const current = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={`relative flex min-w-11 items-center px-3 ${
                    current ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {label}
                  {/* The current page: a 2px bar under its word (taste skill: one quiet indicator). */}
                  {current && (
                    <span aria-hidden="true" className="absolute inset-x-3 bottom-2 h-[2px] rounded-full bg-ink" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
