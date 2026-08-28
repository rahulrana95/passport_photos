import type { Metadata } from 'next';
import { LegalPage } from '@/legal-page/legal-page';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { buildMetadata } from '@/seo/metadata.utils';
import { getContent } from '@/content/content.registry';

const content = getContent();

export const metadata: Metadata = buildMetadata({
  title: content.legalPages.terms.metaTitle,
  description: content.legalPages.terms.metaDescription,
  route: ROUTE_SEGMENTS.terms,
});

export const revalidate = 86_400;

const TermsPage = (): React.JSX.Element => (
  <LegalPage page={content.legalPages.terms} route={ROUTE_SEGMENTS.terms} />
);

export default TermsPage;
