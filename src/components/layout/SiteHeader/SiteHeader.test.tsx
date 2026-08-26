import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PRIMARY_NAV } from '@/constants/navigation.constants';
import { SITE_NAME } from '@/constants/site.constants';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { SiteHeader } from './SiteHeader';

const renderHeader = (props?: Parameters<typeof SiteHeader>[0]): ReturnType<typeof render> =>
  render(
    <MantineProvider defaultColorScheme="auto">
      <SiteHeader {...props} />
    </MantineProvider>,
  );

describe('SiteHeader', () => {
  it('links the brand home', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: SITE_NAME })).toHaveAttribute('href', '/');
  });

  it('renders every primary nav item as a real anchor', () => {
    renderHeader();

    for (const link of PRIMARY_NAV) {
      const anchors = screen.getAllByRole('link', { name: link.label });
      expect(anchors.length).toBeGreaterThan(0);
      for (const anchor of anchors) {
        expect(anchor.tagName).toBe('A');
        expect(anchor).toHaveAttribute('href', link.href);
      }
    }
  });

  it('keeps the mobile menu links in the DOM while it is closed', () => {
    // This is why the mobile menu is a native <details> rather than a JS drawer:
    // a crawler must see the internal link graph without opening anything.
    const { container } = renderHeader();

    const details = container.querySelector('details');
    expect(details?.hasAttribute('open')).toBe(false);

    const mobileNav = screen.getByRole('navigation', { name: 'Primary, mobile' });
    expect(within(mobileNav).getAllByRole('link')).toHaveLength(PRIMARY_NAV.length);
  });

  it('needs no JavaScript for the mobile menu to work', () => {
    const { container } = renderHeader();

    expect(container.querySelector('details > summary')).toBeInTheDocument();
  });

  it('marks the active nav item', () => {
    const active = PRIMARY_NAV[0]!;
    renderHeader({ currentPath: active.href });

    for (const anchor of screen.getAllByRole('link', { name: active.label })) {
      expect(anchor).toHaveAttribute('aria-current', 'page');
    }
  });

  it('marks nothing active when the path matches no nav item', () => {
    renderHeader({ currentPath: '/somewhere-else' });

    expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
  });

  it('names both navigation landmarks distinctly', () => {
    // Queried from the DOM rather than the accessibility tree: at the test
    // viewport the desktop nav is display:none and correctly absent from the
    // tree, so only one of the two is exposed at a time. Both must still be
    // present in the HTML, and distinctly named, so a crawler sees the links
    // and a screen-reader user is never offered two identical "navigation"
    // landmarks at whichever width they are at.
    const { container } = renderHeader();

    const labels = [...container.querySelectorAll('nav[aria-label]')].map((nav) =>
      nav.getAttribute('aria-label'),
    );

    expect(labels).toEqual(['Primary', 'Primary, mobile']);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('hides the decorative menu icon from assistive technology', () => {
    const { container } = renderHeader();

    expect(container.querySelector('summary svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderHeader();

    await expectNoAxeViolations(container);
  });
});
