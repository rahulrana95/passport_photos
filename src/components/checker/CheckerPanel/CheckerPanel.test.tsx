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
import { CheckerPanel } from './CheckerPanel';
import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { DecodedImage, ImageDecoder } from '@/ingestion/image-decoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
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
