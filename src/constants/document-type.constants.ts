/**
 * The document types this product can check a photo for.
 *
 * Declared here rather than in the specification registry because routes are
 * addressable before any specification exists: the route layer decides what is
 * reachable, and the registry (PR #8) fills in the requirements for each.
 */
export const DOCUMENT_TYPES = ['passport', 'visa', 'id-card', 'residence', 'licence'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = {
  passport: 'Passport',
  visa: 'Visa',
  'id-card': 'ID card',
  residence: 'Residence permit',
  licence: 'Driving licence',
};

export const isDocumentType = (value: string): value is DocumentType =>
  (DOCUMENT_TYPES as readonly string[]).includes(value);
