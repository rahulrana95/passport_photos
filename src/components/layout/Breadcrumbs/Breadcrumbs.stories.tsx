import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Breadcrumbs } from './Breadcrumbs';

const meta = {
  title: 'Layout/Breadcrumbs',
  component: Breadcrumbs,
} satisfies Meta<typeof Breadcrumbs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeLevels: Story = {
  args: {
    entries: [
      { name: 'Home', route: '/' },
      { name: 'United States', route: '/us' },
      { name: 'Passport photo', route: '/us/passport-photo' },
    ],
  },
};

export const SingleLevel: Story = {
  args: { entries: [{ name: 'Home', route: '/' }] },
};

export const LongNamesWrap: Story = {
  args: {
    entries: [
      { name: 'Home', route: '/' },
      { name: 'Schengen area member states', route: '/schengen' },
      { name: 'Short-stay visa photograph requirements', route: '/schengen/visa-photo' },
    ],
  },
};
