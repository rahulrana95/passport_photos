import { describe, expect, it } from 'vitest';
import { DOCUMENT_TYPES } from '@/constants/document-type.constants';
import { countryDocumentRoute } from '@/constants/routes.constants';
import { documentFromSegment, segmentFromDocument } from './document-segment.utils';

describe('reading a document out of a URL segment', () => {
  it('round-trips every document type the product knows', () => {
    // The two functions are inverses, and a URL that cannot be read back is a
    // page that 404s while its own link points at it.
    for (const document of DOCUMENT_TYPES) {
      expect(documentFromSegment(segmentFromDocument(document))).toBe(document);
    }
  });

  it('reads the segment the route builder actually writes', () => {
    // Not the segment this file imagines it writes. The route builder is the
    // only thing that produces these URLs, so it decides the shape.
    const route = countryDocumentRoute('us', 'passport');
    const segment = route.split('/').at(-1) as string;

    expect(documentFromSegment(segment)).toBe('passport');
  });

  it('refuses a document type with no photo suffix', () => {
    // '/us/passport' is a different URL and may one day be a different page.
    expect(documentFromSegment('passport')).toBeUndefined();
  });

  it('refuses a suffix with no document type in front of it', () => {
    expect(documentFromSegment('-photo')).toBeUndefined();
  });

  it('refuses a document this product does not cover', () => {
    expect(documentFromSegment('firearms-licence-photo')).toBeUndefined();
  });

  it('refuses something that only ends the right way', () => {
    expect(documentFromSegment('holiday-photo')).toBeUndefined();
  });
});
