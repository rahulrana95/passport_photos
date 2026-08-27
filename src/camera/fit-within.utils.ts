export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Scales a size down to fit a longest-edge budget, never up.
 *
 * Never up is the important half. A 320x240 webcam scaled to 1600 would hand
 * the detector four times the pixels and not one extra bit of detail, and
 * would cost that on exactly the machine that had the worst camera in the
 * first place.
 *
 * Rounded to whole pixels, and floored at one: a canvas cannot be 0.4 wide,
 * and getImageData on a zero-sized canvas throws.
 */
export const fitWithin = (widthPx: number, heightPx: number, maxEdgePx: number): PixelSize => {
  const longest = Math.max(widthPx, heightPx);
  if (longest <= maxEdgePx) return { width: widthPx, height: heightPx };

  const scale = maxEdgePx / longest;

  return {
    width: Math.max(1, Math.round(widthPx * scale)),
    height: Math.max(1, Math.round(heightPx * scale)),
  };
};
