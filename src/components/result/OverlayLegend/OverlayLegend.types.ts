import type { OverlayLegendItem } from '@/overlay/legend-items.utils';

export interface OverlayLegendProps {
  /** Built from the overlay itself, so it can never describe an absent mark. */
  readonly items: readonly OverlayLegendItem[];
}
