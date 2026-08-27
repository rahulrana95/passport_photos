import { COUNTRY_SLUGS } from '@/constants/country.constants';
import type { CountrySlug } from '@/constants/country.constants';

/**
 * WHERE TO GET THE SHEET PRINTED.
 *
 * This is the half of the job the software cannot do. Most people who need a
 * passport photograph need a physical one, and a product that hands them a
 * perfect file and stops has solved the interesting part of their problem and
 * left the part they were actually stuck on.
 *
 * We will never post photographs. That is a logistics business with vans in it
 * and it is not this. Naming the shops on their high street costs nothing,
 * closes the loop, and removes the last reason to pay somebody else.
 *
 * THREE RULES ON THIS LIST, and they are the difference between a useful
 * suggestion and an advertisement:
 *
 *   - No endorsement is implied and none is stated. These are chains that
 *     print photographs, listed because they are the ones a reader will
 *     recognise, not because anybody paid.
 *   - No affiliate link exists here today. When one does it will be marked as
 *     one, in the copy, where the reader can see it. A suggestion that is
 *     quietly a paid placement is the thing this product exists in opposition
 *     to.
 *   - A country with no entry gets honest generic advice rather than an
 *     American chain. "Take it to Walgreens" is useless in Osaka and reads as
 *     a product that has not thought about the reader at all.
 */

export interface PrinterSuggestion {
  readonly name: string;
  /**
   * What the reader asks for at the counter. Not the same everywhere: the
   * phrase that gets a 4x6 print of a file differs by chain and by country,
   * and asking for the wrong thing gets a passport photo taken on the spot at
   * ten times the price.
   */
  readonly service: string;
}

/**
 * Countries where we can name shops. Deliberately partial — see the fallback.
 */
const SUGGESTIONS: Readonly<Partial<Record<CountrySlug, readonly PrinterSuggestion[]>>> = {
  us: [
    { name: 'Walgreens', service: '4x6 photo print from a file' },
    { name: 'CVS Photo', service: '4x6 photo print from a file' },
    { name: 'Walmart Photo', service: '4x6 photo print from a file' },
  ],
  uk: [
    { name: 'Boots Photo', service: '6x4 print from a digital file' },
    { name: 'Max Spielmann', service: '6x4 print from a digital file' },
    { name: 'Snappy Snaps', service: '6x4 print from a digital file' },
  ],
  canada: [
    { name: 'Shoppers Drug Mart', service: '4x6 photo print from a file' },
    { name: 'London Drugs', service: '4x6 photo print from a file' },
  ],
  australia: [
    { name: 'Officeworks', service: '6x4 photo print from a file' },
    { name: 'Big W Photos', service: '6x4 photo print from a file' },
  ],
  'new-zealand': [{ name: 'Warehouse Stationery', service: '6x4 photo print from a file' }],
  india: [{ name: 'A local photo studio or cyber cafe', service: '4x6 glossy print from a file' }],
};

/**
 * The shops to suggest, or an empty list where we do not know.
 *
 * Empty is a real answer and the UI says so in words rather than filling the
 * space with a chain from another continent.
 */
export const printersFor = (country: CountrySlug): readonly PrinterSuggestion[] =>
  SUGGESTIONS[country] ?? [];

/** Countries the registry can name shops in, for the coverage the site shows. */
export const COUNTRIES_WITH_PRINTERS: readonly CountrySlug[] = COUNTRY_SLUGS.filter(
  (country) => printersFor(country).length > 0,
);
