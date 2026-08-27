import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RULE_STATUSES } from '@/constants/rule-status.constants';
import { getContent } from '@/content/content.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { RuleResultRow } from './RuleResultRow';
import { ruleStatusLabel } from '@/rules/rule-status-label.utils';

const content = getContent();

describe('RuleResultRow', () => {
  it('names the rule that was checked', () => {
    render(<RuleResultRow label="Head height" status="pass" />);

    expect(screen.getByText('Head height')).toBeInTheDocument();
  });

  it.each(RULE_STATUSES)('spells out the verdict in words for %s', (status) => {
    // The core accessibility requirement of this component: the outcome must be
    // readable as text, never inferred from a colour.
    render(<RuleResultRow label="Head height" status={status} />);

    expect(screen.getByText(ruleStatusLabel(status, content))).toBeInTheDocument();
  });

  it('gives every status a visually distinct icon, not just a distinct colour', () => {
    // Under forced-colors all status tokens collapse to CanvasText, and roughly
    // one in twelve men cannot separate the pass green from the fail red.
    const renderedPaths = RULE_STATUSES.map((status) => {
      const { container, unmount } = render(<RuleResultRow label="Rule" status={status} />);
      const markup = container.querySelector('svg')?.innerHTML ?? '';
      unmount();
      return markup;
    });

    expect(new Set(renderedPaths).size).toBe(RULE_STATUSES.length);
  });

  it('hides the icon from assistive technology, since the label already says it', () => {
    const { container } = render(<RuleResultRow label="Head height" status="fail" />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the measurement against the requirement when both are known', () => {
    render(
      <RuleResultRow
        label="Head height"
        status="fail"
        measurement="21.4 mm"
        requirement="25–35 mm"
      />,
    );

    expect(screen.getByText(/21\.4 mm \/ required 25–35 mm/)).toBeInTheDocument();
  });

  it('falls back to a dash when only the requirement is known', () => {
    render(<RuleResultRow label="Head height" status="undetectable" requirement="25–35 mm" />);

    expect(screen.getByText(/— \/ required 25–35 mm/)).toBeInTheDocument();
  });

  it('omits the measurement line entirely when nothing was measured', () => {
    const { container } = render(<RuleResultRow label="Glasses" status="manual" />);

    expect(container.textContent).not.toContain('required');
  });

  it('gives a physical action for a failure, not just a verdict', () => {
    render(
      <RuleResultRow
        label="Head height"
        status="fail"
        fixInstruction="Move about 30cm closer to the camera and retake."
      />,
    );

    expect(screen.getByText(/move about 30cm closer/i)).toBeInTheDocument();
  });

  it('exposes the status as data for styling without leaking it into copy', () => {
    const { container } = render(<RuleResultRow label="Head height" status="warning" />);

    expect(container.firstElementChild).toHaveAttribute('data-status', 'warning');
  });

  it.each(RULE_STATUSES)('has no accessibility violations for %s', async (status) => {
    const { container } = render(
      <RuleResultRow label="Head height" status={status} measurement="30 mm" />,
    );

    await expectNoAxeViolations(container);
  });
});
