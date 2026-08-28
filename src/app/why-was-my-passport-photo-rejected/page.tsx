import type { Metadata } from 'next';
import { CheckerPanel } from '@/components/checker/CheckerPanel/CheckerPanel';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs/Breadcrumbs';
import { FaqList } from '@/components/content/FaqList/FaqList';
import { PageHeading } from '@/components/common/PageHeading/PageHeading';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { JsonLdScript } from '@/seo/JsonLdScript';
import { buildMetadata } from '@/seo/metadata.utils';
import { faqJsonLd } from '@/seo/structured-data.utils';
import { getContent } from '@/content/content.registry';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { rejectionReasons } from '@/problem-page/rejection-reasons.utils';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import styles from './page.module.css';

const content = getContent();

export const metadata: Metadata = buildMetadata({
  title: content.problem.rejected.metaTitle,
  description: content.problem.rejected.metaDescription,
  route: ROUTE_SEGMENTS.rejected,
});

/**
 * The page for somebody holding a rejection notice.
 *
 * A DIFFERENT ENTRY FLOW, not a redirect to the checker. Everywhere else on
 * this site the reader has a photograph they are hopeful about and wants a
 * verdict; here they already have the verdict and want a diagnosis. So the
 * reasons come first and the checker second, framed as measuring the photo
 * that was refused rather than one they are about to submit.
 *
 * The reasons are built from the rule registry, so the page cannot describe a
 * rule the engine does not measure — or fall silent about one it does.
 */
const RejectedPage = (): React.JSX.Element => {
  const now = new Date();
  const specs = listServableSpecs().map((spec) => resolveSpec(spec, now));
  const reasons = rejectionReasons(content);

  return (
    <main className={styles['main']} id={SKIP_LINK_TARGET_ID}>
      <JsonLdScript node={faqJsonLd(reasons)} />

      <Breadcrumbs
        entries={[
          { name: content.problem.breadcrumbHome, route: ROUTE_SEGMENTS.home },
          { name: content.problem.rejected.title, route: ROUTE_SEGMENTS.rejected },
        ]}
      />

      <PageHeading
        title={content.problem.rejected.title}
        description={content.problem.rejected.intro}
      />

      {/* Before the checker, deliberately. Somebody who has been refused wants
          to know what the words on the letter mean; offering them an upload
          first answers a question they did not ask. */}
      <FaqList heading={content.problem.rejected.reasonsHeading} entries={reasons} />

      <section className={styles['section']}>
        <h2>{content.problem.rejected.checkHeading}</h2>
        <p>{content.problem.rejected.checkIntro}</p>
        <CheckerPanel specs={specs} />
      </section>
    </main>
  );
};

export default RejectedPage;
