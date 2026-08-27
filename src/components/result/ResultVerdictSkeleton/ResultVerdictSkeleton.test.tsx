import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { ResultVerdict } from '../ResultVerdict/ResultVerdict';
import { ResultVerdictSkeleton } from './ResultVerdictSkeleton';

describe('ResultVerdictSkeleton', () => {
  it('uses the real verdict block’s own box', () => {
    // Two attempts at computing this height from its parts were wrong, by one
    // pixel and then by two. Borrowing the box removes the arithmetic.
    const { container: skeleton } = render(<ResultVerdictSkeleton />);
    const { container: real } = render(<ResultVerdict status="pass" />);

    expect(skeleton.firstElementChild?.className).toBe(real.firstElementChild?.className);
  });

  it('shows no verdict, because there is not one yet', () => {
    const { container } = render(<ResultVerdictSkeleton />);

    expect(container.textContent?.trim()).toBe('');
  });

  it('is marked so the panel’s reservation can be checked', () => {
    const { container } = render(<ResultVerdictSkeleton />);

    expect(container.firstElementChild).toHaveAttribute('data-placeholder', 'verdict');
  });

  it('is hidden from assistive technology', () => {
    const { container } = render(<ResultVerdictSkeleton />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ResultVerdictSkeleton />);

    await expectNoAxeViolations(container);
  });
});
