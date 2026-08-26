import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as measurement from './measurement.constants';

/**
 * The convention this enforces: a numeric constant carries its unit in its name.
 * `HEAD_MIN` is ambiguous once it crosses a function boundary and is how a
 * millimetre value ends up compared against a pixel one.
 */
const UNIT_SUFFIXES = [
  // Dimensionless quantities declare themselves as such rather than claiming a
  // unit they do not have.
  'RADIX',
  'SCALE',
  'FACTOR',
  'COUNT',
  'MM',
  'PX',
  'DPI',
  'MS',
  'RATIO',
  'DEGREES',
  'BYTES',
  'DIGITS',
  'INCH',
  'STDDEV',
  'VARIANCE',
  'LUMINANCE',
];

const hasUnitSuffix = (name: string): boolean =>
  UNIT_SUFFIXES.some((suffix) => name.endsWith(`_${suffix}`) || name.includes(`_${suffix}_`));

describe('measurement constants', () => {
  it('converts inches to millimetres using the exact international value', () => {
    expect(measurement.MM_PER_INCH).toBe(25.4);
  });

  it.each(
    Object.entries(measurement).filter(([, value]) => typeof value === 'number'),
  )('%s names its unit', (name) => {
    expect(hasUnitSuffix(name), `${name} must end in a unit suffix`).toBe(true);
  });

  it('keeps the band tolerance far tighter than any published requirement', () => {
    expect(measurement.BAND_TOLERANCE_MM).toBeGreaterThan(0);
    expect(measurement.BAND_TOLERANCE_MM).toBeLessThan(1);
  });
});

describe('analysis and limit constants follow the same convention', () => {
  const sources = ['src/constants/analysis.constants.ts', 'src/constants/limits.constants.ts'];

  it.each(sources)('%s names the unit on every exported number', (path) => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8');
    const exported = [...source.matchAll(/export const ([A-Z0-9_]+)\s*=\s*[\d(]/g)].map(
      (match) => match[1] ?? '',
    );

    expect(exported.length).toBeGreaterThan(0);
    for (const name of exported) {
      expect(hasUnitSuffix(name), `${name} in ${path} must end in a unit suffix`).toBe(true);
    }
  });
});
