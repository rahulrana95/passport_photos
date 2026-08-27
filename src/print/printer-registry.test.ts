import { describe, expect, it } from 'vitest';
import { COUNTRY_SLUGS } from '@/constants/country.constants';
import { COUNTRIES_WITH_PRINTERS, printersFor } from './printer-registry';

describe('suggesting somewhere to print', () => {
  it('names shops a reader in the United States would recognise', () => {
    expect(printersFor('us').map((printer) => printer.name)).toContain('Walgreens');
  });

  it('names different shops in the United Kingdom', () => {
    // "Take it to Walgreens" is useless in Manchester and reads as a product
    // that has not thought about the reader at all.
    const uk = printersFor('uk').map((printer) => printer.name);

    expect(uk).toContain('Boots Photo');
    expect(uk).not.toContain('Walgreens');
  });

  it('returns nothing rather than something wrong for a country we do not know', () => {
    // Empty is a real answer. The interface says so in words instead of
    // filling the space with a chain from another continent.
    expect(printersFor('japan')).toEqual([]);
  });

  it.each(COUNTRY_SLUGS)('returns a list for %s, even if it is empty', (country) => {
    expect(Array.isArray(printersFor(country))).toBe(true);
  });

  it('tells each reader what to ask for at the counter', () => {
    // The counter is where it goes wrong: asking for "a passport photo" gets
    // a different and far more expensive service than asking for a print.
    for (const country of COUNTRIES_WITH_PRINTERS) {
      for (const printer of printersFor(country)) {
        expect(printer.service.length, `${country}: ${printer.name}`).toBeGreaterThan(0);
      }
    }
  });

  it('knows which countries it can name shops in', () => {
    expect(COUNTRIES_WITH_PRINTERS).toContain('us');
    expect(COUNTRIES_WITH_PRINTERS).not.toContain('japan');
  });

  it('covers fewer countries than it has specifications for, and says so by omission', () => {
    // Not a defect to be padded over. A list of every country with a plausible
    // shop name invented for it would be worse than a short honest one.
    expect(COUNTRIES_WITH_PRINTERS.length).toBeLessThan(COUNTRY_SLUGS.length);
    expect(COUNTRIES_WITH_PRINTERS.length).toBeGreaterThan(0);
  });
});
