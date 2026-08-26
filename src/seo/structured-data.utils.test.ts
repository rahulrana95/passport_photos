import { describe, expect, it } from 'vitest';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import type { FaqEntry } from '@/components/content/FaqList/FaqList.types';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  organisationJsonLd,
  serialiseJsonLd,
  webApplicationJsonLd,
} from './structured-data.utils';

const SITE = 'https://example.test';

const FAQ: readonly FaqEntry[] = [
  { question: 'Can I wear glasses?', answer: 'Not for a US passport photo, since November 2016.' },
  { question: 'How recent must it be?', answer: 'Within the last six months.' },
];

describe('organisationJsonLd', () => {
  it('declares an Organization at the site root', () => {
    const node = organisationJsonLd();
    expect(node['@type']).toBe('Organization');
    expect(node['url']).toBe(SITE);
  });
});

describe('webApplicationJsonLd', () => {
  it('declares software rather than an article', () => {
    expect(webApplicationJsonLd()['@type']).toBe('WebApplication');
  });

  it('states a price of zero, which is how a free tool is distinguished from freemium', () => {
    expect(webApplicationJsonLd()['offers']).toMatchObject({ price: '0' });
  });
});

describe('faqJsonLd', () => {
  it('emits one Question per entry, in order', () => {
    const node = faqJsonLd(FAQ);
    expect(node['mainEntity']).toHaveLength(FAQ.length);
  });

  it('carries the answer text verbatim, so it matches what the page shows', () => {
    // Structured data promising content the reader cannot see is a
    // manual-action risk, not a shortcut.
    const node = faqJsonLd(FAQ);
    expect(JSON.stringify(node)).toContain(FAQ[0]!.answer);
  });

  it('handles an empty list without emitting a malformed node', () => {
    expect(faqJsonLd([])['mainEntity']).toEqual([]);
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers positions from one, not zero', () => {
    const node = breadcrumbJsonLd([
      { name: 'Home', route: ROUTE_SEGMENTS.home },
      { name: 'US passport photo', route: '/us/passport-photo' },
    ]);
    const items = node['mainEntity'] ?? node['itemListElement'];
    expect(items).toMatchObject([{ position: 1 }, { position: 2 }]);
  });

  it('uses absolute URLs built through the route builder', () => {
    const node = breadcrumbJsonLd([{ name: 'Home', route: ROUTE_SEGMENTS.home }]);
    expect(JSON.stringify(node)).toContain(SITE);
  });
});

describe('howToJsonLd', () => {
  it('numbers steps from one', () => {
    const node = howToJsonLd('Take a compliant photo', [
      { name: 'Stand against a plain wall', text: 'Face the camera squarely.' },
      { name: 'Check the result', text: 'Drop the file in and read the report.' },
    ]);
    expect(node['step']).toMatchObject([{ position: 1 }, { position: 2 }]);
  });
});

describe('serialiseJsonLd', () => {
  it('produces parseable JSON', () => {
    expect(() => JSON.parse(serialiseJsonLd(organisationJsonLd()))).not.toThrow();
  });

  it('escapes < so a closing tag cannot terminate the script element early', () => {
    const serialised = serialiseJsonLd(faqJsonLd([{ question: '</script>', answer: 'x' }]));
    expect(serialised).not.toContain('</script>');
    expect(serialised).toContain('\\u003c');
  });
});
