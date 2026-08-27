import { describe, expect, it } from 'vitest';
import { RecordingCanvasContext } from '@/testing/recording-canvas';
import { clearOverlay, drawOverlay } from './draw-overlay';
import { HALO_COLOUR, OVERLAY_ROLE_STYLES } from './overlay-role.constants';
import type { OverlayInstruction } from './overlay-instruction.types';

const IDENTITY = { scale: 1, offsetX: 0, offsetY: 0 };

const draw = (
  instructions: readonly OverlayInstruction[],
  transform = IDENTITY,
  devicePixelRatio = 1,
): RecordingCanvasContext => {
  const context = new RecordingCanvasContext();
  drawOverlay(context, instructions, transform, devicePixelRatio);
  return context;
};

const EYE_LINE: OverlayInstruction = {
  kind: 'line',
  role: 'eye-line',
  fromX: 0,
  fromY: 50,
  toX: 100,
  toY: 50,
};

describe('drawing a line so it is visible on any photograph', () => {
  const context = draw([EYE_LINE]);

  it('strokes it twice', () => {
    // White lines vanish on a pale wall and black lines vanish in dark hair.
    // Any single colour disappears somewhere on somebody's photo, and usually
    // on the part being annotated — the annotation is drawn over the subject.
    expect(context.strokes).toHaveLength(2);
  });

  it('lays a dark halo down first', () => {
    expect(context.strokes[0]?.strokeStyle).toBe(HALO_COLOUR);
  });

  it('draws the visible stroke over it, in the role’s colour', () => {
    expect(context.strokes[1]?.strokeStyle).toBe(OVERLAY_ROLE_STYLES['eye-line'].colour);
  });

  it('makes the halo wider on both sides', () => {
    const style = OVERLAY_ROLE_STYLES['eye-line'];

    expect(context.strokes[0]?.lineWidth).toBe(style.strokeWidthPx + style.haloWidthPx * 2);
    expect(context.strokes[1]?.lineWidth).toBe(style.strokeWidthPx);
  });

  it('gives both passes the same path, so the halo cannot show through', () => {
    // A halo traced separately would show in the gaps of a dashed line above
    // it as a second, offset dashed line.
    expect(context.strokes[0]?.path).toEqual(context.strokes[1]?.path);
  });
});

describe('holding annotation weight constant however the photo scales', () => {
  it('divides stroke widths by the scale', () => {
    // Without this a two-pixel line over a 4000-pixel photograph fitted into a
    // 400-pixel box is drawn a fifth of a pixel wide, which is to say not
    // drawn — and the same overlay over a small scan would be twenty pixels
    // thick.
    const context = draw([EYE_LINE], { scale: 0.1, offsetX: 0, offsetY: 0 });

    expect(context.strokes[1]?.lineWidth).toBe(OVERLAY_ROLE_STYLES['eye-line'].strokeWidthPx / 0.1);
  });

  it('divides dash segments by the scale too', () => {
    const context = draw(
      [{ kind: 'line', role: 'head-band', fromX: 0, fromY: 1, toX: 10, toY: 1 }],
      { scale: 0.5, offsetX: 0, offsetY: 0 },
    );

    expect(context.strokes[1]?.dash).toEqual(
      OVERLAY_ROLE_STYLES['head-band'].dashPx.map((segment) => segment / 0.5),
    );
  });

  it('leaves a solid role with no dash pattern', () => {
    expect(draw([EYE_LINE]).strokes[1]?.dash).toEqual([]);
  });
});

describe('the shapes it can draw', () => {
  it('traces a rectangle for the crop frame', () => {
    const context = draw([
      { kind: 'rect', role: 'crop', x: 5, y: 6, widthPx: 70, heightPx: 80 },
    ]);

    expect(context.strokes[1]?.path).toEqual([{ operation: 'rect', args: [5, 6, 70, 80] }]);
  });

  it('traces a measure as a stem with a cap at each end', () => {
    const context = draw([
      { kind: 'span', role: 'head-span', x: 40, fromY: 10, toY: 90, capWidthPx: 20 },
    ]);

    expect(context.strokes[1]?.path).toEqual([
      { operation: 'moveTo', args: [40, 10] },
      { operation: 'lineTo', args: [40, 90] },
      { operation: 'moveTo', args: [30, 10] },
      { operation: 'lineTo', args: [50, 10] },
      { operation: 'moveTo', args: [30, 90] },
      { operation: 'lineTo', args: [50, 90] },
    ]);
  });

  it('fills a band at the role’s alpha', () => {
    const context = draw([
      { kind: 'shade', role: 'head-band', x: 0, y: 20, widthPx: 100, heightPx: 30 },
    ]);

    expect(context.fills).toEqual([
      {
        fillStyle: OVERLAY_ROLE_STYLES['head-band'].colour,
        globalAlpha: OVERLAY_ROLE_STYLES['head-band'].shadeAlpha,
        args: [0, 20, 100, 30],
      },
    ]);
  });

  it('restores full opacity immediately after a band', () => {
    // The paint order puts the crop frame last, and a leaked alpha would fade
    // the one mark that must not be faint.
    const context = draw([
      { kind: 'shade', role: 'head-band', x: 0, y: 20, widthPx: 100, heightPx: 30 },
    ]);

    expect(context.globalAlpha).toBe(1);
  });

  it('ends a measure exactly on the row it measures', () => {
    // Round caps would overhang by half the stroke width, which at the crown
    // is the difference the whole measurement is about.
    expect(draw([EYE_LINE]).lineCap).toBe('butt');
  });
});

describe('placing the drawing on the canvas', () => {
  it('folds the fit and the device pixel ratio into one transform', () => {
    const context = draw([EYE_LINE], { scale: 0.5, offsetX: 12, offsetY: 8 }, 2);

    expect(context.transforms).toEqual([{ args: [1, 0, 0, 1, 24, 16] }]);
  });

  it('leaves the context as it found it', () => {
    const context = draw([EYE_LINE]);

    expect(context.saves).toBe(context.restores);
    expect(context.saves).toBe(1);
  });

  it('draws nothing at all for an empty overlay', () => {
    const context = draw([]);

    expect(context.strokes).toEqual([]);
    expect(context.fills).toEqual([]);
  });
});

describe('clearing between frames', () => {
  it('clears in CSS pixels, whatever backs them', () => {
    const context = new RecordingCanvasContext();
    clearOverlay(context, { widthPx: 400, heightPx: 300 }, 2);

    expect(context.transforms).toEqual([{ args: [2, 0, 0, 2, 0, 0] }]);
    expect(context.clears).toEqual([[0, 0, 400, 300]]);
  });

  it('is a separate step from drawing', () => {
    // An overlay that cleared as it drew would erase the photograph it was
    // annotating in the export, and hand the reader a blank PNG.
    expect(draw([EYE_LINE]).clears).toEqual([]);
  });
});
