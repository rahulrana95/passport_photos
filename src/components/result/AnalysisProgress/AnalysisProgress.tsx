import { getContent } from '@/content/content.registry';
import { analysisProgress } from '@/result/analysis-progress.utils';
import { PERCENT_SCALE } from '@/constants/measurement.constants';
import type { AnalysisProgressProps } from './AnalysisProgress.types';
import styles from './AnalysisProgress.module.css';

/**
 * How far along the checks are, and what they are actually doing.
 *
 * The stage name is not decoration. The stages take visibly different lengths
 * of time — segmentation is most of the wait on a mid-range phone — and a bar
 * that crawls through it with no explanation reads as a hang. "Finding the
 * edges of your head" reads as work.
 *
 * A real progressbar role with real values, rather than a spinner: a spinner
 * tells a screen-reader user that something is happening and never that it is
 * getting anywhere.
 */
export const AnalysisProgress = ({
  stage,
  stageRatio,
}: AnalysisProgressProps): React.JSX.Element => {
  const content = getContent().result;
  const ratio = analysisProgress(stage, stageRatio);
  const percent = Math.round(ratio * PERCENT_SCALE);

  return (
    <div className={styles['progress']}>
      <p className={styles['label']}>
        <span>{content.stages[stage]}</span>
        <span className={styles['percent']}>{percent}%</span>
      </p>
      <div
        className={styles['track']}
        role="progressbar"
        aria-label={content.analysingLabel}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={PERCENT_SCALE}
      >
        <div className={styles['fill']} style={{ inlineSize: `${percent}%` }} />
      </div>
    </div>
  );
};
