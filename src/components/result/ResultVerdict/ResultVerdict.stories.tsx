import { RULE_STATUSES } from '@/constants/rule-status.constants';
import { ResultVerdict } from './ResultVerdict';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Result/ResultVerdict',
  component: ResultVerdict,
  args: { status: 'pass' },
} satisfies Meta<typeof ResultVerdict>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pass: Story = {};
export const Fail: Story = { args: { status: 'fail' } };
export const Warning: Story = { args: { status: 'warning' } };
export const Manual: Story = { args: { status: 'manual' } };
export const Undetectable: Story = { args: { status: 'undetectable' } };

/**
 * All five together, which is the only way to check the thing that matters:
 * that they are still distinguishable with the colour taken away.
 */
export const EveryStatus: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {RULE_STATUSES.map((status) => (
        <ResultVerdict key={status} status={status} />
      ))}
    </div>
  ),
};
