import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { COLOR_TOKENS, SPACE_TOKENS, TOKEN_GROUPS } from '@/theme/design-tokens.constants';
import { TokenGallery } from './TokenGallery';

describe('TokenGallery', () => {
  it('documents every group in the registry by default', () => {
    render(<TokenGallery />);

    for (const group of TOKEN_GROUPS) {
      expect(screen.getByRole('heading', { name: group.heading })).toBeInTheDocument();
    }
  });

  it('renders every registered token, so documentation cannot fall behind', () => {
    render(<TokenGallery />);

    const registeredCount = TOKEN_GROUPS.reduce((total, group) => total + group.tokens.length, 0);
    expect(screen.getAllByRole('listitem')).toHaveLength(registeredCount);
  });

  it('renders a colour swatch for colour tokens', () => {
    const { container } = render(
      <TokenGallery groups={[{ heading: 'Colour', tokens: [COLOR_TOKENS[0]] }]} />,
    );

    const swatch = container.querySelector('li > span');
    expect(swatch).toHaveStyle({ background: `var(${COLOR_TOKENS[0]})` });
  });

  it('renders a scale bar for non-colour tokens', () => {
    const { container } = render(
      <TokenGallery groups={[{ heading: 'Spacing', tokens: [SPACE_TOKENS[0]] }]} />,
    );

    const bar = container.querySelector('li > span');
    expect(bar).toHaveStyle({ inlineSize: `var(${SPACE_TOKENS[0]})` });
  });

  it('accepts a narrowed group list', () => {
    render(<TokenGallery groups={[{ heading: 'Only this', tokens: ['--tk-accent'] }]} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Spacing' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TokenGallery />);

    await expectNoAxeViolations(container);
  });
});
