import { HALF } from './overlay-layout.constants';

export interface OverlaySize {
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * How source-image coordinates map onto the canvas.
 *
 * One scale for both axes, so the photograph is never stretched, and offsets
 * that centre it in whatever box it was given. This is `object-fit: contain`
 * expressed as numbers — deliberately, because the photograph beneath the
 * overlay is an <img> laid out by the browser with exactly that rule, and any
 * other fit here would leave the annotations sliding off the face they annotate.
 */
export interface OverlayTransform {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * Fits a source image into a container, centred.
 *
 * Returns undefined when either box has no area. That is not a defensive
 * flourish: a container measures zero on the first frame, before layout has
 * run and before a ResizeObserver has fired, and it is the state the component
 * actually starts in. Returning a transform for it would divide by zero and
 * paint an infinitely wide line; saying there is nothing to fit lets the caller
 * wait one frame, which is what it should do anyway.
 */
export const fitTransform = (
  source: OverlaySize,
  container: OverlaySize,
): OverlayTransform | undefined => {
  const hasArea =
    source.widthPx > 0 && source.heightPx > 0 && container.widthPx > 0 && container.heightPx > 0;
  if (!hasArea) return undefined;

  const scale = Math.min(
    container.widthPx / source.widthPx,
    container.heightPx / source.heightPx,
  );

  return {
    scale,
    offsetX: (container.widthPx - source.widthPx * scale) / HALF,
    offsetY: (container.heightPx - source.heightPx * scale) / HALF,
  };
};

/**
 * The backing-store size a canvas needs to stay sharp on the display it is on.
 *
 * A canvas has two sizes: the box CSS gives it, and the pixel grid it actually
 * owns. Leave them equal on a retina screen and every line is drawn into half
 * the pixels it is shown in, which is exactly the soft, doubled edge that makes
 * an overlay look like a screenshot of an overlay.
 *
 * Rounded rather than truncated, because a 399.5-pixel box floored to 399 loses
 * a column of the image at the right edge.
 */
export const backingStoreSize = (css: OverlaySize, devicePixelRatio: number): OverlaySize => ({
  widthPx: Math.round(css.widthPx * devicePixelRatio),
  heightPx: Math.round(css.heightPx * devicePixelRatio),
});
