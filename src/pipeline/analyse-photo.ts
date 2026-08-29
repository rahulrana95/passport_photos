import { buildOverlay } from '@/overlay/build-overlay';
import { evaluateRules } from '@/rules/evaluate-rules';
import { HALF } from '@/measurement/angle.constants';
import { buildRuleInput } from './build-rule-input';
import type { AnalysedPhoto, AnalysePhotoOptions } from './analyse-photo.types';
import type { GeometryResult, SubjectGeometry } from '@/geometry/geometry.types';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

/**
 * The annotations for one photograph, or none where there is nothing to draw.
 *
 * Three ways there is nothing: no face was found, so there are no landmarks to
 * annotate; nothing was measured at all; or the crop could not be planned, so
 * there is no frame to draw the marks inside. All three are already reported by
 * the rules — an overlay is an illustration of a measurement, and an
 * illustration of a measurement that was never taken would be an invention.
 */
const overlayFor = (
  subject: SubjectGeometry | undefined,
  geometry: GeometryResult | undefined,
  spec: ResolvedPhotoSpec,
): readonly OverlayInstruction[] | undefined => {
  if (subject === undefined || geometry === undefined || !geometry.ok) return undefined;

  return buildOverlay(
    {
      crop: geometry.crop,
      chinY: subject.chin.y,
      crownY: subject.crownY,
      // Derived here rather than carried out of the crop planner, because
      // these two are the landmarks themselves — the midpoint of the eyes is
      // the same number whoever computes it, unlike the crown.
      eyeY: (subject.leftEye.y + subject.rightEye.y) / HALF,
      faceMidlineX: (subject.leftEye.x + subject.rightEye.x) / HALF,
    },
    spec,
  );
};

/**
 * A decoded photograph and what the models found, turned into a verdict and
 * the marks that show where that verdict came from.
 *
 * Still the join and nothing else: the measuring is buildRuleInput's job, the
 * judging is the engine's, the drawing is buildOverlay's, and none of them
 * knows the others. What was missing was not logic — it was anyone calling all
 * three.
 *
 * The overlay comes from the SAME subject the report was measured from, not a
 * second derivation of it. A reader looking at a band drawn across their photo
 * is being told why a row above it failed; if the two were computed
 * independently they could disagree, and the picture would quietly become an
 * argument against the text beside it.
 */
export const analysePhoto = (options: AnalysePhotoOptions): AnalysedPhoto => {
  const { input, subject } = buildRuleInput(options);

  return {
    report: evaluateRules(input, options.spec),
    overlay: overlayFor(subject, input.geometry, options.spec),
  };
};
