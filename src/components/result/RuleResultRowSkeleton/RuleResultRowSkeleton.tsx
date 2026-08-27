import { RULE_STATUS_ICON_SIZE } from '../RuleResultRow/RuleResultRow.constants';
import rowStyles from '../RuleResultRow/RuleResultRow.module.css';
import type { RuleResultRowSkeletonProps } from './RuleResultRowSkeleton.types';
import styles from './RuleResultRowSkeleton.module.css';

/** A line box, with no text in it. */
const BLANK = ' ';

/**
 * A rule row that has not arrived yet.
 *
 * IT IMPORTS THE REAL ROW'S STYLESHEET, deliberately. A skeleton with its own
 * padding and its own border is a skeleton whose height matches the real thing
 * until somebody changes one of them, and the failure shows up as a layout
 * shift on a slow connection — which is exactly where nobody is looking. Here
 * the box model is not matched, it is the same box.
 *
 * The height comes from non-breaking spaces at the real font sizes rather than
 * from a fixed height, so a row is one line-box tall for its header and one for
 * its measurement, the same as a passing row.
 *
 * It does NOT reserve a fix instruction. That line only exists on rows that
 * failed, and reserving it for every row would leave a gap under every passing
 * one — trading a shift on failure for a permanent hole on success.
 */
export const RuleResultRowSkeleton = ({
  withMeasurement = true,
}: RuleResultRowSkeletonProps): React.JSX.Element => (
  <div className={rowStyles['row']} data-placeholder="rule-row" aria-hidden="true">
    {/* Stands in for the icon, at the icon's own size — read from the same
        constant the real icon is rendered at, so the first column cannot
        change width between the two states. */}
    <span
      className={styles['block']}
      style={{ inlineSize: `${RULE_STATUS_ICON_SIZE}px` }}
    >
      {BLANK}
    </span>
    <div className={rowStyles['body']}>
      <div className={rowStyles['header']}>
        <span className={`${rowStyles['label']} ${styles['block']} ${styles['label']}`}>
          {BLANK}
        </span>
        <span className={`${rowStyles['statusLabel']} ${styles['block']} ${styles['status']}`}>
          {BLANK}
        </span>
      </div>
      {withMeasurement ? (
        <span className={`${rowStyles['measurement']} ${styles['block']} ${styles['measurement']}`}>
          {BLANK}
        </span>
      ) : null}
    </div>
  </div>
);
