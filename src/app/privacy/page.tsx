import type { Metadata } from 'next';
import { LegalPage } from '@/legal-page/legal-page';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { buildMetadata } from '@/seo/metadata.utils';
import { getContent } from '@/content/content.registry';

const content = getContent();

export const metadata: Metadata = buildMetadata({
  title: content.legalPages.privacy.metaTitle,
  description: content.legalPages.privacy.metaDescription,
  route: ROUTE_SEGMENTS.privacy,
});

/**
 * A day, because this is the page a reader checks when they are deciding
 * whether to believe the sentence on every other page.
 */
export const revalidate = 86_400;

const PrivacyPage = (): React.JSX.Element => (
  <LegalPage page={content.legalPages.privacy} route={ROUTE_SEGMENTS.privacy} />
);

export default PrivacyPage;
