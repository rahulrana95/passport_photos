import { describe, expect, it } from 'vitest';
import { legendItemsFor } from './legend-items.utils';
import { OVERLAY_ROLE_STYLES } from './overlay-role.constants';
import type { OverlayInstruction } from './overlay-instruction.types';

const line = (role: OverlayInstruction['role']): OverlayInstruction => ({
  kind: 'line',
  role,
  fromX: 0,
  fromY: 0,
  toX: 1,
  toY: 0,
});

describe('building the key from the overlay itself', () => {
  it('lists only the marks that are actually on the photograph', () => {
    // A fixed legend keeps promising a yellow dashed line that a reader in a
    // country without an eye-line rule would hunt for and never find.
    expect(legendItemsFor([line('crop'), line('eye-line')]).map((item) => item.role)).toEqual([
      'crop',
      'eye-line',
    ]);
  });

  it('names each mark once however often it is drawn', () => {
    expect(legendItemsFor([line('head-band'), line('head-band')])).toHaveLength(1);
  });

  it('reads the same way for every photograph', () => {
    // Ordered by the role list rather than by first appearance, so the key
    // does not reshuffle between two photographs of the same person.
    const forwards = legendItemsFor([line('crop'), line('centre-line')]);
    const backwards = legendItemsFor([line('centre-line'), line('crop')]);

    expect(forwards.map((item) => item.role)).toEqual(backwards.map((item) => item.role));
  });

  it('carries the style the mark was drawn with', () => {
    expect(legendItemsFor([line('head-band')])[0]?.style).toBe(OVERLAY_ROLE_STYLES['head-band']);
  });

  it('has nothing to say about an empty overlay', () => {
    expect(legendItemsFor([])).toEqual([]);
  });
});
