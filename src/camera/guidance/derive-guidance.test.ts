import { describe, expect, it } from 'vitest';
import { deriveGuidance } from './derive-guidance';
import { MIN_GUIDANCE_LUMINANCE } from './guidance.constants';
import type { LiveObservation } from './derive-guidance';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { SubjectGeometry } from '@/geometry/geometry.types';

/** A US-shaped specification: 51x51mm at 300dpi, head 25-35mm, no eye-line rule. */
const usSpec = (): ResolvedPhotoSpec =>
  ({
    print: { widthMm: 51, heightMm: 51, dpi: 300 },
    headHeight: { minMm: 25, maxMm: 35, minRatio: 0.49, maxRatio: 0.69, authoredUnit: 'mm' },
  }) as ResolvedPhotoSpec;

const FRAME_WIDTH_PX = 1_920;
const FRAME_HEIGHT_PX = 1_080;

/** Head height in the baseline frame, in preview pixels. */
const HEAD_PX = 500;

/**
 * A subject framed so the planned crop sits comfortably inside a 1920x1080
 * preview.
 *
 * The numbers are derived, not chosen. At the band midpoint of 30mm a head of
 * H pixels implies a crop of H x 51 / 30, so the crop fits the frame while
 * H <= 1080 x 0.94 x 30 / 51 = 597, and clears the print's 602px at 300dpi
 * with the live margin while H >= 602 x 1.15 x 30 / 51 = 408. 500 sits in the
 * middle of that window, which is what makes it a frame with nothing wrong
 * with it rather than one that happens to pass.
 */
const framedSubject = (overrides: Partial<SubjectGeometry> = {}): SubjectGeometry => ({
  crownY: 200,
  chin: { x: 960, y: 700 },
  leftEye: { x: 900, y: 450 },
  rightEye: { x: 1_020, y: 450 },
  sourceWidthPx: FRAME_WIDTH_PX,
  sourceHeightPx: FRAME_HEIGHT_PX,
  ...overrides,
});

const observation = (overrides: Partial<LiveObservation> = {}): LiveObservation => ({
  subject: framedSubject(),
  faceConfidence: 0.9,
  faceCount: 1,
  yawDegrees: 0,
  meanLuminance: 128,
  backgroundUniform: true,
  ...overrides,
});

describe('a frame with nothing wrong with it', () => {
  it('says so', () => {
    const guidance = deriveGuidance(observation(), usSpec());

    expect(guidance).toMatchObject({ primary: 'ready', ready: true, unmet: [] });
  });

  it('reports the head as a share of the frame, for the live readout', () => {
    const guidance = deriveGuidance(observation(), usSpec());

    expect(guidance.headFrameRatio).toBeCloseTo(HEAD_PX / FRAME_HEIGHT_PX, 5);
  });
});

describe('only one thing is ever said at a time', () => {
  it('names the first unmet item as the instruction', () => {
    // Two faults at once. A live view that lists both gets neither fixed —
    // the reader reads, looks up, and the picture has already changed.
    const guidance = deriveGuidance(
      observation({ yawDegrees: 30, backgroundUniform: false }),
      usSpec(),
    );

    expect(guidance.primary).toBe('face-camera');
  });

  it('still reports the rest, so a second fault cannot appear unnoticed', () => {
    const guidance = deriveGuidance(
      observation({ yawDegrees: 30, backgroundUniform: false }),
      usSpec(),
    );

    expect(guidance.unmet).toEqual(['face-camera', 'plain-background']);
  });
});

describe('nothing to measure', () => {
  it('asks for a face when none was found', () => {
    const guidance = deriveGuidance(observation({ subject: undefined }), usSpec());

    expect(guidance.primary).toBe('no-face');
  });

  it('treats an unconfident detection as no face at all', () => {
    // The model returns points and a confidence for a coat on a chair. Acting
    // on that would move somebody around the room on the strength of a coat.
    const guidance = deriveGuidance(observation({ faceConfidence: 0.2 }), usSpec());

    expect(guidance.primary).toBe('no-face');
  });

  it('has no head ratio to report when there is no subject', () => {
    expect(deriveGuidance(observation({ subject: undefined }), usSpec()).headFrameRatio).toBeUndefined();
  });

  it('says the room is too dark before it says anything it read off the detector', () => {
    // Landmarks in a dark room come back confident and wrong. "Move left" on
    // that basis is worse than admitting the light is the problem.
    const guidance = deriveGuidance(
      observation({ meanLuminance: MIN_GUIDANCE_LUMINANCE - 1, yawDegrees: 30 }),
      usSpec(),
    );

    expect(guidance.primary).toBe('too-dark');
  });

  it('mentions a second person, who would be cropped into the photograph', () => {
    const guidance = deriveGuidance(observation({ faceCount: 2 }), usSpec());

    expect(guidance.primary).toBe('many-faces');
  });

  it('says the top of the head is hidden when segmentation could not find it', () => {
    const guidance = deriveGuidance(
      observation({ subject: framedSubject({ crownY: undefined }) }),
      usSpec(),
    );

    expect(guidance.primary).toBe('crown-hidden');
  });

  it('says the head is cut off when the crown is above the frame', () => {
    const guidance = deriveGuidance(
      observation({ subject: framedSubject({ crownY: -40 }) }),
      usSpec(),
    );

    expect(guidance.primary).toBe('head-cut-off');
  });
});

describe('a frame the geometry cannot be trusted on', () => {
  it('does not guess a direction from a crown and chin a few pixels apart', () => {
    // Not a small head — a bad frame. "Move closer" here would be a guess
    // dressed up as an instruction, and the reader would follow it.
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({ crownY: 400, chin: { x: 960, y: 410 } }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('no-face');
  });
});

describe('distance', () => {
  it('asks the reader to step back when the crop no longer fits the frame', () => {
    // A head this large needs a crop taller than the preview, so no compliant
    // photograph can be cut from this frame however it is positioned.
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({ crownY: 100, chin: { x: 960, y: 800 } }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('move-back');
  });

  it('asks the reader to come closer when the crop would not have enough pixels', () => {
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({
          crownY: 200,
          chin: { x: 960, y: 550 },
          leftEye: { x: 900, y: 400 },
          rightEye: { x: 1_020, y: 400 },
        }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('move-closer');
  });

  it('corrects distance before position, so nobody is corrected twice', () => {
    // Far too small AND far off centre. Moving left first would leave them
    // still too far away, and they would have to be sent back again.
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({
          crownY: 200,
          chin: { x: 120, y: 550 },
          leftEye: { x: 90, y: 400 },
          rightEye: { x: 150, y: 400 },
        }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('move-closer');
    expect(guidance.unmet).not.toContain('move-left');
  });
});

describe('position', () => {
  /**
   * The direction that is easiest to get backwards, so it is asserted from
   * first principles rather than from the implementation.
   *
   * The camera faces the reader, so the reader's left hand appears on the
   * RIGHT of the image — exactly as it does when somebody photographs you.
   * A face too near the image's left edge therefore has to travel toward the
   * image's right, and the way a person does that is by stepping to their own
   * left. So: crop overflowing past x=0 means "move left".
   */
  it('says move left when the crop runs off the left of the frame', () => {
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({
          chin: { x: 370, y: 700 },
          leftEye: { x: 310, y: 450 },
          rightEye: { x: 430, y: 450 },
        }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('move-left');
  });

  it('says move right when the crop runs off the right of the frame', () => {
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({
          chin: { x: 1_590, y: 700 },
          leftEye: { x: 1_530, y: 450 },
          rightEye: { x: 1_650, y: 450 },
        }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('move-right');
  });

  it('names the camera for vertical corrections, because nobody crouches', () => {
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({
          leftEye: { x: 900, y: 300 },
          rightEye: { x: 1_020, y: 300 },
        }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('raise-camera');
  });

  it('asks for the camera to be lowered when the crop runs off the bottom', () => {
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({
          crownY: 400,
          chin: { x: 960, y: 900 },
          leftEye: { x: 900, y: 650 },
          rightEye: { x: 1_020, y: 650 },
        }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('lower-camera');
  });
});

describe('pose and surroundings', () => {
  it('asks for a level head when the eye line is tilted', () => {
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({
          leftEye: { x: 900, y: 420 },
          rightEye: { x: 1_020, y: 480 },
        }),
      }),
      usSpec(),
    );

    expect(guidance.primary).toBe('level-head');
  });

  it('tolerates a tilt small enough that the still analyser would pass it', () => {
    // Guidance and the analyser share this threshold on purpose. A stricter
    // live rule would hold somebody at arm's length chasing a tilt that was
    // never going to be reported.
    const guidance = deriveGuidance(
      observation({
        subject: framedSubject({
          leftEye: { x: 900, y: 448 },
          rightEye: { x: 1_020, y: 452 },
        }),
      }),
      usSpec(),
    );

    expect(guidance.unmet).not.toContain('level-head');
  });

  it('asks the reader to face the camera when they are turned away', () => {
    const guidance = deriveGuidance(observation({ yawDegrees: 20 }), usSpec());

    expect(guidance.primary).toBe('face-camera');
  });

  it('reads a turn in either direction', () => {
    const guidance = deriveGuidance(observation({ yawDegrees: -20 }), usSpec());

    expect(guidance.primary).toBe('face-camera');
  });

  it('mentions the background when it is not plain', () => {
    const guidance = deriveGuidance(observation({ backgroundUniform: false }), usSpec());

    expect(guidance.primary).toBe('plain-background');
  });

  it('stays silent about a background it has not judged yet', () => {
    // Segmentation lands a frame or two after the landmarks. Guessing in the
    // gap would flash "plain background" at somebody standing against a wall.
    const guidance = deriveGuidance(observation({ backgroundUniform: undefined }), usSpec());

    expect(guidance.primary).toBe('ready');
  });
});
