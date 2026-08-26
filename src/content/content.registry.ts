import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { EN_CONTENT } from './en.content';
import type { ContentTree } from './content.types';

export const SUPPORTED_LOCALES = ['en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Adding a locale means adding it here. Because the record is keyed by
 * SupportedLocale and valued as ContentTree, a locale that is registered but
 * missing — or one whose copy omits a key — fails the build rather than
 * rendering an empty string in production.
 */
const CONTENT_BY_LOCALE: Readonly<Record<SupportedLocale, ContentTree>> = {
  en: EN_CONTENT,
};

export const isSupportedLocale = (value: string): value is SupportedLocale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

export const getContent = (locale: string = DEFAULT_LOCALE): ContentTree =>
  isSupportedLocale(locale) ? CONTENT_BY_LOCALE[locale] : CONTENT_BY_LOCALE[DEFAULT_LOCALE];
