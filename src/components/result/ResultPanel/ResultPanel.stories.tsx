import {
  failingReport,
  fixtureSpec,
  passingReport,
  undetectableReport,
} from '@/testing/fixtures/compliance-report.builder';
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
  args: { state: { kind: 'ready', report: passingReport() } },
};

export const Mixed: Story = {
  args: { state: { kind: 'ready', report: failingReport() } },
};

/** Nothing could be measured — and so nothing is reported as passing. */
export const NothingMeasurable: Story = {
  args: { state: { kind: 'ready', report: undetectableReport() } },
};

export const Failed: Story = {
  args: { state: { kind: 'failed', error: 'timeout' }, onRetry: () => undefined },
};

export const BrowserUnsupported: Story = {
  args: { state: { kind: 'failed', error: 'worker-unavailable' } },
};
