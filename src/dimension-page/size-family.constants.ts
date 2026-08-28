import type { SizeFamily } from './size-family.types';

/**
 * The numbers people are given by a form, and the URL each one answers at.
 *
 * SLUGS ARE THE SEARCH, NOT THE UNIT WE PREFER. A US applicant is told "2x2
 * inches" and types that; nobody searches for 50.8x50.8mm even though that is
 * the same square and the registry stores it in millimetres. The slug is the
 * phrase, and the matching below is done on the underlying measurement, so the
 * two can differ without either being wrong.
 *
 * A family with no served specification behind it gets no page — see
 * servedSizeFamilies. That is why 50x70mm is declared here and does not
 * currently render: the size is real and several countries use it, but none of
 * them is verified yet, and a page about a requirement we have not checked is
 * the one thing this product must not publish.
 */
export const SIZE_FAMILIES: readonly SizeFamily[] = [
  { kind: 'print', slug: '2x2-inch-photo', widthMm: 50.8, heightMm: 50.8, unit: 'inch' },
  { kind: 'print', slug: '35x45mm-photo', widthMm: 35, heightMm: 45, unit: 'mm' },
  { kind: 'print', slug: '50x70mm-photo', widthMm: 50, heightMm: 70, unit: 'mm' },
  { kind: 'pixels', slug: '600x600-photo', edgePx: 600 },
  { kind: 'file-size', slug: 'resize-photo-to-240kb', maxBytes: 240_000 },
];

/**
 * How close two printed sizes have to be to count as the same requirement.
 *
 * A tenth of a millimetre. 2x2 inches is 50.8mm exactly, and an authority that
 * published 51mm means the same square — but 50mm and 51mm are genuinely
 * different sizes and must not collapse onto one page.
 */
export const SIZE_MATCH_TOLERANCE_MM = 0.1;
