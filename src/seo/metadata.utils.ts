import type { Metadata } from 'next';
import { absoluteUrl } from '@/constants/routes.constants';
import { SITE_NAME } from '@/constants/site.constants';
import { env } from '@/config/env.config';
import {
  DEFAULT_OG_IMAGE_PATH,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  TITLE_MAX_LENGTH,
} from './metadata.constants';
import type { PageMetadataInput } from './metadata.types';

export interface LengthWarning {
  readonly field: 'title' | 'description';
  readonly message: string;
}

/**
 * Pure, and exported separately from the factory so it can be asserted directly.
 * These are advisory: an over-long title still ranks, it just gets cut off
 * mid-sentence in the result, which is a writing problem rather than a build
 * failure.
 */
export const lengthWarnings = (input: PageMetadataInput): readonly LengthWarning[] => {
  const warnings: LengthWarning[] = [];
  const fullTitle = `${input.title} | ${SITE_NAME}`;

  if (fullTitle.length > TITLE_MAX_LENGTH) {
    warnings.push({
      field: 'title',
      message: `Title is ${fullTitle.length} characters including the site name; search results truncate around ${TITLE_MAX_LENGTH}.`,
    });
  }
  if (input.description.length > DESCRIPTION_MAX_LENGTH) {
    warnings.push({
      field: 'description',
      message: `Description is ${input.description.length} characters; search results truncate around ${DESCRIPTION_MAX_LENGTH}.`,
    });
  }
  if (input.description.length < DESCRIPTION_MIN_LENGTH) {
    warnings.push({
      field: 'description',
      message: `Description is only ${input.description.length} characters; under ${DESCRIPTION_MIN_LENGTH} tends to get rewritten by the search engine.`,
    });
  }
  return warnings;
};

/**
 * The only way a page gets metadata.
 *
 * Centralised so canonical URLs, the trailing-slash policy and the social tags
 * cannot drift page by page — the failure mode being two URLs for one page,
 * which splits its ranking between them.
 */
export const buildMetadata = (input: PageMetadataInput): Metadata => {
  const canonical = absoluteUrl(env.NEXT_PUBLIC_SITE_URL, input.route);
  const imageUrl = absoluteUrl(
    env.NEXT_PUBLIC_SITE_URL,
    input.imagePath ?? DEFAULT_OG_IMAGE_PATH,
  );

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical },
    // A page is indexable only when it asks to be AND the deployment is
    // production. Otherwise a preview build competes with the page it forked.
    robots:
      input.noIndex === true || !env.IS_INDEXABLE
        ? { index: false, follow: true }
        : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      url: canonical,
      images: [{ url: imageUrl, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: input.title }],
      ...(input.lastModified === undefined ? {} : { modifiedTime: input.lastModified }),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [imageUrl],
    },
  };
};
