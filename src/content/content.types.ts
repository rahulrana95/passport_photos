import type {
  ApplicationRequirementId,
  IsoRequirementId,
} from '@/rules/iso-requirement.constants';
import type { FixActionKind, RuleMessageId } from '@/rules/rule-message.constants';
import type { RuleId } from '@/rules/rule-id.constants';
import type { RequirementCoverage } from '@/rules/rule.types';

/** The four answers the coverage map can give about a requirement. */
export type CoverageKind = RequirementCoverage['kind'];

/** Every requirement that needs a human name, from either taxonomy. */
export type RequirementLabelKey = IsoRequirementId | ApplicationRequirementId;

/**
 * The shape every locale must satisfy.
 *
 * Declaring it as an interface rather than inferring it from the English file is
 * what makes a missing translation a compile error: a locale that omits a key,
 * or adds one nobody else has, fails `tsc`.
 */
export interface CommonContent {
  readonly skipToContent: string;
  readonly themeLabel: string;
  readonly loading: string;
  readonly retry: string;
  readonly close: string;
}

export interface UploadContent {
  readonly dropzoneLabel: string;
  readonly dropzoneHint: string;
  readonly browseLabel: string;
  readonly privacyNote: string;
  readonly errorTooLarge: string;
  readonly errorWrongType: string;
  readonly errorTooSmall: string;
  readonly errorHeicUnsupported: string;
  readonly errorCorrupt: string;
}

export interface ResultContent {
  readonly verdictPass: string;
  readonly verdictFail: string;
  readonly verdictWarning: string;
  readonly verdictManual: string;
  readonly verdictUndetectable: string;
  readonly manualChecklistHeading: string;
  readonly downloadDigital: string;
  readonly downloadPrintSheet: string;
  readonly downloadReport: string;
}

export interface LegalContent {
  readonly acceptanceDisclaimer: string;
  readonly privacyClaim: string;
  readonly verifyPrivacyHint: string;
  readonly specVerifiedOn: string;
}

export interface ErrorContent {
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly notFoundAction: string;
  readonly unexpectedTitle: string;
  readonly unexpectedBody: string;
}

export interface ContentTree {
  readonly common: CommonContent;
  readonly upload: UploadContent;
  readonly result: ResultContent;
  readonly legal: LegalContent;
  readonly errors: ErrorContent;
  readonly rules: RuleContent;
}

/**
 * Every word a compliance report can say.
 *
 * Records keyed by the engine's own unions, which is what makes a new rule
 * impossible to ship silently: adding one to the registry without writing its
 * label and its messages fails the build rather than rendering a blank row
 * where a verdict should be. The same holds in reverse for a locale — a
 * translation missing one message does not compile.
 */
export interface RuleContent {
  /** What was checked, e.g. "Head height". Short enough for a table row. */
  readonly labels: Readonly<Record<RuleId, string>>;
  /** What we found, per rule and per outcome. */
  readonly messages: Readonly<Record<RuleMessageId, string>>;
  /**
   * The physical correction. Templates, interpolated with the measured delta:
   * `{amount}` is the only placeholder, and it is already formatted with its
   * unit for the reader's locale by the time it lands here.
   */
  readonly fixes: Readonly<Record<FixActionKind, string>>;
  /** Names for the coverage map's four kinds of answer. */
  readonly coverageKinds: Readonly<Record<CoverageKind, string>>;
  /** Human names for the standard's requirements, for the coverage map. */
  readonly requirements: Readonly<Record<RequirementLabelKey, string>>;
  readonly formats: RuleFormatContent;
}

/**
 * How a measurement is written next to the requirement it is judged against.
 *
 * Templates rather than string concatenation, because the join between two
 * numbers is not the same in every language and "34 to 36" is not always the
 * order or the word. Pixels get a template of their own: there is no
 * internationalised unit for them, so the symbol is copy like any other.
 */
export interface RuleFormatContent {
  readonly range: string;
  readonly minimum: string;
  readonly pixels: string;
}
