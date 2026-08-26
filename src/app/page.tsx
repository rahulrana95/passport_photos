import type { Metadata } from 'next';
import { PageHeading } from '@/components/common/PageHeading/PageHeading';
import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { homeRoute } from '@/constants/routes.constants';
import { SITE_DESCRIPTION, SITE_TAGLINE } from '@/constants/site.constants';
import { JsonLdScript } from '@/seo/JsonLdScript';
import { buildMetadata } from '@/seo/metadata.utils';
import { webApplicationJsonLd } from '@/seo/structured-data.utils';
import styles from './page.module.css';

export const metadata: Metadata = buildMetadata({
  title: SITE_TAGLINE,
  description: SITE_DESCRIPTION,
  route: homeRoute(),
});

/**
 * Placeholder home page. Exists so the scaffold proves end to end that a route
 * renders to static HTML containing real, crawlable text. Replaced by the real
 * landing page in a later task.
 */
const HomePage = (): React.JSX.Element => (
  <main className={styles['main']} id={SKIP_LINK_TARGET_ID}>
    <JsonLdScript node={webApplicationJsonLd()} />
    <PageHeading title={SITE_TAGLINE} description={SITE_DESCRIPTION} />
  </main>
);

export default HomePage;
