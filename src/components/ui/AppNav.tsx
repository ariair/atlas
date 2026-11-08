'use client';

// Top bar: a floating, frosted pill. The logo twists on hover and its name slides out of it; the page
// links sit in the middle; alerts, log in and sign up sit on the right. Log in, sign up and log out come from
// AuthLinks (they appear once Auth0 is configured).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AlertsMenu from './AlertsMenu';
import AtlasMark from './AtlasMark';
import AuthLinks from './AuthLinks'; // [auth]

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
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false); // the three-bar menu used on narrow screens

  // Close the menu on Escape or a click outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menuOpen]);

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
    <header className="nav-enter relative z-40 px-3 pt-3 sm:px-5">
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
        <ul ref={listRef} className="relative hidden h-full min-w-0 items-stretch justify-center gap-0 sm:flex lg:gap-1">
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
          {/* [auth] log in / sign up / log out, in the bar on wide windows (inactive until Auth0 is configured) */}
          <AuthLinks />
          {/* Narrow screens: every page link and the account buttons fold into a three-bar menu at the far right, which leaves room for more pages (like study). */}
          <div ref={menuRef} className="relative sm:hidden">
            <button type="button" className="map-btn" aria-label="Menu" aria-expanded={menuOpen} aria-controls="nav-menu" onClick={() => setMenuOpen((o) => !o)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
              </svg>
            </button>
            <div
              id="nav-menu"
              role="region"
              aria-label="Menu"
              data-open={menuOpen}
              style={{ '--pop-origin': '100% 0%' } as React.CSSProperties}
              className="pop-panel absolute right-0 top-[calc(100%+10px)] z-30 flex w-[min(16rem,calc(100vw-2rem))] flex-col gap-1 rounded-xl border border-white/10 bg-surface p-2 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              {LINKS.map(({ href, label }, i) => {
                const current = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    tabIndex={menuOpen ? 0 : -1}
                    aria-current={current ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                    style={{ '--i': i } as React.CSSProperties}
                    className={`pop-item flex min-h-11 items-center rounded-lg px-3 ${current ? 'bg-white/10 font-medium text-ink' : 'text-ink-muted'}`}
                  >
                    {label}
                  </Link>
                );
              })}
              <div className="mt-1 flex gap-2 border-t border-rule pt-2">
                <AuthLinks variant="menu" />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
