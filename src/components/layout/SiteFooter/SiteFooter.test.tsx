import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { footerCountryLinks } from './footer-links.utils';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COUNTRY_NAMES } from '@/constants/country.constants';
import { FOOTER_FEATURED_COUNTRIES, LEGAL_NAV } from '@/constants/navigation.constants';
import { countryDocumentRoute } from '@/constants/routes.constants';
import { getContent } from '@/content/content.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { SiteFooter } from './SiteFooter';

const content = getContent();

/** The countries that actually have a page, which is what the footer may link. */
const servedCountries = (): ReadonlySet<string> =>
  new Set(listServableSpecs().map((spec) => spec.country));

describe('SiteFooter', () => {
  it('links each featured country through the route builder', () => {
    render(<SiteFooter />);

    for (const link of footerCountryLinks()) {
      expect(screen.getByRole('link', { name: COUNTRY_NAMES[link.country] })).toHaveAttribute(
        'href',
        countryDocumentRoute(link.country, link.document),
      );
    }
  });

  it('links a country to a document it actually issues', () => {
    // Every link used to be hard-coded to `passport`, so the Schengen entry
    // pointed at a passport page that does not exist — the Schengen
    // specification is a visa. A footer renders on every route, so that was a
    // broken link on every page of the site.
    render(<SiteFooter />);

    for (const link of footerCountryLinks()) {
      const href = screen
        .getByRole('link', { name: COUNTRY_NAMES[link.country] })
        .getAttribute('href');

      expect(
        listServableSpecs().some(
          (spec) => href === countryDocumentRoute(spec.country, spec.document),
        ),
      ).toBe(true);
    }
  });

  it('shows no legal column while there are no legal pages', () => {
    // A heading with nothing under it reads as a rendering fault, and linking
    // Privacy to a 404 from every page is worse than not linking it at all.
    render(<SiteFooter legalLinks={[]} />);

    expect(screen.queryByRole('heading', { name: 'Legal' })).not.toBeInTheDocument();
  });

  it('shows the legal column once there are pages to link', () => {
    render(<SiteFooter legalLinks={[{ label: 'Privacy', href: '/privacy' }]} />);

    expect(screen.getByRole('heading', { name: 'Legal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
  });

  it('offers no country that has no page', () => {
    // The footer renders on every route, so a featured country with no page is
    // not one broken link — it is one on every page of the site. Four of the
    // six were exactly that until a crawl of the country pages caught them.
    render(<SiteFooter />);

    const unserved = FOOTER_FEATURED_COUNTRIES.filter(
      (country) => !servedCountries().has(country),
    );
    expect(unserved.length).toBeGreaterThan(0);

    for (const country of unserved) {
      expect(screen.queryByRole('link', { name: COUNTRY_NAMES[country] })).not.toBeInTheDocument();
    }
  });

  it('features a curated subset rather than the whole registry', () => {
    // 100+ links on every page dilutes what each one passes and adds weight to
    // a template that renders on every route.
    render(<SiteFooter />);

    expect(FOOTER_FEATURED_COUNTRIES.length).toBeLessThan(12);
  });

  it('accepts an override list', () => {
    render(<SiteFooter featuredCountries={['us']} />);

    expect(screen.getByRole('link', { name: COUNTRY_NAMES.us })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: COUNTRY_NAMES.uk })).toBeNull();
  });

  it('ignores an unknown slug rather than rendering a broken link', () => {
    render(<SiteFooter featuredCountries={['us', 'atlantis']} />);

    expect(screen.queryByRole('link', { name: /atlantis/i })).toBeNull();
    expect(screen.getByRole('link', { name: COUNTRY_NAMES.us })).toBeInTheDocument();
  });

  it('links the legal pages', () => {
    render(<SiteFooter />);

    for (const link of LEGAL_NAV) {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    }
  });

  it('states the privacy claim', () => {
    render(<SiteFooter />);

    expect(screen.getByText(content.legal.privacyClaim)).toBeInTheDocument();
  });

  it('carries the acceptance disclaimer on every page, not only beside a result', () => {
    render(<SiteFooter />);

    expect(screen.getByText(content.legal.acceptanceDisclaimer)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SiteFooter />);

    await expectNoAxeViolations(container);
  });
});
