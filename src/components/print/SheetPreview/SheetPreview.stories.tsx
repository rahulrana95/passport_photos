import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { planSheet } from '@/sheet/sheet-layout.utils';
import { SHEET_SIZES } from '@/sheet/sheet-size.constants';
import { SAMPLE_PHOTO_LIGHT } from '@/testing/fixtures/sample-photo.constants';
import { SheetPreview } from './SheetPreview';
import type { SheetPlan } from '@/sheet/sheet-layout.types';

const planFor = (sheetId: keyof typeof SHEET_SIZES, photo: { widthMm: number; heightMm: number }): SheetPlan => {
  const sheet = SHEET_SIZES[sheetId];
  const result = planSheet(sheet, photo, { marginMm: sheet.marginMm });
  if (!result.ok) throw new Error('The story sheet must hold a photograph.');
  return result.plan;
};

const EU = { widthMm: 35, heightMm: 45 };
const US = { widthMm: 50.8, heightMm: 50.8 };

/**
 * What the printed sheet will look like.
 *
 * Compare the three sheet sizes: six copies of a 35x45 photograph fit on both
 * 4x6 inches and 10x15cm — which are not the same size, a millimetre and a half
 * apart in each direction — and thirty fit on A4.
 */
const meta = {
  title: 'Print/SheetPreview',
  component: SheetPreview,
  args: { photoSrc: SAMPLE_PHOTO_LIGHT },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SheetPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FourBySixInches: Story = {
  args: { plan: planFor('4x6in', EU) },
};

export const TenByFifteenCentimetres: Story = {
  args: { plan: planFor('10x15cm', EU) },
};

export const A4: Story = {
  args: { plan: planFor('a4', EU) },
};

/** A 50.8mm square is a large photograph. Two on a 4x6 is the honest answer. */
export const LargeSquarePhoto: Story = {
  args: { plan: planFor('4x6in', US) },
};

/** Laid on its side, because turning it fits four instead of three. */
export const PhotographTurned: Story = {
  args: {
    plan: (() => {
      const result = planSheet(
        { widthMm: 100, heightMm: 60 },
        { widthMm: 30, heightMm: 50 },
        { marginMm: 0, gutterMm: 0 },
      );
      if (!result.ok) throw new Error('The story must place a photograph.');
      return result.plan;
    })(),
  },
};

export const WithoutAPhotograph: Story = {
  args: { plan: planFor('4x6in', EU), photoSrc: undefined },
};
