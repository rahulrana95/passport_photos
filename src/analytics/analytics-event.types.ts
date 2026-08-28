import type { CountrySlug } from '@/constants/country.constants';
import type { DocumentType } from '@/constants/document-type.constants';
import type { ImageFormat } from '@/ingestion/image-format.constants';
import type { RuleId } from '@/rules/rule-id.constants';
import type { RuleStatus } from '@/constants/rule-status.constants';

/**
 * Everything this product is allowed to know about its own use.
 *
 * A CLOSED UNION, not a record of arbitrary properties, and that is the whole
 * safety mechanism. The rule is easy to state and impossible to keep by
 * convention: measurements of a person's face never leave their device. A
 * failing rule's IDENTITY is a fact about whether a photograph complies; the
 * 34.2mm that rule measured is a biometric measurement of somebody's head.
 * One belongs in analytics and the other is the thing this product promises
 * never to transmit.
 *
 * So there is no field anywhere below that can hold a number derived from
 * pixels. Adding one means editing this file, which means the test that
 * enumerates every payload key sees it, which means somebody has to decide
 * deliberately rather than by autocomplete.
 */

export interface SpecIdentity {
  readonly country: CountrySlug;
  readonly document: DocumentType;
}

export type AnalyticsEvent =
  /** A reader chose a specification and the tool became theirs to use. */
  | { readonly name: 'check-started'; readonly spec: SpecIdentity }
  /**
   * A photograph was read, or refused. The FORMAT is here because it decides
   * what we build next — how many readers arrive with a HEIC is the whole
   * argument for having spent a megabyte on decoding one.
   */
  | { readonly name: 'photo-accepted'; readonly format: ImageFormat }
  | { readonly name: 'photo-refused'; readonly reason: string }
  /** The verdict, as a verdict. No measurement reaches this. */
  | {
      readonly name: 'check-completed';
      readonly spec: SpecIdentity;
      readonly overall: RuleStatus;
      readonly failedRules: number;
    }
  /**
   * One event per failing rule, which is what makes a failure RATE possible.
   *
   * The most valuable number this product can collect: it says which
   * requirement people actually get wrong, and therefore what the guidance
   * should say first.
   */
  | { readonly name: 'rule-failed'; readonly ruleId: RuleId; readonly spec: SpecIdentity }
  /**
   * They got a photograph out. The closest thing this product has to revenue.
   *
   * Carries no country, deliberately. The button that fires it sits three
   * components below the one that knows which specification was chosen, and
   * threading the identity down to it would put the result panel and the
   * overlay in the business of analytics to record one click. The country mix
   * is already carried by the events the check itself emits.
   */
  | { readonly name: 'photo-downloaded' };

export type AnalyticsEventName = AnalyticsEvent['name'];

/** What Vercel Analytics accepts. Narrowed to what we actually send. */
export type AnalyticsPropertyValue = string | number;

export type AnalyticsPayload = Readonly<Record<string, AnalyticsPropertyValue>>;

/** The transport, as an interface, so a test never reaches the network. */
export type AnalyticsTransport = (
  name: string,
  payload: AnalyticsPayload,
) => void;
