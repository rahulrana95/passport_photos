import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/content.registry';
import { legendItemsFor } from '@/overlay/legend-items.utils';
import { OVERLAY_ROLE_STYLES, OVERLAY_ROLES } from '@/overlay/overlay-role.constants';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { OverlayLegend } from './OverlayLegend';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';

const content = getContent();

const everyRole: readonly OverlayInstruction[] = OVERLAY_ROLES.map((role) => ({
  kind: 'line',
  role,
  fromX: 0,
  fromY: 0,
  toX: 1,
  toY: 0,
}));

describe('OverlayLegend', () => {
  it('names every mark on the photograph in words', () => {
    // The canvas draws no text at all — a caption inside a bitmap cannot be
    // read aloud, selected or translated. This list is the only place the
    // marks are named, so it has to name all of them.
    render(<OverlayLegend items={legendItemsFor(everyRole)} />);

    for (const role of OVERLAY_ROLES) {
      expect(screen.getByText(content.overlay.roles[role])).toBeInTheDocument();
    }
  });

  it('describes only the marks it was given', () => {
    render(<OverlayLegend items={legendItemsFor([everyRole[0] as OverlayInstruction])} />);

    expect(screen.queryByText(content.overlay.roles['eye-band'])).not.toBeInTheDocument();
  });

  it('distinguishes a limit from a measurement by pattern, not only colour', () => {
    // Roughly one man in twelve cannot separate these hues, and a printed
    // report may be photocopied to grey.
    const { container } = render(<OverlayLegend items={legendItemsFor(everyRole)} />);
    const dashed = container.querySelectorAll('[data-dashed="true"]');

    const dashedRoles = OVERLAY_ROLES.filter(
      (role) => OVERLAY_ROLE_STYLES[role].dashPx.length > 0,
    );

    expect(dashed).toHaveLength(dashedRoles.length);
    expect(dashedRoles.length).toBeGreaterThan(0);
  });

  it('hides the swatches from assistive technology', () => {
    // They carry no information the adjacent text does not.
    const { container } = render(<OverlayLegend items={legendItemsFor(everyRole)} />);

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(OVERLAY_ROLES.length);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OverlayLegend items={legendItemsFor(everyRole)} />);

    await expectNoAxeViolations(container);
  });
});
