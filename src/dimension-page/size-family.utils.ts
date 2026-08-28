import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { SIZE_FAMILIES, SIZE_MATCH_TOLERANCE_MM } from './size-family.constants';
import type { PhotoSpec, PrintSize } from '@/photo-spec/photo-spec.schemas';
import type { ServedSizeFamily, SizeFamily } from './size-family.types';

/**
 * Exactly the fields a size is decided by.
 *
 * Narrower than PhotoSpec on purpose: it says what the matching reads, and it
 * lets a resolved specification — which carries a different head-height shape
 * — be passed without a cast.
 */
export type SizedSpec = Pick<PhotoSpec, 'print' | 'alternativePrintSizes' | 'digital'>;

/**
 * Whether a specification actually requires this size.
 *
 * Each kind asks a different question, and the difference matters:
 *
 * A PRINT size must be one the authority accepts, including any alternative it
 * publishes alongside the main one — a country that accepts both 35x45mm and a
 * legacy square belongs on both pages.
 *
 * A PIXEL size is a range rather than a value. Somebody told to upload 600x600
 * wants to know whose forms that satisfies, and a specification accepting
 * 600-1200 satisfies it; one demanding at least 900 does not.
 *
 * A FILE SIZE is an exact ceiling. "Resize to 240KB" is a specific instruction
 * from a specific form, and listing a country with a 10MB limit under it would
 * be answering a question nobody asked.
 */
export const familyMatches = (family: SizeFamily, spec: SizedSpec): boolean => {
  if (family.kind === 'print') {
    return [spec.print, ...(spec.alternativePrintSizes ?? [])].some((size) =>
      isSamePrintSize(size, family.widthMm, family.heightMm),
    );
  }

  // A country that published no digital requirement cannot answer a question
  // about pixels or file size. It still answers one about the printed size,
  // which is the only number its authority actually stated.
  const { digital } = spec;
  if (digital === undefined) return false;

  if (family.kind === 'pixels') {
    const { minEdgePx, maxEdgePx } = digital;
    return family.edgePx >= minEdgePx && (maxEdgePx === undefined || family.edgePx <= maxEdgePx);
  }

  return digital.maxBytes === family.maxBytes;
};

const isSamePrintSize = (size: PrintSize, widthMm: number, heightMm: number): boolean =>
  Math.abs(size.widthMm - widthMm) <= SIZE_MATCH_TOLERANCE_MM &&
  Math.abs(size.heightMm - heightMm) <= SIZE_MATCH_TOLERANCE_MM;

/**
 * Only the families some served specification actually requires.
 *
 * The same rule the country pages follow, for the same reason: a page about a
 * requirement nobody has is a page with nothing true to say, and a page built
 * from an unverified specification is worse than no page at all. It is also
 * what keeps these pages off the thin-content pile — every one of them lists
 * real countries, because it only exists if there are some.
 */
export const servedSizeFamilies = (
  families: readonly SizeFamily[] = SIZE_FAMILIES,
  specs: readonly PhotoSpec[] = listServableSpecs(),
): readonly ServedSizeFamily[] =>
  families
    .map((family) => ({ family, specs: specs.filter((spec) => familyMatches(family, spec)) }))
    .filter((served) => served.specs.length > 0);

/**
 * The size pages a given specification belongs on.
 *
 * The other direction of the same relationship, for the country page to link
 * back with. Cross-linking both ways is what stops the two families competing
 * for the same readers: the country page owns the requirements and points at
 * the number; the number page owns "who asks for this" and points at the
 * countries.
 */
export const familiesForSpec = (
  spec: SizedSpec,
  families: readonly SizeFamily[] = SIZE_FAMILIES,
  specs: readonly PhotoSpec[] = listServableSpecs(),
): readonly SizeFamily[] =>
  servedSizeFamilies(families, specs)
    .filter((served) => familyMatches(served.family, spec))
    .map((served) => served.family);

export const findSizeFamily = (
  slug: string,
  families: readonly SizeFamily[] = SIZE_FAMILIES,
  specs: readonly PhotoSpec[] = listServableSpecs(),
): ServedSizeFamily | undefined =>
  servedSizeFamilies(families, specs).find((served) => served.family.slug === slug);
