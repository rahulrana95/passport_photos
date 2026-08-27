import { RULE_STATUS_TOKENS } from '@/constants/rule-status.constants';
import { getContent } from '@/content/content.registry';
import { ruleStatusLabel } from '@/rules/rule-status-label.utils';
import { RULE_STATUS_ICON_SIZE, RULE_STATUS_ICONS } from './RuleResultRow.constants';
import type { RuleResultRowProps } from './RuleResultRow.types';
import styles from './RuleResultRow.module.css';

/**
 * One rule's verdict.
 *
 * Status is communicated three ways at once — icon shape, text label and colour
 * — because colour alone fails for colour-blind readers and disappears entirely
 * under forced-colors mode.
 */
export const RuleResultRow = ({
  label,
  status,
  measurement,
  requirement,
  fixInstruction,
}: RuleResultRowProps): React.JSX.Element => {
  const content = getContent();
  const Icon = RULE_STATUS_ICONS[status];
  const statusText = ruleStatusLabel(status, content);

  return (
    <div className={styles['row']} data-status={status}>
      <Icon
        className={styles['icon']}
        size={RULE_STATUS_ICON_SIZE}
        color={`var(${RULE_STATUS_TOKENS[status]})`}
        aria-hidden="true"
      />
      <div className={styles['body']}>
        <div className={styles['header']}>
          <span className={styles['label']}>{label}</span>
          <span className={styles['statusLabel']}>{statusText}</span>
        </div>
        {measurement === undefined && requirement === undefined ? null : (
          <span className={styles['measurement']}>
            {measurement ?? '—'}
            {requirement === undefined ? null : ` / required ${requirement}`}
          </span>
        )}
        {fixInstruction === undefined ? null : (
          <p className={styles['fix']}>{fixInstruction}</p>
        )}
      </div>
    </div>
  );
};
