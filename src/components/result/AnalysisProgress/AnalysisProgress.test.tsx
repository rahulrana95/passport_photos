import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ANALYSIS_STAGES } from '@/analysis/analysis-protocol.types';
import { getContent } from '@/content/content.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { AnalysisProgress } from './AnalysisProgress';

const content = getContent().result;
const [FIRST_STAGE] = ANALYSIS_STAGES;

describe('AnalysisProgress', () => {
  it.each(ANALYSIS_STAGES)('says what it is doing during %s', (stage) => {
    // Not decoration. The stages take visibly different lengths of time, and a
    // bar that crawls through segmentation with no explanation reads as a hang.
    render(<AnalysisProgress stage={stage} stageRatio={0} />);

    expect(screen.getByText(content.stages[stage])).toBeInTheDocument();
  });

  it('is a progressbar with a real value, not a spinner', () => {
    // A spinner tells a screen-reader user that something is happening and
    // never that it is getting anywhere.
    render(<AnalysisProgress stage={FIRST_STAGE} stageRatio={0.5} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow');
  });

  it('moves when the stage advances, even with no progress reported inside it', () => {
    const values = ANALYSIS_STAGES.map((stage) => {
      const { unmount } = render(<AnalysisProgress stage={stage} stageRatio={0} />);
      const value = Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'));
      unmount();
      return value;
    });

    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThan(Number(values[index - 1]));
    }
  });

  it('never sits at zero once the first stage is under way', () => {
    render(<AnalysisProgress stage={FIRST_STAGE} stageRatio={0.6} />);

    expect(Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  });

  it('shows the percentage next to the stage', () => {
    render(<AnalysisProgress stage={FIRST_STAGE} stageRatio={1} />);

    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('names the bar, so it is not announced as an unlabelled progressbar', () => {
    render(<AnalysisProgress stage={FIRST_STAGE} stageRatio={0} />);

    expect(screen.getByRole('progressbar')).toHaveAccessibleName(content.analysingLabel);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AnalysisProgress stage={FIRST_STAGE} stageRatio={0.4} />);

    await expectNoAxeViolations(container);
  });
});
