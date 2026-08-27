import type { OverlaySize } from '@/overlay/overlay-transform.utils';

/**
 * The size a container has before layout has measured it.
 *
 * A real state rather than a placeholder: the first render happens before any
 * ResizeObserver has fired, and painting into a box of no area is what produces
 * a divide by zero and an infinitely wide line.
 */
export const EMPTY_OVERLAY_SIZE: OverlaySize = { widthPx: 0, heightPx: 0 };
