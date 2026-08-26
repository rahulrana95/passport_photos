import type { PageHeadingProps } from './PageHeading.types';
import styles from './PageHeading.module.css';

/**
 * Server Component by design. Page headings are ranking content, so they must
 * be present in the static HTML and must not pull Mantine into the client
 * bundle. Plain semantic markup plus a CSS Module.
 */
export const PageHeading = ({ title, description }: PageHeadingProps): React.JSX.Element => (
  <header className={styles['wrapper']}>
    <h1 className={styles['title']}>{title}</h1>
    {description === undefined ? null : <p className={styles['description']}>{description}</p>}
  </header>
);
