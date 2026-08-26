import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SkipLink } from './SkipLink';

/**
 * Visible only when focused. Press Tab in the canvas to reveal it — if it stays
 * hidden on focus, keyboard users have no way past the navigation.
 */
const meta = { title: 'Layout/SkipLink', component: SkipLink } satisfies Meta<typeof SkipLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CustomTarget: Story = { args: { targetId: 'results' } };
