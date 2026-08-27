import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every `var(--tk-…)` in the codebase must name a token that exists.
 *
 * The existing parity test checks one direction — that every registered token
 * is declared — and that direction is the one that never fails. This is the
 * other direction, and it is the one that does: a component referencing
 * `--tk-primary` when the token is called `--tk-accent` does not fail to
 * build, does not fail lint, and does not fail stylelint. It silently falls
 * back, or renders nothing, and the state it was styling is invisible.
 *
 * That is not hypothetical. The upload zone's drag highlight shipped through
 * review naming three tokens that do not exist, and the only reason it was
 * caught was somebody looking at a screenshot.
 *
 * A `var(--x, fallback)` reference is held to the same standard. The fallback
 * makes the mistake harder to see, not less of one.
 */

const STYLE_ROOT = resolve(process.cwd(), 'src/styles');
const SOURCE_ROOT = resolve(process.cwd(), 'src');

const cssFilesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return cssFilesUnder(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });

const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

const declaredTokens = new Set<string>();
for (const file of cssFilesUnder(STYLE_ROOT)) {
  for (const match of withoutComments(readFileSync(file, 'utf8')).matchAll(
    /(--tk-[a-z0-9-]+)\s*:/g,
  )) {
    if (match[1] !== undefined) declaredTokens.add(match[1]);
  }
}

interface TokenReference {
  readonly file: string;
  readonly token: string;
}

const references: TokenReference[] = [];
const withFallback: TokenReference[] = [];
for (const file of cssFilesUnder(SOURCE_ROOT)) {
  const source = withoutComments(readFileSync(file, 'utf8'));
  for (const match of source.matchAll(/var\(\s*(--tk-[a-z0-9-]+)\s*(,?)/g)) {
    if (match[1] === undefined) continue;
    const reference = { file: relative(process.cwd(), file), token: match[1] };
    references.push(reference);
    if (match[2] === ',') withFallback.push(reference);
  }
}

describe('token references', () => {
  it('finds tokens to check, so the suite cannot pass vacuously', () => {
    expect(declaredTokens.size).toBeGreaterThan(0);
    expect(references.length).toBeGreaterThan(0);
  });

  it('names only tokens the stylesheet declares', () => {
    const unknown = references.filter((reference) => !declaredTokens.has(reference.token));

    // Reported as the full list rather than one at a time: a rename touches
    // every reference at once, and fixing them one test run at a time is how
    // that becomes a morning.
    expect(unknown).toEqual([]);
  });

  it('carries no fallback value, which is what turns a typo into a near-miss', () => {
    // With the assertion above in place, a token is guaranteed to exist, so a
    // fallback can never be used — it is dead code. Worse than dead: all three
    // of the wrong names this test was written for had one, and a fallback is
    // precisely why each of them rendered something plausible instead of
    // nothing at all, which is what would have made them obvious.
    expect(withFallback).toEqual([]);
  });
});
