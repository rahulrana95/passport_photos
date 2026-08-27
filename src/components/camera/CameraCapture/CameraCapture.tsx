'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getContent } from '@/content/content.registry';
import { captureStill } from '@/camera/capture-still';
import { createFrameLoop } from '@/camera/frame-loop';
import { deriveGuidance } from '@/camera/guidance/derive-guidance';
import { grabFrame } from '@/camera/frame-grabber';
import { observeFrame } from '@/camera/observe-frame';
import { browserEnvironment } from '@/camera/browser-environment';
import { openCamera, stopStream } from '@/camera/open-camera';
import {
  CAPTURE_MIME_TYPE,
  CAPTURE_QUALITY,
  GUIDANCE_FRAME_EDGE_PX,
  GUIDANCE_INTERVAL_MS,
} from '@/camera/camera-loop.constants';
import { DEFAULT_CAMERA_FACING } from '@/camera/camera-facing.constants';
import { CameraGuideOverlay } from '../CameraGuideOverlay/CameraGuideOverlay';
import type { CameraFacing } from '@/camera/camera-facing.constants';
import type { CameraFailure } from '@/camera/camera-failure.types';
import type { LiveGuidance } from '@/camera/guidance/guidance.types';
import type { CameraCaptureProps } from './CameraCapture.types';
import styles from './CameraCapture.module.css';

const WAITING: LiveGuidance = {
  primary: 'no-face',
  unmet: ['no-face'],
  ready: false,
  headFrameRatio: undefined,
};

/**
 * The live camera, and the running commentary that makes it worth having.
 *
 * The retake loop is the loudest complaint in every competitor's reviews:
 * upload, get rejected, upload again, give up on the fourth try. Everything
 * here exists to replace that with "move closer… closer… hold there", before
 * the shutter rather than after it.
 *
 * THE STREAM IS STOPPED ON EVERY PATH OUT. Unmount, failure, a switch to the
 * other camera, the reader pressing stop. A track left running keeps the
 * camera indicator lit, and on a product whose entire promise is that the
 * photograph never leaves the device, an indicator that stays on is not a bug
 * — it is the accusation, made by the operating system, on our behalf.
 */
export const CameraCapture = ({
  spec,
  crownDefinition,
  onCapture,
  onUploadInstead,
  analyse,
  environment,
  intervalMs = GUIDANCE_INTERVAL_MS,
}: CameraCaptureProps): React.JSX.Element => {
  const content = getContent().camera;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<CameraFacing>(DEFAULT_CAMERA_FACING);
  const [live, setLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [failure, setFailure] = useState<CameraFailure | undefined>(undefined);
  const [guidance, setGuidance] = useState<LiveGuidance>(WAITING);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const mountedRef = useRef(true);
  const canvasRef = useRef<HTMLCanvasElement | undefined>(undefined);

  const canvas = (): HTMLCanvasElement => {
    // One canvas for the lifetime of the component, off the document. A new
    // one per frame would allocate a bitmap four times a second and leave the
    // collector to notice.
    canvasRef.current ??= document.createElement('canvas');
    return canvasRef.current;
  };

  /**
   * Holds the element AND attaches the stream, in one place.
   *
   * A callback ref rather than an effect: React runs it with the element when
   * it attaches and with null when it detaches, so clearing the reference and
   * hanging the stream on it cannot drift apart. Memoised on `stream`, which
   * makes React re-run it — null first, then the element — exactly when the
   * stream changes, and not on every unrelated render.
   */
  const attachVideo = useCallback(
    (node: HTMLVideoElement | null): void => {
      videoRef.current = node;
      if (node === null) return;

      node.srcObject = stream;
    },
    [stream],
  );

  const stop = useCallback((): void => {
    stopStream(streamRef.current);
    streamRef.current = undefined;
    setStream(null);
    setLive(false);
    setGuidance(WAITING);
  }, []);

  const start = useCallback(
    async (nextFacing: CameraFacing): Promise<void> => {
      setStarting(true);
      setFailure(undefined);
      stopStream(streamRef.current);

      const result = await openCamera({
        environment: environment ?? browserEnvironment(),
        facing: nextFacing,
      });

      setStarting(false);

      if (!result.ok) {
        setFailure(result.failure);
        setLive(false);
        return;
      }

      if (!mountedRef.current) {
        // The reader pressed start and left before the permission prompt was
        // answered. Nothing will ever stop this stream otherwise: the unmount
        // cleanup ran while getUserMedia was still in flight, so it found no
        // stream to stop, and the camera light stays on over an empty page.
        stopStream(result.stream);
        return;
      }

      // Two homes for one stream, each with a job the other cannot do. State
      // drives the callback ref that hangs it on the element; the ref is what
      // the unmount cleanup can still read, since a cleanup with no
      // dependencies closes over the first render's state forever.
      streamRef.current = result.stream;
      setStream(result.stream);
      setFacing(nextFacing);
      setLive(true);
    },
    [environment],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!live || video === null) return undefined;

    const loop = createFrameLoop({
      intervalMs,
      grab: () =>
        grabFrame({ video, canvas: canvas(), maxEdgePx: GUIDANCE_FRAME_EDGE_PX }),
      onFrame: async (frame) => {
        const result = await analyse(frame);
        setGuidance(deriveGuidance(observeFrame({ result, frame, spec, crownDefinition }), spec));
      },
      // Swallowed on purpose. A detector that timed out on one frame must not
      // freeze the preview with a stale instruction still on it — the next
      // frame is a few hundred milliseconds away and will simply be better.
      onError: () => undefined,
    });

    loop.start();
    return () => {
      loop.stop();
    };
  }, [live, analyse, spec, crownDefinition, intervalMs]);

  // Battery, and the reason it is worth a listener: a backgrounded tab keeps
  // its camera open, and a detection loop running against a frame nobody is
  // looking at is pure heat. The stream stays open so returning is instant.
  useEffect(() => {
    const onVisibility = (): void => {
      // Only ever switches off. Coming back is the reader's decision, not the
      // tab's: a camera that restarted itself when a background tab regained
      // focus would turn its own indicator light on with nobody looking at it.
      if (document.hidden) setLive(false);
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(
    () => () => {
      mountedRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = undefined;
    },
    [],
  );

  const takePhoto = async (): Promise<void> => {
    const photo = await captureStill({
      video: videoRef.current,
      canvas: canvas(),
      mimeType: CAPTURE_MIME_TYPE,
      quality: CAPTURE_QUALITY,
    });

    if (photo !== undefined) onCapture(photo);
  };

  const resolved = failure === undefined ? undefined : content.failures[failure.code];

  return (
    <div className={styles['camera']}>
      {/* Always in the tree, never conditionally mounted. The stream is
          attached the moment the camera opens, and an element that only
          existed once `live` was true would not be there to attach it to. */}
      <div className={styles['stage']} data-live={live}>
        <video
          className={styles['video']}
          ref={attachVideo}
          data-mirrored={facing === 'user'}
          aria-label={content.previewLabel}
          autoPlay
          playsInline
          muted
        />
        {live ? <CameraGuideOverlay guidance={guidance} /> : null}
      </div>

      {resolved === undefined ? null : (
        <div className={styles['failure']} role="alert">
          <p className={styles['failureMessage']}>{resolved.message}</p>
          <p className={styles['remedy']}>{resolved.remedy}</p>
        </div>
      )}

      <div className={styles['actions']}>
        {live ? (
          <>
            <button
              className={styles['button']}
              type="button"
              data-primary={guidance.ready}
              data-track="camera-capture"
              onClick={() => void takePhoto()}
            >
              {content.captureLabel}
            </button>
            <button
              className={styles['button']}
              type="button"
              data-track="camera-switch"
              onClick={() => void start(facing === 'user' ? 'environment' : 'user')}
            >
              {content.switchCameraLabel}
            </button>
            <button
              className={styles['button']}
              type="button"
              data-track="camera-stop"
              onClick={stop}
            >
              {content.stopLabel}
            </button>
          </>
        ) : (
          <button
            className={styles['button']}
            type="button"
            disabled={starting}
            data-track="camera-start"
            onClick={() => void start(facing)}
          >
            {content.startLabel}
          </button>
        )}

        {onUploadInstead === undefined ? null : (
          <button
            className={styles['button']}
            type="button"
            data-track="camera-upload-instead"
            onClick={onUploadInstead}
          >
            {content.fallbackToUpload}
          </button>
        )}
      </div>
    </div>
  );
};
