import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { Breadcrumbs } from './Breadcrumbs';
import type { BreadcrumbEntry } from '@/seo/structured-data.types';

const TRAIL: readonly BreadcrumbEntry[] = [
  { name: 'Home', route: ROUTE_SEGMENTS.home },
  { name: 'United States', route: '/us' },
  { name: 'Passport photo', route: '/us/passport-photo' },
];

describe('Breadcrumbs', () => {
  it('renders nothing at all for an empty trail', () => {
    const { container } = render(<Breadcrumbs entries={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('links every ancestor', () => {
    render(<Breadcrumbs entries={TRAIL} />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'United States' })).toHaveAttribute('href', '/us');
  });

  it('does not link the current page, and marks it as current', () => {
    render(<Breadcrumbs entries={TRAIL} />);

    expect(screen.queryByRole('link', { name: 'Passport photo' })).toBeNull();
    expect(screen.getByText('Passport photo')).toHaveAttribute('aria-current', 'page');
  });

  it('names the landmark so it is distinguishable from other navigation', () => {
    render(<Breadcrumbs entries={TRAIL} />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('hides the decorative separator from assistive technology', () => {
    const { container } = render(<Breadcrumbs entries={TRAIL} />);

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(TRAIL.length - 1);
  });

  it('emits structured data that matches the visible trail exactly', () => {
    // A BreadcrumbList describing a path the reader cannot see is a
    // manual-action risk, so the two are built from the same array.
    const { container } = render(<Breadcrumbs entries={TRAIL} />);

    const raw = container.querySelector('script[type="application/ld+json"]')?.innerHTML ?? '';
    const parsed = JSON.parse(raw) as { itemListElement: { name: string; position: number }[] };

    expect(parsed.itemListElement.map((item) => item.name)).toEqual(TRAIL.map((e) => e.name));
    expect(parsed.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it('handles a single-entry trail', () => {
    render(<Breadcrumbs entries={[TRAIL[0]!]} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Home')).toHaveAttribute('aria-current', 'page');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Breadcrumbs entries={TRAIL} />);

    await expectNoAxeViolations(container);
  });
});
