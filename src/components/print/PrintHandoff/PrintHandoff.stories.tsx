import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PrintHandoff } from './PrintHandoff';

/**
 * The half of the job software cannot do.
 *
 * Compare UnitedStates with Japan: where we can name shops honestly we do, and
 * where we cannot the reader gets generic advice rather than a chain from
 * another continent.
 */
const meta = {
  title: 'Print/PrintHandoff',
  component: PrintHandoff,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PrintHandoff>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UnitedStates: Story = { args: { country: 'us' } };

export const UnitedKingdom: Story = { args: { country: 'uk' } };

/** No shops named, and the copy says so rather than filling the space. */
export const Japan: Story = { args: { country: 'japan' } };
