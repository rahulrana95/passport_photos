import { COUNTRY_NAMES, COUNTRY_SLUGS } from '@/constants/country.constants';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-type.constants';
import { countryDocumentRoute } from '@/constants/routes.constants';
import type { CountryLinkGridProps } from './CountryLinkGrid.types';
import styles from './CountryLinkGrid.module.css';

/**
 * The internal link graph between country pages.
 *
 * Real anchors, rendered on the server. A <select> that navigates on change
 * would be invisible to crawlers, and this grid is doing real work: it is how
 * authority flows between 150 pages that would otherwise be islands.
 *
 * Hrefs come from the route builder, never from a template literal at the call
 * site, so a path can never drift from the canonical tag or the sitemap.
 */
export const CountryLinkGrid = ({
  heading,
  documentType,
  countries = COUNTRY_SLUGS,
  currentCountry,
}: CountryLinkGridProps): React.JSX.Element => {
  const linked = countries.filter((country) => country !== currentCountry);

  return (
    <nav className={styles['wrapper']} aria-label={heading}>
      <h2 className={styles['heading']}>{heading}</h2>
      <ul className={styles['list']}>
        {linked.map((country) => (
          <li key={country}>
            <a className={styles['link']} href={countryDocumentRoute(country, documentType)}>
              {COUNTRY_NAMES[country]} {DOCUMENT_TYPE_LABELS[documentType].toLowerCase()} photo
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
