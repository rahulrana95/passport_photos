import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  isDocumentType,
} from './document-type.constants';

describe('document types', () => {
  it('labels every type', () => {
    for (const type of DOCUMENT_TYPES) {
      expect(DOCUMENT_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it.each(DOCUMENT_TYPES)('%s is URL-safe', (type) => {
    expect(type).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('accepts a known type', () => {
    expect(isDocumentType('passport')).toBe(true);
  });

  it('rejects an unknown type', () => {
    expect(isDocumentType('library-card')).toBe(false);
  });
});
