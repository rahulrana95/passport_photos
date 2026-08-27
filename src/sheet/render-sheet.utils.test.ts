import { describe, expect, it } from 'vitest';
import {
  CHANNEL_MAX,
  CHANNEL_OFFSET_RED,
  CHANNELS_PER_PIXEL,
  ALPHA_OPAQUE,
  CHANNEL_OFFSET_ALPHA,
} from '@/testing/fixtures/pixel-format.constants';
import { millimetresToPixels } from '@/measurement/format-measurement.utils';
import { planSheet } from './sheet-layout.utils';
import { renderSheet } from './render-sheet.utils';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { SheetPlan } from './sheet-layout.types';

const DPI = 96;

/** A photograph with a distinct top-left corner, so a turn is detectable. */
const marked = (width: number, height: number): PixelBuffer => {
  const data = new Uint8ClampedArray(width * height * CHANNELS_PER_PIXEL);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * CHANNELS_PER_PIXEL;
      const value = x < width / 2 && y < height / 2 ? 20 : 160;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + CHANNEL_OFFSET_ALPHA] = ALPHA_OPAQUE;
    }
  }
  return { width, height, data };
};

const redAt = (buffer: PixelBuffer, x: number, y: number): number =>
  Number(buffer.data[(y * buffer.width + x) * CHANNELS_PER_PIXEL + CHANNEL_OFFSET_RED]);

const planFor = (photo: { widthMm: number; heightMm: number }): SheetPlan => {
  const result = planSheet({ widthMm: 101.6, heightMm: 152.4 }, photo, { marginMm: 3, gutterMm: 3 });
  if (!result.ok) throw new Error('The fixture sheet must hold at least one photograph.');
  return result.plan;
};

describe('drawing the sheet', () => {
  const plan = planFor({ widthMm: 35, heightMm: 45 });
  const sheet = renderSheet(marked(140, 180), plan, DPI);

  it('is the physical size of the sheet, at the given resolution', () => {
    // The only number a ruler can disagree with, and the one the whole
    // feature is for.
    expect(sheet.width).toBe(millimetresToPixels(plan.sheet.widthMm, DPI));
    expect(sheet.height).toBe(millimetresToPixels(plan.sheet.heightMm, DPI));
  });

  it('starts from white paper', () => {
    // The corner is outside every slot and outside every cut mark.
    expect(redAt(sheet, 0, 0)).toBe(CHANNEL_MAX);
  });

  it('puts a photograph in every slot', () => {
    for (const slot of plan.slots) {
      const x = millimetresToPixels(slot.xMm, DPI);
      const y = millimetresToPixels(slot.yMm, DPI);
      // Inside the slot rather than at its corner, which is where the cut
      // marks are.
      expect(redAt(sheet, x + 10, y + 10), `${slot.xMm},${slot.yMm}`).not.toBe(CHANNEL_MAX);
    }
  });

  it('draws every copy identically', () => {
    // Resampled once and stamped, rather than resampled per slot: six results
    // that could differ by a rounding decision would be six photographs of
    // subtly different sizes.
    const samples = plan.slots.map((slot) =>
      redAt(
        sheet,
        millimetresToPixels(slot.xMm, DPI) + 4,
        millimetresToPixels(slot.yMm, DPI) + 4,
      ),
    );

    expect(new Set(samples).size).toBe(1);
  });

  it('leaves every pixel opaque', () => {
    expect(sheet.data[CHANNEL_OFFSET_ALPHA]).toBe(ALPHA_OPAQUE);
  });
});

describe('cut marks', () => {
  const plan = planFor({ widthMm: 35, heightMm: 45 });
  const sheet = renderSheet(marked(140, 180), plan, DPI);
  const firstSlot = plan.slots[0];

  it('are drawn outside the photograph, never across it', () => {
    // A guide printed over a face is ink on the photograph the reader then
    // submits.
    if (firstSlot === undefined) throw new Error('The plan must place a photograph.');
    const x = millimetresToPixels(firstSlot.xMm, DPI);
    const y = millimetresToPixels(firstSlot.yMm, DPI);
    const markPx = millimetresToPixels(3, DPI);

    // Just outside the top-left corner, along the horizontal mark.
    expect(redAt(sheet, x - Math.round(markPx / 2), y)).toBe(0);
  });

  it('leave the middle of the photograph untouched', () => {
    if (firstSlot === undefined) throw new Error('The plan must place a photograph.');
    const centreX = millimetresToPixels(firstSlot.xMm + 35 / 2, DPI);
    const centreY = millimetresToPixels(firstSlot.yMm + 45 / 2, DPI);

    expect(redAt(sheet, centreX, centreY)).not.toBe(0);
  });
});

describe('a photograph laid on its side', () => {
  it('is turned rather than squashed', () => {
    // The tile has to end up the shape the slot expects. Stretching it to fit
    // would produce a photograph of a differently shaped person.
    const result = planSheet(
      { widthMm: 100, heightMm: 60 },
      { widthMm: 30, heightMm: 50 },
      { marginMm: 0, gutterMm: 0 },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.rotated).toBe(true);

    const sheet = renderSheet(marked(60, 100), result.plan, DPI);
    const slot = result.plan.slots[0];
    if (slot === undefined) throw new Error('The plan must place a photograph.');

    // The dark quarter was the photograph's top-left. Turned clockwise, it is
    // now the top-right of the tile.
    const x = millimetresToPixels(slot.xMm, DPI);
    const y = millimetresToPixels(slot.yMm, DPI);
    const tileWidth = millimetresToPixels(50, DPI);

    expect(redAt(sheet, x + tileWidth - 6, y + 6)).toBeLessThan(100);
    expect(redAt(sheet, x + 6, y + 6)).toBeGreaterThan(100);
  });
});
