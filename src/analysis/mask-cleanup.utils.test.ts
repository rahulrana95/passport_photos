import { describe, expect, it } from 'vitest';
import {
  closeMask,
  componentContaining,
  fillHoles,
  findComponents,
  isSubject,
  openMask,
} from './mask-cleanup.utils';
import type { Mask } from './mask-cleanup.utils';

/** Builds a mask from rows of characters: '#' is subject, '.' is background. */
const maskFrom = (rows: readonly string[]): Mask => {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * height);

  rows.forEach((row, y) => {
    [...row].forEach((character, x) => {
      data[y * width + x] = character === '#' ? 255 : 0;
    });
  });

  return { width, height, data };
};

const render = (mask: Mask): string[] => {
  const rows: string[] = [];
  for (let y = 0; y < mask.height; y += 1) {
    let row = '';
    for (let x = 0; x < mask.width; x += 1) row += isSubject(mask, x, y) ? '#' : '.';
    rows.push(row);
  }
  return rows;
};

describe('isSubject', () => {
  it('treats the upper half of the range as subject', () => {
    const mask: Mask = { width: 2, height: 1, data: Uint8ClampedArray.from([127, 128]) };

    expect(isSubject(mask, 0, 0)).toBe(false);
    expect(isSubject(mask, 1, 0)).toBe(true);
  });

  it('treats a short data array as background rather than throwing', () => {
    // A mask whose dimensions and data disagree is malformed input, not an
    // impossibility: it is what a partially-read WASM buffer looks like.
    const truncated: Mask = { width: 4, height: 4, data: new Uint8ClampedArray(2).fill(255) };

    expect(isSubject(truncated, 0, 0)).toBe(true);
    expect(isSubject(truncated, 3, 3)).toBe(false);
  });

  it('treats everything outside the frame as background', () => {
    const mask = maskFrom(['##', '##']);

    expect(isSubject(mask, -1, 0)).toBe(false);
    expect(isSubject(mask, 0, -1)).toBe(false);
    expect(isSubject(mask, 2, 0)).toBe(false);
    expect(isSubject(mask, 0, 2)).toBe(false);
  });
});

describe('findComponents', () => {
  it('finds nothing in an empty mask', () => {
    expect(findComponents(maskFrom(['...', '...']))).toHaveLength(0);
  });

  it('finds one region and its bounds', () => {
    const components = findComponents(maskFrom(['.....', '.###.', '.###.', '.....']));

    expect(components).toHaveLength(1);
    expect(components[0]).toMatchObject({ pixelCount: 6, minX: 1, maxX: 3, minY: 1, maxY: 2 });
  });

  it('separates two regions that do not touch', () => {
    expect(findComponents(maskFrom(['#..#', '#..#']))).toHaveLength(2);
  });

  it('does not join regions that touch only at a corner', () => {
    // Four-connectivity, deliberately. Under eight-connectivity a single
    // diagonally-touching speckle joins the head, and one stray pixel above
    // the hair then becomes the crown.
    expect(findComponents(maskFrom(['#.', '.#']))).toHaveLength(2);
  });

  it('joins regions that share an edge', () => {
    expect(findComponents(maskFrom(['##', '..']))).toHaveLength(1);
  });

  it('walks a long thin region without overflowing the stack', () => {
    // Iterative rather than recursive: a recursive flood fill blows the stack
    // on exactly the images that matter most, the ones where the subject fills
    // the frame.
    const width = 400;
    const height = 400;
    const data = new Uint8ClampedArray(width * height).fill(255);

    expect(findComponents({ width, height, data })[0]?.pixelCount).toBe(width * height);
  });
});

describe('componentContaining', () => {
  it('keeps only the region holding the given pixel', () => {
    const mask = maskFrom(['##..##', '##..##']);

    expect(render(componentContaining(mask, 0, 0)?.mask ?? mask)).toEqual(['##....', '##....']);
  });

  it('returns nothing when the pixel is background', () => {
    expect(componentContaining(maskFrom(['#.', '.#']), 1, 0)).toBeUndefined();
  });

  it('returns nothing for a pixel outside the frame', () => {
    expect(componentContaining(maskFrom(['##', '##']), 99, 99)).toBeUndefined();
  });

  it('reports the topmost row of the component it walked', () => {
    // Reported from the walk rather than re-scanned, so the caller never needs
    // a "found nothing" branch for a component it just seeded.
    const mask = maskFrom(['....##', '....##', '##....', '##....']);

    expect(componentContaining(mask, 0, 2)?.minY).toBe(2);
    expect(componentContaining(mask, 4, 0)?.minY).toBe(0);
  });
});

describe('fillHoles', () => {
  it('fills an enclosed hole', () => {
    const mask = maskFrom(['#####', '#...#', '#####']);

    expect(render(fillHoles(mask))).toEqual(['#####', '#####', '#####']);
  });

  it('leaves a notch open to the outside alone', () => {
    // Flood-filled from the border inward, so anything the background can reach
    // is background. Filling by "small area" instead would close a genuine gap
    // between an arm and a body.
    const mask = maskFrom(['#####', '#...#', '##.##']);

    expect(render(fillHoles(mask))).toEqual(['#####', '#...#', '##.##']);
  });

  it('leaves an empty mask empty', () => {
    expect(render(fillHoles(maskFrom(['...', '...'])))).toEqual(['...', '...']);
  });

  it('leaves a solid mask solid', () => {
    expect(render(fillHoles(maskFrom(['###', '###'])))).toEqual(['###', '###']);
  });
});

describe('openMask', () => {
  it('removes an isolated speckle', () => {
    const mask = maskFrom(['.....', '..#..', '.....']);

    expect(render(openMask(mask))).toEqual(['.....', '.....', '.....']);
  });

  it('keeps a solid body', () => {
    const mask = maskFrom(['#####', '#####', '#####', '#####']);

    expect(render(openMask(mask))).toEqual(['#####', '#####', '#####', '#####']);
  });

  it('does not eat the mask inward from the frame edge', () => {
    // Outside the frame counts as subject during erosion. A head that reaches
    // the bottom of the frame is normal; a head shrunk by the frame boundary
    // is a bug that would move every measurement.
    const mask = maskFrom(['###', '###']);

    expect(render(openMask(mask))).toEqual(['###', '###']);
  });
});

describe('closeMask', () => {
  it('bridges a one-pixel gap', () => {
    const mask = maskFrom(['##.##', '#####']);

    expect(render(closeMask(mask))).toEqual(['#####', '#####']);
  });

  it('leaves a convex blob unchanged when it is clear of the frame edge', () => {
    const mask = maskFrom([
      '.......',
      '.......',
      '..###..',
      '..###..',
      '.......',
      '.......',
    ]);

    expect(render(closeMask(mask))).toEqual([
      '.......',
      '.......',
      '..###..',
      '..###..',
      '.......',
      '.......',
    ]);
  });

  it('can grow the silhouette at the frame edge, and never shrink it', () => {
    // Closing is extensive: it adds pixels and never removes them. Near the
    // frame edge, where erosion treats the outside as subject so a body
    // reaching the edge is not eaten away, that growth reaches the boundary.
    // Documented rather than wished away — it is why the crown pipeline closes
    // before it measures rather than after.
    const mask = maskFrom(['.....', '.###.', '.###.', '.....']);
    const closed = closeMask(mask);

    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (isSubject(mask, x, y)) expect(isSubject(closed, x, y), `${x},${y}`).toBe(true);
      }
    }
    expect(render(closed)[0]).toBe('..#..');
  });

  it('does not join two genuinely separate regions', () => {
    const mask = maskFrom(['#...#', '#...#']);

    expect(render(closeMask(mask))).toEqual(['#...#', '#...#']);
  });

  it('accepts multiple passes for a wider gap', () => {
    const mask = maskFrom(['##..##', '######']);

    expect(render(closeMask(mask, 2))).toEqual(['######', '######']);
  });
});
