import { JsonLdScript } from '@/seo/JsonLdScript';
import { breadcrumbJsonLd } from '@/seo/structured-data.utils';
import type { BreadcrumbsProps } from './Breadcrumbs.types';
import styles from './Breadcrumbs.module.css';

/**
 * The visible trail and its structured data are emitted together, from the same
 * array.
 *
 * They have to match exactly — a BreadcrumbList describing a path the reader
 * cannot see is a manual-action risk — and the only reliable way to guarantee
 * that is to make one impossible without the other.
 */
export const Breadcrumbs = ({ entries }: BreadcrumbsProps): React.JSX.Element | null => {
  if (entries.length === 0) return null;

  const lastIndex = entries.length - 1;

  return (
    <>
      <JsonLdScript node={breadcrumbJsonLd(entries)} />
      <nav className={styles['nav']} aria-label="Breadcrumb">
        <ol className={styles['list']}>
          {entries.map((entry, index) => (
            <li key={entry.route}>
              {index === lastIndex ? (
                <span className={styles['current']} aria-current="page">
                  {entry.name}
                </span>
              ) : (
                <>
                  <a className={styles['link']} href={entry.route}>
                    {entry.name}
                  </a>
                  <span className={styles['separator']} aria-hidden="true">
                    {' / '}
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};
