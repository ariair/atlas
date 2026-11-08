// Subject colours are tuned for the dark map. On the light theme they are darkened so dots and lines stay visible.
export function darken(hex: string, factor = 0.72): string {
  const n = parseInt(hex.slice(1), 16);
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const c = (v: number) => Math.round(v * factor).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

export const toneFor = (hex: string, light: boolean) => (light ? darken(hex) : hex);

/** Shorten a label for drawing on the map. */
export function shortLabel(label: string, max = 26): string {
  return label.length > max ? `${label.slice(0, max - 1).trimEnd()}…` : label;
}
