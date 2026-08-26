import { TOKEN_GROUPS } from '@/theme/design-tokens.constants';
import type { TokenGalleryProps } from './TokenGallery.types';
import styles from './TokenGallery.module.css';

const isColorToken = (token: string): boolean =>
  token.includes('ground') ||
  token.includes('surface') ||
  token.includes('sunken') ||
  token.includes('accent') ||
  token.includes('border') ||
  token.includes('status') ||
  token.startsWith('--tk-text-p') ||
  token.startsWith('--tk-text-s') ||
  token.startsWith('--tk-text-t');

/**
 * Renders every token in the registry so the design system can be reviewed in
 * both themes. Documentation only — reached from Storybook, never linked from
 * the application, so it is not part of the shipped bundle.
 *
 * It renders from the registry rather than a hand-written list, so a token
 * added to the system cannot be missing from its own documentation.
 */
export const TokenGallery = ({
  groups = TOKEN_GROUPS,
}: TokenGalleryProps): React.JSX.Element => (
  <div className={styles['gallery']}>
    {groups.map((group) => (
      <section key={group.heading} className={styles['group']}>
        <h2 className={styles['heading']}>{group.heading}</h2>
        <ul className={styles['list']}>
          {group.tokens.map((token) => (
            <li key={token} className={styles['row']}>
              {isColorToken(token) ? (
                <span className={styles['swatch']} style={{ background: `var(${token})` }} />
              ) : (
                <span className={styles['scaleBar']} style={{ inlineSize: `var(${token})` }} />
              )}
              <code className={styles['name']}>{token}</code>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);
