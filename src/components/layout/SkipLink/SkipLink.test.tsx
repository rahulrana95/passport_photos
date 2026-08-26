import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { getContent } from '@/content/content.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('points at the main content region by default', () => {
    render(<SkipLink />);

    expect(screen.getByRole('link')).toHaveAttribute('href', `#${SKIP_LINK_TARGET_ID}`);
  });

  it('accepts a custom target', () => {
    render(<SkipLink targetId="results" />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '#results');
  });

  it('uses the shared copy rather than an inline string', () => {
    render(<SkipLink />);

    expect(screen.getByRole('link')).toHaveTextContent(getContent().common.skipToContent);
  });

  it('stays in the accessibility tree so the keyboard can reach it', () => {
    // Hiding it with display:none would make it unreachable, which defeats the
    // entire point. It is moved off-screen with a transform instead.
    const { container } = render(<SkipLink />);

    const link = container.querySelector('a');
    expect(link).not.toHaveAttribute('hidden');
    expect(link).not.toHaveAttribute('aria-hidden');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SkipLink />);

    await expectNoAxeViolations(container);
  });
});
