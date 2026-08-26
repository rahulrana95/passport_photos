import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { PageHeading } from './PageHeading';

describe('PageHeading', () => {
  it('renders the title as the only level-one heading', () => {
    render(<PageHeading title="Check your photo" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Check your photo');
  });

  it('renders the description when one is provided', () => {
    render(<PageHeading title="Check your photo" description="Against official requirements" />);

    expect(screen.getByText('Against official requirements')).toBeInTheDocument();
  });

  it('omits the description element entirely when none is provided', () => {
    const { container } = render(<PageHeading title="Check your photo" />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PageHeading title="Check your photo" description="Sub" />);

    await expectNoAxeViolations(container);
  });
});
