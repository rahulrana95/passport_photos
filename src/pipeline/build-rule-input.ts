import { estimateCrown } from '@/analysis/crown-detection.utils';
import {
  CHIN_POINT_INDEX,
  LEFT_EYE_POINT_INDEX,
  REQUIRED_LANDMARK_POINTS,
  RIGHT_EYE_POINT_INDEX,
} from '@/analysis/landmark-points.constants';
import { evaluateBackground } from '@/quality/background.utils';
import { evaluateExposure } from '@/quality/exposure.utils';
import { evaluateSharpness } from '@/quality/sharpness.utils';
import { summariseTones } from '@/quality/luminance.utils';
import { millimetresToPixels } from '@/measurement/format-measurement.utils';
import { planCrop } from '@/geometry/crop-plan.utils';
import { HALF } from '@/measurement/angle.constants';
import { faceBoxOf, scaleBox, withinBox } from './face-region.utils';
import { SUBJECT_MASK_THRESHOLD } from './build-rule-input.constants';
import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { IngestedImage } from '@/ingestion/image-decoder.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { RuleInput } from '@/rules/rule.types';
import type { SourcePoint, SubjectGeometry } from '@/geometry/geometry.types';
import { exportDpi } from '@/photo-spec/photo-spec.utils';

export interface BuildRuleInputOptions {
  readonly image: IngestedImage;
  readonly result: AnalysisResult;
  readonly spec: ResolvedPhotoSpec;
}

/**
 * The engine's input, and the subject it was measured from.
 *
 * The subject is returned rather than recomputed by whoever wants to draw it.
 * Deriving it a second time would mean estimating the crown twice, and two
 * estimates of the top of a head can differ — which would put the annotation a
 * few pixels away from the measurement it claims to illustrate.
 *
 * Undefined where no face was found: there is nothing to annotate, and the
 * report already says so.
 */
export interface RuleInputBundle {
  readonly input: RuleInput;
  readonly subject: SubjectGeometry | undefined;
}

/**
 * Everything the rule engine needs, assembled from one analysed photograph.
 *
 * The join nothing else made. Every stage below already existed and had been
 * tested on its own; until now no production code put them together, so a
 * decoded photograph could not become a report.
 *
 * NOTHING HERE DECIDES ANYTHING. Every field is a measurement or an absence,
 * and the absences are the point: a stage that could not run reports undefined
 * rather than a default, because the engine treats undefined as "not measured"
 * and a default as "measured, and fine". A test hands the engine an empty
 * bundle and asserts that nothing passes.
 *
 * TWO COORDINATE SPACES, and mixing them is the mistake this file exists to
 * avoid. Landmarks arrive normalised and are multiplied into SOURCE pixels,
 * because that is where the crop is planned and the crop is applied to the
 * full-resolution original the reader downloads. The mask and the pixels are
 * in WORKING space, because that is what the detector was given.
 */
export const buildRuleInput = (options: BuildRuleInputOptions): RuleInputBundle => {
  const { image, result, spec } = options;
  const { landmarks, segmentation } = result;

  if (landmarks === undefined || landmarks.points.length < REQUIRED_LANDMARK_POINTS) {
    return { input: NOTHING_MEASURED, subject: undefined };
  }

  const toSource = (index: number): SourcePoint => {
    // Read through Number rather than defaulted: the length was checked above,
    // so a fallback here would be a branch no input can reach.
    const point = landmarks.points[index] as { readonly x: number; readonly y: number };
    return { x: point.x * image.source.widthPx, y: point.y * image.source.heightPx };
  };

  const chin = toSource(CHIN_POINT_INDEX);
  const leftEye = toSource(LEFT_EYE_POINT_INDEX);
  const rightEye = toSource(RIGHT_EYE_POINT_INDEX);
  const interOcularSourcePx = Math.abs(rightEye.x - leftEye.x);

  const crown =
    segmentation === undefined
      ? undefined
      : estimateCrown(
          { width: segmentation.width, height: segmentation.height, data: segmentation.mask },
          {
            // The mask is in working space, so the face centre has to be too.
            faceCentreX: ((leftEye.x + rightEye.x) / HALF) / image.workingSize.scaleToSource,
            faceCentreY: ((leftEye.y + rightEye.y) / HALF) / image.workingSize.scaleToSource,
            definition: spec.crownDefinition,
            headWidthPx: (interOcularSourcePx * HALF) / image.workingSize.scaleToSource,
          },
        );

  const subject: SubjectGeometry = {
    chin,
    leftEye,
    rightEye,
    crownY:
      crown?.ok === true ? crown.crownY * image.workingSize.scaleToSource : undefined,
    sourceWidthPx: image.source.widthPx,
    sourceHeightPx: image.source.heightPx,
  };

  const geometry = planCrop(subject, spec);
  const faceBox = scaleBox(
    faceBoxOf(leftEye, rightEye, chin),
    1 / image.workingSize.scaleToSource,
  );
  const isFace = withinBox(image.working, faceBox);

  const dpi = exportDpi(spec.print);
  const outputPx = {
    widthPx: millimetresToPixels(spec.print.widthMm, dpi),
    heightPx: millimetresToPixels(spec.print.heightMm, dpi),
  };

  const input: RuleInput = {
    detection: { ok: true, hadOtherFaces: false },
    geometry,
    crown,
    exposure: evaluateExposure(summariseTones(image.working, isFace)),
    background:
      segmentation === undefined
        ? undefined
        : evaluateBackground(
            image.working,
            (index) => Number(segmentation.mask[index]) < SUBJECT_MASK_THRESHOLD,
            spec.background,
          ),
    sharpness: evaluateSharpness(image.working, isFace),
    blendshapes: landmarks.blendshapes,
    pose: { yawDegrees: landmarks.yawDegrees, pitchDegrees: landmarks.pitchDegrees },
    // In the EXPORTED photo's pixels, which is what the rule is about: a
    // border system reads the file, not the original. The crop is what maps
    // one to the other.
    interOcularPx: geometry.ok
      ? (interOcularSourcePx * outputPx.widthPx) / geometry.crop.widthPx
      : undefined,
    outputPx,
    confidence: {
      landmarks: landmarks.confidence,
      crown: crown?.ok === true ? crown.confidence : undefined,
      segmentation: segmentation?.confidence,
    },
  };

  return { input, subject };
};

/**
 * What a photograph nothing could be found in reports.
 *
 * Every field undefined, deliberately, and the detection outcome says why. The
 * engine turns this into a report where nothing passes rather than one where
 * everything does.
 */
const NOTHING_MEASURED: RuleInput = {
  detection: { ok: false, reason: 'no-face' },
  geometry: undefined,
  crown: undefined,
  exposure: undefined,
  background: undefined,
  sharpness: undefined,
  blendshapes: undefined,
  pose: undefined,
  interOcularPx: undefined,
  outputPx: undefined,
  confidence: { landmarks: undefined, crown: undefined, segmentation: undefined },
};
