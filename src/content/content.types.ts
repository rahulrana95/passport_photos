import type {
  ApplicationRequirementId,
  IsoRequirementId,
} from '@/rules/iso-requirement.constants';
import type { FixActionKind, RuleMessageId } from '@/rules/rule-message.constants';
import type { RuleId } from '@/rules/rule-id.constants';
import type { RequirementCoverage } from '@/rules/rule.types';
import type { OverlayRole } from '@/overlay/overlay-role.constants';
import type { SheetSizeId } from '@/sheet/sheet-size.constants';
import type { IngestionMessageId } from '@/ingestion/ingestion-failure.types';
import type { AnalysisErrorCode, AnalysisStage } from '@/analysis/analysis-protocol.types';
import type { CameraFailureCode } from '@/camera/camera-failure.types';
import type { RuleStatus } from '@/constants/rule-status.constants';
import type { GuidanceId } from '@/camera/guidance/guidance.types';

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

/**
 * What a refusal says and what to do about it.
 *
 * The remedy is the field that matters. "We cannot read this file" loses the
 * reader; "your iPhone saved this as HEIC — open it in Photos, tap Share, copy
 * the photo and paste it here" keeps them.
 */
export interface IngestionMessage {
  readonly message: string;
  readonly remedy: string;
}

export interface UploadContent {
  readonly dropzoneLabel: string;
  readonly dropzoneHint: string;
  readonly browseLabel: string;
  readonly privacyNote: string;
  readonly takePhotoLabel: string;
  readonly pasteHint: string;
  readonly busyNote: string;
  /** Shown when several files are dropped at once. */
  readonly usedFirstOfMany: string;
  /** Shown when a drop contained no file at all — a folder, or a link. */
  readonly nothingDropped: string;
  /** Every refusal the ingestion pipeline can produce, keyed by its id. */
  readonly failures: Readonly<Record<IngestionMessageId, IngestionMessage>>;
}

/**
 * Every word the live camera can say.
 *
 * Keyed by the guidance engine's own union, so a new instruction cannot be
 * added without its words: the record fails to compile, rather than rendering
 * an empty banner over somebody's face while they wait to be told what to do.
 *
 * The instructions are deliberately short. They are read at arm's length, by
 * somebody who is holding a phone and trying to keep still, and a sentence
 * they have to stop and parse is a sentence that moves the camera.
 */
export interface CameraContent {
  readonly startLabel: string;
  readonly stopLabel: string;
  readonly captureLabel: string;
  readonly switchCameraLabel: string;
  readonly previewLabel: string;
  readonly fallbackToUpload: string;
  /** Interpolated with {percent}. */
  readonly headHeightReadout: string;
  readonly guidance: Readonly<Record<GuidanceId, string>>;
  readonly failures: Readonly<Record<CameraFailureCode, IngestionMessage>>;
}

/**
 * The checker page — the one screen where the whole product is assembled.
 */
export interface CheckerContent {
  readonly heading: string;
  readonly intro: string;
  readonly specLegend: string;
  /** Interpolated with {country} and {document}. */
  readonly specOption: string;
  readonly startOver: string;
  readonly privacyHeading: string;
  readonly privacyBody: string;
}

export interface ResultContent {
  /**
   * The headline, which has to stand alone at the top of a page.
   *
   * Deliberately different words from `statuses` below. A row says its verdict
   * beside the name of what was checked and gets its meaning from that pairing;
   * the headline has nothing beside it, so it has to carry the sentence.
   */
  readonly verdictPass: string;
  readonly verdictFail: string;
  readonly verdictWarning: string;
  readonly verdictManual: string;
  readonly verdictUndetectable: string;
  /**
   * The verdict as it appears in a row, next to what was checked.
   *
   * Short, because it appears once per rule and a report has twenty of them.
   * Repeating "Meets the published requirements" down a whole column buries
   * the two rows that do not, which is the only thing the reader came for.
   */
  readonly statuses: Readonly<Record<RuleStatus, string>>;
  readonly manualChecklistHeading: string;
  readonly downloadDigital: string;
  readonly downloadPrintSheet: string;
  readonly downloadReport: string;
  readonly resultsHeading: string;
  readonly downloadsHeading: string;
  readonly analysingLabel: string;
  /**
   * What each stage is doing, in words.
   *
   * Named stages rather than a bare percentage because the stages take
   * visibly different lengths of time: segmentation is most of the wait on a
   * mid-range phone, and a bar that crawls through it with no explanation
   * reads as a hang. "Finding the edges of your head" reads as work.
   */
  readonly stages: Readonly<Record<AnalysisStage, string>>;
  /** Announced when the analysis finishes. Interpolated with {verdict}. */
  readonly completeAnnouncement: string;
  readonly retryLabel: string;
  /** Every way the analysis itself can fail, keyed by the worker's own code. */
  readonly failures: Readonly<Record<AnalysisErrorCode, IngestionMessage>>;
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

/**
 * Words for the marks drawn on the photograph.
 *
 * The canvas carries no text of its own. Text baked into a bitmap cannot be
 * read by a screen reader, cannot be selected, does not reflow at mobile
 * widths, and would have to be scaled against the photograph's resolution
 * rather than the reader's font size. So every annotation is geometry, and the
 * legend beside it — real text, in the DOM — is what says what the geometry
 * means.
 */
export interface OverlayContent {
  readonly photoAlt: string;
  readonly legendHeading: string;
  readonly roles: Readonly<Record<OverlayRole, string>>;
  readonly download: string;
  readonly downloadFilename: string;
  readonly downloadFailed: string;
}

/**
 * Words for the printed sheet and for getting it printed.
 *
 * The handoff copy is load-bearing rather than decorative. Most people who
 * need a passport photograph need a physical one, and the step they are
 * actually stuck on is the one between a file and a print — so the
 * instructions have to be specific enough to say at a counter.
 */
export interface PrintContent {
  readonly sheetHeading: string;
  readonly sheetSizes: Readonly<Record<SheetSizeId, string>>;
  /** Interpolated with {count}. */
  readonly copiesPerSheet: string;
  readonly downloadJpeg: string;
  readonly downloadPdf: string;
  readonly cutGuidesNote: string;
  readonly scaleWarning: string;
  readonly tooLargeForSheet: string;
  readonly handoffHeading: string;
  readonly handoffSteps: readonly string[];
  readonly printersHeading: string;
  /** Shown above the list, and it says plainly that nobody paid for a place. */
  readonly printersNote: string;
  /** Shown instead of a list where we cannot name shops honestly. */
  readonly printersUnknown: string;
}

/**
 * Words for the downloadable report.
 *
 * All of them, and this is the property that lets the report be set in a font
 * nobody has to embed: it contains no text the reader supplied. There is no
 * name field and no free-text box anywhere in this product, so its character
 * repertoire is whatever the shipped locale uses.
 */
export interface ReportContent {
  readonly title: string;
  /** Interpolated with {date}. */
  readonly checkedOn: string;
  readonly overallHeading: string;
  readonly resultsHeading: string;
  readonly checklistHeading: string;
  readonly coverageHeading: string;
  /** Interpolated with {checked}, {manual}, {undetectable}, {planned}, {total}. */
  readonly coverageSummary: string;
  readonly sourceHeading: string;
  /** Interpolated with {date}. */
  readonly sourceVerified: string;
  readonly requirementLabel: string;
  readonly pageLabel: string;
}

export interface ContentTree {
  readonly common: CommonContent;
  readonly upload: UploadContent;
  readonly camera: CameraContent;
  readonly checker: CheckerContent;
  readonly result: ResultContent;
  readonly legal: LegalContent;
  readonly errors: ErrorContent;
  readonly rules: RuleContent;
  readonly overlay: OverlayContent;
  readonly print: PrintContent;
  readonly report: ReportContent;
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
