import { VERDICT_ICON_SIZE } from '../ResultVerdict/ResultVerdict.constants';
import verdictStyles from '../ResultVerdict/ResultVerdict.module.css';
import skeletonStyles from '../RuleResultRowSkeleton/RuleResultRowSkeleton.module.css';

/** A line box, with no text in it. */
const BLANK = ' ';

/**
 * The verdict block before there is a verdict.
 *
 * IT IMPORTS THE REAL BLOCK'S STYLESHEET, for the same reason the row skeleton
 * does: the height is then not matched, it is the same box. Two attempts at
 * computing this height from its parts — padding plus a line box, then padding
 * plus the taller of a line box and the icon — were both wrong, by one pixel
 * and then by two. Neither would have been noticed without measuring, and
 * neither was worth the arithmetic when the component itself knows.
 *
 * `undetectable` is a deliberate non-choice of icon size: the block is empty
 * of meaning, so it borrows only the geometry.
 */
export const ResultVerdictSkeleton = (): React.JSX.Element => (
  <div className={verdictStyles['verdict']} data-placeholder="verdict" aria-hidden="true">
    <span
      className={skeletonStyles['block']}
      style={{ inlineSize: `${VERDICT_ICON_SIZE}px`, blockSize: `${VERDICT_ICON_SIZE}px` }}
    >
      {BLANK}
    </span>
    <p className={`${verdictStyles['text']} ${skeletonStyles['block']} ${skeletonStyles['verdictText']}`}>
      {BLANK}
    </p>
  </div>
);