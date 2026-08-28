import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { getContent } from '@/content/content.registry';
import { LegalPage } from './legal-page';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const content = getContent();

const meta = {
  title: 'Legal/LegalPage',
  component: LegalPage,
} satisfies Meta<typeof LegalPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Privacy: Story = {
  args: { page: content.legalPages.privacy, route: ROUTE_SEGMENTS.privacy },
};

export const Terms: Story = {
  args: { page: content.legalPages.terms, route: ROUTE_SEGMENTS.terms },
};

/**
 * One section and one paragraph, which is what a page looks like the day
 * somebody adds a third policy and has not written it yet.
 */
export const Minimal: Story = {
  args: {
    page: {
      title: 'Cookies',
      metaTitle: 'Cookies',
      metaDescription: 'What this site stores in your browser.',
      updated: 'Last updated 28 August 2026',
      sections: [{ heading: 'Cookies', paragraphs: ['This site sets none.'] }],
    },
    route: ROUTE_SEGMENTS.privacy,
  },
};
