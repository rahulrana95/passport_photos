import { isDocumentType, type DocumentType } from '@/constants/document-type.constants';
import { DOCUMENT_SEGMENT_SUFFIX } from './country-page.constants';

/**
 * Reads the document type back out of a URL segment.
 *
 * The inverse of `countryDocumentRoute`, which writes `/us/passport-photo`. The
 * suffix is not decoration: `/us/passport` would collide with any future page
 * about the document itself, and the word people actually search for is
 * "passport photo" rather than "passport".
 *
 * Returns undefined rather than throwing. An unknown segment is an ordinary
 * request for a page that does not exist — the route answers it with a 404, and
 * a thrown error there would be a 500 for a URL somebody merely mistyped.
 */
export const documentFromSegment = (segment: string): DocumentType | undefined => {
  if (!segment.endsWith(DOCUMENT_SEGMENT_SUFFIX)) return undefined;

  const candidate = segment.slice(0, -DOCUMENT_SEGMENT_SUFFIX.length);

  return isDocumentType(candidate) ? candidate : undefined;
};

/** The segment a document type is addressed by, e.g. 'passport-photo'. */
export const segmentFromDocument = (document: DocumentType): string =>
  `${document}${DOCUMENT_SEGMENT_SUFFIX}`;
