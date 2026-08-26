import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TOKEN_GROUPS } from '@/theme/design-tokens.constants';
import { TokenGallery } from './TokenGallery';

/**
 * Switch the toolbar theme control to review every token in both schemes. Any
 * swatch that looks identical across the two is a token that was updated in one
 * theme and forgotten in the other.
 */
const meta = {
  title: 'Design system/Tokens',
  component: TokenGallery,
} satisfies Meta<typeof TokenGallery>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllTokens: Story = {};

export const ColourOnly: Story = {
  args: { groups: TOKEN_GROUPS.filter((group) => group.heading === 'Colour') },
};

export const ScalesOnly: Story = {
  args: { groups: TOKEN_GROUPS.filter((group) => group.heading !== 'Colour') },
};
