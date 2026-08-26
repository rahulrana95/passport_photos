import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle/ThemeToggle';
import { PRIMARY_NAV } from '@/constants/navigation.constants';
import { homeRoute } from '@/constants/routes.constants';
import { SITE_NAME } from '@/constants/site.constants';
import type { SiteHeaderProps } from './SiteHeader.types';
import styles from './SiteHeader.module.css';

const ICON_SIZE = 18;

/**
 * A Server Component, except for the theme toggle.
 *
 * The mobile menu is a native <details> rather than a JavaScript drawer, which
 * buys three things at once: every navigation link is in the static HTML whether
 * the menu is open or closed, so a crawler always sees the internal link graph;
 * keyboard and screen-reader behaviour comes free and correct; and the header
 * ships no bundle of its own.
 */
export const SiteHeader = ({ currentPath }: SiteHeaderProps): React.JSX.Element => {
  const navLinks = PRIMARY_NAV.map((link) => (
    <li key={link.href}>
      <a
        className={styles['navLink']}
        href={link.href}
        {...(link.href === currentPath ? { 'aria-current': 'page' as const } : {})}
      >
        {link.label}
      </a>
    </li>
  ));

  return (
    <header className={styles['header']}>
      <div className={styles['inner']}>
        <a className={styles['brand']} href={homeRoute()}>
          {SITE_NAME}
        </a>

        <nav className={styles['desktopNav']} aria-label="Primary">
          <ul className={styles['navList']}>{navLinks}</ul>
        </nav>

        <div className={styles['actions']}>
          <details className={styles['mobileNav']}>
            <summary className={styles['mobileSummary']}>
              <Menu size={ICON_SIZE} aria-hidden="true" />
              Menu
            </summary>
            <div className={styles['mobilePanel']}>
              <nav aria-label="Primary, mobile">
                <ul className={`${styles['navList']} ${styles['mobileList']}`}>{navLinks}</ul>
              </nav>
              <div className={styles['mobileActions']}>
                <ThemeToggle />
              </div>
            </div>
          </details>
          <div className={styles['desktopActions']}>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};
