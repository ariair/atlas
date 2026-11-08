'use client';

import { useEffect } from 'react';
import { applySettings } from '@/lib/settings';
import { systemPrefersDark, useSettings } from '@/lib/useSettings';

// Keeps <html> in step with the settings: changes from another tab, and the system light/dark switch when theme is "system".
// The first paint is handled by SETTINGS_BOOT_SCRIPT in the root layout.
export default function SettingsApplier() {
  const { settings } = useSettings();

  useEffect(() => {
    applySettings(document.documentElement, settings, systemPrefersDark());
    if (settings.theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applySettings(document.documentElement, settings, systemPrefersDark());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings]);

  return null;
}
