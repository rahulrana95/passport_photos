import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SiteFooter } from './SiteFooter';

const meta = {
  title: 'Layout/SiteFooter',
  component: SiteFooter,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SiteFooter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleCountry: Story = {
  args: { featuredCountries: ['us'] },
};

/**
 * The footer once the privacy page and the terms exist.
 *
 * Worth its own screenshot: the column is hidden while there is nothing to put
 * in it, and a heading over an empty list is the thing that would look wrong.
 */
export const WithLegalLinks: Story = {
  args: {
    legalLinks: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
