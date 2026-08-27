import { ANALYSIS_STAGES } from '@/analysis/analysis-protocol.types';
import { AnalysisProgress } from './AnalysisProgress';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Result/AnalysisProgress',
  component: AnalysisProgress,
  args: { stage: 'decoding', stageRatio: 0.5 },
} satisfies Meta<typeof AnalysisProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Starting: Story = { args: { stage: 'decoding', stageRatio: 0 } };

/** The stage that takes most of the wait on a mid-range phone. */
export const Segmenting: Story = { args: { stage: 'segmenting', stageRatio: 0 } };

export const NearlyDone: Story = { args: { stage: 'checking-quality', stageRatio: 0.8 } };

/**
 * Every stage at zero progress within itself.
 *
 * The case the design exists for: a device where no stage reports a useful
 * intermediate ratio still shows a bar that climbs, because reaching a stage
 * advances it.
 */
export const EveryStage: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {ANALYSIS_STAGES.map((stage) => (
        <AnalysisProgress key={stage} stage={stage} stageRatio={0} />
      ))}
    </div>
  ),
};
