'use client';

import { useEffect, useState } from 'react';

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';

// Shown whenever demo mode is on. Turns it on from ?demo=1 (remembered in a cookie so it follows you between pages).
export default function DemoBadge() {
  const [demo, setDemo] = useState(false);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    // Runs before the page's own effects (this component comes first in the layout), so data requests see the cookie.
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      document.cookie = 'atlas_demo=1; Path=/; Max-Age=86400; SameSite=Lax';
    }
    fetch('/api/demo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.demo) {
          setDemo(true);
          setForced(Boolean(d.forced));
        }
      })
      .catch(() => {});
  }, []);

  function exit() {
    for (const name of ['atlas_demo', 'atlas_demo_samples']) document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    window.location.href = window.location.pathname;
  }

  if (!demo) return null;
  return (
    <div role="status" aria-live="polite" className="border-b-2 border-black bg-sky-100 px-4 py-2 text-lg text-black">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p>
          <strong>Demo mode.</strong> You are looking at sample data. Nothing is saved and no login is needed.
        </p>
        {!forced && (
          <button type="button" onClick={exit} className={`min-h-11 rounded-md border-2 border-black px-4 font-medium ${focus}`}>
            Exit demo mode
          </button>
        )}
      </div>
    </div>
  );
}
