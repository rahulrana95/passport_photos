'use client';

import { useEffect } from 'react';
import { getContent } from '@/content/content.registry';
import styles from './error-page.module.css';

interface ErrorPageProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

/**
 * Route-segment error boundary. Must be a Client Component — that is React's
 * contract for an error boundary.
 *
 * The copy deliberately reassures about the photo: a crash on a page where
 * someone has just handed over a picture of their face raises an obvious
 * question, and the honest answer is that nothing was ever sent anywhere.
 */
const ErrorPage = ({ error, reset }: ErrorPageProps): React.JSX.Element => {
  const content = getContent();

  useEffect(() => {
    // Message and digest only. Never anything derived from the user's image.
    console.error('Route error:', error.message, error.digest);
  }, [error]);

  return (
    <main className={styles['wrapper']} id="main-content">
      <h1 className={styles['title']}>{content.errors.unexpectedTitle}</h1>
      <p className={styles['body']}>{content.errors.unexpectedBody}</p>
      <button className={styles['action']} type="button" onClick={reset}>
        {content.common.retry}
      </button>
      {error.digest === undefined ? null : (
        <p className={styles['detail']}>Reference: {error.digest}</p>
      )}
    </main>
  );
};

export default ErrorPage;
