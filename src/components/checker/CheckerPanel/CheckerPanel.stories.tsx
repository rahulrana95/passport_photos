import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { CheckerPanel } from './CheckerPanel';
import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { DecodedImage, ImageDecoder } from '@/ingestion/image-decoder.types';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/** Fixed, so a story rendered twice is the same story. */
const NOW = new Date('2026-01-01T00:00:00Z');

const SPECS = listServableSpecs().map((spec) => resolveSpec(spec, NOW));

/**
 * A photograph large enough for ingestion to accept, and nothing more.
 *
 * The real decoder needs createImageBitmap and an OffscreenCanvas; a story does
 * not, and giving it one would make every screenshot depend on a decode. What
 * these stories are for is the panel around the photograph — the picker, the
 * dropzone, where each kind of failure appears.
 */
const DECODED_EDGE_PX = 600;
const BYTES_PER_PIXEL = 4;
const OPAQUE = 255;

const decodedImage = (): DecodedImage => ({
  source: { widthPx: DECODED_EDGE_PX, heightPx: DECODED_EDGE_PX },
  working: {
    width: DECODED_EDGE_PX,
    height: DECODED_EDGE_PX,
    data: new Uint8ClampedArray(DECODED_EDGE_PX * DECODED_EDGE_PX * BYTES_PER_PIXEL).fill(OPAQUE),
  },
  isAnimated: false,
});

const stubDecoder: ImageDecoder = {
  decode: async (): Promise<DecodedImage> => await Promise.resolve(decodedImage()),
  canDecode: (): boolean => true,
};

/**
 * An analysis that finds nothing, which is what a blank frame really contains.
 *
 * Honest rather than convenient: inventing landmarks here would put a passing
 * report on screen for a photograph that has no face in it, and the report
 * states of the panel below already have their own stories.
 */
const findsNothing = async (): Promise<AnalysisResult> =>
  await Promise.resolve({ landmarks: undefined, segmentation: undefined });

const meta = {
  title: 'Checker/CheckerPanel',
  component: CheckerPanel,
  args: { specs: SPECS, decoder: stubDecoder, analyse: findsNothing },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CheckerPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Before a photo has been chosen: the whole product, waiting. */
export const Waiting: Story = {};

/**
 * One specification, so the picker collapses to a single choice.
 *
 * Worth a screenshot: the fieldset must not look broken when a country page
 * offers only its own document.
 */
export const SingleSpecification: Story = {
  args: { specs: SPECS.slice(0, 1) },
};

/**
 * No specification at all — an empty registry.
 *
 * Renders nothing, deliberately. A dropzone with nothing to check against would
 * invite a photograph and then have nowhere to take it.
 */
export const NothingToCheckAgainst: Story = {
  args: { specs: [] },
};
