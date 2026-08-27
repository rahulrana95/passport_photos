import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { legendItemsFor } from '@/overlay/legend-items.utils';
import { OVERLAY_ROLES } from '@/overlay/overlay-role.constants';
import { OverlayLegend } from './OverlayLegend';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';

const everyMark: readonly OverlayInstruction[] = OVERLAY_ROLES.map((role) => ({
  kind: 'line',
  role,
  fromX: 0,
  fromY: 0,
  toX: 1,
  toY: 0,
}));

/**
 * The key to the marks on the photograph.
 *
 * The swatches sit on a dark plate rather than on the page. These colours were
 * chosen to be read over a photograph on top of a dark halo, and shown against
 * a light surface several of them would misrepresent the mark they stand for.
 */
const meta = {
  title: 'Result/OverlayLegend',
  component: OverlayLegend,
} satisfies Meta<typeof OverlayLegend>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EveryMark: Story = {
  args: { items: legendItemsFor(everyMark) },
};

export const WithoutAnEyeLineRule: Story = {
  args: {
    items: legendItemsFor(everyMark.filter((instruction) => instruction.role !== 'eye-band')),
  },
};
