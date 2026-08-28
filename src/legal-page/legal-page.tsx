import { Breadcrumbs } from '@/components/layout/Breadcrumbs/Breadcrumbs';
import { PageHeading } from '@/components/common/PageHeading/PageHeading';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { getContent } from '@/content/content.registry';
import type { LegalPageContent } from '@/content/content.types';
import type { StaticRoute } from '@/constants/routes.constants';
import styles from './legal-page.module.css';

/**
 * The shared shape of a legal page: a heading, a date, and prose.
 *
 * One component for both because they are the same document twice, and two
 * copies of this would drift — the privacy page would gain a heading level or
 * a date position the terms page never got, and the site would look like two
 * sites at the moment a reader is deciding whether to trust it.
 *
 * Plain semantic HTML rendered on the server. Nothing here is interactive and
 * nothing about it should cost a hydration bundle.
 */
export const LegalPage = ({
  page,
  route,
}: {
  readonly page: LegalPageContent;
  readonly route: StaticRoute;
}): React.JSX.Element => {
  const content = getContent();

  return (
    <main className={styles['main']} id={SKIP_LINK_TARGET_ID}>
      <Breadcrumbs
        entries={[
          { name: content.legalPages.breadcrumbHome, route: ROUTE_SEGMENTS.home },
          { name: page.title, route },
        ]}
      />
      <PageHeading title={page.title} />
      <p className={styles['updated']}>{page.updated}</p>

      {page.sections.map((section) => (
        <section className={styles['section']} key={section.heading}>
          <h2 className={styles['heading']}>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p className={styles['paragraph']} key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
};
