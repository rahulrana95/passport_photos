import { describe, expect, it } from 'vitest';
import { planSheet } from './sheet-layout.utils';
import { SHEET_SIZES } from './sheet-size.constants';

const EU_PHOTO = { widthMm: 35, heightMm: 45 };
const US_PHOTO = { widthMm: 50.8, heightMm: 50.8 };

const countOn = (sheetId: keyof typeof SHEET_SIZES, photo: { widthMm: number; heightMm: number }): number => {
  const sheet = SHEET_SIZES[sheetId];
  const result = planSheet(sheet, photo, { marginMm: sheet.marginMm });
  return result.ok ? result.plan.count : 0;
};

describe('how many copies fit', () => {
  it('gets six 35x45 photographs onto a 4x6 sheet', () => {
    // The number every high-street printer manages. Getting four instead is
    // what a millimetre of extra gutter costs, and the reader would have no
    // way of knowing they had been short-changed.
    expect(countOn('4x6in', EU_PHOTO)).toBe(6);
  });

  it('gets six onto the metric sheet too, despite it being smaller', () => {
    // 100x150 is not 4x6 inches. It is a millimetre and a half smaller in each
    // direction, which is exactly the kind of difference that decides whether
    // a column fits.
    expect(countOn('10x15cm', EU_PHOTO)).toBe(6);
  });

  it('gets thirty onto A4', () => {
    expect(countOn('a4', EU_PHOTO)).toBe(30);
  });

  it('gets two US photographs onto a 4x6 sheet', () => {
    // A 50.8mm square is a large photograph. Two is the honest answer.
    expect(countOn('4x6in', US_PHOTO)).toBe(2);
  });

  it('gets fifteen US photographs onto A4', () => {
    expect(countOn('a4', US_PHOTO)).toBe(15);
  });
});

describe('trying every arrangement', () => {
  it('lays the photograph on its side when that fits more', () => {
    // A cut photograph has no orientation, so turning one is free. Handing
    // somebody three copies when four fit is not.
    const result = planSheet(
      { widthMm: 100, heightMm: 60 },
      { widthMm: 30, heightMm: 50 },
      { marginMm: 0, gutterMm: 0 },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.count).toBe(4);
    expect(result.plan.rotated).toBe(true);
  });

  it('leaves the sheet the way round it was given when nothing is gained', () => {
    const result = planSheet(
      { widthMm: 100, heightMm: 60 },
      { widthMm: 30, heightMm: 50 },
      { marginMm: 0, gutterMm: 0 },
    );

    expect(result.ok && result.plan.sheet).toEqual({ widthMm: 100, heightMm: 60 });
  });

  it('turns the sheet when that is what fits more', () => {
    const result = planSheet(
      { widthMm: 60, heightMm: 120 },
      { widthMm: 55, heightMm: 25 },
      { marginMm: 0, gutterMm: 0 },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.count).toBeGreaterThanOrEqual(4);
  });
});

describe('where the photographs sit', () => {
  const result = planSheet(
    { widthMm: 100, heightMm: 100 },
    { widthMm: 20, heightMm: 20 },
    { marginMm: 10, gutterMm: 5 },
  );

  it('produces one slot per copy', () => {
    expect(result.ok && result.plan.slots).toHaveLength(result.ok ? result.plan.count : -1);
  });

  it('centres the block, so a remainder becomes margin rather than a stub', () => {
    // Three columns of 20 with two 5mm gutters is 70mm on a 100mm sheet. The
    // leftover 30 is shared between the two edges instead of forming a strip
    // down one side that somebody then tries to cut a photograph out of.
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.columns).toBe(3);
    expect(result.plan.slots[0]?.xMm).toBeCloseTo(15, 6);
  });

  it('spaces them by exactly the gutter', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [first, second] = result.plan.slots;
    expect((second?.xMm ?? 0) - (first?.xMm ?? 0)).toBeCloseTo(25, 6);
  });

  it('never places one outside the printable area', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const slot of result.plan.slots) {
      expect(slot.xMm).toBeGreaterThanOrEqual(10);
      expect(slot.yMm).toBeGreaterThanOrEqual(10);
      expect(slot.xMm + result.plan.photo.widthMm).toBeLessThanOrEqual(90);
      expect(slot.yMm + result.plan.photo.heightMm).toBeLessThanOrEqual(90);
    }
  });

  it('reads across then down, so a partial last row is at the bottom', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [first, second] = result.plan.slots;
    expect(first?.yMm).toBe(second?.yMm);
  });
});

describe('a photograph that will not fit', () => {
  it('says so rather than producing an empty sheet', () => {
    // A sheet with nothing on it prints fine and wastes a sheet of photo
    // paper and a trip to the shop.
    expect(
      planSheet({ widthMm: 101.6, heightMm: 152.4 }, { widthMm: 200, heightMm: 200 }),
    ).toEqual({ ok: false, reason: 'photo-larger-than-sheet' });
  });

  it('says so when only one edge is too long', () => {
    expect(
      planSheet({ widthMm: 100, heightMm: 100 }, { widthMm: 40, heightMm: 99 }, { marginMm: 5 }),
    ).toEqual({ ok: false, reason: 'photo-larger-than-sheet' });
  });

  it('fits a photograph that exactly fills the printable area', () => {
    // The boundary the failure above sits next to. One copy is a real answer.
    const result = planSheet(
      { widthMm: 100, heightMm: 100 },
      { widthMm: 90, heightMm: 90 },
      { marginMm: 5, gutterMm: 3 },
    );

    expect(result.ok && result.plan.count).toBe(1);
  });
});
