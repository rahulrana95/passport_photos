import { ResultVerdict } from '../ResultVerdict/ResultVerdict';
import { ResultVerdictSkeleton } from './ResultVerdictSkeleton';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Result/ResultVerdictSkeleton',
  component: ResultVerdictSkeleton,
} satisfies Meta<typeof ResultVerdictSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Waiting: Story = {};

/** The placeholder above the block it stands in for, at the same height. */
export const AgainstTheRealVerdict: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <ResultVerdictSkeleton />
      <ResultVerdict status="pass" />
    </div>
  ),
};
