import { getContent } from '@/content/content.registry';
import { interpolate } from '@/content/interpolate.utils';
import {
  GUIDE_OVAL_HEIGHT_RATIO,
  GUIDE_OVAL_WIDTH_RATIO,
  GUIDE_SCRIM_COLOUR,
  GUIDE_STROKE_COLOUR,
  GUIDE_STROKE_READY_COLOUR,
  GUIDE_STROKE_WIDTH,
  GUIDE_VIEWBOX,
} from '@/camera/guide-overlay.constants';
import { PERCENT_SCALE } from '@/constants/measurement.constants';
import { HALF } from '@/measurement/angle.constants';
import type { CameraGuideOverlayProps } from './CameraGuideOverlay.types';
import styles from './CameraGuideOverlay.module.css';

const MASK_ID = 'camera-guide-cutout';

/**
 * The target, and the one thing to do about it.
 *
 * An oval cut out of a darkened surround rather than a bare outline. A camera
 * feed is not a background you can pick a contrasting colour against — a white
 * ring vanishes against a window and a dark one vanishes in a hallway — so the
 * scrim does the contrast work and the ring only has to show against that.
 *
 * The oval is FIXED. It does not track the detected face, and that is the
 * point: a target that moved with the reader would be a target they could
 * never reach. They move their head into it, and the guidance engine — which
 * is measuring against the actual specification, not against this shape —
 * says when it is right.
 */
export const CameraGuideOverlay = ({
  guidance,
  waiting = false,
}: CameraGuideOverlayProps): React.JSX.Element => {
  const content = getContent().camera;
  const centre = GUIDE_VIEWBOX / HALF;

  return (
    <div className={styles['overlay']}>
      <svg
        className={styles['guide']}
        viewBox={`0 0 ${GUIDE_VIEWBOX} ${GUIDE_VIEWBOX}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <mask id={MASK_ID}>
          <rect width={GUIDE_VIEWBOX} height={GUIDE_VIEWBOX} fill="white" />
          <ellipse
            cx={centre}
            cy={centre}
            rx={(GUIDE_VIEWBOX * GUIDE_OVAL_WIDTH_RATIO) / HALF}
            ry={(GUIDE_VIEWBOX * GUIDE_OVAL_HEIGHT_RATIO) / HALF}
            fill="black"
          />
        </mask>
        <rect
          width={GUIDE_VIEWBOX}
          height={GUIDE_VIEWBOX}
          fill={GUIDE_SCRIM_COLOUR}
          mask={`url(#${MASK_ID})`}
        />
        <ellipse
          cx={centre}
          cy={centre}
          rx={(GUIDE_VIEWBOX * GUIDE_OVAL_WIDTH_RATIO) / HALF}
          ry={(GUIDE_VIEWBOX * GUIDE_OVAL_HEIGHT_RATIO) / HALF}
          fill="none"
          stroke={guidance.ready ? GUIDE_STROKE_READY_COLOUR : GUIDE_STROKE_COLOUR}
          strokeWidth={GUIDE_STROKE_WIDTH}
        />
      </svg>

      {guidance.headFrameRatio === undefined ? null : (
        <p className={styles['readout']}>
          {interpolate(content.headHeightReadout, {
            percent: String(Math.round(guidance.headFrameRatio * PERCENT_SCALE)),
          })}
        </p>
      )}

      {/*
        Polite, and one message. An assertive region would interrupt whatever
        the reader is being told every few hundred milliseconds, which for a
        screen-reader user turns a live camera into an unusable stream of
        chatter.
      */}
      <p className={styles['instruction']} data-ready={guidance.ready} role="status" aria-live="polite">
        {waiting ? content.previewLabel : content.guidance[guidance.primary]}
      </p>
    </div>
  );
};
