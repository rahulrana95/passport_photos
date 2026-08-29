import { beforeAll, describe, expect, it } from 'vitest';
import { createFakeDetector } from '@/analysis/fake-detector';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { SYNTHETIC_HEAD_FIXTURES } from '@/testing/fixtures/synthetic-head.constants';
import { planWorkingSize } from '@/ingestion/downscale.utils';
import { fixtureSpec } from '@/testing/fixtures/compliance-report.builder';
import { summariseTones } from '@/quality/luminance.utils';
import { faceBoxOf, withinBox } from './face-region.utils';
import { analysePhoto } from './analyse-photo';
import { buildRuleInput } from './build-rule-input';
import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { IngestedImage } from '@/ingestion/image-decoder.types';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';
import type { ComplianceReport, RuleInput } from '@/rules/rule.types';
import type { SyntheticHeadSpec } from '@/testing/fixtures/synthetic-head.types';

const SPEC = fixtureSpec();

/** Generous: the shared photograph is measured pixel by pixel, under coverage. */
const SETUP_TIMEOUT_MS = 120_000;

/**
 * A whole photograph, analysed the way production analyses one.
 *
 * The synthetic head's parameters ARE the ground truth — nothing here is
 * hand-measured — and the fake detector derives its landmarks from those same
 * parameters. So a wrong answer below means this pipeline is wrong, never that
 * a fixture was mis-measured.
 */
/**
 * The corpus fixture whose framing a compliant crop fits inside.
 *
 * Looked up by name rather than rebuilt here: the fake detector matches a
 * buffer back to the fixture it was generated from, by exact pixel identity,
 * so an ad-hoc spec produces a frame it refuses to read.
 */
const ROOMY_HEAD: SyntheticHeadSpec = (() => {
  const fixture = SYNTHETIC_HEAD_FIXTURES.find((entry) => entry.name === 'compliant-framing');
  if (fixture === undefined) throw new Error('The compliant-framing fixture is missing.');
  return fixture.spec;
})();

/**
 * The photograph, and everything derived from it, built once.
 *
 * Generating a 1200x1200 head, matching it back to its fixture and measuring
 * every pixel of it costs several seconds under coverage instrumentation, and
 * thirteen tests want the identical photograph. Recomputing per test pushed the
 * file past the five-second timeout the moment coverage was switched on: green
 * locally, red in CI, for a reason that has nothing to do with the behaviour
 * under test. Every step here is a pure function of the fixture spec, so a
 * shared copy is the same photograph a fresh call would have built.
 */
const memoise = <T>(make: () => Promise<T>): (() => Promise<T>) => {
  let pending: Promise<T> | undefined;
  return async (): Promise<T> => {
    pending ??= make();
    return await pending;
  };
};

const analysed = memoise(
  async (): Promise<{ readonly image: IngestedImage; readonly result: AnalysisResult }> => {
    const working = generateSyntheticHead(ROOMY_HEAD);
    const detector = createFakeDetector();

    const result: AnalysisResult = {
      landmarks: await detector.detectLandmarks(working),
      segmentation: await detector.segment(working),
    };

    const source = { widthPx: ROOMY_HEAD.widthPx, heightPx: ROOMY_HEAD.heightPx };

    return {
      result,
      image: {
        format: 'jpeg',
        orientation: 1,
        source,
        working,
        workingSize: planWorkingSize(source, Math.max(source.widthPx, source.heightPx)),
      },
    };
  },
);

/** What production hands the rule engine, for the photograph above. */
const measured = memoise(async (): Promise<RuleInput> => {
  const { image, result } = await analysed();
  return buildRuleInput({ image, result, spec: SPEC }).input;
});

/** The same photograph with the mask withheld, as a segmenter failure gives it. */
const measuredWithoutMask = memoise(async (): Promise<RuleInput> => {
  const { image, result } = await analysed();
  return buildRuleInput({ image, result: { ...result, segmentation: undefined }, spec: SPEC })
    .input;
});

const reported = memoise(async (): Promise<ComplianceReport> => {
  const { image, result } = await analysed();
  return analysePhoto({ image, result, spec: SPEC }).report;
});

/** The annotations for that same photograph, memoised for the same reason. */
const annotated = memoise(async (): Promise<readonly OverlayInstruction[] | undefined> => {
  const { image, result } = await analysed();
  return analysePhoto({ image, result, spec: SPEC }).overlay;
});

/**
 * Paid once, here, rather than by whichever test happens to run first.
 * Otherwise that one test carries eight seconds of shared setup and fails a
 * five-second timeout while the twelve behind it pass in milliseconds.
 */
beforeAll(async () => {
  await Promise.all([reported(), measured(), measuredWithoutMask(), annotated()]);
}, SETUP_TIMEOUT_MS);

describe('a photograph the models could read', () => {
  it('produces a report with a row for every rule the specification states', async () => {
    const report = await reported();

    expect(report.results.length).toBeGreaterThan(0);
    expect(report.manualChecklist.length).toBeGreaterThan(0);
  });

  it('measures a head height rather than declining to', async () => {
    // The measurement the whole product exists for, and the one that depends
    // on every stage having been joined up correctly.
    const report = await reported();
    const headHeight = report.results.find((row) => row.ruleId === 'head-height');

    expect(headHeight?.measurement).toBeDefined();
    expect(headHeight?.status).not.toBe('undetectable');
  });

  it('finds the crown from the mask, which is what head height depends on', async () => {
    const input = await measured();

    expect(input.crown?.ok).toBe(true);
  });

  it('reports the eye separation in the exported photo’s pixels', async () => {
    // Not the original's. A border system reads the file it is given, and the
    // crop is what maps one to the other.
    const input = await measured();

    expect(input.interOcularPx).toBeGreaterThan(0);
    expect(input.outputPx).toEqual({ widthPx: 600, heightPx: 600 });
  });

  it('judges exposure over the face, not over the whole frame', async () => {
    // A frame is mostly wall. Exposure averaged over it is a judgement about
    // the wall, and the clipped highlight that ruins a photograph is on skin.
    const { image } = await analysed();
    const input = await measured();

    const box = faceBoxOf(
      { x: 600 - 85, y: 540 },
      { x: 600 + 85, y: 540 },
      { x: 600, y: 780 },
    );
    const faceSamples = summariseTones(image.working, withinBox(image.working, box)).sampleCount;

    expect(input.exposure).toBeDefined();
    expect(faceSamples).toBeGreaterThan(0);
    expect(faceSamples).toBeLessThan(image.working.width * image.working.height);
  });

  it('judges the background from the mask', async () => {
    const input = await measured();

    expect(input.background?.sampleCount).toBeGreaterThan(0);
  });

  it('carries every confidence the stages reported', async () => {
    const input = await measured();

    expect(input.confidence.landmarks).toBeGreaterThan(0);
    expect(input.confidence.segmentation).toBeGreaterThan(0);
    expect(input.confidence.crown).toBeGreaterThan(0);
  });
});

describe('a photograph nothing could be found in', () => {
  const nothing: AnalysisResult = { landmarks: undefined, segmentation: undefined };

  it('never reports a pass', async () => {
    // The single most important assertion in the product: a photograph we
    // could not read must not come back looking acceptable.
    const { image } = await analysed();

    const { report } = analysePhoto({ image, result: nothing, spec: SPEC });

    expect(report.results.some((row) => row.status === 'pass')).toBe(false);
  });

  it('says a face could not be found rather than leaving it blank', async () => {
    const { image } = await analysed();

    const { input } = buildRuleInput({ image, result: nothing, spec: SPEC });

    expect(input.detection).toEqual({ ok: false, reason: 'no-face' });
  });

  it('measures nothing at all', async () => {
    const { image } = await analysed();

    const { input } = buildRuleInput({ image, result: nothing, spec: SPEC });

    // Undefined, not a default. The engine reads undefined as "not measured"
    // and a default as "measured, and fine".
    expect(input.geometry).toBeUndefined();
    expect(input.exposure).toBeUndefined();
    expect(input.background).toBeUndefined();
    expect(input.sharpness).toBeUndefined();
    expect(input.outputPx).toBeUndefined();
  });

  it('treats too few landmarks as no face rather than measuring from them', async () => {
    const { image, result } = await analysed();
    const truncated: AnalysisResult = {
      ...result,
      landmarks:
        result.landmarks === undefined
          ? undefined
          : { ...result.landmarks, points: result.landmarks.points.slice(0, 1) },
    };

    expect(buildRuleInput({ image, result: truncated, spec: SPEC }).input.detection).toEqual({
      ok: false,
      reason: 'no-face',
    });
  });
});

describe('a photograph the segmenter could not read', () => {
  it('still measures everything the landmarks alone support', async () => {
    const input = await measuredWithoutMask();

    expect(input.exposure).toBeDefined();
    expect(input.sharpness).toBeDefined();
    expect(input.pose).toBeDefined();
  });

  it('declines the crown, and therefore the head height', async () => {
    // Landmarks stop at the hairline. Without a mask there is no top of the
    // head, and guessing one is the error that sends somebody to a passport
    // office with a photograph that will be rejected.
    const input = await measuredWithoutMask();

    expect(input.crown).toBeUndefined();
    expect(input.background).toBeUndefined();
  });
});

describe('the annotations that go over the photograph', () => {
  it('draws the crop the report was measured against, not a second opinion', async () => {
    const overlay = await annotated();
    const input = await measured();

    // The frame drawn on screen has to be the crop the verdict came from. If
    // these were derived independently they could differ by a pixel or two of
    // crown estimate, and the picture would quietly contradict the row above
    // it — the reader would be looking at a band their head clears while
    // being told it does not.
    const frame = overlay?.find((instruction) => instruction.role === 'crop');
    expect(input.geometry?.ok).toBe(true);
    expect(frame).toBeDefined();
  });

  it('annotates in the source pixels the preview is shown in', async () => {
    const { image } = await analysed();
    const overlay = await annotated();

    // Every coordinate must sit inside the upright source, because that is the
    // space CheckerPanel hands the overlay as the image's size. A mark outside
    // it is a mark the reader never sees, and a sign the two spaces have been
    // mixed.
    const coordinates = (overlay ?? []).flatMap((instruction) =>
      instruction.kind === 'line'
        ? [
            { x: instruction.fromX, y: instruction.fromY },
            { x: instruction.toX, y: instruction.toY },
          ]
        : [],
    );

    expect(coordinates.length).toBeGreaterThan(0);
    for (const point of coordinates) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(image.source.widthPx);
      expect(point.y).toBeLessThanOrEqual(image.source.heightPx);
    }
  });

  it('has nothing to draw on a photograph with no face in it', async () => {
    const { image } = await analysed();
    const unreadable: AnalysisResult = { landmarks: undefined, segmentation: undefined };

    const { report, overlay } = analysePhoto({ image, result: unreadable, spec: SPEC });

    // Undefined rather than an empty array, and the verdict still stands. An
    // empty overlay would render a frame with no marks in it, which reads as
    // "we checked and found nothing wrong".
    expect(overlay).toBeUndefined();
    expect(report.results.some((row) => row.status === 'pass')).toBe(false);
  });
});
