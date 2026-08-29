import {
  failingReport,
  fixtureSpec,
  passingReport,
  undetectableReport,
} from '@/testing/fixtures/compliance-report.builder';
import {
  SAMPLE_PHOTO_HEIGHT_PX,
  SAMPLE_PHOTO_LIGHT,
  SAMPLE_PHOTO_SUBJECT,
  SAMPLE_PHOTO_WIDTH_PX,
} from '@/testing/fixtures/sample-photo.constants';
import { buildOverlay } from '@/overlay/build-overlay';
import { PhotoOverlay } from '../PhotoOverlay/PhotoOverlay';
import { ResultPanel } from './ResultPanel';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Result/ResultPanel',
  component: ResultPanel,
  args: { spec: fixtureSpec(), state: { kind: 'idle' } },
} satisfies Meta<typeof ResultPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Before a photo has been chosen.
 *
 * Worth its own screenshot next to Ready: the two should occupy the same
 * space, because that is the entire claim the skeleton makes.
 */
export const Waiting: Story = {};

export const Analysing: Story = {
  args: { state: { kind: 'analysing', stage: 'segmenting', stageRatio: 0.2 } },
};

export const AllPass: Story = {
  args: { state: { kind: 'ready', report: passingReport(), preview: undefined } },
};

export const Mixed: Story = {
  args: { state: { kind: 'ready', report: failingReport(), preview: undefined } },
};

/** Nothing could be measured — and so nothing is reported as passing. */
export const NothingMeasurable: Story = {
  args: { state: { kind: 'ready', report: undetectableReport(), preview: undefined } },
};

export const Failed: Story = {
  args: { state: { kind: 'failed', error: 'timeout' }, onRetry: () => undefined },
};

export const BrowserUnsupported: Story = {
  args: { state: { kind: 'failed', error: 'worker-unavailable' } },
};

/**
 * The state a reader actually lands in: the answer, and their own photograph
 * with the measurements drawn on it.
 *
 * The whole reason the panel takes children. A row saying the head is four
 * millimetres too tall is a number; the band drawn across the photograph is
 * where that number came from, and it is the difference between being told to
 * retake the photo and knowing how.
 *
 * The annotations come from buildOverlay rather than being written out here,
 * so this story cannot drift into showing marks the product does not draw.
 */
export const WithAnnotatedPhoto: Story = {
  args: {
    state: { kind: 'ready', report: failingReport(), preview: undefined },
    children: (
      <PhotoOverlay
        imageSrc={SAMPLE_PHOTO_LIGHT}
        sourceWidthPx={SAMPLE_PHOTO_WIDTH_PX}
        sourceHeightPx={SAMPLE_PHOTO_HEIGHT_PX}
        instructions={buildOverlay(SAMPLE_PHOTO_SUBJECT, fixtureSpec())}
      />
    ),
  },
};
