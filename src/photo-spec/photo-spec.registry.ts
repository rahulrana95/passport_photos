import type { CountrySlug } from '@/constants/country.constants';
import type { DocumentType } from '@/constants/document-type.constants';
import { photoSpecSchema, type PhotoSpec } from './photo-spec.schemas';
import { deepFreeze, resolveSpec } from './photo-spec.utils';
import type { SpecKey, SpecLookupResult } from './photo-spec.types';
import { FRANCE_PASSPORT } from './specs/france.spec';
import { GERMANY_PASSPORT } from './specs/germany.spec';
import { NETHERLANDS_PASSPORT } from './specs/netherlands.spec';
import { SCHENGEN_VISA } from './specs/schengen.spec';
import { UK_PASSPORT } from './specs/uk.spec';
import { US_PASSPORT, US_VISA } from './specs/us.spec';

const AUTHORED_SPECS: readonly PhotoSpec[] = [
  US_PASSPORT,
  US_VISA,
  UK_PASSPORT,
  SCHENGEN_VISA,
  FRANCE_PASSPORT,
  GERMANY_PASSPORT,
  NETHERLANDS_PASSPORT,
];

export const specKey = (country: CountrySlug, document: DocumentType): SpecKey =>
  `${country}:${document}`;

/**
 * Every spec is parsed at module load, not on use.
 *
 * A malformed specification then fails the build rather than a single page
 * request, which is the difference between a red CI run and one country quietly
 * serving wrong requirements to real applicants.
 */
export const buildRegistry = (specs: readonly PhotoSpec[]): ReadonlyMap<SpecKey, PhotoSpec> => {
  const registry = new Map<SpecKey, PhotoSpec>();

  for (const candidate of specs) {
    const spec = photoSpecSchema.parse(candidate);
    const key = specKey(spec.country, spec.document);

    if (registry.has(key)) {
      throw new Error(`Duplicate specification for ${key}. Each country and document pair must be unique.`);
    }
    registry.set(key, deepFreeze(spec));
  }
  return registry;
};

const REGISTRY = buildRegistry(AUTHORED_SPECS);

/** Only verified specs are served. See VERIFICATION_STATUSES for why. */
const isServable = (spec: PhotoSpec): boolean => spec.verification === 'verified';

export const listAuthoredSpecs = (): readonly PhotoSpec[] => [...REGISTRY.values()];

export const listServableSpecs = (): readonly PhotoSpec[] =>
  [...REGISTRY.values()].filter(isServable);

/**
 * Returns a typed not-found rather than undefined, so a caller cannot
 * accidentally render a page for a country we do not cover.
 *
 * The registry is a parameter rather than a closed-over module constant so the
 * lookup stays a pure function. That matters right now for a reason worth
 * stating: every seeded specification is provisional, so the real registry
 * serves nothing, and the success path would otherwise be untestable until a
 * human verifies a spec against its source.
 */
export const findSpecIn = (
  registry: ReadonlyMap<SpecKey, PhotoSpec>,
  country: string,
  document: string,
  now: Date,
): SpecLookupResult => {
  const spec = registry.get(`${country}:${document}` as SpecKey);

  if (spec === undefined) {
    const countryIsKnown = [...registry.keys()].some((key) => key.startsWith(`${country}:`));
    return { found: false, reason: countryIsKnown ? 'unsupported-document' : 'unknown-country' };
  }
  if (!isServable(spec)) return { found: false, reason: 'unknown-country' };

  return { found: true, spec: resolveSpec(spec, now) };
};

export const findSpec = (country: string, document: string, now: Date): SpecLookupResult =>
  findSpecIn(REGISTRY, country, document, now);
