// Display settings (theme, text size, font, map options). Stored in this browser only (localStorage).
// A tiny boot script applies them before the page paints, so there is no flash of the wrong theme.
import { z } from 'zod';

export const SETTINGS_KEY = 'atlas-settings-v1';
export const SETTINGS_EVENT = 'atlas-settings-change';

// Each field falls back to its default on its own, so one bad value never resets everything.
const field = <T extends z.ZodType>(schema: T, fallback: z.infer<T>) => schema.catch(fallback as never).default(fallback as never);

export const SettingsSchema = z.object({
  theme: field(z.enum(['dark', 'light', 'system']), 'dark'), // PRD: dark by default
  textSize: field(z.enum(['default', 'large', 'xlarge']), 'default'),
  font: field(z.enum(['default', 'atkinson']), 'default'),
  spacing: field(z.enum(['default', 'relaxed']), 'default'),
  colourVision: field(z.enum(['default', 'red-green', 'blue-yellow']), 'default'), // subject colour set, read by the map, key and cards
  contrast: field(z.enum(['default', 'high']), 'default'),
  motion: field(z.enum(['system', 'off']), 'system'), // 'off' freezes the map and animations
  nodeNames: field(z.enum(['hover', 'zoom', 'always']), 'hover'),
  showSuggested: field(z.boolean(), true),
  hiddenSubjects: field(z.array(z.string().max(80)).max(50), [] as string[]),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

export function parseSettings(raw: unknown): Settings {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return SettingsSchema.parse(obj);
}

export function resolveTheme(theme: Settings['theme'], systemPrefersDark: boolean): 'dark' | 'light' {
  return theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;
}

/** The attributes put on <html>. The CSS in globals.css reads these. */
export function settingsToAttributes(s: Settings, systemPrefersDark: boolean): Record<string, string> {
  return {
    'data-theme': resolveTheme(s.theme, systemPrefersDark),
    'data-text-size': s.textSize,
    'data-font': s.font,
    'data-spacing': s.spacing,
    'data-contrast': s.contrast,
    'data-motion': s.motion,
  };
}

export function applySettings(root: { setAttribute(name: string, value: string): void; style?: { colorScheme: string } }, s: Settings, systemPrefersDark: boolean) {
  const attrs = settingsToAttributes(s, systemPrefersDark);
  for (const [k, v] of Object.entries(attrs)) root.setAttribute(k, v);
  if (root.style) root.style.colorScheme = attrs['data-theme'];
}

/**
 * Runs in <head> before first paint. Plain JavaScript on purpose (it is inlined into the page), and kept in step with
 * settingsToAttributes by a test. Never throws: if anything is wrong the page just keeps the dark default.
 */
export const SETTINGS_BOOT_SCRIPT = `(function(){try{
var d=document.documentElement,raw=null,s={};
try{raw=localStorage.getItem(${JSON.stringify(SETTINGS_KEY)});if(raw)s=JSON.parse(raw)||{};}catch(e){}
function pick(v,allowed,def){return allowed.indexOf(v)>-1?v:def;}
var theme=pick(s.theme,['dark','light','system'],'dark');
if(theme==='system'){theme=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}
d.setAttribute('data-theme',theme);
d.setAttribute('data-text-size',pick(s.textSize,['default','large','xlarge'],'default'));
d.setAttribute('data-font',pick(s.font,['default','atkinson'],'default'));
d.setAttribute('data-spacing',pick(s.spacing,['default','relaxed'],'default'));
d.setAttribute('data-contrast',pick(s.contrast,['default','high'],'default'));
d.setAttribute('data-motion',pick(s.motion,['system','off'],'system'));
d.style.colorScheme=theme;
}catch(e){}})();`;

export function readStoredSettings(storage: Pick<Storage, 'getItem'> | null): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    return parseSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return DEFAULT_SETTINGS;
  }
}
