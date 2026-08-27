import { describe, expect, it } from 'vitest';
import { interpolate } from './interpolate.utils';

describe('interpolating copy', () => {
  it('substitutes a named placeholder', () => {
    expect(interpolate('Move about {amount} closer.', { amount: '20%' })).toBe(
      'Move about 20% closer.',
    );
  });

  it('substitutes every occurrence', () => {
    expect(interpolate('{a} then {b} then {a}', { a: 'one', b: 'two' })).toBe(
      'one then two then one',
    );
  });

  it('leaves a placeholder standing when nothing was supplied for it', () => {
    // Blanking it would leave a gap in a sentence, which reads as a rendering
    // glitch and is invisible in review. A visible "{amount}" is unmistakable,
    // and the rule suite asserts none survives into a real report.
    expect(interpolate('Move about {amount} closer.', {})).toBe('Move about {amount} closer.');
  });

  it('leaves text with no placeholders untouched', () => {
    expect(interpolate('Take the photo again.', { amount: '20%' })).toBe('Take the photo again.');
  });
});
