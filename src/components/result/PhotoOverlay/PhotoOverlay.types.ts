import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';

/**
 * A photograph the browser has finished decoding, and the source it came from.
 *
 * The source is carried because the <img> element is reused when a new
 * photograph arrives: nothing about the element identifies which source it
 * currently holds pixels for, so without this the download button would stay
 * live over the previous image for as long as the new one takes to decode —
 * on a phone photograph, long enough to press.
 */
export interface DecodedPhoto {
  readonly element: HTMLImageElement;
  readonly src: string;
}

export interface PhotoOverlayProps {
  /** Object URL of the photograph. It never leaves the device. */
  readonly imageSrc: string;
  readonly sourceWidthPx: number;
  readonly sourceHeightPx: number;
  readonly instructions: readonly OverlayInstruction[];
}
