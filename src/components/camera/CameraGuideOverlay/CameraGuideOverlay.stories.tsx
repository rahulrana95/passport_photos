import { CameraGuideOverlay } from './CameraGuideOverlay';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { LiveGuidance } from '@/camera/guidance/guidance.types';

const guidance = (overrides: Partial<LiveGuidance>): LiveGuidance => ({
  primary: 'move-closer',
  unmet: ['move-closer'],
  ready: false,
  headFrameRatio: 0.42,
  ...overrides,
});

const meta = {
  title: 'Camera/CameraGuideOverlay',
  component: CameraGuideOverlay,
  // The overlay is absolutely positioned over a camera feed, so it needs a
  // stage to sit in. The stand-in is a flat panel rather than a photograph:
  // what these stories are for is the scrim, the ring and the instruction.
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '20rem',
          aspectRatio: '3 / 4',
          background: 'var(--tk-sunken)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: { guidance: guidance({}) },
} satisfies Meta<typeof CameraGuideOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MoveCloser: Story = {};

export const Ready: Story = {
  args: { guidance: guidance({ primary: 'ready', unmet: [], ready: true, headFrameRatio: 0.55 }) },
};

export const Starting: Story = {
  args: { guidance: guidance({ headFrameRatio: undefined }), waiting: true },
};

/** The longest instruction there is, which is where the banner gives out first. */
export const LongestInstruction: Story = {
  args: {
    guidance: guidance({
      primary: 'plain-background',
      unmet: ['plain-background'],
      headFrameRatio: 0.51,
    }),
  },
};

export const NoHeadYet: Story = {
  args: { guidance: guidance({ primary: 'no-face', unmet: ['no-face'], headFrameRatio: undefined }) },
};
