import type { AnnotatedExportTarget } from '@/overlay/download-annotated';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';
import type { OverlaySize } from '@/overlay/overlay-transform.utils';

export interface AnnotatedPhotoDownloadProps {
  /**
   * The photograph, already decoded.
   *
   * Not nullable, and that is the point. An undecoded image draws nothing, so
   * an export taken before the load event would be a blank frame with the
   * measurements neatly drawn on it. Making the prop non-null moves that
   * decision to the one place that can actually observe the load — and leaves
   * no "what if there is no image" branch in here that the disabled button
   * would make unreachable anyway.
   */
  readonly image: HTMLImageElement;
  readonly source: OverlaySize;
  readonly instructions: readonly OverlayInstruction[];
  /**
   * Where the export is composed.
   *
   * A port rather than a hard call to document.createElement, because the two
   * things it could be are genuinely different objects: a canvas element today,
   * and an OffscreenCanvas the day a forty-megapixel photograph makes encoding
   * on the main thread worth moving off it. It also lets the success path be
   * tested, which jsdom cannot otherwise reach — it implements no 2D context at
   * all, so without this the only exercised branch would be the failure.
   */
  readonly createCanvas?: () => AnnotatedExportTarget;
}
