import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from './axe.utils';

/**
 * A silently-passing accessibility helper is worse than none at all, so the
 * helper is verified against markup that is known to be inaccessible.
 */
describe('expectNoAxeViolations', () => {
  it('resolves for accessible markup', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<button type="button">Check photo</button>';
    document.body.append(container);

    await expect(expectNoAxeViolations(container)).resolves.toBeUndefined();
  });

  it('throws, and names the rule, when a violation is present', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<img src="photo.jpg">';
    document.body.append(container);

    await expect(expectNoAxeViolations(container)).rejects.toThrow(/image-alt/);
  });
});
