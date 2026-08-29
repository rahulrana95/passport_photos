import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ANALYSIS_ERROR_CODES, ANALYSIS_STAGES } from '@/analysis/analysis-protocol.types';
import { getContent } from '@/content/content.registry';
import { reportShape } from '@/result/report-shape.utils';
import { resolveRuleMessage } from '@/rules/rule-message.utils';
import { verdictLabel } from '@/result/verdict-label.utils';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import {
  failingReport,
  fixtureSpec,
  passingReport,
  undetectableReport,
} from '@/testing/fixtures/compliance-report.builder';
import { ResultPanel } from './ResultPanel';
import type { AnalysisState } from '@/result/analysis-state.types';

const content = getContent();
const SPEC = fixtureSpec();
const [FIRST_STAGE] = ANALYSIS_STAGES;

const renderPanel = (state: AnalysisState, extra: Record<string, unknown> = {}) =>
  render(<ResultPanel state={state} spec={SPEC} {...extra} />);

describe('before anything has been analysed', () => {
  it('reserves exactly the rows the answer will have — including the checklist', () => {
    // Derived from the specification, not estimated. Forgetting the manual
    // checklist here was worth a fifth of the panel's height when the answer
    // arrived, and it only showed up when the two states were measured.
    const shape = reportShape(SPEC);
    const { container } = renderPanel({ kind: 'idle' });

    expect(container.querySelectorAll('[data-placeholder="rule-row"]')).toHaveLength(
      shape.ruleRows.length + shape.manualRows.length,
    );
  });

  it('reserves the same number of rows the real report renders', () => {
    const report = passingReport();
    const { container: idle } = renderPanel({ kind: 'idle' });
    const skeletons = idle.querySelectorAll('[data-placeholder="rule-row"]').length;

    expect(skeletons).toBe(report.results.length + report.manualChecklist.length);
  });

  it('reserves the verdict block, which is not a row', () => {
    const { container } = renderPanel({ kind: 'idle' });

    expect(container.querySelector('[data-placeholder="verdict"]')).toBeInTheDocument();
  });

  it('shows both headings while waiting, so they do not appear from nowhere', () => {
    renderPanel({ kind: 'idle' });

    expect(screen.getByText(content.result.resultsHeading)).toBeInTheDocument();
    expect(screen.getByText(content.result.manualChecklistHeading)).toBeInTheDocument();
  });

  it('says nothing about progress before there is any', () => {
    renderPanel({ kind: 'idle' });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('is not marked busy when it is merely waiting to be given a photo', () => {
    const { container } = renderPanel({ kind: 'idle' });

    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'false');
  });
});

describe('while analysing', () => {
  const analysing: AnalysisState = { kind: 'analysing', stage: FIRST_STAGE, stageRatio: 0.5 };

  it('shows progress that names the stage', () => {
    renderPanel(analysing);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(content.result.stages[FIRST_STAGE])).toBeInTheDocument();
  });

  it('marks itself busy', () => {
    const { container } = renderPanel(analysing);

    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
  });

  it('keeps the reserved rows underneath, so the answer lands where the wait was', () => {
    const shape = reportShape(SPEC);
    const { container } = renderPanel(analysing);

    expect(container.querySelectorAll('[data-placeholder="rule-row"]').length).toBe(
      shape.ruleRows.length + shape.manualRows.length,
    );
  });
});

describe('when the checks are done', () => {
  it('leads with the verdict', () => {
    renderPanel({ kind: 'ready', report: passingReport(), preview: undefined });

    expect(
      screen.getByText(verdictLabel(passingReport().overall, content)),
    ).toBeInTheDocument();
  });

  it('announces once, and says the wait is over as well as the answer', () => {
    renderPanel({ kind: 'ready', report: passingReport(), preview: undefined });

    const live = screen.getAllByRole('status');
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveTextContent(/Check complete/);
  });

  it('renders one row per rule the specification states', () => {
    const report = passingReport();
    renderPanel({ kind: 'ready', report, preview: undefined });

    for (const result of report.results) {
      const resolved = resolveRuleMessage(result, report.spec, content.rules);
      expect(screen.getAllByText(resolved.label).length).toBeGreaterThan(0);
    }
  });

  it('uses the same wording the PDF report uses', () => {
    // Formatting a measurement twice, in two places, is how a report and a
    // screen end up disagreeing about the same photograph.
    const report = failingReport();
    renderPanel({ kind: 'ready', report, preview: undefined });

    const failed = report.results.find((result) => result.status === 'fail');
    expect(failed).toBeDefined();
    const resolved = resolveRuleMessage(
      failed as NonNullable<typeof failed>,
      report.spec,
      content.rules,
    );
    expect(screen.getByText(resolved.label)).toBeInTheDocument();
  });

  it('gives every failure something to do about it', () => {
    const report = failingReport();
    renderPanel({ kind: 'ready', report, preview: undefined });

    for (const result of report.results.filter((entry) => entry.status === 'fail')) {
      const resolved = resolveRuleMessage(result, report.spec, content.rules);
      // A verdict without an action leaves the reader stuck, which is the
      // point at which they give up and pay a competitor.
      expect(resolved.fixInstruction ?? resolved.measurement).toBeDefined();
    }
  });

  it('shows the manual checklist as its own list', () => {
    renderPanel({ kind: 'ready', report: passingReport(), preview: undefined });

    expect(screen.getByText(content.result.manualChecklistHeading)).toBeInTheDocument();
  });

  it('renders whatever the page puts under the verdict', () => {
    renderPanel({ kind: 'ready', report: passingReport(), preview: undefined }, {
      children: <p>Downloads go here</p>,
    });

    expect(screen.getByText('Downloads go here')).toBeInTheDocument();
  });

  it('drops the skeleton once there are real rows', () => {
    const { container } = renderPanel({ kind: 'ready', report: passingReport(), preview: undefined });

    expect(container.querySelectorAll('[data-placeholder="rule-row"]').length).toBeLessThan(
      reportShape(SPEC).ruleRows.length,
    );
  });

  it('reports a photo nothing could be measured on without claiming a pass', () => {
    const report = undetectableReport();
    renderPanel({ kind: 'ready', report, preview: undefined });

    expect(report.results.some((result) => result.status === 'pass')).toBe(false);
    expect(screen.getByText(verdictLabel(report.overall, content))).toBeInTheDocument();
  });
});

describe('when the analysis itself fails', () => {
  const failures = ANALYSIS_ERROR_CODES.filter((code) => code !== 'cancelled');

  it.each(failures)('explains %s and what to do about it', (error) => {
    renderPanel({ kind: 'failed', error });

    expect(screen.getByText(content.result.failures[error].message)).toBeInTheDocument();
    expect(screen.getByText(content.result.failures[error].remedy)).toBeInTheDocument();
  });

  it('interrupts, because the reader is waiting on it', () => {
    renderPanel({ kind: 'failed', error: 'timeout' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('offers a retry when the page can provide one', async () => {
    const onRetry = vi.fn();
    renderPanel({ kind: 'failed', error: 'timeout' }, { onRetry });

    await userEvent.setup().click(screen.getByRole('button', { name: content.result.retryLabel }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry when there is nowhere to retry to', () => {
    renderPanel({ kind: 'failed', error: 'timeout' });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('treats a cancelled analysis as waiting, not as an error', () => {
    // Cancelling is the state the reader asked for by choosing another photo.
    // An error box explaining that they did what they meant to do is noise,
    // sitting exactly where the next answer should go.
    renderPanel({ kind: 'failed', error: 'cancelled' });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the reserved rows again after a cancellation', () => {
    const shape = reportShape(SPEC);
    const { container } = renderPanel({ kind: 'failed', error: 'cancelled' });

    expect(container.querySelectorAll('[data-placeholder="rule-row"]').length).toBe(
      shape.ruleRows.length + shape.manualRows.length,
    );
  });
});

describe('accessibility', () => {
  it.each([
    ['idle', { kind: 'idle' } as AnalysisState],
    ['analysing', { kind: 'analysing', stage: FIRST_STAGE, stageRatio: 0.3 } as AnalysisState],
    ['failed', { kind: 'failed', error: 'timeout' } as AnalysisState],
  ])('has no violations while %s', async (_name, state) => {
    const { container } = renderPanel(state);

    await expectNoAxeViolations(container);
  });

  it('has no violations showing a full report', async () => {
    const { container } = renderPanel({ kind: 'ready', report: failingReport(), preview: undefined });

    await expectNoAxeViolations(container);
  });
});
