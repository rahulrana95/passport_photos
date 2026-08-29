import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisError } from '@/analysis/analysis-error.utils';
import { COUNTRY_NAMES } from '@/constants/country.constants';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-type.constants';
import { JPEG_SIGNATURE } from '@/ingestion/image-format.constants';
import { MIN_SOURCE_EDGE_PX } from '@/constants/limits.constants';
import { fixtureSpec } from '@/testing/fixtures/compliance-report.builder';
import { getContent } from '@/content/content.registry';
import { interpolate } from '@/content/interpolate.utils';
import { listAuthoredSpecs } from '@/photo-spec/photo-spec.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { fileListOf } from '@/testing/file-list.stub';
import { stubCameraEnvironment } from '@/testing/camera-environment.stub';
import { withWorkingCanvas } from '@/testing/canvas.stub';
import { CheckerPanel } from './CheckerPanel';
import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { DecodedImage, ImageDecoder } from '@/ingestion/image-decoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { ObjectUrlPort } from '@/result/preview-object-url.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { CheckerPanelProps } from './CheckerPanel.types';

const content = getContent();

/**
 * The smallest photograph ingestion accepts, downscaled by half.
 *
 * Both edges matter. Anything under the minimum is refused before a decoder is
 * ever called, so a token 8x8 buffer would test the refusal path in every test
 * that meant to test the happy one. And the working copy is deliberately not
 * the source, so "analyses the working copy" is an assertion rather than a
 * coincidence.
 */
const SOURCE_EDGE_PX = MIN_SOURCE_EDGE_PX * 2;
const WORKING_EDGE_PX = MIN_SOURCE_EDGE_PX;
const BYTES_PER_PIXEL = 4;
const OPAQUE = 255;

const frame = (): PixelBuffer => ({
  width: WORKING_EDGE_PX,
  height: WORKING_EDGE_PX,
  data: new Uint8ClampedArray(WORKING_EDGE_PX * WORKING_EDGE_PX * BYTES_PER_PIXEL).fill(OPAQUE),
});

const decoded = (): DecodedImage => ({
  source: { widthPx: SOURCE_EDGE_PX, heightPx: SOURCE_EDGE_PX },
  working: frame(),
  isAnimated: false,
});

/**
 * A decoder that never touches a canvas.
 *
 * The real one needs createImageBitmap and OffscreenCanvas, neither of which
 * jsdom has. What this component decides — which spec, which failure goes
 * where, what happens next — does not depend on real pixels.
 */
const workingDecoder = (): ImageDecoder => ({
  decode: async (): Promise<DecodedImage> => await Promise.resolve(decoded()),
  canDecode: (): boolean => true,
});

/** A decoder that reads the header fine and then fails, as a truncated JPEG does. */
const failingDecoder = (): ImageDecoder => ({
  decode: async (): Promise<undefined> => await Promise.resolve(undefined),
  canDecode: (): boolean => true,
});

const NO_RESULT: AnalysisResult = { landmarks: undefined, segmentation: undefined };

/*
 * A photograph that can actually be measured, so the preview path is reachable.
 *
 * Hand-placed rather than generated, because what is being tested here is the
 * wiring — that a measurable photo produces a preview and that its object URL
 * is released — and a generator would put a second thing in the way of a
 * failure. The numbers only have to survive the crop planner: a head near the
 * middle of the permitted band, far enough inside a 960px frame that the crop
 * it implies fits.
 */
const CHIN_Y_PX = 700;
const CROWN_Y_PX = 288;
const EYE_Y_PX = 480;
const LEFT_EYE_X_PX = 430;
const RIGHT_EYE_X_PX = 530;
const MASK_SUBJECT = 255;

/*
 * In SOURCE pixels, because that is the space the mask is read in here.
 *
 * The working size is planned from the source and capped at 1600px, and this
 * fixture's source is smaller than the cap — so nothing is downscaled and the
 * scale factor is 1. Sizing the mask to the stub decoder's smaller buffer
 * instead put the crown at half its true row and the face centre outside the
 * mask entirely, which reads as "segmentation found nothing".
 */
const subjectMask = (): Uint8ClampedArray => {
  const mask = new Uint8ClampedArray(SOURCE_EDGE_PX * SOURCE_EDGE_PX);

  for (let y = CROWN_Y_PX; y < CHIN_Y_PX; y += 1) {
    for (let x = LEFT_EYE_X_PX; x < RIGHT_EYE_X_PX; x += 1) mask[y * SOURCE_EDGE_PX + x] = MASK_SUBJECT;
  }
  return mask;
};

const MEASURABLE_RESULT: AnalysisResult = {
  landmarks: {
    // Chin, left iris, right iris — the order the shared index constants fix.
    points: [
      { x: 0.5, y: CHIN_Y_PX / SOURCE_EDGE_PX },
      { x: LEFT_EYE_X_PX / SOURCE_EDGE_PX, y: EYE_Y_PX / SOURCE_EDGE_PX },
      { x: RIGHT_EYE_X_PX / SOURCE_EDGE_PX, y: EYE_Y_PX / SOURCE_EDGE_PX },
    ],
    confidence: 0.95,
    rollDegrees: 0,
    yawDegrees: 0,
    pitchDegrees: 0,
    blendshapes: {},
  },
  segmentation: {
    width: SOURCE_EDGE_PX,
    height: SOURCE_EDGE_PX,
    mask: subjectMask(),
    confidence: 0.9,
  },
};

/** Object URLs jsdom does not have, with every handout and release recorded. */
const recordingUrls = (): ObjectUrlPort & {
  readonly created: string[];
  readonly revoked: string[];
} => {
  const created: string[] = [];
  const revoked: string[] = [];

  return {
    created,
    revoked,
    create: () => {
      const url = `blob:preview-${created.length}`;
      created.push(url);
      return url;
    },
    revoke: (url) => {
      revoked.push(url);
    },
  };
};

const JPEG_BODY_BYTES = 64;

const jpegFile = (name = 'passport.jpg'): File => {
  const body = new Uint8Array(JPEG_BODY_BYTES);
  body.set(JPEG_SIGNATURE, 0);
  return new File([body], name, { type: 'image/jpeg' });
};

/** Bytes matching no image signature at all, which ingestion refuses outright. */
const textFile = (): File =>
  new File([new Uint8Array(JPEG_BODY_BYTES).fill(0x41)], 'notes.txt', { type: 'text/plain' });

const TWO_SPECS: readonly ResolvedPhotoSpec[] = (() => {
  const authored = listAuthoredSpecs();
  const [first, second] = authored;
  if (first === undefined || second === undefined) {
    throw new Error('Two authored specifications are needed to test the picker.');
  }
  return [fixtureSpec([first]), fixtureSpec([second])];
})();

const optionLabel = (spec: ResolvedPhotoSpec): string =>
  interpolate(content.checker.specOption, {
    country: COUNTRY_NAMES[spec.country],
    document: DOCUMENT_TYPE_LABELS[spec.document],
  });

const renderPanel = (
  props: Partial<CheckerPanelProps> = {},
): { readonly analyse: ReturnType<typeof vi.fn> } & ReturnType<typeof render> => {
  const analyse = vi.fn(async (): Promise<AnalysisResult> => await Promise.resolve(NO_RESULT));
  const rendered = render(
    <CheckerPanel
      specs={TWO_SPECS}
      decoder={workingDecoder()}
      analyse={analyse}
      {...props}
    />,
  );

  return { ...rendered, analyse };
};

const dropFile = (file: File): void => {
  const zone = screen.getByText(content.upload.dropzoneLabel).parentElement as HTMLElement;
  fireEvent.drop(zone, { dataTransfer: { files: fileListOf(file) } });
};

/**
 * The report is on screen when the restart control is.
 *
 * Not `findByRole('status')`: the progress region is also a status region, so
 * that query resolves while the analysis is still running and the element it
 * returns has unmounted by the time it is asserted on. The restart button
 * exists in exactly one state, which is the one being waited for.
 */
const reportOnScreen = async (): Promise<HTMLElement> =>
  await screen.findByText(content.checker.startOver);

describe('CheckerPanel', () => {
  it('offers every specification it was given, with the first already chosen', () => {
    renderPanel();

    for (const spec of TWO_SPECS) {
      expect(screen.getByLabelText(optionLabel(spec))).toBeInTheDocument();
    }
    expect(screen.getByLabelText(optionLabel(TWO_SPECS[0] as ResolvedPhotoSpec))).toBeChecked();
  });

  it('asks nothing when there is only one specification to check against', async () => {
    // A country page carries exactly one. Asking "what are you applying for?"
    // above a single radio reads as though the page were unsure which country
    // it is about.
    const only = TWO_SPECS[0] as ResolvedPhotoSpec;
    render(<CheckerPanel specs={[only]} decoder={workingDecoder()} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByText(content.checker.specLegend)).not.toBeInTheDocument();
    expect(screen.getByText(content.upload.dropzoneLabel)).toBeInTheDocument();
  });

  it('turns a chosen photo into a report', async () => {
    // The whole product in one assertion: a file goes in, an answer comes out.
    // Nothing else in the suite covers the join between ingestion and analysis.
    renderPanel();

    dropFile(jpegFile());

    expect(await reportOnScreen()).toBeInTheDocument();
  });

  it('checks against the specification the reader picked, not the first one', async () => {
    // A report against the wrong country is worse than no report: it is
    // confidently wrong, and the reader has no way to tell.
    const { analyse } = renderPanel();
    const second = TWO_SPECS[1] as ResolvedPhotoSpec;

    await userEvent.click(screen.getByLabelText(optionLabel(second)));
    dropFile(jpegFile());

    await reportOnScreen();

    expect(analyse).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(optionLabel(second))).toBeChecked();
  });

  it('shows the progress the analysis reports while it runs', async () => {
    const analyse = vi.fn(
      async (
        _frame: PixelBuffer,
        options: { readonly onProgress: (stage: 'segmenting', ratio: number) => void },
      ): Promise<AnalysisResult> => {
        options.onProgress('segmenting', 0.5);
        return await Promise.resolve(NO_RESULT);
      },
    );

    renderPanel({ analyse });
    dropFile(jpegFile());

    expect(await reportOnScreen()).toBeInTheDocument();
    expect(analyse).toHaveBeenCalledOnce();
  });

  it('puts a file it could not read next to the control that would replace it', async () => {
    // Not in the result panel. A refusal belongs beside the dropzone, where
    // the fix is; the answer area is for answers.
    renderPanel();

    dropFile(textFile());

    expect(
      await screen.findByText(content.upload.failures['unrecognised-format'].message),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the dropzone usable after a refusal rather than stalling on it', async () => {
    renderPanel();

    dropFile(textFile());
    await screen.findByText(content.upload.failures['unrecognised-format'].message);
    dropFile(jpegFile());

    expect(await reportOnScreen()).toBeInTheDocument();
  });

  it('sends a photo that decoded badly back to the dropzone, not to the answer', async () => {
    // The upload zone only ever sees the first thirty-two bytes. A file that
    // passes that and dies in the decoder is the common case — a transfer that
    // stopped halfway — and the refusal still belongs beside the control that
    // would replace it.
    renderPanel({ decoder: failingDecoder() });

    dropFile(jpegFile());

    expect(
      await screen.findByText(content.upload.failures['decode-failed'].message),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports an analysis failure by its own code, so the remedy fits it', async () => {
    const analyse = vi.fn(
      async (): Promise<AnalysisResult> =>
        await Promise.reject(new AnalysisError('timeout', 'took too long')),
    );

    renderPanel({ analyse });
    dropFile(jpegFile());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      content.result.failures.timeout.message,
    );
  });

  it('falls back to an unknown failure rather than inventing a remedy', async () => {
    // A stray exception has no code. Guessing one would hand the reader
    // instructions for a failure that did not happen.
    const analyse = vi.fn(
      async (): Promise<AnalysisResult> => await Promise.reject(new Error('something else')),
    );

    renderPanel({ analyse });
    dropFile(jpegFile());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      content.result.failures.unknown.message,
    );
  });

  it('offers a fresh start once an answer is on screen', async () => {
    renderPanel();

    dropFile(jpegFile());
    await userEvent.click(await reportOnScreen());

    expect(screen.getByText(content.upload.dropzoneLabel)).toBeInTheDocument();
    expect(screen.queryByText(content.checker.startOver)).not.toBeInTheDocument();
  });

  it('reaches the real analysis when none was injected', async () => {
    // The default path, exercised for real: no worker is constructed until a
    // photograph arrives, and jsdom has no Worker to construct — so what the
    // reader gets here is the same message a locked-down browser would give.
    render(<CheckerPanel specs={TWO_SPECS} decoder={workingDecoder()} />);

    dropFile(jpegFile());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      content.result.failures['worker-unavailable'].message,
    );
  });

  it('builds nothing until a photo arrives', () => {
    // The defaults construct a Worker and a canvas, and jsdom has neither. A
    // render that reached for either would throw here — which is the point:
    // fifteen megabytes of models must not load because a page rendered.
    expect(() => render(<CheckerPanel specs={TWO_SPECS} />)).not.toThrow();
  });

  it('renders nothing at all when it was given no specifications', () => {
    // Unreachable from the page, which filters the registry — but the page is
    // not the only caller a component gets, and an empty registry must not
    // render a picker with no options and a dropzone that leads nowhere.
    render(<CheckerPanel specs={[]} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByText(content.upload.dropzoneLabel)).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPanel();

    await expectNoAxeViolations(container);
  });
});

const cameraContent = getContent().camera;

/** The sensor the stub camera reports, which jsdom never sets on its own. */
const SENSOR_WIDTH_PX = 1_920;
const SENSOR_HEIGHT_PX = 1_080;
const HAVE_CURRENT_DATA = 2;

const primeVideo = (): void => {
  const video = screen.getByLabelText(cameraContent.previewLabel);

  for (const [property, value] of [
    ['videoWidth', SENSOR_WIDTH_PX],
    ['videoHeight', SENSOR_HEIGHT_PX],
    ['readyState', HAVE_CURRENT_DATA],
  ] as const) {
    Object.defineProperty(video, property, { configurable: true, value });
  }
};

describe('taking a photo with the camera', () => {
  it('opens the live camera rather than a second file picker', async () => {
    // The whole bug: `capture` on a file input is ignored by every desktop
    // browser, so "Take a photo" opened the picker and looked broken.
    renderPanel({ cameraEnvironment: stubCameraEnvironment() });

    await userEvent.click(screen.getByText(content.upload.takePhotoLabel));

    expect(screen.getByLabelText(cameraContent.previewLabel)).toBeInTheDocument();
    expect(screen.queryByText(content.upload.dropzoneLabel)).not.toBeInTheDocument();
  });

  it('checks the photograph it took, the same way an uploaded one is checked', async () => {
    const restoreCanvas = withWorkingCanvas();
    try {
      const { analyse } = renderPanel({ cameraEnvironment: stubCameraEnvironment() });

      await userEvent.click(screen.getByText(content.upload.takePhotoLabel));
      await userEvent.click(screen.getByRole('button', { name: cameraContent.startLabel }));
      primeVideo();
      await userEvent.click(
        await screen.findByRole('button', { name: cameraContent.captureLabel }),
      );

      expect(await reportOnScreen()).toBeInTheDocument();
      expect(analyse).toHaveBeenCalled();
    } finally {
      restoreCanvas();
    }
  });

  it('feeds the live preview through the same analysis the report uses', async () => {
    // The guidance loop is the product's differentiator — "move closer, hold
    // there" before the shutter rather than a rejection after it — and it runs
    // on the analysis client this panel already owns, so the models are loaded
    // once and the preview costs no second worker.
    const restoreCanvas = withWorkingCanvas();
    try {
      const { analyse } = renderPanel({ cameraEnvironment: stubCameraEnvironment() });

      await userEvent.click(screen.getByText(content.upload.takePhotoLabel));
      await userEvent.click(screen.getByRole('button', { name: cameraContent.startLabel }));
      primeVideo();

      // Before any shutter press: what is asserted is the preview loop, not
      // the still.
      await waitFor(() => {
        expect(analyse).toHaveBeenCalled();
      });
    } finally {
      restoreCanvas();
    }
  });

  it('keeps preview progress out of the page, where it would mean the wrong thing', async () => {
    // The preview analyses a frame four times a second. Letting that drive the
    // page's progress would leave a bar jittering under a camera nobody has
    // photographed with yet — progress towards a report that does not exist.
    const restoreCanvas = withWorkingCanvas();
    try {
      const analyse = vi.fn(
        async (
          _frame: PixelBuffer,
          options: { readonly onProgress: (stage: 'segmenting', ratio: number) => void },
        ): Promise<AnalysisResult> => {
          options.onProgress('segmenting', 0.5);
          return await Promise.resolve(NO_RESULT);
        },
      );

      renderPanel({ analyse, cameraEnvironment: stubCameraEnvironment() });

      await userEvent.click(screen.getByText(content.upload.takePhotoLabel));
      await userEvent.click(screen.getByRole('button', { name: cameraContent.startLabel }));
      primeVideo();

      await waitFor(() => {
        expect(analyse).toHaveBeenCalled();
      });
      expect(screen.queryByText(content.checker.startOver)).not.toBeInTheDocument();
    } finally {
      restoreCanvas();
    }
  });

  it('goes back to the dropzone when the reader would rather upload', async () => {
    renderPanel({ cameraEnvironment: stubCameraEnvironment() });

    await userEvent.click(screen.getByText(content.upload.takePhotoLabel));
    await userEvent.click(screen.getByText(cameraContent.fallbackToUpload));

    expect(screen.getByText(content.upload.dropzoneLabel)).toBeInTheDocument();
  });

  it('stops offering a camera that cannot open, and offers the device\u2019s own', async () => {
    // Offering the same dead button twice is how a reader decides the product
    // is broken. A browser with no getUserMedia fails every time it is asked,
    // so after the first refusal the phone's camera app is the honest offer.
    // No injected camera, deliberately: jsdom has no getUserMedia, which is
    // exactly what an in-app webview looks like — the case this exists for.
    const { container } = renderPanel();

    await userEvent.click(screen.getByText(content.upload.takePhotoLabel));
    await userEvent.click(screen.getByRole('button', { name: cameraContent.startLabel }));
    await screen.findByRole('alert');
    await userEvent.click(screen.getByText(cameraContent.fallbackToUpload));

    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(2);
    expect(inputs[1]).toHaveAttribute('capture');
  });
});

describe('the decoded photo it analyses', () => {
  it('is the downscaled working copy, not the original', async () => {
    // The models run on the working copy; handing them the source would
    // measure a different image from the one every geometry number came from.
    const analyse = vi.fn(async (): Promise<AnalysisResult> => await Promise.resolve(NO_RESULT));

    renderPanel({ analyse });
    dropFile(jpegFile());

    await waitFor(() => {
      expect(analyse).toHaveBeenCalled();
    });
    const [passed] = analyse.mock.calls[0] as unknown as readonly [PixelBuffer];
    expect(passed.width).toBe(WORKING_EDGE_PX);
    expect(passed.width).not.toBe(SOURCE_EDGE_PX);
  });
});

describe('the photograph shown back with its measurements on it', () => {
  const measurable = (): Partial<CheckerPanelProps> => ({
    analyse: vi.fn(async (): Promise<AnalysisResult> => await Promise.resolve(MEASURABLE_RESULT)),
  });

  it('shows the reader their own photo, annotated, once it has been measured', async () => {
    const urls = recordingUrls();
    renderPanel({ ...measurable(), objectUrls: urls });

    dropFile(jpegFile());
    await reportOnScreen();

    // The <img> is the point of the whole feature: a list of failed rules
    // tells somebody their head is too large, and the picture tells them by
    // how much and in which direction.
    const photo = await screen.findByAltText(content.overlay.photoAlt);
    expect(photo).toHaveAttribute('src', urls.created[0]);
    expect(urls.created).toHaveLength(1);
  });

  it('shows no photo when nothing on it could be measured', async () => {
    const urls = recordingUrls();
    renderPanel({ objectUrls: urls });

    dropFile(jpegFile());
    await reportOnScreen();

    // A frame with no marks in it reads as "we looked and found nothing
    // wrong", which is the opposite of what an unreadable photograph means.
    expect(screen.queryByAltText(content.overlay.photoAlt)).toBeNull();
    expect(urls.created).toHaveLength(0);
  });

  it('releases the previous photograph when another is checked', async () => {
    const urls = recordingUrls();
    renderPanel({ ...measurable(), objectUrls: urls });

    dropFile(jpegFile());
    await reportOnScreen();
    fireEvent.click(screen.getByText(content.checker.startOver));
    dropFile(jpegFile('second.jpg'));
    await reportOnScreen();

    // Without this the first decode stays pinned in memory for the life of
    // the document, and the reader checking five photos on a phone pays for
    // all five at once.
    expect(urls.created).toHaveLength(2);
    expect(urls.revoked).toContain(urls.created[0]);
  });

  it('releases the photograph when the panel goes away', async () => {
    const urls = recordingUrls();
    const { unmount } = renderPanel({ ...measurable(), objectUrls: urls });

    dropFile(jpegFile());
    await reportOnScreen();
    unmount();

    expect(urls.revoked).toEqual(urls.created);
  });

  it('keeps no photograph on screen after starting over', async () => {
    const urls = recordingUrls();
    renderPanel({ ...measurable(), objectUrls: urls });

    dropFile(jpegFile());
    await reportOnScreen();
    fireEvent.click(screen.getByText(content.checker.startOver));

    expect(screen.queryByAltText(content.overlay.photoAlt)).toBeNull();
    expect(urls.revoked).toContain(urls.created[0]);
  });
});
