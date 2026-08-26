import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RuleResultRow } from './RuleResultRow';

/**
 * Switch the toolbar to dark, and try Windows High Contrast, to confirm the
 * outcome is still readable. Under forced-colors every status colour collapses
 * to CanvasText — the icon and the label are what carry the meaning.
 */
const meta = {
  title: 'Result/RuleResultRow',
  component: RuleResultRow,
} satisfies Meta<typeof RuleResultRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pass: Story = {
  args: { label: 'Head height', status: 'pass', measurement: '31.2 mm', requirement: '25–35 mm' },
};

export const Fail: Story = {
  args: {
    label: 'Head height',
    status: 'fail',
    measurement: '21.4 mm',
    requirement: '25–35 mm',
    fixInstruction: 'Your head fills 41% of the frame; this country needs 50–69%. Move about 30cm closer to the camera and retake.',
  },
};

export const Warning: Story = {
  args: {
    label: 'Background uniformity',
    status: 'warning',
    measurement: '11.6 σ',
    requirement: 'below 12 σ',
    fixInstruction: 'Close, but the wall behind you has a faint shadow. Step further away from it if you can.',
  },
};

export const ManualCheck: Story = {
  args: {
    label: 'Glasses',
    status: 'manual',
    fixInstruction: 'We cannot detect glasses reliably. The US has prohibited them since November 2016 — check your photo yourself.',
  },
};

export const Undetectable: Story = {
  args: {
    label: 'Photo age',
    status: 'undetectable',
    fixInstruction: 'This file carries no capture date, which usually means it is a screenshot. Use the original from your camera.',
  },
};

export const LongContentOverflow: Story = {
  args: {
    label: 'Distance between the outer corners of the eyes measured horizontally',
    status: 'fail',
    measurement: '412.88888 px',
    requirement: 'at least 240 px',
    fixInstruction:
      'Long labels and long measurements must wrap rather than push the row sideways, and the icon must stay aligned to the first line.',
  },
};
