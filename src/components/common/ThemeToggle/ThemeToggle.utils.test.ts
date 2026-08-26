import { describe, expect, it, vi } from 'vitest';
import { createColorSchemeHandler, isColorScheme } from './ThemeToggle.utils';

describe('isColorScheme', () => {
  it.each(['light', 'dark', 'auto'])('accepts the supported scheme %s', (value) => {
    expect(isColorScheme(value)).toBe(true);
  });

  it.each(['', 'sepia', 'DARK'])('rejects the unsupported value %s', (value) => {
    expect(isColorScheme(value)).toBe(false);
  });
});

describe('createColorSchemeHandler', () => {
  it('forwards a supported scheme', () => {
    const setColorScheme = vi.fn();

    createColorSchemeHandler(setColorScheme)('dark');

    expect(setColorScheme).toHaveBeenCalledWith('dark');
  });

  it('ignores a value the control could never legitimately emit', () => {
    const setColorScheme = vi.fn();

    createColorSchemeHandler(setColorScheme)('sepia');

    expect(setColorScheme).not.toHaveBeenCalled();
  });
});
