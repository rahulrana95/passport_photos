import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COUNTRY_NAMES } from '@/constants/country.constants';
import { FOOTER_FEATURED_COUNTRIES, LEGAL_NAV } from '@/constants/navigation.constants';
import { countryDocumentRoute } from '@/constants/routes.constants';
import { getContent } from '@/content/content.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { SiteFooter } from './SiteFooter';

const content = getContent();

describe('SiteFooter', () => {
  it('links the featured countries through the route builder', () => {
    render(<SiteFooter />);

    for (const country of FOOTER_FEATURED_COUNTRIES) {
      expect(screen.getByRole('link', { name: COUNTRY_NAMES[country] })).toHaveAttribute(
        'href',
        countryDocumentRoute(country, 'passport'),
      );
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
