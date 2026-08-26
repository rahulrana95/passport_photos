import type { ProseProps } from './Prose.types';
import styles from './Prose.module.css';

/**
 * Typographic wrapper for long-form content.
 *
 * A Server Component with no JavaScript: everything it wraps is ranking content
 * that must be present in the static HTML. Using a Mantine component here would
 * pull the whole page into the client bundle for text that never changes.
 */
export const Prose = ({ children, constrainMeasure = true }: ProseProps): React.JSX.Element => (
  <div
    className={
      constrainMeasure ? `${styles['prose']} ${styles['constrained']}` : styles['prose']
    }
  >
    {children}
  </div>
);
