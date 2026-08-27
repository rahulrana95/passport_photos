import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { RuleResultRow } from '../RuleResultRow/RuleResultRow';
import { RuleResultRowSkeleton } from './RuleResultRowSkeleton';

describe('RuleResultRowSkeleton', () => {
  it('uses the real row’s own box, not a copy of it', () => {
    // The height is not matched, it is the same box. A skeleton with its own
    // padding matches until somebody changes one of them, and the failure
    // shows up as a layout shift on a slow connection.
    const { container: skeleton } = render(<RuleResultRowSkeleton />);
    const { container: real } = render(
      <RuleResultRow label="Head height" status="pass" measurement="31mm" />,
    );

    expect(skeleton.firstElementChild?.className).toBe(real.firstElementChild?.className);
  });

  it('reserves a measurement line by default', () => {
    const { container } = render(<RuleResultRowSkeleton />);

    expect(container.querySelectorAll('[class*="measurement"]')).toHaveLength(1);
  });

  it('leaves the measurement line out when the row will not have one', () => {
    // Manual rules are questions for the reader and never carry a number, so
    // a reserved line would leave a blank gap under every checklist item.
    const { container } = render(<RuleResultRowSkeleton withMeasurement={false} />);

    expect(container.querySelectorAll('[class*="measurement"]')).toHaveLength(0);
  });

  it('is one line box shorter without the measurement, not a different box', () => {
    // The difference between the two must be exactly the line, since that is
    // the only thing the real rows differ by.
    const { container: withLine } = render(<RuleResultRowSkeleton />);
    const { container: without } = render(<RuleResultRowSkeleton withMeasurement={false} />);

    expect(withLine.firstElementChild?.className).toBe(without.firstElementChild?.className);
  });

  it('is marked so it can be told apart from a real row', () => {
    const { container } = render(<RuleResultRowSkeleton />);

    expect(container.firstElementChild).toHaveAttribute('data-placeholder', 'rule-row');
  });

  it('is hidden from assistive technology, which has nothing to read here', () => {
    const { container } = render(<RuleResultRowSkeleton />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<RuleResultRowSkeleton />);

    await expectNoAxeViolations(container);
  });
});
