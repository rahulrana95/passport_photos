/**
 * Countries whose requirements this product serves.
 *
 * The URL slug is deliberately separate from the ISO code: `schengen` is not a
 * country, but it is the single specification 29 member states share, and it is
 * what people actually search for. Slugs are what appear in URLs and must never
 * change once published.
 */
export const COUNTRY_SLUGS = [
  'us',
  'uk',
  'schengen',
  'canada',
  'australia',
  'india',
  'japan',
  'china',
  'brazil',
  'new-zealand',
  'france',
  'germany',
  'netherlands',
] as const;

export type CountrySlug = (typeof COUNTRY_SLUGS)[number];

export const COUNTRY_NAMES: Readonly<Record<CountrySlug, string>> = {
  us: 'United States',
  uk: 'United Kingdom',
  schengen: 'Schengen area',
  canada: 'Canada',
  australia: 'Australia',
  india: 'India',
  japan: 'Japan',
  china: 'China',
  brazil: 'Brazil',
  'new-zealand': 'New Zealand',
  france: 'France',
  germany: 'Germany',
  netherlands: 'Netherlands',
};

export const isCountrySlug = (value: string): value is CountrySlug =>
  (COUNTRY_SLUGS as readonly string[]).includes(value);
