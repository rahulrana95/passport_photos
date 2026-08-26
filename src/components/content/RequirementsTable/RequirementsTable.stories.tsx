import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RequirementsTable } from './RequirementsTable';

const meta = {
  title: 'Content/RequirementsTable',
  component: RequirementsTable,
} satisfies Meta<typeof RequirementsTable>;

export default meta;

type Story = StoryObj<typeof meta>;

const US_ROWS = [
  { label: 'Photo size', value: '51 × 51 mm (2 × 2 in)' },
  { label: 'Head height', value: '25–35 mm', note: 'Measured from the bottom of the chin to the top of the head, including hair.' },
  { label: 'Eye line', value: '28–35 mm from the bottom edge' },
  { label: 'Background', value: 'Plain white or off-white', note: 'No shadows, no pattern, no texture.' },
  { label: 'Resolution', value: 'At least 600 × 600 px' },
  { label: 'File size', value: 'Under 240 KB, JPEG' },
  { label: 'Glasses', value: 'Not permitted', note: 'Prohibited since November 2016, even without glare.' },
  { label: 'Expression', value: 'Neutral, mouth closed, both eyes open' },
];

export const WithProvenance: Story = {
  args: {
    caption: 'United States passport photo requirements',
    rows: US_ROWS,
    sourceUrl: 'https://travel.state.gov/content/travel/en/passports/how-apply/photos.html',
    verifiedOn: '2026-08-20',
  },
};

export const WithoutProvenance: Story = {
  args: { caption: 'Draft requirements', rows: US_ROWS.slice(0, 3) },
};

export const Mobile: Story = {
  args: {
    caption: 'United States passport photo requirements',
    rows: US_ROWS,
    sourceUrl: 'https://travel.state.gov/example',
    verifiedOn: '2026-08-20',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
