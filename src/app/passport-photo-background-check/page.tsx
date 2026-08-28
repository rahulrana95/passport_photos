import type { Metadata } from 'next';
import { CheckerPanel } from '@/components/checker/CheckerPanel/CheckerPanel';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs/Breadcrumbs';
import { PageHeading } from '@/components/common/PageHeading/PageHeading';
import { RequirementsTable } from '@/components/content/RequirementsTable/RequirementsTable';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { buildMetadata } from '@/seo/metadata.utils';
import { getContent } from '@/content/content.registry';
import { backgroundRows } from '@/problem-page/topic-rows.utils';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import styles from './page.module.css';

const content = getContent();

export const metadata: Metadata = buildMetadata({
  title: content.problem.background.metaTitle,
  description: content.problem.background.metaDescription,
  route: ROUTE_SEGMENTS.backgroundCheck,
});

/**
 * One requirement, across every country.
 *
 * The mirror of a country page, and not a duplicate of one: the rows here are
 * countries and the column is a single requirement, which is the comparison
 * somebody refused in one country and applying in another actually needs. The
 * country pages stay the place a full set of requirements lives.
 */
const BackgroundPage = (): React.JSX.Element => {
  const now = new Date();
  const specs = listServableSpecs();

  return (
    <main className={styles['main']} id={SKIP_LINK_TARGET_ID}>
      <Breadcrumbs
        entries={[
          { name: content.problem.breadcrumbHome, route: ROUTE_SEGMENTS.home },
          { name: content.problem.background.title, route: ROUTE_SEGMENTS.backgroundCheck },
        ]}
      />

      <PageHeading
        title={content.problem.background.title}
        description={content.problem.background.intro}
      />

      <section className={styles['section']}>
        <h2>{content.problem.background.tableHeading}</h2>
        <RequirementsTable
          caption={content.problem.background.tableCaption}
          rows={backgroundRows(content, specs)}
        />
      </section>

      <section className={styles['section']}>
        <h2>{content.problem.background.whyHeading}</h2>
        <p>{content.problem.background.whyBody}</p>
      </section>

      <section className={styles['section']}>
        <h2>{content.problem.background.checkHeading}</h2>
        <CheckerPanel specs={specs.map((spec) => resolveSpec(spec, now))} />
      </section>
    </main>
  );
};

export default BackgroundPage;
