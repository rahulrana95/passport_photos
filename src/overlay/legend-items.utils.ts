import { OVERLAY_ROLE_STYLES, OVERLAY_ROLES } from './overlay-role.constants';
import type { OverlayInstruction } from './overlay-instruction.types';
import type { OverlayRole, OverlayRoleStyle } from './overlay-role.constants';

export interface OverlayLegendItem {
  readonly role: OverlayRole;
  readonly style: OverlayRoleStyle;
}

/**
 * The key to an overlay, built from the overlay itself.
 *
 * Derived rather than authored, so a legend cannot describe a mark that is not
 * on the photograph. That happens the moment the two are written separately:
 * an eye-line band is drawn only where the country publishes one, and a fixed
 * legend would keep promising a yellow dashed line that a reader in a country
 * without an eye-line rule would then hunt for and never find.
 *
 * Ordered by the role list rather than by first appearance, so the key reads
 * the same way for every photograph.
 */
export const legendItemsFor = (
  instructions: readonly OverlayInstruction[],
): readonly OverlayLegendItem[] => {
  const present = new Set(instructions.map((instruction) => instruction.role));

  return OVERLAY_ROLES.filter((role) => present.has(role)).map((role) => ({
    role,
    style: OVERLAY_ROLE_STYLES[role],
  }));
};
