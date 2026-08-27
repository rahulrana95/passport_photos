import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { buildOverlay } from '@/overlay/build-overlay';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import {
  SAMPLE_PHOTO_HEIGHT_PX,
  SAMPLE_PHOTO_LIGHT,
  SAMPLE_PHOTO_SUBJECT,
  SAMPLE_PHOTO_WIDTH_PX,
} from '@/testing/fixtures/sample-photo.constants';
import { AnnotatedPhotoDownload } from './AnnotatedPhotoDownload';

const SPEC = resolveSpec(US_PASSPORT, new Date('2026-08-27T00:00:00Z'));

const sampleImage = (): HTMLImageElement => {
  const image = new Image(SAMPLE_PHOTO_WIDTH_PX, SAMPLE_PHOTO_HEIGHT_PX);
  image.src = SAMPLE_PHOTO_LIGHT;
  return image;
};

/**
 * Saving the photograph with its measurements drawn on.
 *
 * Press it in the CannotCompose story to see the failure state: a browser
 * declines a canvas above its maximum area, which is a device limit rather
 * than a bug, so it is reported beside the button instead of thrown — the
 * measurements on the page are unaffected and the reader should not be shown
 * an error over a result that is fine.
 */
const meta = {
  title: 'Result/AnnotatedPhotoDownload',
  component: AnnotatedPhotoDownload,
  args: {
    image: sampleImage(),
    source: { widthPx: SAMPLE_PHOTO_WIDTH_PX, heightPx: SAMPLE_PHOTO_HEIGHT_PX },
    instructions: buildOverlay(SAMPLE_PHOTO_SUBJECT, SPEC),
  },
} satisfies Meta<typeof AnnotatedPhotoDownload>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const CannotCompose: Story = {
  args: {
    createCanvas: () => ({
      width: 0,
      height: 0,
      getContext: () => null,
      toBlob: () => undefined,
    }),
  },
};
