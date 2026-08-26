import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FaqList } from './FaqList';

const meta = {
  title: 'Content/FaqList',
  component: FaqList,
} satisfies Meta<typeof FaqList>;

export default meta;

type Story = StoryObj<typeof meta>;

const ENTRIES = [
  { question: 'Can I wear glasses?', answer: 'Not for a US passport photo. Glasses have been prohibited since November 2016, even without glare.' },
  { question: 'How recent does the photo have to be?', answer: 'Within the last six months. We read the capture date from the file where one is present, but we cannot detect it on a screenshot.' },
  { question: 'Will an AI-edited photo be accepted?', answer: 'No. Since 1 January 2026 the US automatically flags photos touched by AI background replacement or retouching, before a human reviewer sees them.' },
];

export const Collapsed: Story = {
  args: { heading: 'Common questions', entries: ENTRIES },
};

export const FirstOpen: Story = {
  args: { heading: 'Common questions', entries: ENTRIES, openFirst: true },
};

export const LongAnswerOverflow: Story = {
  args: {
    heading: 'Edge case',
    entries: [
      {
        question:
          'What happens if my photo is rejected for a reason that is not listed in the official requirements document published by the issuing authority?',
        answer:
          'Long questions must wrap rather than overflow, and the chevron must stay aligned to the top line rather than drifting to the middle of a three-line summary.',
      },
    ],
    openFirst: true,
  },
};
