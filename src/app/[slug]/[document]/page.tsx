import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CheckerPanel } from '@/components/checker/CheckerPanel/CheckerPanel';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs/Breadcrumbs';
import { CountryLinkGrid } from '@/components/navigation/CountryLinkGrid/CountryLinkGrid';
import { FaqList } from '@/components/content/FaqList/FaqList';
import { PageHeading } from '@/components/common/PageHeading/PageHeading';
import { RequirementsTable } from '@/components/content/RequirementsTable/RequirementsTable';
import { COUNTRY_NAMES } from '@/constants/country.constants';
import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-type.constants';
import {
  ROUTE_SEGMENTS,
  countryDocumentRoute,
  dimensionFamilyRoute,
} from '@/constants/routes.constants';
import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { JsonLdScript } from '@/seo/JsonLdScript';
import { buildFaqEntries } from '@/country-page/country-faq.utils';
import { buildMetadata } from '@/seo/metadata.utils';
import { buildRequirementRows } from '@/country-page/requirement-rows.utils';
import { documentFromSegment, segmentFromDocument } from '@/country-page/document-segment.utils';
import { faqJsonLd, howToJsonLd } from '@/seo/structured-data.utils';
import { familiesForSpec } from '@/dimension-page/size-family.utils';
import { familyLabel } from '@/dimension-page/dimension-label.utils';
import { findSpec, listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { getContent } from '@/content/content.registry';
import { interpolate } from '@/content/interpolate.utils';
import { relatedCountries } from '@/country-page/related-countries.utils';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import styles from './page.module.css';

/**
 * `slug` is the country here, and a dimension family one level up.
 *
 * Next allows exactly one dynamic segment name at a given depth, and the
 * dimension pages — /2x2-inch-photo and the rest — are single-segment routes
 * that have to share this one. So the folder is named for the shape of the URL
 * rather than for what a country page reads out of it.
 */
interface CountryPageParams {
  readonly slug: string;
  readonly document: string;
}

interface CountryPageProps {
  readonly params: Promise<CountryPageParams>;
}

/**
 * Every page that exists, and no page that does not.
 *
 * Generated from the SERVABLE registry rather than from the country list: a
 * country we have not verified has no requirements to publish, and a page
 * asserting government requirements nobody checked is the one failure this
 * product cannot recover from. Anything outside this list falls through to a
 * real 404 below.
 */
// Mutable by Next's contract, not by choice: the router's own validator
// rejects a readonly array here.
export const generateStaticParams = (): CountryPageParams[] =>
  listServableSpecs().map((spec) => ({
    slug: spec.country,
    document: segmentFromDocument(spec.document),
  }));

/**
 * Nothing outside the generated set renders at all.
 *
 * Without this a request for /france/passport-photo would be rendered on demand
 * and answered with whatever the page does for an unknown country — a soft 404
 * at best. With it, the router itself answers 404 before this file runs.
 */
export const dynamicParams = false;

const specFor = (params: CountryPageParams): ResolvedPhotoSpec => {
  const document = documentFromSegment(params.document);
  if (document === undefined) notFound();

  const found = findSpec(params.slug, document, new Date());
  if (!found.found) notFound();

  return found.spec;
};

export const generateMetadata = async ({ params }: CountryPageProps): Promise<Metadata> => {
  const spec = specFor(await params);
  const content = getContent();
  const names = {
    country: COUNTRY_NAMES[spec.country],
    document: DOCUMENT_TYPE_LABELS[spec.document].toLowerCase(),
  };

  return buildMetadata({
    title: interpolate(content.country.metaTitle, names),
    description: interpolate(content.country.metaDescription, names),
    route: countryDocumentRoute(spec.country, spec.document),
    lastModified: spec.lastVerified,
  });
};

/**
 * A country's requirements, with the checker that measures against them.
 *
 * THE CHECKER IS ABOVE THE REQUIREMENTS, deliberately. Somebody arriving from a
 * search for "us passport photo size" has a photograph in their hand and a
 * question about it; the table is what they read when the answer surprises
 * them. Putting the reference first would be optimising the page for the
 * crawler over the reader, and the crawler reads the whole document anyway.
 *
 * Everything except the checker is server-rendered text. The requirements, the
 * provenance line and every FAQ answer are in the HTML before any JavaScript
 * runs — this page's entire purpose is to be the best answer to that search,
 * and an answer that arrives after hydration is an answer a crawler may never
 * see.
 */
const CountryDocumentPage = async ({ params }: CountryPageProps): Promise<React.JSX.Element> => {
  const spec = specFor(await params);
  const content = getContent();

  const names = {
    country: COUNTRY_NAMES[spec.country],
    document: DOCUMENT_TYPE_LABELS[spec.document].toLowerCase(),
  };
  const say = (template: string): string => interpolate(template, names);

  const faqEntries = buildFaqEntries(spec, content, DEFAULT_LOCALE);
  const steps = [
    { name: content.country.steps.chooseName, text: say(content.country.steps.chooseText) },
    { name: content.country.steps.checkName, text: say(content.country.steps.checkText) },
    { name: content.country.steps.fixName, text: say(content.country.steps.fixText) },
  ];

  return (
    <main className={styles['main']} id={SKIP_LINK_TARGET_ID}>
      <JsonLdScript node={faqJsonLd(faqEntries)} />
      <JsonLdScript node={howToJsonLd(say(content.country.howToName), steps)} />

      <Breadcrumbs
        entries={[
          { name: content.country.breadcrumbHome, route: ROUTE_SEGMENTS.home },
          { name: content.country.breadcrumbChecker, route: ROUTE_SEGMENTS.checker },
          {
            name: say(content.country.title),
            route: countryDocumentRoute(spec.country, spec.document),
          },
        ]}
      />

      <PageHeading title={say(content.country.title)} description={say(content.country.intro)} />

      {/* One specification, not the picker: the reader chose their country by
          arriving here, and asking again would be asking them to confirm the
          URL they typed. */}
      <CheckerPanel specs={[spec]} />

      <section className={styles['section']}>
        <h2>{say(content.country.requirementsHeading)}</h2>
        <RequirementsTable
          caption={say(content.country.requirementsCaption)}
          rows={buildRequirementRows(spec, content, DEFAULT_LOCALE)}
          sourceUrl={spec.source}
          verifiedOn={spec.lastVerified}
        />
      </section>

      <FaqList heading={say(content.country.faqHeading)} entries={faqEntries} openFirst />

      {/* Out to the pages that own the numbers. The two families cross-link in
          both directions on purpose: this page owns the requirements and
          points at the size; the size page owns "who else asks for this" and
          points back. Without that they compete for the same reader while each
          telling them less. */}
      <nav className={styles['section']} aria-label={content.country.alsoKnownAsHeading}>
        <h2>{content.country.alsoKnownAsHeading}</h2>
        <ul className={styles['sizes']}>
          {familiesForSpec(spec).map((family) => (
            <li key={family.slug}>
              <a href={dimensionFamilyRoute(family.slug)}>
                {familyLabel(family, content, DEFAULT_LOCALE)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <CountryLinkGrid
        heading={content.country.otherCountriesHeading}
        documentType={spec.document}
        countries={relatedCountries(spec)}
        currentCountry={spec.country}
      />
    </main>
  );
};

export default CountryDocumentPage;
