import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RULE_STATUSES } from '@/constants/rule-status.constants';
import { getContent } from '@/content/content.registry';
import { verdictLabel } from '@/result/verdict-label.utils';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { ResultVerdict } from './ResultVerdict';

const content = getContent();

describe('ResultVerdict', () => {
  it.each(RULE_STATUSES)('states the verdict for %s in words', (status) => {
    render(<ResultVerdict status={status} />);

    // Words, not just a colour. Roughly one in twelve men cannot separate the
    // pass green from the fail red, and under forced-colors every status token
    // resolves to the same CanvasText.
    expect(screen.getByText(verdictLabel(status, content))).toBeInTheDocument();
  });

  it.each(RULE_STATUSES)('carries a distinct icon shape for %s', (status) => {
    const { container } = render(<ResultVerdict status={status} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('gives each status its own icon, not one icon in five colours', () => {
    const shapes = RULE_STATUSES.map((status) => {
      const { container } = render(<ResultVerdict status={status} />);
      return container.querySelector('svg')?.innerHTML ?? '';
    });

    // pass/fail/warning/manual are four distinct shapes; undetectable shares
    // manual's colour token but not its shape, so all five differ.
    expect(new Set(shapes).size).toBe(RULE_STATUSES.length);
  });

  it('exposes the status for styling without making colour the message', () => {
    const { container } = render(<ResultVerdict status="fail" />);

    expect(container.firstElementChild).toHaveAttribute('data-status', 'fail');
  });

  it('hides its icon from assistive technology, which already has the words', () => {
    const { container } = render(<ResultVerdict status="pass" />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('is not a live region — the panel announces, once', () => {
    // Two live regions for one verdict says it twice, and this one would say
    // only half of it: it never mentions that the wait ended.
    const { container } = render(<ResultVerdict status="pass" />);

    expect(container.querySelector('[aria-live]')).toBeNull();
  });

  it.each(RULE_STATUSES)('has no accessibility violations for %s', async (status) => {
    const { container } = render(<ResultVerdict status={status} />);

    await expectNoAxeViolations(container);
  });
});
