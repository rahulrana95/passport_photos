import type { RuleStatus } from '@/constants/rule-status.constants';
import type { CrownEstimate } from '@/analysis/crown-detection.utils';
import type { FaceRejectionReason } from '@/analysis/landmark-selection.utils';
import type { GeometryResult } from '@/geometry/geometry.types';
import type { Band } from '@/measurement/band.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { BackgroundResult } from '@/quality/background.utils';
import type { ExposureResult } from '@/quality/exposure.utils';
import type { SharpnessResult } from '@/quality/sharpness.utils';
import type {
  ApplicationRequirementId,
  IsoRequirementId,
  UncoveredReason,
} from './iso-requirement.constants';
import type {
  EvidenceSource,
  FixGroup,
  RuleId,
  RuleSeverity,
} from './rule-id.constants';
import type {
  FixActionKind,
  FixAmountUnit,
  RuleMeasurementUnit,
  RuleMessageId,
} from './rule-message.constants';

/**
 * Which published requirement a rule is about.
 *
 * A discriminated union rather than a single id, because the two kinds have
 * genuinely different standing. An ISO requirement is part of an international
 * face-image standard every authority derives from; a photo being under six
 * months old is a rule one government wrote on one web page. Reporting the
 * second under an ISO identifier would dress up a local policy as a standard.
 */
export type RequirementReference =
  | { readonly standard: 'iso-19794-5'; readonly id: IsoRequirementId }
  | { readonly standard: 'issuing-authority'; readonly id: ApplicationRequirementId };

/** A quantity a report shows the reader, raw. Rounding happens at render. */
export interface RuleMeasurement {
  readonly value: number;
  readonly unit: RuleMeasurementUnit;
}

/** How much, and in what unit, a physical correction needs to be. */
export interface FixAmount {
  readonly value: number;
  readonly unit: FixAmountUnit;
}

export interface FixAction {
  readonly kind: FixActionKind;
  /** Absent where the action has no magnitude — "open your eyes" has none. */
  readonly amount: FixAmount | undefined;
}

/** What the detector concluded about which face, if any, to measure. */
export type DetectionOutcome =
  | { readonly ok: true; readonly hadOtherFaces: boolean }
  | { readonly ok: false; readonly reason: FaceRejectionReason };

/** Confidence reported by each stage that produced evidence. */
export interface EvidenceConfidence {
  readonly landmarks: number | undefined;
  readonly crown: number | undefined;
  readonly segmentation: number | undefined;
}

/**
 * Everything measured, handed to the engine in one piece.
 *
 * Every field is optional in the `| undefined` sense rather than the `?` sense,
 * so assembling this bundle is a decision about each stage rather than a
 * silence. A stage that did not run is undefined, and no rule may read an
 * undefined input as a pass — that is the "detection failed entirely" edge
 * case, and it is enforced by a test that hands the engine an empty bundle and
 * asserts nothing passes.
 */
export interface RuleInput {
  readonly detection: DetectionOutcome | undefined;
  readonly geometry: GeometryResult | undefined;
  readonly crown: CrownEstimate | undefined;
  readonly exposure: ExposureResult | undefined;
  readonly background: BackgroundResult | undefined;
  readonly sharpness: SharpnessResult | undefined;
  readonly blendshapes: Readonly<Record<string, number>> | undefined;
  /**
   * Yaw and pitch as the pose model reports them. Roll is deliberately absent:
   * it is measured from the eye line by the geometry engine, and carrying two
   * sources for one angle is how they drift apart.
   */
  readonly pose: { readonly yawDegrees: number; readonly pitchDegrees: number } | undefined;
  /** Distance between the eye centres, in the exported photo's pixels. */
  readonly interOcularPx: number | undefined;
  /** Size of the exported photo in pixels. */
  readonly outputPx: { readonly widthPx: number; readonly heightPx: number } | undefined;
  readonly confidence: EvidenceConfidence;
}

/** What one rule concluded, before the engine adjusts anything. */
export interface RuleOutcome {
  readonly status: RuleStatus;
  readonly messageId: RuleMessageId;
  readonly measurement: RuleMeasurement | undefined;
  readonly band: Band | undefined;
  readonly fix: FixAction | undefined;
}

export interface RuleDefinition {
  readonly id: RuleId;
  readonly requirements: readonly RequirementReference[];
  readonly severity: RuleSeverity;
  readonly evidence: EvidenceSource;
  /** Set when this rule's fix contradicts another's. See FIX_GROUPS. */
  readonly fixGroup: FixGroup | undefined;
  /**
   * Whether this rule reports a quantity when it can measure one.
   *
   * Declared rather than discovered, because it is needed BEFORE the rule has
   * run: the interface reserves the space a report will occupy while the
   * analysis is still going, and a row that reports a number is one line
   * taller than one that does not. Eight of the twenty-four do. Reserving two
   * lines for all of them makes the page shrink by a third of its own height
   * when the answer arrives, and reserving one makes it grow.
   *
   * A declaration that can drift from the truth would be worse than no
   * declaration, so a test evaluates every rule against a fully measured
   * photograph and asserts the flag matches what came back.
   */
  readonly measures: boolean;
  /**
   * Returns undefined when the specification does not state this requirement
   * at all — the Schengen standard fixes an eye line, several others do not.
   *
   * Omitted from the report entirely rather than reported as a pass. A row
   * reading "Eye position — meets the requirement" against a country that
   * publishes no eye position is a measurement presented as a verdict on a
   * rule nobody wrote.
   */
  readonly evaluate: (input: RuleInput, spec: ResolvedPhotoSpec) => RuleOutcome | undefined;
}

/** One rule's contribution to a report, after the engine has adjusted it. */
export interface RuleResult {
  readonly ruleId: RuleId;
  readonly requirements: readonly RequirementReference[];
  readonly severity: RuleSeverity;
  readonly status: RuleStatus;
  /** What the rule concluded before any confidence downgrade. */
  readonly computedStatus: RuleStatus;
  readonly messageId: RuleMessageId;
  readonly measurement: RuleMeasurement | undefined;
  readonly band: Band | undefined;
  readonly fix: FixAction | undefined;
  /**
   * Set when this rule had a fix and another rule in the same group kept
   * theirs. The reader is told the two are the same correction rather than
   * being handed two instructions that undo each other.
   */
  readonly fixDeferredTo: RuleId | undefined;
  readonly confidence: number | undefined;
}

/** One requirement's line in the published coverage map. */
export type RequirementCoverage =
  | { readonly requirement: RequirementReference; readonly kind: 'checked' | 'manual'; readonly ruleIds: readonly RuleId[] }
  | { readonly requirement: RequirementReference; readonly kind: UncoveredReason; readonly ruleIds: readonly [] };

export interface CoverageSummary {
  readonly entries: readonly RequirementCoverage[];
  readonly checkedCount: number;
  readonly manualCount: number;
  readonly undetectableCount: number;
  readonly plannedCount: number;
  readonly totalCount: number;
}

export interface ComplianceReport {
  /**
   * The worst thing found among the rules we evaluated ourselves.
   *
   * Deliberately NOT an aggregate over the manual checklist. Those items are
   * present for every photo ever checked, so folding them in would make every
   * report say the same thing and the headline would carry no information at
   * all. The checklist is presented as its own list, which is also how a
   * reader thinks about it: here is what we found, here is what is yours.
   */
  readonly overall: RuleStatus;
  readonly results: readonly RuleResult[];
  readonly manualChecklist: readonly RuleResult[];
  readonly coverage: CoverageSummary;
  readonly spec: ResolvedPhotoSpec;
}
