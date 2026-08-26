import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JsonLdScript } from './JsonLdScript';
import { faqJsonLd, organisationJsonLd } from './structured-data.utils';

describe('JsonLdScript', () => {
  it('emits a script tag with the structured-data MIME type', () => {
    const { container } = render(<JsonLdScript node={organisationJsonLd()} />);

    expect(container.querySelector('script')).toHaveAttribute(
      'type',
      'application/ld+json',
    );
  });

  it('emits parseable JSON', () => {
    const { container } = render(<JsonLdScript node={organisationJsonLd()} />);

    const raw = container.querySelector('script')?.innerHTML ?? '';
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('escapes a closing tag so it cannot terminate the script element early', () => {
    // Without the escape, an answer containing </script> would end the element
    // and inject the remainder of the payload into the document as markup.
    const { container } = render(
      <JsonLdScript node={faqJsonLd([{ question: '</script><img>', answer: 'x' }])} />,
    );

    const raw = container.querySelector('script')?.innerHTML ?? '';
    expect(raw).not.toContain('</script>');
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders exactly one element and nothing else', () => {
    // Not asserted via textContent: jsdom counts script contents as text, so
    // that check would pass for a component that also rendered a stray div.
    const { container } = render(<JsonLdScript node={organisationJsonLd()} />);

    expect(container.querySelectorAll('*')).toHaveLength(1);
    expect(container.firstElementChild?.tagName).toBe('SCRIPT');
  });
});
