import { drawOverlay } from './draw-overlay';
import type { OverlayDrawingContext } from './draw-overlay';
import type { OverlayInstruction } from './overlay-instruction.types';
import type { OverlaySize } from './overlay-transform.utils';

/**
 * A canvas the annotated image is composed on.
 *
 * Structural, like the drawing context, so the composition can be tested
 * without a canvas implementation. It also keeps the door open for an
 * OffscreenCanvas, which is the same shape and would let this run off the main
 * thread if a very large photograph ever makes it worth doing.
 */
export interface AnnotatedExportContext extends OverlayDrawingContext {
  drawImage: (image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number) => void;
}

export interface AnnotatedExportCanvas {
  width: number;
  height: number;
  getContext: (contextId: '2d') => AnnotatedExportContext | null;
}

export const ANNOTATED_EXPORT_MIME = 'image/png';

/**
 * Composes the photograph and its annotations at full source resolution.
 *
 * FULL RESOLUTION, not the size it was displayed at. What the reader is
 * exporting is a record of what we measured, and measurements made on a
 * 4000-pixel original do not belong on a 400-pixel screenshot of it — the marks
 * would land in the right places on an image with too little detail to check
 * them against.
 *
 * Drawn at scale 1 with no offset for the same reason: source pixels are the
 * coordinate space the instructions are already in, so the export is the
 * identity case of the transform the screen uses.
 *
 * Returns false when the canvas cannot give a 2D context, which browsers do
 * when the image would exceed their maximum canvas area. A caller that ignored
 * it would hand the reader a blank PNG of their own photograph.
 */
export const renderAnnotatedCanvas = (
  canvas: AnnotatedExportCanvas,
  image: CanvasImageSource,
  source: OverlaySize,
  instructions: readonly OverlayInstruction[],
): boolean => {
  canvas.width = source.widthPx;
  canvas.height = source.heightPx;

  const context = canvas.getContext('2d');
  if (context === null) return false;

  context.drawImage(image, 0, 0, source.widthPx, source.heightPx);
  drawOverlay(context, instructions, { scale: 1, offsetX: 0, offsetY: 0 }, 1);

  return true;
};
