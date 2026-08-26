import { COUNTRY_NAMES, isCountrySlug } from '@/constants/country.constants';
import { FOOTER_FEATURED_COUNTRIES, LEGAL_NAV, PRIMARY_NAV } from '@/constants/navigation.constants';
import { countryDocumentRoute } from '@/constants/routes.constants';
import { SITE_NAME } from '@/constants/site.constants';
import { getContent } from '@/content/content.registry';
import type { SiteFooterProps } from './SiteFooter.types';
import styles from './SiteFooter.module.css';

/**
 * A Server Component, and part of the internal link graph rather than decoration.
 *
 * The country column is a curated subset, not the full registry: putting 100+
 * links on every page would dilute what each one passes and add weight to a
 * template that renders on every route.
 */
export const SiteFooter = ({ featuredCountries }: SiteFooterProps): React.JSX.Element => {
  const content = getContent();
  const countries = (featuredCountries ?? FOOTER_FEATURED_COUNTRIES).filter(isCountrySlug);

  return (
    <footer className={styles['footer']}>
      <div className={styles['inner']}>
        <div className={styles['column']}>
          <h2 className={styles['heading']}>{SITE_NAME}</h2>
          <p className={styles['claim']}>{content.legal.privacyClaim}</p>
        </div>

        <div className={styles['column']}>
          <h2 className={styles['heading']}>Tools</h2>
          <ul className={styles['list']}>
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <a className={styles['link']} href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles['column']}>
          <h2 className={styles['heading']}>Passport photo requirements</h2>
          <ul className={styles['list']}>
            {countries.map((country) => (
              <li key={country}>
                <a className={styles['link']} href={countryDocumentRoute(country, 'passport')}>
                  {COUNTRY_NAMES[country]}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles['column']}>
          <h2 className={styles['heading']}>Legal</h2>
          <ul className={styles['list']}>
            {LEGAL_NAV.map((link) => (
              <li key={link.href}>
                <a className={styles['link']} href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Shown site-wide, not only next to a result: the claim it qualifies is
          made on every page that states a requirement. */}
      <p className={styles['disclaimer']}>{content.legal.acceptanceDisclaimer}</p>
    </footer>
  );
};
