import { getContent } from '@/content/content.registry';
import type { RequirementsTableProps } from './RequirementsTable.types';
import styles from './RequirementsTable.module.css';

/**
 * Renders a country's published requirements.
 *
 * A Server Component and a real <table>: this is the content the page ranks for,
 * so it has to exist in the static HTML rather than arriving after hydration.
 *
 * Provenance is part of the component, not an optional decoration. Every claim
 * here is a claim about a government requirement, so the source link and the
 * verification date travel with the table.
 */
export const RequirementsTable = ({
  caption,
  rows,
  sourceUrl,
  verifiedOn,
}: RequirementsTableProps): React.JSX.Element => {
  const content = getContent();

  return (
    <div>
      <div className={styles['scroller']}>
        <table className={styles['table']}>
          <caption className={styles['caption']}>{caption}</caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className={styles['rowHeader']}>
                  {row.label}
                </th>
                <td className={styles['cell']}>
                  {row.value}
                  {row.note === undefined ? null : (
                    <span className={styles['note']}>{row.note}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {verifiedOn === undefined ? null : (
        <p className={styles['provenance']}>
          {content.legal.specVerifiedOn} <time dateTime={verifiedOn}>{verifiedOn}</time>
          {sourceUrl === undefined ? null : (
            <>
              {' · '}
              <a href={sourceUrl} rel="noreferrer nofollow" target="_blank">
                Official source
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
};
