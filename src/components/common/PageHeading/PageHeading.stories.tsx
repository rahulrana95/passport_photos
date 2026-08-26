import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageHeading } from './PageHeading';

const meta = {
  title: 'Common/PageHeading',
  component: PageHeading,
} satisfies Meta<typeof PageHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithDescription: Story = {
  args: {
    title: 'Check your passport or visa photo before you submit it',
    description:
      'Check a passport or visa photo against the official requirements for your country. Runs entirely in your browser.',
  },
};

export const TitleOnly: Story = {
  args: { title: 'US passport photo requirements' },
};

export const LongTitleOverflow: Story = {
  args: {
    title:
      'Requirements for a Schengen visa photograph submitted to a consulate outside the European Union',
    description: 'Long titles must wrap and balance rather than overflow their container.',
  },
};

export const Mobile: Story = {
  args: {
    title: 'Check your passport or visa photo',
    description: 'The type scale steps down below the small breakpoint.',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
