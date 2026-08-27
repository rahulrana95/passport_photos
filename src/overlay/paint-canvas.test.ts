import { describe, expect, it } from 'vitest';
import { RecordingCanvasContext } from '@/testing/recording-canvas';
import { paintOverlayCanvas } from './paint-canvas';
import type { OverlayCanvas } from './paint-canvas';
import type { OverlayInstruction } from './overlay-instruction.types';

const INSTRUCTIONS: readonly OverlayInstruction[] = [
  { kind: 'rect', role: 'crop', x: 0, y: 0, widthPx: 100, heightPx: 100 },
];

const SOURCE = { widthPx: 1000, heightPx: 1000 };

class FakeCanvas implements OverlayCanvas {
  width = 0;
  height = 0;

  constructor(readonly context: RecordingCanvasContext | null) {}

  getContext(): RecordingCanvasContext | null {
    return this.context;
  }
}

describe('painting a frame', () => {
  it('sizes the backing store for the display', () => {
    const canvas = new FakeCanvas(new RecordingCanvasContext());
    paintOverlayCanvas(canvas, INSTRUCTIONS, SOURCE, { widthPx: 400, heightPx: 300 }, 2);

    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('clears before it draws', () => {
    const context = new RecordingCanvasContext();
    paintOverlayCanvas(new FakeCanvas(context), INSTRUCTIONS, SOURCE, { widthPx: 400, heightPx: 400 }, 1);

    expect(context.clears).toHaveLength(1);
    expect(context.strokes.length).toBeGreaterThan(0);
  });

  it('reports success', () => {
    const painted = paintOverlayCanvas(
      new FakeCanvas(new RecordingCanvasContext()),
      INSTRUCTIONS,
      SOURCE,
      { widthPx: 400, heightPx: 400 },
      1,
    );

    expect(painted).toBe(true);
  });

  it('declines a container that has not been laid out yet', () => {
    // An ordinary state, not an error: it resolves on the next frame, once the
    // ResizeObserver has measured something.
    const canvas = new FakeCanvas(new RecordingCanvasContext());
    const painted = paintOverlayCanvas(canvas, INSTRUCTIONS, SOURCE, { widthPx: 0, heightPx: 0 }, 1);

    expect(painted).toBe(false);
    expect(canvas.width).toBe(0);
  });

  it('declines when the browser will not give it a context', () => {
    // Also ordinary: the overlay simply does not appear over a photograph the
    // reader can still see.
    expect(
      paintOverlayCanvas(new FakeCanvas(null), INSTRUCTIONS, SOURCE, { widthPx: 400, heightPx: 400 }, 1),
    ).toBe(false);
  });
});
