'use client';

// Top bar: a floating, frosted pill. The logo twists on hover and its name slides out of it; the page
// links sit in the middle; alerts, log in and sign up sit on the right. Log in and sign up are inactive
// until Auth0 is ready (aria-disabled, no link).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import AlertsMenu from './AlertsMenu';
import AtlasMark from './AtlasMark';

// Study joins this list when its page ships (prompt 4A); linking it now would lead to a 404.
const LINKS = [
  { href: '/world', label: 'map' },
  { href: '/upload', label: 'upload' },
  { href: '/deadlines', label: 'deadlines' },
  { href: '/settings', label: 'settings' },
];

export default function AppNav({ showAlerts = true }: { showAlerts?: boolean }) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  // Slide the bubble under the current page's link. It moves by changing left and width, so
  // clicking another link glides it across; on pages with no link (landing) it fades out.
  useEffect(() => {
    const place = () => {
      const list = listRef.current;
      const bubble = bubbleRef.current;
      if (!list || !bubble) return;
      const cur = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!cur) {
        bubble.style.opacity = '0';
        return;
      }
      bubble.style.opacity = '1';
      bubble.style.width = `${cur.offsetWidth}px`;
      bubble.style.transform = `translateX(${cur.offsetLeft}px)`;
    };
    place();
    // The links move when fonts load or the window resizes, so measure again then.
    const ro = new ResizeObserver(place);
    if (listRef.current) ro.observe(listRef.current);
    document.fonts?.ready.then(place);
    return () => ro.disconnect();
  }, [pathname]);
  return (
    <header className="nav-enter relative z-20 px-3 pt-3 sm:px-5">
      <a href="#main" className="btn btn-primary absolute left-4 top-2 z-50 -translate-y-24 focus:translate-y-0">
        skip to main content
      </a>
      <nav
        aria-label="Main"
        className="mx-auto grid h-14 max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl border border-white/10 bg-surface/70 px-2 backdrop-blur-md sm:gap-6 sm:px-3"
      >
        <Link
          href="/"
          aria-label="atlas, home"
          className="logo-link flex min-h-11 min-w-11 items-center gap-1.5 rounded-xl px-1.5 text-[1.375rem] font-medium tracking-[-0.02em]"
        >
          <AtlasMark className="logo-mark shrink-0" />
          <span aria-hidden="true" className="logo-word">
            <span>atlas</span>
          </span>
        </Link>
        <ul ref={listRef} className="relative flex h-full items-stretch justify-start gap-0 sm:justify-center sm:gap-1">
          <span ref={bubbleRef} aria-hidden="true" className="nav-bubble" />
          {LINKS.map(({ href, label }) => {
            const current = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={`nav-link flex min-w-11 items-center px-3 sm:px-4 ${current ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'}`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {showAlerts && <AlertsMenu />}
          <button type="button" aria-disabled="true" title="coming soon" className="btn relative hidden min-h-9 rounded-full border-transparent bg-transparent px-3.5 after:absolute after:-inset-1 after:content-[''] sm:inline-flex">
            log in
          </button>
          <button type="button" aria-disabled="true" title="coming soon" className="btn btn-primary relative hidden min-h-9 rounded-full px-4 after:absolute after:-inset-1 after:content-[''] sm:inline-flex">
            sign up
          </button>
        </div>
      </nav>
    </header>
  );
}
