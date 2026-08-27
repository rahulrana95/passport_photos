import type { Metadata } from 'next';
import { CheckerPanel } from '@/components/checker/CheckerPanel/CheckerPanel';
import { PageHeading } from '@/components/common/PageHeading/PageHeading';
import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { getContent } from '@/content/content.registry';
import { JsonLdScript } from '@/seo/JsonLdScript';
import { buildMetadata } from '@/seo/metadata.utils';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { webApplicationJsonLd } from '@/seo/structured-data.utils';
import styles from './page.module.css';

const content = getContent();

export const metadata: Metadata = buildMetadata({
  title: content.checker.heading,
  description: content.checker.intro,
  route: ROUTE_SEGMENTS.checker,
});

/**
 * The checker.
 *
 * Server-rendered down to the panel, so the heading, the intro and the privacy
 * explanation are in the static HTML a crawler reads. Only the panel is a
 * client component, and even that loads no models until somebody adds a photo.
 *
 * The specifications are resolved HERE, on the server, and handed down. The
 * panel renders whatever it is given: which countries are covered is a fact
 * about the registry, and a client component that knew the registry would ship
 * it to every reader.
 */
const CheckerPage = (): React.JSX.Element => {
  const now = new Date();
  const specs = listServableSpecs().map((spec) => resolveSpec(spec, now));

  return (
    <main className={styles['main']} id={SKIP_LINK_TARGET_ID}>
      <JsonLdScript node={webApplicationJsonLd()} />
      <PageHeading title={content.checker.heading} description={content.checker.intro} />
      <CheckerPanel specs={specs} />
      <section>
        <h2>{content.checker.privacyHeading}</h2>
        <p>{content.checker.privacyBody}</p>
      </section>
    </main>
  );
};

export default CheckerPage;
