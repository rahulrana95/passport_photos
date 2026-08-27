import { fn } from 'storybook/test';
import { stubCameraEnvironment } from '@/testing/camera-environment.stub';
import { CameraCapture } from './CameraCapture';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

/** A US-shaped specification. Only the fields guidance reads are populated. */
const US_SPEC = {
  print: { widthMm: 51, heightMm: 51, dpi: 300 },
  headHeight: { minMm: 25, maxMm: 35, minRatio: 0.49, maxRatio: 0.69, authoredUnit: 'mm' },
  background: { colour: 'white', hexRanges: [['#e0e0e0', '#ffffff']], uniformityTolerance: 12 },
} as unknown as ResolvedPhotoSpec;

const meta = {
  title: 'Camera/CameraCapture',
  component: CameraCapture,
  args: {
    spec: US_SPEC,
    onCapture: fn(),
    // A camera that never existed. Storybook runs in a browser that may well
    // have a real one, and a story that asked for permission every time it
    // rendered would make the screenshot suite unrunnable.
    environment: stubCameraEnvironment(),
    analyse: async () => ({ landmarks: undefined, segmentation: undefined }),
  },
} satisfies Meta<typeof CameraCapture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const WithUploadFallback: Story = {
  args: { onUploadInstead: fn() },
};

export const PermissionDenied: Story = {
  args: {
    environment: stubCameraEnvironment({
      reject: Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
    }),
    onUploadInstead: fn(),
  },
  decorators: [
    (Story) => (
      <div
        ref={(node) => {
          // Pressed from a callback ref, which React runs during commit, so
          // the refused state is the first frame painted. A play function
          // would race the screenshot.
          node?.querySelector('button')?.click();
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const NoCameraOnThisDevice: Story = {
  args: {
    environment: stubCameraEnvironment({
      reject: Object.assign(new Error('none'), { name: 'NotFoundError' }),
    }),
    onUploadInstead: fn(),
  },
  decorators: [
    (Story) => (
      <div
        ref={(node) => {
          node?.querySelector('button')?.click();
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const Mobile: Story = {
  args: { onUploadInstead: fn() },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
