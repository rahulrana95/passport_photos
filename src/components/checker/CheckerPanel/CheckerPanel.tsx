'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { COUNTRY_NAMES } from '@/constants/country.constants';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-type.constants';
import { createAnalysisClient } from '@/analysis/analysis-client';
import { createBrowserWorker } from '@/analysis/analysis-worker.factory';
import { createBrowserDecoder } from '@/ingestion/browser-decoder';
import { browserDecodeEnvironment } from '@/ingestion/browser-decode-environment';
import { analysePhoto } from '@/pipeline/analyse-photo';
import { trackEvent } from '@/analytics/track-event';
import { vercelTransport } from '@/analytics/vercel-transport';
import { reportEvents } from '@/analytics/report-events.utils';
import { getContent } from '@/content/content.registry';
import { ingestImage } from '@/ingestion/ingest-image';
import { interpolate } from '@/content/interpolate.utils';
import { AnalysisError } from '@/analysis/analysis-error.utils';
import { CameraCapture } from '@/components/camera/CameraCapture/CameraCapture';
import { PhotoOverlay } from '@/components/result/PhotoOverlay/PhotoOverlay';
import { ResultPanel } from '@/components/result/ResultPanel/ResultPanel';
import { browserObjectUrls } from '@/result/preview-object-url';
import { UploadZone } from '@/components/upload/UploadZone/UploadZone';
import type { AnalysisResult, AnalysisStage } from '@/analysis/analysis-protocol.types';
import type { AnalysisState, PhotoPreview } from '@/result/analysis-state.types';
import type { ObjectUrlPort } from '@/result/preview-object-url.types';
import type { ImageDecoder, IngestedImage } from '@/ingestion/image-decoder.types';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';
import type { IngestionFailure } from '@/ingestion/ingestion-failure.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { AnalyseOptions, CheckerPanelProps } from './CheckerPanel.types';
import styles from './CheckerPanel.module.css';

const FIRST_STAGE: AnalysisStage = 'decoding';

/** What a photograph taken here is called once it reaches ingestion. */
const CAPTURE_FILE_NAME = 'camera-capture.jpg';

/**
 * The whole product on one screen: choose a document, add a photo, read the answer.
 *
 * Everything below it already existed and had been tested on its own. What was
 * missing was this — nothing mounted the pieces, so none of it was reachable
 * from a URL. A decoded photograph could not become a report because no
 * production code called both halves.
 *
 * NOTHING LOADS UNTIL A PHOTO ARRIVES. The decoder and the analysis worker are
 * built on first use, not on render: the models are fifteen megabytes, and a
 * page that pulled them down to show a heading would spend the reader's data
 * before they had decided to use it.
 *
 * The two kinds of failure go to two different places, which is the whole
 * reason they are separate types. A file we could not read is the upload
 * zone's business and appears there, next to the control that would replace
 * it. An analysis that broke is the result panel's, and comes with a retry.
 */
export const CheckerPanel = ({
  specs,
  decoder,
  analyse,
  cameraEnvironment,
  objectUrls,
  track = vercelTransport,
}: CheckerPanelProps): React.JSX.Element => {
  const content = getContent();
  const [selected, setSelected] = useState(0);
  const [state, setState] = useState<AnalysisState>({ kind: 'idle' });
  const [rejected, setRejected] = useState<IngestionFailure | undefined>(undefined);
  const [camera, setCamera] = useState(false);
  /**
   * Set once the live camera has said it cannot run here.
   *
   * After that the dropzone stops offering it and goes back to the phone's own
   * camera app, which needs no getUserMedia and is the only thing that works
   * in an in-app webview. Offering the same dead button twice is how a reader
   * decides the product is broken.
   */
  const [cameraUnavailable, setCameraUnavailable] = useState(false);

  const decoderRef = useRef<ImageDecoder | undefined>(decoder);
  /**
   * The object URL currently on screen, so it can be revoked when it is not.
   *
   * A ref rather than state: nothing renders from it, and reading it during
   * cleanup must see the LATEST url rather than the one captured by whichever
   * render registered the effect.
   */
  const previewUrlRef = useRef<string | undefined>(undefined);
  const objectUrlsRef = useRef<ObjectUrlPort | undefined>(objectUrls);
  const analyseRef = useRef<CheckerPanelProps['analyse']>(analyse);

  const spec = specs[selected] ?? specs[0];

  const urlsWith = (): ObjectUrlPort => {
    objectUrlsRef.current ??= browserObjectUrls();
    return objectUrlsRef.current;
  };

  /**
   * Releases the photograph currently previewed, if there is one.
   *
   * Called before every replacement and once on unmount. Not calling it is not
   * a visible bug — it is a decoded phone photograph, tens of megabytes, held
   * for the lifetime of the document while the reader checks another five.
   */
  const releasePreview = useCallback((): void => {
    const url = previewUrlRef.current;
    if (url === undefined) return;

    previewUrlRef.current = undefined;
    urlsWith().revoke(url);
    // No dependencies: everything read here is a ref, which is the point —
    // the cleanup must see the URL as it is at unmount, not as it was when
    // whichever render registered the effect captured it.
  }, []);

  useEffect(() => releasePreview, [releasePreview]);

  /**
   * Hands out the photograph to be previewed, and remembers it for release.
   *
   * The url is recorded in the ref in the same breath as it is created. Any
   * gap between the two is a url nothing owns — and a url nothing owns is one
   * nothing revokes.
   */
  const capturePreview = useCallback(
    (
      file: File,
      image: IngestedImage,
      instructions: readonly OverlayInstruction[],
    ): PhotoPreview => {
      const src = urlsWith().create(file);
      previewUrlRef.current = src;

      return {
        src,
        // The UPRIGHT size, which is the space the overlay's coordinates are in.
        // The decoder applies EXIF orientation itself and reports the corrected
        // dimensions; taking the stored ones would put every mark on a rotated
        // photograph at ninety degrees to the face it is measuring.
        widthPx: image.source.widthPx,
        heightPx: image.source.heightPx,
        instructions,
      };
      // Refs only, as with releasePreview: nothing here is a reactive value.
    },
    [],
  );

  const decodeWith = (): ImageDecoder => {
    decoderRef.current ??= createBrowserDecoder(browserDecodeEnvironment());
    return decoderRef.current;
  };

  const analyseWith = (): NonNullable<CheckerPanelProps['analyse']> => {
    analyseRef.current ??= defaultAnalyse();
    return analyseRef.current;
  };

  const check = useCallback(
    async (file: File, against: ResolvedPhotoSpec): Promise<void> => {
      setRejected(undefined);
      // Released at the START of the next check, not when its answer arrives.
      // The photograph on screen belongs to the answer being replaced, and
      // holding it until the replacement is ready would keep two full-size
      // decodes alive at once on the device least able to afford it.
      releasePreview();
      setState({ kind: 'analysing', stage: FIRST_STAGE, stageRatio: 0 });

      const identity = { country: against.country, document: against.document };
      trackEvent({ name: 'check-started', spec: identity }, track);

      const ingested = await ingestImage(new Uint8Array(await file.arrayBuffer()), decodeWith());

      if (!ingested.ok) {
        // Back to waiting, with the refusal shown on the control that can fix
        // it. An error where the answer goes would be in the wrong place.
        trackEvent({ name: 'photo-refused', reason: ingested.failure.code }, track);
        setState({ kind: 'idle' });
        setRejected(ingested.failure);
        return;
      }

      trackEvent({ name: 'photo-accepted', format: ingested.image.format }, track);

      try {
        const result = await analyseWith()(ingested.image.working, {
          onProgress: (stage, ratio) => {
            setState({ kind: 'analysing', stage, stageRatio: ratio });
          },
        });

        const { report, overlay } = analysePhoto({ image: ingested.image, result, spec: against });

        // One event per failing rule, plus the verdict. The per-rule events are
        // what make a failure RATE possible, which is the number that says what
        // the guidance should explain first.
        for (const event of reportEvents(report, identity)) trackEvent(event, track);

        // Created only once there is something to draw on it. A photograph
        // nothing could be measured on is shown as a verdict and no picture,
        // rather than a picture with no marks that looks like a pass.
        const preview =
          overlay === undefined ? undefined : capturePreview(file, ingested.image, overlay);

        setState({ kind: 'ready', report, preview });
      } catch (error) {
        // A code where there is one, 'unknown' where there is not. Every code
        // has its own remedy, and inventing one for a stray exception would
        // give the reader advice about a failure that did not happen.
        releasePreview();
        setState({
          kind: 'failed',
          error: error instanceof AnalysisError ? error.code : 'unknown',
        });
      }
    },
    [capturePreview, releasePreview, track],
  );

  // A checker with nothing to check against is not a degraded checker; it is
  // not one. A dropzone that leads nowhere would invite a photograph and then
  // silently drop it. The page filters the registry to the verified
  // specifications, so this is the empty-registry case.
  if (spec === undefined) return <div className={styles['checker']} />;

  return (
    <div className={styles['checker']}>
      {/* A picker is a question, and a question with one answer is a question
          nobody should be asked. A country page carries exactly one
          specification: the reader chose it by arriving there, and being asked
          to confirm it reads as though the page were unsure. */}
      {specs.length === 1 ? null : (
        <fieldset className={styles['specs']}>
          <legend className={styles['legend']}>{content.checker.specLegend}</legend>
          {specs.map((option, index) => (
            <span key={`${option.country}:${option.document}`}>
              <input
                className={styles['radio']}
                type="radio"
                name="photo-spec"
                id={`spec-${option.country}-${option.document}`}
                checked={index === selected}
                onChange={() => {
                  setSelected(index);
                }}
              />
              <label
                className={styles['option']}
                htmlFor={`spec-${option.country}-${option.document}`}
              >
                {interpolate(content.checker.specOption, {
                  country: COUNTRY_NAMES[option.country],
                  document: DOCUMENT_TYPE_LABELS[option.document],
                })}
              </label>
            </span>
          ))}
        </fieldset>
      )}

      {camera ? (
        <CameraCapture
          spec={spec}
          {...(cameraEnvironment === undefined ? {} : { environment: cameraEnvironment })}
          analyse={async (frame) => await analyseWith()(frame, { onProgress: () => undefined })}
          onCapture={(photo) => {
            setCamera(false);
            void check(new File([photo], CAPTURE_FILE_NAME, { type: photo.type }), spec);
          }}
          onUploadInstead={() => {
            setCamera(false);
          }}
          onUnavailable={() => {
            setCameraUnavailable(true);
          }}
        />
      ) : state.kind === 'ready' ? (
        <button
          className={styles['restart']}
          type="button"
          data-track="checker-restart"
          onClick={() => {
            releasePreview();
            setState({ kind: 'idle' });
          }}
        >
          {content.checker.startOver}
        </button>
      ) : (
        <UploadZone
          onFile={(file) => {
            void check(file, spec);
          }}
          busy={state.kind === 'analysing'}
          failure={rejected}
          {...(cameraUnavailable
            ? {}
            : {
                onUseCamera: (): void => {
                  setCamera(true);
                },
              })}
        />
      )}

      <ResultPanel state={state} spec={spec}>
        {state.kind === 'ready' && state.preview !== undefined ? (
          <PhotoOverlay
            imageSrc={state.preview.src}
            sourceWidthPx={state.preview.widthPx}
            sourceHeightPx={state.preview.heightPx}
            instructions={state.preview.instructions}
          />
        ) : null}
      </ResultPanel>
    </div>
  );
};

/**
 * The real analysis, behind the same shape a test injects.
 *
 * The client owns the worker's lifetime and creates it on first use, so
 * building this costs nothing until a photograph is actually analysed.
 */
const defaultAnalyse = (): NonNullable<CheckerPanelProps['analyse']> => {
  const client = createAnalysisClient({ createWorker: createBrowserWorker });

  return async (frame: PixelBuffer, options: AnalyseOptions): Promise<AnalysisResult> =>
    client.analyse({ buffer: frame }, { onProgress: options.onProgress });
};
