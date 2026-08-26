import type { Metadata } from 'next';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { getContent } from '@/content/content.registry';
import { buildMetadata } from '@/seo/metadata.utils';
import styles from './error-page.module.css';

/**
 * Returns a genuine 404 status because it is Next's not-found convention, rather
 * than a soft 200 rendering an apology — a soft 404 keeps the page in the index
 * and wastes crawl budget on a URL that does not exist.
 */
export const metadata: Metadata = buildMetadata({
  title: 'Page not found',
  description:
    'That page does not exist. Start from the passport photo checker and choose your country and document type.',
  route: ROUTE_SEGMENTS.checker,
  noIndex: true,
});

const NotFoundPage = (): React.JSX.Element => {
  const content = getContent();

  return (
    <main className={styles['wrapper']} id="main-content">
      <h1 className={styles['title']}>{content.errors.notFoundTitle}</h1>
      <p className={styles['body']}>{content.errors.notFoundBody}</p>
      <a className={styles['action']} href={ROUTE_SEGMENTS.checker}>
        {content.errors.notFoundAction}
      </a>
    </main>
  );
};

export default NotFoundPage;
