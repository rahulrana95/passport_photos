import type { DocumentType } from '@/constants/document-type.constants';

/**
 * What the footer links a country to when it has more than one specification.
 *
 * A passport, because that is what most readers arrive looking for. Where a
 * country has no passport specification — Schengen publishes a visa standard
 * and not a passport one — the footer links whatever it does have rather than
 * a page that does not exist.
 */
export const PREFERRED_FOOTER_DOCUMENT: DocumentType = 'passport';
