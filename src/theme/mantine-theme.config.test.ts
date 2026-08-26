import { describe, expect, it } from 'vitest';
import { appCssVariablesResolver, appTheme } from './mantine-theme.config';

describe('appTheme', () => {
  it('uses the project font token rather than a hardcoded family', () => {
    expect(appTheme.fontFamily).toBe('var(--tk-font-body)');
  });

  it('provides the ten shades Mantine requires for the brand colour', () => {
    expect(appTheme.colors?.['brand']).toHaveLength(10);
  });
});

describe('appCssVariablesResolver', () => {
  const resolved = appCssVariablesResolver({} as never);

  it('maps the filled primary colour onto the project accent token', () => {
    expect(resolved.variables['--mantine-primary-color-filled']).toBe('var(--tk-accent)');
  });

  it('drives both colour schemes from the same tokens, so neither can drift', () => {
    expect(resolved.light['--mantine-color-body']).toBe('var(--tk-ground)');
    expect(resolved.dark['--mantine-color-body']).toBe('var(--tk-ground)');
  });
});
