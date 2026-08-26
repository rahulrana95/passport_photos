import { serialiseJsonLd } from './structured-data.utils';
import type { JsonLdScriptProps } from './JsonLdScript.types';

/**
 * Emits structured data into the server-rendered HTML.
 *
 * A Server Component: structured data injected after hydration is unreliable,
 * because a crawler may have already read and moved on.
 */
export const JsonLdScript = ({ node }: JsonLdScriptProps): React.JSX.Element => (
  <script
    type="application/ld+json"
    // The payload is built from typed builders in this module and escaped by
    // serialiseJsonLd; no user input reaches it.
    dangerouslySetInnerHTML={{ __html: serialiseJsonLd(node) }}
  />
);
