import { fn } from 'storybook/test';
import { ingestionFailures } from '@/ingestion/ingestion-failure.utils';
import { UploadZone } from './UploadZone';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Upload/UploadZone',
  component: UploadZone,
  // A spy rather than a no-op, so the actions panel shows what a real drop
  // handed over — which is the only way to tell, in Storybook, whether a file
  // was accepted or silently refused.
  args: { onFile: fn() },
} satisfies Meta<typeof UploadZone>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

/**
 * The highlight while a file is over the zone.
 *
 * Driven by a real dragenter rather than a prop, because the dragging state is
 * transient UI the component owns and adding a prop for it would be an API
 * that exists to serve a screenshot. The event is dispatched from a callback
 * ref, which React runs during commit — so the highlighted frame is the first
 * one painted, and the screenshot cannot catch an un-highlighted one.
 */
export const Dragging: Story = {
  decorators: [
    (Story) => (
      <div
        ref={(node) => {
          node?.firstElementChild?.dispatchEvent(new DragEvent('dragenter', { bubbles: true }));
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const Busy: Story = {
  args: { busy: true },
};

/**
 * A refusal, supplied the way the decode stage supplies one.
 *
 * Static rather than produced by dropping a file into the story: reading a
 * file is asynchronous, and a screenshot baseline that depends on a race is a
 * baseline that fails for reasons unrelated to the change under review.
 */
export const Refused: Story = {
  args: { failure: ingestionFailures.heicNotDecodable() },
};

/** The longest refusal there is, which is where the layout gives out first. */
export const RefusedWithMeasurements: Story = {
  args: { failure: ingestionFailures.tooSmall(320, 240) },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
