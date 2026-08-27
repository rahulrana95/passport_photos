import { describe, expect, it } from 'vitest';
import { backingStoreSize, fitTransform } from './overlay-transform.utils';

describe('fitting a photograph into a box', () => {
  it('scales a landscape source by its width when the box is taller in proportion', () => {
    expect(fitTransform({ widthPx: 800, heightPx: 400 }, { widthPx: 400, heightPx: 400 })).toEqual({
      scale: 0.5,
      offsetX: 0,
      offsetY: 100,
    });
  });

  it('scales a portrait source by its height', () => {
    // Portrait and landscape need no special case anywhere else in the module
    // precisely because this one function settles it.
    expect(fitTransform({ widthPx: 400, heightPx: 800 }, { widthPx: 400, heightPx: 400 })).toEqual({
      scale: 0.5,
      offsetX: 100,
      offsetY: 0,
    });
  });

  it('never stretches: one scale serves both axes', () => {
    const transform = fitTransform({ widthPx: 300, heightPx: 900 }, { widthPx: 600, heightPx: 600 });

    expect(transform?.scale).toBeCloseTo(2 / 3, 10);
  });

  it('enlarges a source smaller than its box', () => {
    expect(fitTransform({ widthPx: 100, heightPx: 100 }, { widthPx: 300, heightPx: 300 })?.scale).toBe(3);
  });

  it('declines to fit anything into a box with no area', () => {
    // The state the component actually starts in: a container measures zero
    // before layout has run. A transform for it would divide by zero and paint
    // an infinitely wide line.
    expect(fitTransform({ widthPx: 800, heightPx: 400 }, { widthPx: 0, heightPx: 400 })).toBeUndefined();
    expect(fitTransform({ widthPx: 800, heightPx: 400 }, { widthPx: 400, heightPx: 0 })).toBeUndefined();
  });

  it('declines to fit a source with no area', () => {
    expect(fitTransform({ widthPx: 0, heightPx: 400 }, { widthPx: 400, heightPx: 400 })).toBeUndefined();
    expect(fitTransform({ widthPx: 400, heightPx: 0 }, { widthPx: 400, heightPx: 400 })).toBeUndefined();
  });
});

describe('sizing a canvas for the display it is on', () => {
  it('gives the canvas one backing pixel per device pixel', () => {
    // Leave these equal on a retina screen and every line is drawn into half
    // the pixels it is shown in — the soft, doubled edge that makes an overlay
    // look like a screenshot of an overlay.
    expect(backingStoreSize({ widthPx: 400, heightPx: 300 }, 2)).toEqual({
      widthPx: 800,
      heightPx: 600,
    });
  });

  it('rounds rather than truncating a fractional box', () => {
    // A 399.5-pixel box floored to 399 loses a column of the image at the
    // right edge, which on a crop frame is the frame itself.
    expect(backingStoreSize({ widthPx: 399.5, heightPx: 200.4 }, 1)).toEqual({
      widthPx: 400,
      heightPx: 200,
    });
  });

  it('leaves a non-retina canvas alone', () => {
    expect(backingStoreSize({ widthPx: 400, heightPx: 300 }, 1)).toEqual({
      widthPx: 400,
      heightPx: 300,
    });
  });
});
