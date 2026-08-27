import { RULE_STATUS_TOKENS } from '@/constants/rule-status.constants';
import { getContent } from '@/content/content.registry';
import { verdictLabel } from '@/result/verdict-label.utils';
import {
  RULE_STATUS_ICONS,
} from '../RuleResultRow/RuleResultRow.constants';
import { VERDICT_ICON_SIZE } from './ResultVerdict.constants';
import type { ResultVerdictProps } from './ResultVerdict.types';
import styles from './ResultVerdict.module.css';

/**
 * The answer, at the top, in one sentence.
 *
 * Shares its icon set with the per-rule rows on purpose: a reader who has
 * learnt that the cross means "fails" halfway down the list should not meet a
 * different symbol for the same thing at the top of it.
 *
 * Three signals for one status — shape, words, colour — because roughly one in
 * twelve men cannot separate the pass green from the fail red, and under
 * forced-colors every status token resolves to the same CanvasText. The colour
 * is the reinforcement, never the message.
 */
export const ResultVerdict = ({ status }: ResultVerdictProps): React.JSX.Element => {
  const content = getContent();
  const Icon = RULE_STATUS_ICONS[status];

  return (
    <div className={styles['verdict']} data-status={status}>
      <Icon
        size={VERDICT_ICON_SIZE}
        color={`var(${RULE_STATUS_TOKENS[status]})`}
        aria-hidden="true"
      />
      <p className={styles['text']}>{verdictLabel(status, content)}</p>
    </div>
  );
};
