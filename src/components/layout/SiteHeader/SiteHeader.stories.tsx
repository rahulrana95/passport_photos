import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PRIMARY_NAV } from '@/constants/navigation.constants';
import { SiteHeader } from './SiteHeader';

/**
 * Below the small breakpoint the disclosure replaces the inline nav. Both render
 * the same links into the HTML, so the internal link graph is visible to a
 * crawler at any width.
 */
const meta = {
  title: 'Layout/SiteHeader',
  component: SiteHeader,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SiteHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ActiveNavItem: Story = {
  args: { currentPath: PRIMARY_NAV[0]?.href ?? '/' },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
