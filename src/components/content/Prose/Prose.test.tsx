import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { Prose } from './Prose';

describe('Prose', () => {
  it('renders its children', () => {
    render(
      <Prose>
        <p>Head height must be between 25mm and 35mm.</p>
      </Prose>,
    );

    expect(screen.getByText(/head height must be/i)).toBeInTheDocument();
  });

  it('constrains the measure by default', () => {
    const { container } = render(<Prose>text</Prose>);

    expect(container.firstElementChild?.className).toContain('constrained');
  });

  it('releases the measure when asked, for full-width content such as tables', () => {
    const { container } = render(<Prose constrainMeasure={false}>text</Prose>);

    expect(container.firstElementChild?.className).not.toContain('constrained');
  });

  it('leaves heading semantics to the caller rather than imposing its own', () => {
    render(
      <Prose>
        <h2>Requirements</h2>
      </Prose>,
    );

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Prose>
        <p>Body copy</p>
      </Prose>,
    );

    await expectNoAxeViolations(container);
  });
});
