import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COLOR_TOKENS,
  RADIUS_TOKENS,
  SHADOW_TOKENS,
  SPACE_TOKENS,
  TEXT_TOKENS,
  THEME_DEPENDENT_TOKENS,
} from './design-tokens.constants';

// Resolved from the project root: under jsdom, import.meta.url is an http URL,
// not a file one, so it cannot be used to locate a source file.
const rawStylesheet = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

// Comments are stripped first. The file documents its own selectors in a header
// comment, so searching the raw text finds the prose before the rule and reads
// the wrong block entirely.
const stylesheet = rawStylesheet.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Extracts the token declarations from one block of the stylesheet.
 *
 * These are parsed from source text rather than read through getComputedStyle
 * because jsdom does not evaluate `prefers-color-scheme`, so the system-default
 * block — the state most likely to be broken — would be invisible to a
 * computed-style test.
 */
const tokensInBlock = (blockSelector: string): Map<string, string> => {
  const start = stylesheet.indexOf(blockSelector);
  if (start === -1) throw new Error(`Block not found in tokens.css: ${blockSelector}`);

  const open = stylesheet.indexOf('{', start);
  const close = stylesheet.indexOf('}', open);
  const body = stylesheet.slice(open + 1, close);

  const declarations = new Map<string, string>();
  for (const line of body.split('\n')) {
    const match = /^\s*(--tk-[a-z0-9-]+)\s*:\s*(.+?);/.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      declarations.set(match[1], match[2].trim());
    }
  }
  return declarations;
};

const BASE = tokensInBlock(':root {');
const SYSTEM_DARK = tokensInBlock(":root:not([data-mantine-color-scheme='light'])");
const EXPLICIT_DARK = tokensInBlock("[data-mantine-color-scheme='dark']");
const FORCED_COLORS = tokensInBlock('@media (forced-colors: active)');

const ALL_REGISTERED = [
  ...COLOR_TOKENS,
  ...SPACE_TOKENS,
  ...TEXT_TOKENS,
  ...RADIUS_TOKENS,
  ...SHADOW_TOKENS,
];

describe('token registry and stylesheet agree', () => {
  it.each(ALL_REGISTERED)('%s is declared in the base :root block', (token) => {
    expect(BASE.has(token)).toBe(true);
  });

  it('declares no colour token that the registry does not know about', () => {
    const declaredColours = [...BASE.keys()].filter(
      (name) =>
        name.startsWith('--tk-status') ||
        name.startsWith('--tk-accent') ||
        name.startsWith('--tk-text-p') ||
        name.startsWith('--tk-border'),
    );
    for (const name of declaredColours) {
      expect(COLOR_TOKENS).toContain(name);
    }
  });
});

describe('all three theme states are complete', () => {
  /**
   * The classic failure: a token gets a dark value under the explicit attribute
   * but not under prefers-color-scheme, so a visitor on system-default sees one
   * theme's text on the other theme's background.
   */
  it.each(THEME_DEPENDENT_TOKENS)('%s is overridden for system-default dark', (token) => {
    expect(SYSTEM_DARK.has(token)).toBe(true);
  });

  it.each(THEME_DEPENDENT_TOKENS)('%s is overridden for explicit dark', (token) => {
    expect(EXPLICIT_DARK.has(token)).toBe(true);
  });

  it('gives the system-default and explicit dark blocks identical values', () => {
    for (const [token, value] of SYSTEM_DARK) {
      expect(EXPLICIT_DARK.get(token)).toBe(value);
    }
    expect([...EXPLICIT_DARK.keys()].sort()).toEqual([...SYSTEM_DARK.keys()].sort());
  });

  it.each(THEME_DEPENDENT_TOKENS)('%s actually changes between light and dark', (token) => {
    expect(EXPLICIT_DARK.get(token)).not.toBe(BASE.get(token));
  });
});

describe('forced-colors mode', () => {
  it.each(COLOR_TOKENS)('%s hands control to a system colour keyword', (token) => {
    expect(FORCED_COLORS.has(token)).toBe(true);
  });

  it('uses system keywords rather than fixed values', () => {
    const systemKeywords = ['Canvas', 'CanvasText', 'GrayText', 'LinkText', 'none'];
    for (const value of FORCED_COLORS.values()) {
      expect(systemKeywords).toContain(value);
    }
  });
});
