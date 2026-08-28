import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COUNTRY_NAMES, COUNTRY_SLUGS } from '@/constants/country.constants';
import { listServedCountries } from '@/photo-spec/photo-spec.registry';
import { countryDocumentRoute } from '@/constants/routes.constants';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { CountryLinkGrid } from './CountryLinkGrid';

describe('CountryLinkGrid', () => {
  it('links every country served by default', () => {
    render(<CountryLinkGrid heading="Other countries" documentType="passport" />);

    expect(screen.getAllByRole('link')).toHaveLength(listServedCountries().length);
  });

  it('links no country that has no page', () => {
    // A slug is declared as soon as somebody intends to cover a country; the
    // page exists only once a spec has been verified. Linking by slug puts
    // 404s in our own navigation, which a crawler records as a broken site.
    render(<CountryLinkGrid heading="Other countries" documentType="passport" />);

    const served = new Set(listServedCountries());
    const unserved = COUNTRY_SLUGS.filter((slug) => !served.has(slug));

    expect(unserved.length, 'this test is vacuous once every slug is served').toBeGreaterThan(0);
    for (const slug of unserved) {
      expect(
        screen.queryByRole('link', { name: new RegExp(COUNTRY_NAMES[slug]) }),
        `${slug} has no page and must not be linked`,
      ).toBeNull();
    }
  });

  it('renders real anchors with an href, not script-driven navigation', () => {
    // A Select that navigates on change is invisible to crawlers. This grid is
    // how authority flows between pages that would otherwise be islands.
    render(<CountryLinkGrid heading="Other countries" documentType="passport" />);

    for (const link of screen.getAllByRole('link')) {
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBeTruthy();
    }
  });

  it('builds hrefs through the route builder', () => {
    render(<CountryLinkGrid heading="Other countries" documentType="visa" />);

    expect(screen.getByRole('link', { name: /United States/ })).toHaveAttribute(
      'href',
      countryDocumentRoute('us', 'visa'),
    );
  });

  it('never links a page to itself', () => {
    render(
      <CountryLinkGrid heading="Other countries" documentType="passport" currentCountry="us" />,
    );

    expect(screen.queryByRole('link', { name: new RegExp(COUNTRY_NAMES.us) })).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(listServedCountries().length - 1);
  });

  it('accepts a narrowed country list', () => {
    render(
      <CountryLinkGrid heading="Nearby" documentType="passport" countries={['uk', 'schengen']} />,
    );

    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('names the navigation landmark, so it is distinguishable from the header nav', () => {
    render(<CountryLinkGrid heading="Other countries" documentType="passport" />);

    expect(screen.getByRole('navigation', { name: 'Other countries' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CountryLinkGrid heading="Other countries" documentType="passport" />,
    );

    await expectNoAxeViolations(container);
  });
});
