import { PageHeading } from '@/components/common/PageHeading/PageHeading';
import { ACCEPTANCE_DISCLAIMER, SITE_DESCRIPTION, SITE_TAGLINE } from '@/constants/site.constants';
import styles from './page.module.css';

/**
 * Placeholder home page. Exists so the scaffold proves end to end that a route
 * renders to static HTML containing real, crawlable text. Replaced by the real
 * landing page in a later task.
 */
const HomePage = (): React.JSX.Element => (
  <main className={styles['main']}>
    <PageHeading title={SITE_TAGLINE} description={SITE_DESCRIPTION} />
    <p className={styles['note']}>{ACCEPTANCE_DISCLAIMER}</p>
  </main>
);

export default HomePage;
