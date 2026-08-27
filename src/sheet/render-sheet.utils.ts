import {
  ALPHA_OPAQUE,
  CHANNEL_MAX,
  CHANNEL_OFFSET_ALPHA,
  CHANNEL_OFFSET_BLUE,
  CHANNEL_OFFSET_GREEN,
  CHANNEL_OFFSET_RED,
  CHANNELS_PER_PIXEL,
} from '@/testing/fixtures/pixel-format.constants';
import { HALF } from '@/measurement/angle.constants';
import { millimetresToPixels } from '@/measurement/format-measurement.utils';
import { resampleArea } from '@/encode/resample-area.utils';
import { CUT_MARK_LENGTH_MM } from './sheet-size.constants';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { SheetPlan } from './sheet-layout.types';

/** Cut marks are drawn in black, which is the only ink every printer has. */
const MARK_LEVEL = 0;
/** A hair under half a millimetre at 300dpi: visible, and thinner than scissors. */
const MARK_WIDTH_PX = 2;
/** A mark is centred on the corner, so it straddles it by half its width. */
const MARK_HALF_WIDTH_PX = MARK_WIDTH_PX / HALF;

const blank = (widthPx: number, heightPx: number): PixelBuffer => {
  const data = new Uint8ClampedArray(widthPx * heightPx * CHANNELS_PER_PIXEL).fill(CHANNEL_MAX);
  return { width: widthPx, height: heightPx, data };
};

/** Turns a tile a quarter turn, for a photograph laid on its side. */
const turnQuarter = (tile: PixelBuffer): PixelBuffer => {
  const data = new Uint8ClampedArray(tile.data.length);

  for (let y = 0; y < tile.height; y += 1) {
    for (let x = 0; x < tile.width; x += 1) {
      const from = (y * tile.width + x) * CHANNELS_PER_PIXEL;
      // Clockwise: the left column becomes the top row.
      const to = (x * tile.height + (tile.height - 1 - y)) * CHANNELS_PER_PIXEL;

      for (let channel = 0; channel < CHANNELS_PER_PIXEL; channel += 1) {
        // Read through Number rather than defaulted: both indices are derived
        // from the loop bounds over this very buffer, so an absent element
        // cannot occur, and guarding for one would add four branches per
        // channel that no input can reach.
        data[to + channel] = Number(tile.data[from + channel]);
      }
    }
  }

  return { width: tile.height, height: tile.width, data };
};

const paint = (
  sheet: PixelBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  level: number,
): void => {
  const fromX = Math.max(0, Math.round(x));
  const fromY = Math.max(0, Math.round(y));
  const toX = Math.min(sheet.width, Math.round(x + width));
  const toY = Math.min(sheet.height, Math.round(y + height));

  for (let row = fromY; row < toY; row += 1) {
    for (let column = fromX; column < toX; column += 1) {
      const offset = (row * sheet.width + column) * CHANNELS_PER_PIXEL;
      sheet.data[offset + CHANNEL_OFFSET_RED] = level;
      sheet.data[offset + CHANNEL_OFFSET_GREEN] = level;
      sheet.data[offset + CHANNEL_OFFSET_BLUE] = level;
      sheet.data[offset + CHANNEL_OFFSET_ALPHA] = ALPHA_OPAQUE;
    }
  }
};

/**
 * Stamps a tile onto the sheet, clipped to it.
 *
 * The visible span is worked out once, by clamping the loop bounds, rather
 * than tested per pixel. Both forms clip; only this one has no branch inside
 * the inner loop, which matters twice over — it is the hottest loop in the
 * module, and a per-pixel guard against an overflow the planner has already
 * ruled out is a branch nothing can take and nothing can test.
 *
 * The clipping is not decoration even so. Slot positions and tile sizes are
 * each rounded to whole pixels independently, so a tile can finish a pixel
 * past where the arithmetic in millimetres said it would.
 */
const blit = (sheet: PixelBuffer, tile: PixelBuffer, atX: number, atY: number): void => {
  const fromY = Math.max(0, -atY);
  const toY = Math.min(tile.height, sheet.height - atY);
  const fromX = Math.max(0, -atX);
  const toX = Math.min(tile.width, sheet.width - atX);

  for (let y = fromY; y < toY; y += 1) {
    const row = atY + y;

    for (let x = fromX; x < toX; x += 1) {
      const column = atX + x;

      const from = (y * tile.width + x) * CHANNELS_PER_PIXEL;
      const to = (row * sheet.width + column) * CHANNELS_PER_PIXEL;
      for (let channel = 0; channel < CHANNELS_PER_PIXEL; channel += 1) {
        sheet.data[to + channel] = Number(tile.data[from + channel]);
      }
    }
  }
};

/**
 * Cut marks at the corners of a photograph, outside it and never across it.
 *
 * Outside is the whole rule. A guide printed over a face is ink on the
 * photograph the reader then submits, and no amount of "it is only a thin
 * line" survives contact with a passport office.
 *
 * Marks rather than full rules through the sheet, because a full rule between
 * two columns is a line somebody follows with scissors into the photograph
 * above it. Corner marks say where to cut and stop.
 */
const drawCutMarks = (
  sheet: PixelBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  markPx: number,
): void => {
  const corners = [
    { cx: x, cy: y, dx: -1, dy: -1 },
    { cx: x + width, cy: y, dx: 1, dy: -1 },
    { cx: x, cy: y + height, dx: -1, dy: 1 },
    { cx: x + width, cy: y + height, dx: 1, dy: 1 },
  ];

  for (const corner of corners) {
    const horizontalX = corner.dx < 0 ? corner.cx - markPx : corner.cx;
    const verticalY = corner.dy < 0 ? corner.cy - markPx : corner.cy;

    paint(sheet, horizontalX, corner.cy - MARK_HALF_WIDTH_PX, markPx, MARK_WIDTH_PX, MARK_LEVEL);
    paint(sheet, corner.cx - MARK_HALF_WIDTH_PX, verticalY, MARK_WIDTH_PX, markPx, MARK_LEVEL);
  }
};

/**
 * Draws the sheet, at print resolution, ready to be encoded.
 *
 * The photograph is resampled ONCE and stamped as many times as it fits.
 * Resampling per slot would be the same arithmetic six times over on a
 * megapixel image, and — worse — six results that could differ by a rounding
 * decision, producing a sheet whose copies are not identical.
 */
export const renderSheet = (
  photo: PixelBuffer,
  plan: SheetPlan,
  dpi: number,
): PixelBuffer => {
  const sheet = blank(
    millimetresToPixels(plan.sheet.widthMm, dpi),
    millimetresToPixels(plan.sheet.heightMm, dpi),
  );

  // Sized from the placed photograph, then turned if it is lying on its side,
  // so the tile always ends up the shape the slot expects.
  const tileWidthPx = millimetresToPixels(
    plan.rotated ? plan.photo.heightMm : plan.photo.widthMm,
    dpi,
  );
  const tileHeightPx = millimetresToPixels(
    plan.rotated ? plan.photo.widthMm : plan.photo.heightMm,
    dpi,
  );
  const upright = resampleArea(
    photo,
    { x: 0, y: 0, widthPx: photo.width, heightPx: photo.height },
    { widthPx: tileWidthPx, heightPx: tileHeightPx },
  );
  const tile = plan.rotated ? turnQuarter(upright) : upright;
  const markPx = millimetresToPixels(CUT_MARK_LENGTH_MM, dpi);

  for (const slot of plan.slots) {
    const x = millimetresToPixels(slot.xMm, dpi);
    const y = millimetresToPixels(slot.yMm, dpi);

    blit(sheet, tile, x, y);
    drawCutMarks(sheet, x, y, tile.width, tile.height, markPx);
  }

  return sheet;
};
