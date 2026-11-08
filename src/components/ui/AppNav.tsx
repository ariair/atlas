'use client';

// Top bar: a floating, frosted pill. The logo twists on hover and its name slides out of it; the page
// links sit in the middle; alerts, log in and sign up sit on the right. Log in, sign up and log out come from
// AuthLinks (they appear once Auth0 is configured).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import AlertsMenu from './AlertsMenu';
import AtlasMark from './AtlasMark';
import AuthLinks from './AuthLinks'; // [auth]

const LINKS = [
  { href: '/world', label: 'map' },
  { href: '/study', label: 'study' }, // [study]
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
    if (listRef.current) {
      ro.observe(listRef.current);
      if (listRef.current.parentElement) ro.observe(listRef.current.parentElement);
    }
    document.fonts?.ready.then(place);
    const onResize = () => {
      requestAnimationFrame(place);
      setTimeout(place, 250); // once the links have finished moving
    };
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [pathname]);
  return (
    <header className="nav-enter relative z-20 px-3 pt-3 sm:px-5">
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50">
        skip to main content
      </a>
      <nav
        aria-label="Main"
        className="mx-auto grid h-14 max-w-[1280px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[clamp(0.125rem,1.5vw,1.5rem)] rounded-2xl border border-white/10 bg-surface/70 px-[clamp(0.25rem,1vw,0.75rem)] backdrop-blur-md"
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
        <ul ref={listRef} className="relative flex h-full min-w-0 items-stretch justify-center gap-0 lg:gap-1">
          <span ref={bubbleRef} aria-hidden="true" className="nav-bubble" />
          {LINKS.map(({ href, label }) => {
            const current = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={`nav-link flex min-w-11 items-center px-[clamp(0.3rem,1.1vw,1rem)] ${current ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'}`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="col-start-3 flex shrink-0 items-center justify-self-end gap-[clamp(0.125rem,0.8vw,0.5rem)]">
          {showAlerts && <AlertsMenu />}
          {/* [auth] log in / sign up / log out (inline when wide, an account drop-down when narrow); nothing until Auth0 is configured */}
          <AuthLinks />
        </div>
      </nav>
    </header>
  );
}
