import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { FaqList } from './FaqList';
import type { FaqEntry } from './FaqList.types';

const ENTRIES: readonly FaqEntry[] = [
  { question: 'Can I wear glasses?', answer: 'Not for a US passport photo, since November 2016.' },
  { question: 'How recent must the photo be?', answer: 'Taken within the last six months.' },
];

describe('FaqList', () => {
  it('renders the heading and every question', () => {
    render(<FaqList heading="Common questions" entries={ENTRIES} />);

    expect(screen.getByRole('heading', { name: 'Common questions' })).toBeInTheDocument();
    for (const entry of ENTRIES) {
      expect(screen.getByText(entry.question)).toBeInTheDocument();
    }
  });

  it('keeps every answer in the DOM while collapsed, so crawlers can read it', () => {
    // The whole reason this is native <details> rather than a JS accordion: the
    // answers are ranking content and feed the FAQPage structured data, so they
    // must exist in the static HTML whether or not anyone has clicked.
    render(<FaqList heading="Common questions" entries={ENTRIES} />);

    for (const entry of ENTRIES) {
      expect(screen.getByText(entry.answer)).toBeInTheDocument();
    }
  });

  it('starts fully collapsed by default', () => {
    const { container } = render(<FaqList heading="Common questions" entries={ENTRIES} />);

    expect(container.querySelectorAll('details[open]')).toHaveLength(0);
  });

  it('can open the first entry to show the pattern is expandable', () => {
    const { container } = render(
      <FaqList heading="Common questions" entries={ENTRIES} openFirst />,
    );

    expect(container.querySelectorAll('details[open]')).toHaveLength(1);
  });

  it('allows more than one answer open at once', () => {
    // Deliberately not an exclusive accordion — people compare two answers.
    const { container } = render(<FaqList heading="Common questions" entries={ENTRIES} />);

    for (const details of container.querySelectorAll('details')) {
      expect(details.hasAttribute('name')).toBe(false);
    }
  });

  it('hides the decorative chevron from assistive technology', () => {
    const { container } = render(<FaqList heading="Common questions" entries={ENTRIES} />);

    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(ENTRIES.length);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FaqList heading="Common questions" entries={ENTRIES} />);

    await expectNoAxeViolations(container);
  });
});
