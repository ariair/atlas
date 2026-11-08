import { describe, expect, it } from 'vitest';
import { PALETTES, type ColourVision } from './layout';

// Colour-vision simulation (Machado et al. 2009, severity 1.0) in linear RGB, then CIE Lab distance.
const MATRICES = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(lin); };
function toLab(l: number[]): number[] {
  const [r, g, b] = l;
  const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = xyz.map(f);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const simulate = (hex: string, m: number[][]) => toLab(m.map((row) => Math.max(0, Math.min(1, row[0] * rgb(hex)[0] + row[1] * rgb(hex)[1] + row[2] * rgb(hex)[2]))));
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const minGap = (colors: string[], m: number[][]) => {
  let min = Infinity;
  for (let i = 0; i < colors.length; i++) for (let j = i + 1; j < colors.length; j++) min = Math.min(min, dist(simulate(colors[i], m), simulate(colors[j], m)));
  return min;
};

const TARGETS: Record<ColourVision, (keyof typeof MATRICES)[]> = {
  default: [],
  'red-green': ['protan', 'deutan'],
  'blue-yellow': ['tritan'],
};

describe('subject colour sets', () => {
  for (const [name, types] of Object.entries(TARGETS) as [ColourVision, (keyof typeof MATRICES)[]][]) {
    it(`${name}: every set has 7 valid colours`, () => {
      expect(PALETTES[name]).toHaveLength(7);
      for (const c of PALETTES[name]) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
    for (const t of types) {
      it(`${name}: no two subject colours merge under ${t} vision`, () => {
        expect(minGap(PALETTES[name], MATRICES[t])).toBeGreaterThanOrEqual(15);
      });
    }
  }
});
