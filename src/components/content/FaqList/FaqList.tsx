import { ChevronDown } from 'lucide-react';
import type { FaqListProps } from './FaqList.types';
import styles from './FaqList.module.css';

/**
 * FAQ list built on native <details>/<summary>.
 *
 * Deliberately not a JavaScript accordion. The answers are ranking content and
 * feed the FAQPage structured data, so they must be in the static HTML. Native
 * disclosure gives that for free, plus keyboard and screen-reader behaviour, and
 * it cannot cause layout shift on hydration because there is no hydration.
 */
export const FaqList = ({
  heading,
  entries,
  openFirst = false,
}: FaqListProps): React.JSX.Element => (
  <section className={styles['wrapper']}>
    <h2 className={styles['heading']}>{heading}</h2>
    {entries.map((entry, index) => (
      <details
        key={entry.question}
        className={styles['item']}
        open={openFirst && index === 0}
      >
        <summary className={styles['summary']}>
          {entry.question}
          <ChevronDown className={styles['marker']} size={18} aria-hidden="true" />
        </summary>
        <p className={styles['answer']}>{entry.answer}</p>
      </details>
    ))}
  </section>
);
