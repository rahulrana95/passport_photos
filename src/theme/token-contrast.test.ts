import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, WCAG_AA_NORMAL_TEXT } from './colour-contrast.utils';

// Parsed from source for the same reason tokens-parity.test.ts does it: jsdom
// does not evaluate prefers-color-scheme, so the system-default block — the
// state most likely to be broken — is invisible to a computed-style test.
const stylesheet = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

const tokensInBlock = (blockSelector: string): Map<string, string> => {
  const start = stylesheet.indexOf(blockSelector);
  if (start === -1) throw new Error(`Block not found in tokens.css: ${blockSelector}`);

  const open = stylesheet.indexOf('{', start);
  const body = stylesheet.slice(open + 1, stylesheet.indexOf('}', open));

  const declarations = new Map<string, string>();
  for (const line of body.split('\n')) {
    const match = /^\s*(--tk-[a-z0-9-]+)\s*:\s*(.+?);/.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      declarations.set(match[1], match[2].trim());
    }
  }
  return declarations;
};

/** Every surface a foreground token is allowed to land on. */
const SURFACE_TOKENS = ['--tk-ground', '--tk-surface', '--tk-sunken'] as const;

/**
 * Every token used as text or as an icon carrying meaning.
 *
 * The status colours are here because a status is never colour alone — it is
 * an icon plus a label, and the label is text on one of the surfaces below.
 */
const FOREGROUND_TOKENS = [
  '--tk-text-primary',
  '--tk-text-secondary',
  '--tk-text-tertiary',
  '--tk-accent',
  '--tk-status-pass',
  '--tk-status-warn',
  '--tk-status-fail',
  '--tk-status-manual',
] as const;

const LIGHT = tokensInBlock(':root {');
const EXPLICIT_DARK = tokensInBlock("[data-mantine-color-scheme='dark']");
const SYSTEM_DARK = tokensInBlock(":root:not([data-mantine-color-scheme='light'])");

const valueIn = (theme: Map<string, string>, token: string): string => {
  const value = theme.get(token) ?? LIGHT.get(token);
  if (value === undefined) throw new Error(`Token never declared: ${token}`);
  return value;
};

const THEMES = [
  { name: 'light', tokens: LIGHT },
  { name: 'explicit dark', tokens: EXPLICIT_DARK },
  { name: 'system dark', tokens: SYSTEM_DARK },
] as const;

describe('every text token clears WCAG AA on every surface it can land on', () => {
  // Lighthouse only measures what the one page it visits happens to render.
  // It caught --tk-text-tertiary on white at 4.34 and nothing else, while
  // status-warn sat at 3.94 on the sunken surface, unrendered and unreported.
  // This is the check that does not depend on a component existing yet.
  for (const theme of THEMES) {
    for (const foreground of FOREGROUND_TOKENS) {
      for (const surface of SURFACE_TOKENS) {
        it(`${theme.name}: ${foreground} on ${surface}`, () => {
          const ratio = contrastRatio(
            valueIn(theme.tokens, foreground),
            valueIn(theme.tokens, surface),
          );

          expect(
            ratio,
            `${foreground} on ${surface} in ${theme.name} is ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
        });
      }
    }
  }
});

describe('the text scale stays legible as a hierarchy', () => {
  it('secondary is quieter than primary, and tertiary quieter still', () => {
    // Fixing a contrast failure by darkening a token can flatten the hierarchy
    // it existed to express. This asserts the ordering survives the fix.
    for (const theme of THEMES) {
      const against = valueIn(theme.tokens, '--tk-surface');
      const primary = contrastRatio(valueIn(theme.tokens, '--tk-text-primary'), against);
      const secondary = contrastRatio(valueIn(theme.tokens, '--tk-text-secondary'), against);
      const tertiary = contrastRatio(valueIn(theme.tokens, '--tk-text-tertiary'), against);

      expect(primary, theme.name).toBeGreaterThan(secondary);
      expect(secondary, theme.name).toBeGreaterThan(tertiary);
    }
  });
});
