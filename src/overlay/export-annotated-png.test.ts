import { describe, expect, it } from 'vitest';
import { RecordingCanvasContext } from '@/testing/recording-canvas';
import { renderAnnotatedCanvas } from './export-annotated-png';
import type { AnnotatedExportCanvas } from './export-annotated-png';
import type { OverlayInstruction } from './overlay-instruction.types';

const SOURCE = { widthPx: 3024, heightPx: 4032 };
const IMAGE = {} as CanvasImageSource;
const INSTRUCTIONS: readonly OverlayInstruction[] = [
  { kind: 'rect', role: 'crop', x: 100, y: 200, widthPx: 1500, heightPx: 1500 },
];

class FakeCanvas implements AnnotatedExportCanvas {
  width = 0;
  height = 0;

  constructor(readonly context: RecordingCanvasContext | null) {}

  getContext(): RecordingCanvasContext | null {
    return this.context;
  }
}

describe('composing the annotated photograph', () => {
  it('works at the original’s full resolution', () => {
    // What the reader is exporting is a record of what we measured, and
    // measurements taken on a 4000-pixel original do not belong on a
    // 400-pixel screenshot of it.
    const canvas = new FakeCanvas(new RecordingCanvasContext());
    renderAnnotatedCanvas(canvas, IMAGE, SOURCE, INSTRUCTIONS);

    expect(canvas.width).toBe(3024);
    expect(canvas.height).toBe(4032);
  });

  it('draws the photograph first, then the marks over it', () => {
    const context = new RecordingCanvasContext();
    renderAnnotatedCanvas(new FakeCanvas(context), IMAGE, SOURCE, INSTRUCTIONS);

    expect(context.images).toEqual([[0, 0, 3024, 4032]]);
    expect(context.strokes.length).toBeGreaterThan(0);
  });

  it('never clears the canvas it was given', () => {
    // The photograph is already on it. A clear here hands the reader a blank
    // PNG of their own photo.
    const context = new RecordingCanvasContext();
    renderAnnotatedCanvas(new FakeCanvas(context), IMAGE, SOURCE, INSTRUCTIONS);

    expect(context.clears).toEqual([]);
  });

  it('draws the marks in source coordinates, unscaled', () => {
    // The export is the identity case of the transform the screen uses.
    const context = new RecordingCanvasContext();
    renderAnnotatedCanvas(new FakeCanvas(context), IMAGE, SOURCE, INSTRUCTIONS);

    expect(context.strokes[0]?.path).toEqual([{ operation: 'rect', args: [100, 200, 1500, 1500] }]);
  });

  it('reports that it could not compose anything without a context', () => {
    // Browsers decline a context when the canvas would exceed their maximum
    // area. A caller that ignored this would save a blank image.
    expect(renderAnnotatedCanvas(new FakeCanvas(null), IMAGE, SOURCE, INSTRUCTIONS)).toBe(false);
  });

  it('reports success when it composed the image', () => {
    expect(
      renderAnnotatedCanvas(new FakeCanvas(new RecordingCanvasContext()), IMAGE, SOURCE, INSTRUCTIONS),
    ).toBe(true);
  });
});
