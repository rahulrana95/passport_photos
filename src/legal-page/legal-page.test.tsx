import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { getContent } from '@/content/content.registry';
import { LegalPage } from './legal-page';

const content = getContent();

describe('a legal page', () => {
  it('renders every section the content declares', () => {
    // Driven by the content rather than by markup, so a section added to the
    // privacy policy cannot be silently left off the page.
    const { privacy } = content.legalPages;
    render(<LegalPage page={privacy} route={ROUTE_SEGMENTS.privacy} />);

    for (const section of privacy.sections) {
      expect(screen.getByRole('heading', { name: section.heading })).toBeInTheDocument();
    }
  });

  it('renders every paragraph, not only the first of each section', () => {
    const { terms } = content.legalPages;
    render(<LegalPage page={terms} route={ROUTE_SEGMENTS.terms} />);

    const expected = terms.sections.flatMap((section) => section.paragraphs);
    for (const paragraph of expected) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });

  it('says when it was last updated', () => {
    // A legal page with no date is one a reader cannot judge the age of, and
    // these describe behaviour that changes.
    render(<LegalPage page={content.legalPages.privacy} route={ROUTE_SEGMENTS.privacy} />);

    expect(screen.getByText(content.legalPages.privacy.updated)).toBeInTheDocument();
  });

  it('has one h1, and section headings one level below it', () => {
    render(<LegalPage page={content.legalPages.terms} route={ROUTE_SEGMENTS.terms} />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <LegalPage page={content.legalPages.privacy} route={ROUTE_SEGMENTS.privacy} />,
    );

    await expectNoAxeViolations(container);
  });
});
