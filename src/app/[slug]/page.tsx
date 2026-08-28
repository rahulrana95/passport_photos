import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CheckerPanel } from '@/components/checker/CheckerPanel/CheckerPanel';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs/Breadcrumbs';
import { PageHeading } from '@/components/common/PageHeading/PageHeading';
import { COUNTRY_NAMES } from '@/constants/country.constants';
import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-type.constants';
import { ROUTE_SEGMENTS, countryDocumentRoute, dimensionFamilyRoute } from '@/constants/routes.constants';
import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { buildMetadata } from '@/seo/metadata.utils';
import { familyHeading, familyLabel } from '@/dimension-page/dimension-label.utils';
import { findSizeFamily, servedSizeFamilies } from '@/dimension-page/size-family.utils';
import { getContent } from '@/content/content.registry';
import { interpolate } from '@/content/interpolate.utils';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import type { ServedSizeFamily } from '@/dimension-page/size-family.types';
import styles from './page.module.css';

interface DimensionPageParams {
  readonly slug: string;
}

interface DimensionPageProps {
  readonly params: Promise<DimensionPageParams>;
}

/**
 * One page per number somebody has actually been given.
 *
 * Generated from the families that a SERVED specification requires, so a page
 * never exists without real countries on it — which is also what keeps these
 * off the thin-content pile. 50x70mm is declared in the catalogue and does not
 * render, because nothing verified uses it yet.
 */
export const generateStaticParams = (): DimensionPageParams[] =>
  servedSizeFamilies().map((served) => ({ slug: served.family.slug }));

export const dynamicParams = false;

const familyFor = (slug: string): ServedSizeFamily => {
  const found = findSizeFamily(slug);
  if (found === undefined) notFound();

  return found;
};

export const generateMetadata = async ({ params }: DimensionPageProps): Promise<Metadata> => {
  const { family } = familyFor((await params).slug);
  const content = getContent();
  const size = familyLabel(family, content, DEFAULT_LOCALE);

  return buildMetadata({
    title: interpolate(content.dimension.metaTitles[family.kind], { size }),
    description: interpolate(content.dimension.metaDescriptions[family.kind], { size }),
    route: dimensionFamilyRoute(family.slug),
  });
};

/**
 * A size, who asks for it, and the checker.
 *
 * THE LIST OF COUNTRIES IS THE POINT. Somebody searching "2x2 photo" has been
 * told a number and does not know whose rule it is; the answer they need is
 * which forms accept it and what else each of those forms wants. A page that
 * only restated the number would be a dictionary entry, and it would compete
 * with the country pages for the same readers while telling them less.
 *
 * The overlap with country pages is deliberate and one-directional: this page
 * links out to each country, states its own number, and leaves the full
 * requirements to the page that owns them.
 */
const DimensionPage = async ({ params }: DimensionPageProps): Promise<React.JSX.Element> => {
  const { family, specs } = familyFor((await params).slug);
  const content = getContent();
  const now = new Date();
  const size = familyLabel(family, content, DEFAULT_LOCALE);

  return (
    <main className={styles['main']} id={SKIP_LINK_TARGET_ID}>
      <Breadcrumbs
        entries={[
          { name: content.dimension.breadcrumbHome, route: ROUTE_SEGMENTS.home },
          {
            name: familyHeading(family, content, DEFAULT_LOCALE),
            route: dimensionFamilyRoute(family.slug),
          },
        ]}
      />

      <PageHeading
        title={familyHeading(family, content, DEFAULT_LOCALE)}
        description={interpolate(content.dimension.intros[family.kind], { size })}
      />

      <section className={styles['section']}>
        <h2>{content.dimension.usedByHeading}</h2>
        <ul className={styles['list']}>
          {specs.map((spec) => (
            <li key={`${spec.country}:${spec.document}`}>
              <a
                className={styles['link']}
                href={countryDocumentRoute(spec.country, spec.document)}
              >
                {interpolate(content.dimension.usedByItem, {
                  country: COUNTRY_NAMES[spec.country],
                  document: DOCUMENT_TYPE_LABELS[spec.document].toLowerCase(),
                })}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles['section']}>
        <h2>{content.dimension.checkHeading}</h2>
        {/* Every specification that requires this size, so the picker is a
            real choice here rather than the single option a country page
            offers. */}
        <CheckerPanel specs={specs.map((spec) => resolveSpec(spec, now))} />
      </section>
    </main>
  );
};

export default DimensionPage;
