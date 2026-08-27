import { RuleResultRow } from '../RuleResultRow/RuleResultRow';
import { RuleResultRowSkeleton } from './RuleResultRowSkeleton';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Result/RuleResultRowSkeleton',
  component: RuleResultRowSkeleton,
} satisfies Meta<typeof RuleResultRowSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithMeasurement: Story = {};

export const WithoutMeasurement: Story = { args: { withMeasurement: false } };

/**
 * The only comparison worth screenshotting: a placeholder above the row it
 * stands in for. If the two boxes are ever different heights, it shows here.
 */
export const AgainstTheRealRow: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <RuleResultRowSkeleton />
      <RuleResultRow label="Head height" status="pass" measurement="31mm" requirement="25–35mm" />
      <RuleResultRowSkeleton withMeasurement={false} />
      <RuleResultRow label="Glasses" status="manual" />
    </div>
  ),
};
