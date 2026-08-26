import { absoluteUrl } from '@/constants/routes.constants';
import { SITE_DESCRIPTION, SITE_NAME } from '@/constants/site.constants';
import { env } from '@/config/env.config';
import type { FaqEntry } from '@/components/content/FaqList/FaqList.types';
import type { BreadcrumbEntry, HowToStep, JsonLdNode } from './structured-data.types';

const SCHEMA_CONTEXT = 'https://schema.org';

export const organisationJsonLd = (): JsonLdNode => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'Organization',
  name: SITE_NAME,
  url: env.NEXT_PUBLIC_SITE_URL,
});

/**
 * Declares the checker as software rather than an article.
 *
 * `price: '0'` is not marketing copy — it is how a search engine distinguishes a
 * genuinely free tool from a freemium one, and every paid competitor in this
 * category is freemium.
 */
export const webApplicationJsonLd = (): JsonLdNode => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'WebApplication',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: env.NEXT_PUBLIC_SITE_URL,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
});

/**
 * Every answer here MUST be visible on the page.
 *
 * Structured data that promises content the reader cannot see is a manual-action
 * risk, not a clever shortcut. faqJsonLd takes the same FaqEntry array the
 * FaqList component renders, so the two cannot diverge.
 */
export const faqJsonLd = (entries: readonly FaqEntry[]): JsonLdNode => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'FAQPage',
  mainEntity: entries.map((entry) => ({
    '@type': 'Question',
    name: entry.question,
    acceptedAnswer: { '@type': 'Answer', text: entry.answer },
  })),
});

export const breadcrumbJsonLd = (entries: readonly BreadcrumbEntry[]): JsonLdNode => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'BreadcrumbList',
  itemListElement: entries.map((entry, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: entry.name,
    item: absoluteUrl(env.NEXT_PUBLIC_SITE_URL, entry.route),
  })),
});

export const howToJsonLd = (name: string, steps: readonly HowToStep[]): JsonLdNode => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'HowTo',
  name,
  step: steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: step.text,
  })),
});

/**
 * Serialises a node for a <script type="application/ld+json"> tag.
 *
 * `<` is escaped because a closing tag appearing inside the JSON would end the
 * script element early and inject the rest as markup.
 */
export const serialiseJsonLd = (node: JsonLdNode): string =>
  JSON.stringify(node).replace(/</g, '\\u003c');
