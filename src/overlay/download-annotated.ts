import { ANNOTATED_EXPORT_MIME, renderAnnotatedCanvas } from './export-annotated-png';
import type { AnnotatedExportCanvas } from './export-annotated-png';
import type { OverlayInstruction } from './overlay-instruction.types';
import type { OverlaySize } from './overlay-transform.utils';

export interface AnnotatedExportTarget extends AnnotatedExportCanvas {
  readonly toBlob: (callback: (blob: Blob | null) => void, type?: string) => void;
}

/**
 * Builds the annotated PNG and hands it to the caller to save.
 *
 * Promise-returning because toBlob is asynchronous, and it is asynchronous for
 * a good reason: encoding a full-resolution photograph to PNG is tens of
 * milliseconds of work that would otherwise be a visible stall on the button
 * press.
 *
 * Resolves false rather than rejecting when the browser cannot produce the
 * image. Failing to export is not exceptional — a canvas above the browser's
 * maximum area declines, and that is a photograph larger than the device can
 * handle rather than a bug — and a caller has to tell the reader either way,
 * which a rejection makes harder rather than easier.
 */
export const buildAnnotatedPng = async (
  canvas: AnnotatedExportTarget,
  image: CanvasImageSource,
  source: OverlaySize,
  instructions: readonly OverlayInstruction[],
): Promise<Blob | undefined> => {
  if (!renderAnnotatedCanvas(canvas, image, source, instructions)) return undefined;

  return new Promise<Blob | undefined>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? undefined), ANNOTATED_EXPORT_MIME);
  });
};
