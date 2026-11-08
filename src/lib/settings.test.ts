import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_BOOT_SCRIPT, SETTINGS_KEY, applySettings, parseSettings, readStoredSettings, resolveTheme, settingsToAttributes } from './settings';

describe('parseSettings', () => {
  it('gives dark-theme defaults for nothing', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings([1, 2])).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({ theme: 'dark', nodeNames: 'hover', showSuggested: true, motion: 'system', hiddenSubjects: [] });
  });
  it('keeps valid fields', () => {
    const s = parseSettings({ theme: 'light', textSize: 'xlarge', font: 'atkinson', nodeNames: 'always', showSuggested: false, hiddenSubjects: ['Biology'] });
    expect(s).toMatchObject({ theme: 'light', textSize: 'xlarge', font: 'atkinson', nodeNames: 'always', showSuggested: false, hiddenSubjects: ['Biology'] });
  });
  it('replaces only the bad fields, not everything', () => {
    const s = parseSettings({ theme: 'neon', textSize: 'large', showSuggested: 'yes', hiddenSubjects: 'Biology' });
    expect(s.theme).toBe('dark');
    expect(s.textSize).toBe('large');
    expect(s.showSuggested).toBe(true);
    expect(s.hiddenSubjects).toEqual([]);
  });
});

describe('theme and attributes', () => {
  it('resolves system theme from the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('maps settings to html attributes', () => {
    expect(settingsToAttributes(parseSettings({ theme: 'light', font: 'atkinson', contrast: 'high' }), true)).toEqual({
      'data-theme': 'light', 'data-text-size': 'default', 'data-font': 'atkinson', 'data-spacing': 'default', 'data-contrast': 'high', 'data-motion': 'system',
    });
  });
  it('applySettings writes the attributes and the color scheme', () => {
    const set: Record<string, string> = {};
    const root = { setAttribute: (k: string, v: string) => void (set[k] = v), style: { colorScheme: '' } };
    applySettings(root, parseSettings({ theme: 'light' }), true);
    expect(set['data-theme']).toBe('light');
    expect(root.style.colorScheme).toBe('light');
  });
});

describe('readStoredSettings', () => {
  it('reads valid stored JSON and survives garbage or missing storage', () => {
    expect(readStoredSettings({ getItem: () => JSON.stringify({ theme: 'light' }) }).theme).toBe('light');
    expect(readStoredSettings({ getItem: () => '{not json' })).toEqual(DEFAULT_SETTINGS);
    expect(readStoredSettings({ getItem: () => { throw new Error('blocked'); } })).toEqual(DEFAULT_SETTINGS);
    expect(readStoredSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

// The boot script must set exactly what settingsToAttributes would, or the page would flash when React takes over.
describe('boot script', () => {
  function run(stored: unknown, prefersLight = false, storageThrows = false) {
    const attrs: Record<string, string> = {};
    const root = { setAttribute: (k: string, v: string) => void (attrs[k] = v), style: { colorScheme: '' } };
    const sandbox = {
      document: { documentElement: root },
      window: { matchMedia: () => ({ matches: prefersLight }) },
      localStorage: { getItem: (k: string) => { if (storageThrows) throw new Error('blocked'); return k === SETTINGS_KEY && stored !== undefined ? JSON.stringify(stored) : null; } },
    };
    vm.runInNewContext(SETTINGS_BOOT_SCRIPT, sandbox);
    return { attrs, scheme: root.style.colorScheme };
  }
  const cases: unknown[] = [undefined, {}, { theme: 'light' }, { theme: 'system' }, { textSize: 'xlarge', font: 'atkinson', spacing: 'relaxed', contrast: 'high', motion: 'off' }, { theme: 'bogus', textSize: 7 }];
  for (const stored of cases) {
    for (const prefersLight of [false, true]) {
      it(`matches settingsToAttributes for ${JSON.stringify(stored)} (OS light=${prefersLight})`, () => {
        const { attrs } = run(stored, prefersLight);
        expect(attrs).toEqual(settingsToAttributes(parseSettings(stored), !prefersLight));
      });
    }
  }
  it('sets the color scheme and never throws when storage is blocked', () => {
    expect(run({ theme: 'light' }).scheme).toBe('light');
    const { attrs } = run(undefined, false, true);
    expect(attrs['data-theme']).toBe('dark');
  });
});
