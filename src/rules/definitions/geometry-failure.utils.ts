import { ruleOutcome, unmeasured } from '../rule-outcome.utils';
import type { CropFailureReason, GeometryMeasurements, GeometryResult } from '@/geometry/geometry.types';
import type { RuleMessageId } from '../rule-message.constants';
import type { RuleOutcome } from '../rule.types';

/**
 * Why the geometry engine declined, in words, once.
 *
 * Four rules measure from the same crop, so they fail together and for the
 * same reason. Wording it four times is how three of them end up saying
 * something subtly different about one event.
 */
const GEOMETRY_FAILURE_MESSAGES: Readonly<Record<CropFailureReason, RuleMessageId>> = {
  'crown-unmeasured': 'geometry.crown-unmeasured',
  'head-not-in-frame': 'geometry.head-not-in-frame',
  'crop-outside-source': 'geometry.crop-outside-source',
  'source-resolution-too-low': 'geometry.source-resolution-too-low',
  'degenerate-geometry': 'geometry.degenerate-geometry',
};

/**
 * Either the measurements, or the outcome to report instead of them.
 *
 * Returning the outcome rather than throwing keeps every framing rule to one
 * shape: ask for the measurements, hand back what came instead if they did not
 * arrive. No rule can accidentally treat a geometry failure as a pass, because
 * the only value it can obtain from a failure is already an outcome.
 */
export type GeometryAccess =
  | { readonly ok: true; readonly measurements: GeometryMeasurements }
  | { readonly ok: false; readonly outcome: RuleOutcome };

export const accessGeometry = (geometry: GeometryResult | undefined): GeometryAccess => {
  if (geometry === undefined) return { ok: false, outcome: unmeasured() };
  if (!geometry.ok) {
    return {
      ok: false,
      outcome: ruleOutcome('undetectable', GEOMETRY_FAILURE_MESSAGES[geometry.reason]),
    };
  }

  return { ok: true, measurements: geometry.measurements };
};
