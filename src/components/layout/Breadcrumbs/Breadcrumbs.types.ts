import type { BreadcrumbEntry } from '@/seo/structured-data.types';

export interface BreadcrumbsProps {
  /** Ordered from the site root to the current page, which is not linked. */
  readonly entries: readonly BreadcrumbEntry[];
}
