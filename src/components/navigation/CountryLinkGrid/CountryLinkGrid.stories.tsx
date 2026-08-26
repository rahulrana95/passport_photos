import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CountryLinkGrid } from './CountryLinkGrid';

const meta = {
  title: 'Navigation/CountryLinkGrid',
  component: CountryLinkGrid,
} satisfies Meta<typeof CountryLinkGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllCountries: Story = {
  args: { heading: 'Passport photo requirements by country', documentType: 'passport' },
};

export const ExcludingCurrentPage: Story = {
  args: {
    heading: 'Other countries',
    documentType: 'passport',
    currentCountry: 'us',
  },
};

export const VisaDocuments: Story = {
  args: { heading: 'Visa photo requirements by country', documentType: 'visa' },
};

export const Mobile: Story = {
  args: { heading: 'Other countries', documentType: 'passport' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
