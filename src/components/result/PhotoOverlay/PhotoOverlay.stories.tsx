import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { buildOverlay } from '@/overlay/build-overlay';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { UK_PASSPORT } from '@/photo-spec/specs/uk.spec';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import {
  SAMPLE_PHOTO_DARK,
  SAMPLE_PHOTO_HEIGHT_PX,
  SAMPLE_PHOTO_LIGHT,
  SAMPLE_PHOTO_SUBJECT,
  SAMPLE_PHOTO_WIDTH_PX,
} from '@/testing/fixtures/sample-photo.constants';
import { PhotoOverlay } from './PhotoOverlay';

const NOW = new Date('2026-08-27T00:00:00Z');
const US = resolveSpec(US_PASSPORT, NOW);
const UK = resolveSpec(UK_PASSPORT, NOW);

/**
 * The annotated photograph.
 *
 * The pair to compare is Light and Dark. Every stroke here is drawn twice — a
 * dark halo under a light line — because a photograph is not a background you
 * can pick a colour against, and a single-colour overlay always disappears
 * somewhere on somebody's photo. Switch between those two stories and no mark
 * should be harder to see in either.
 */
const meta = {
  title: 'Result/PhotoOverlay',
  component: PhotoOverlay,
  args: {
    imageSrc: SAMPLE_PHOTO_LIGHT,
    sourceWidthPx: SAMPLE_PHOTO_WIDTH_PX,
    sourceHeightPx: SAMPLE_PHOTO_HEIGHT_PX,
    instructions: buildOverlay(SAMPLE_PHOTO_SUBJECT, US),
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PhotoOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LightPhoto: Story = {};

export const DarkPhoto: Story = {
  args: { imageSrc: SAMPLE_PHOTO_DARK },
};

/**
 * A country that publishes no eye-line rule. The yellow band disappears and the
 * legend loses its entry with it — the key is built from the overlay, so it can
 * never promise a mark that is not on the photograph.
 */
export const WithoutAnEyeLineRule: Story = {
  args: { instructions: buildOverlay(SAMPLE_PHOTO_SUBJECT, UK) },
};

/**
 * Segmentation could not find the top of the head. The crown-to-chin measure is
 * absent rather than guessed; the band showing where the head must reach stays,
 * because that comes from the specification and is known either way.
 */
export const CrownNotFound: Story = {
  args: {
    instructions: buildOverlay({ ...SAMPLE_PHOTO_SUBJECT, crownY: undefined }, US),
  },
};

/**
 * Narrow enough that the legend wraps. The annotations must stay legible, and
 * the marks must stay on the face — the canvas is re-fitted, never re-measured.
 */
export const MobileWidth: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * A landscape original. Nothing in the module special-cases orientation: the
 * fit is one function, and the annotations were never told the shape.
 */
export const LandscapeSource: Story = {
  args: {
    sourceWidthPx: SAMPLE_PHOTO_HEIGHT_PX,
    sourceHeightPx: SAMPLE_PHOTO_WIDTH_PX,
  },
};
