import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getContent } from '@/content/content.registry';
import { MAX_UPLOAD_BYTES } from '@/constants/limits.constants';
import { JPEG_SIGNATURE, PNG_SIGNATURE } from '@/ingestion/image-format.constants';
import { ingestionFailures } from '@/ingestion/ingestion-failure.utils';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { fileListOf } from '@/testing/file-list.stub';
import { UploadZone } from './UploadZone';
import type { UploadZoneProps } from './UploadZone.types';

const content = getContent().upload;

const DRAGGING = 'data-dragging';
const BODY_BYTES = 64;

/** A file whose leading bytes really are the format it claims. */
const imageFile = (
  name: string,
  signature: readonly number[],
  type: string,
  byteLength = BODY_BYTES,
): File => {
  const body = new Uint8Array(byteLength);
  body.set(signature, 0);
  return new File([body], name, { type });
};

const jpeg = (name = 'passport.jpg'): File => imageFile(name, JPEG_SIGNATURE, 'image/jpeg');
const png = (name = 'passport.png'): File => imageFile(name, PNG_SIGNATURE, 'image/png');

/** Bytes that match no signature at all — a PDF, an archive, a text file. */
const notAnImage = (): File => new File([new Uint8Array(BODY_BYTES).fill(0x41)], 'notes.txt', {
  type: 'text/plain',
});

const folderLike = (): File => new File([], 'Camera Roll', { type: '' });

const renderZone = (props: Partial<UploadZoneProps> = {}): ReturnType<typeof render> =>
  render(<UploadZone onFile={vi.fn()} {...props} />);

const zoneElement = (): HTMLElement => screen.getByText(content.dropzoneLabel).parentElement as HTMLElement;

const dropFiles = (...files: readonly File[]): void => {
  fireEvent.drop(zoneElement(), { dataTransfer: { files: fileListOf(...files) } });
};

describe('UploadZone', () => {
  it('offers both a picker and a camera, so an existing photo stays choosable on a phone', () => {
    renderZone();

    // The two must be separate controls. Putting `capture` on a single picker
    // removes the option to choose an existing photograph on iOS entirely.
    expect(screen.getByText(content.browseLabel)).toBeInTheDocument();
    expect(screen.getByText(content.takePhotoLabel)).toBeInTheDocument();
  });

  it('opens a live camera when the caller has one, instead of a second file picker', async () => {
    // The bug this replaced: `capture` is ignored by every desktop browser, so
    // "Take a photo" opened the same picker as "Choose a photo" and appeared
    // to do nothing at all.
    const onUseCamera = vi.fn();
    const { container } = renderZone({ onUseCamera });

    await userEvent.click(screen.getByText(content.takePhotoLabel));

    expect(onUseCamera).toHaveBeenCalledOnce();
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(1);
  });

  it('falls back to the phone\u2019s own camera when the caller has none', () => {
    // Not a downgrade on a phone: the camera app shoots at full sensor
    // resolution, and it is the only thing that works in a webview with no
    // getUserMedia.
    const { container } = renderZone();

    const [, capture] = [...container.querySelectorAll('input[type="file"]')];
    expect(capture).toHaveAttribute('capture');
  });

  it('keeps the file inputs focusable rather than hiding them from the keyboard', () => {
    const { container } = renderZone();

    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input).not.toHaveAttribute('hidden');
      expect(input).not.toHaveAttribute('tabindex', '-1');
    }
  });

  it('states that nothing leaves the device', () => {
    renderZone();

    expect(screen.getByText(content.privacyNote)).toBeInTheDocument();
  });

  it('hands a valid dropped photograph to the caller', async () => {
    const onFile = vi.fn();
    renderZone({ onFile });

    const file = jpeg();
    dropFiles(file);

    await waitFor(() => {
      expect(onFile).toHaveBeenCalledWith(file);
    });
  });

  it('hands over a photograph chosen from the picker', async () => {
    const onFile = vi.fn();
    const user = userEvent.setup();
    const { container } = renderZone({ onFile });

    const file = png();
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);

    await waitFor(() => {
      expect(onFile).toHaveBeenCalledWith(file);
    });
  });

  it('hands over a photograph taken with the camera input', async () => {
    const onFile = vi.fn();
    const user = userEvent.setup();
    const { container } = renderZone({ onFile });

    const file = jpeg('camera.jpg');
    const [, capture] = [...container.querySelectorAll('input[type="file"]')];
    await user.upload(capture as HTMLInputElement, file);

    await waitFor(() => {
      expect(onFile).toHaveBeenCalledWith(file);
    });
  });

  it('uses the first of several dropped files and says so', async () => {
    const onFile = vi.fn();
    renderZone({ onFile });

    const first = jpeg('one.jpg');
    dropFiles(first, jpeg('two.jpg'));

    await waitFor(() => {
      expect(onFile).toHaveBeenCalledWith(first);
    });
    expect(screen.getByText(content.usedFirstOfMany)).toBeInTheDocument();
  });

  it('stays quiet about a count when only one file was dropped', async () => {
    const onFile = vi.fn();
    renderZone({ onFile });

    dropFiles(jpeg());

    await waitFor(() => {
      expect(onFile).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(content.usedFirstOfMany)).not.toBeInTheDocument();
  });

  it('explains a drop that carried no file at all', async () => {
    const onFile = vi.fn();
    renderZone({ onFile });

    dropFiles(folderLike());

    expect(await screen.findByText(content.nothingDropped)).toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });

  it('refuses a file that is not an image, with its remedy', async () => {
    const onFile = vi.fn();
    renderZone({ onFile });

    dropFiles(notAnImage());

    const failure = content.failures['unrecognised-format'];
    expect(await screen.findByText(failure.message)).toBeInTheDocument();
    expect(screen.getByText(failure.remedy)).toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });

  it('reports the refusal to the caller as well as the reader', async () => {
    const onRejected = vi.fn();
    renderZone({ onRejected });

    dropFiles(notAnImage());

    await waitFor(() => {
      expect(onRejected).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'unrecognised-format' }),
      );
    });
  });

  it('refuses an empty file with the empty-file wording, not the format one', async () => {
    renderZone();

    // Zero bytes with a declared type is a truncated download, and it must not
    // be mistaken for the folder case — the advice for each is different.
    dropFiles(new File([], 'passport.jpg', { type: 'image/jpeg' }));

    expect(await screen.findByText(content.failures['empty-file'].message)).toBeInTheDocument();
  });

  it('names the reader’s own file size when it is over the limit', async () => {
    renderZone();

    const oversized = jpeg('huge.jpg');
    // Faking the size rather than allocating fifty megabytes in a unit test.
    Object.defineProperty(oversized, 'size', { value: MAX_UPLOAD_BYTES + 1 });
    dropFiles(oversized);

    expect(await screen.findByText(/over the 50MB limit/)).toBeInTheDocument();
  });

  it('clears a previous refusal when a good photograph follows it', async () => {
    const onFile = vi.fn();
    renderZone({ onFile });

    dropFiles(notAnImage());
    expect(await screen.findByText(content.failures['unrecognised-format'].message)).toBeInTheDocument();

    dropFiles(jpeg());

    await waitFor(() => {
      expect(onFile).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByText(content.failures['unrecognised-format'].message),
    ).not.toBeInTheDocument();
  });

  it('announces refusals politely rather than interrupting', async () => {
    renderZone();

    dropFiles(notAnImage());

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(content.failures['unrecognised-format'].message);
  });

  it('accepts a photograph pasted from the clipboard, which is the HEIC remedy', async () => {
    const onFile = vi.fn();
    renderZone({ onFile });

    const file = jpeg('pasted.jpg');
    // Our own HEIC advice is Share, Copy Photo, paste. If this listener is not
    // wired, that advice sends the reader nowhere.
    fireEvent.paste(window, { clipboardData: { files: fileListOf(file) } });

    await waitFor(() => {
      expect(onFile).toHaveBeenCalledWith(file);
    });
  });

  it('ignores a paste that carried no file, leaving text pasting alone', () => {
    const onFile = vi.fn();
    renderZone({ onFile });

    fireEvent.paste(window, { clipboardData: { files: fileListOf() } });

    expect(onFile).not.toHaveBeenCalled();
    expect(screen.queryByText(content.nothingDropped)).not.toBeInTheDocument();
  });

  it('stops listening for pastes once it is gone', () => {
    const onFile = vi.fn();
    const { unmount } = renderZone({ onFile });

    unmount();
    fireEvent.paste(window, { clipboardData: { files: fileListOf(jpeg()) } });

    expect(onFile).not.toHaveBeenCalled();
  });

  it('highlights while a file is over it', () => {
    renderZone();
    const zone = zoneElement();

    fireEvent.dragEnter(zone);

    expect(zone).toHaveAttribute(DRAGGING, 'true');
  });

  it('stays highlighted while the pointer moves across a child element', () => {
    renderZone();
    const zone = zoneElement();

    // The flicker bug, exactly: entering a child fires dragenter on the child
    // and dragleave on the parent, so a boolean would switch the highlight off
    // while the file is still plainly inside the zone.
    fireEvent.dragEnter(zone);
    fireEvent.dragEnter(screen.getByText(content.dropzoneHint));
    fireEvent.dragLeave(zone);

    expect(zone).toHaveAttribute(DRAGGING, 'true');
  });

  it('drops the highlight once the file leaves for good', () => {
    renderZone();
    const zone = zoneElement();

    fireEvent.dragEnter(zone);
    fireEvent.dragLeave(zone);

    expect(zone).toHaveAttribute(DRAGGING, 'false');
  });

  it('never counts the highlight below zero, so a stray leave cannot strand it', () => {
    renderZone();
    const zone = zoneElement();

    // Browsers do emit unpaired dragleave events. If the counter went negative
    // here, the next real dragenter would not reach one and the zone would
    // never light up again.
    fireEvent.dragLeave(zone);
    fireEvent.dragEnter(zone);

    expect(zone).toHaveAttribute(DRAGGING, 'true');
  });

  it('drops the highlight when the file lands', async () => {
    renderZone();
    const zone = zoneElement();

    fireEvent.dragEnter(zone);
    fireEvent.dragEnter(screen.getByText(content.dropzoneHint));
    dropFiles(jpeg());

    await waitFor(() => {
      expect(zone).toHaveAttribute(DRAGGING, 'false');
    });
  });

  it('swallows a drop that missed the zone, so the browser cannot navigate away', () => {
    renderZone();

    const event = new Event('drop', { cancelable: true, bubbles: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents a dragover over the zone, without which the browser refuses the drop', () => {
    renderZone();

    // Asserted on the outcome rather than on which listener produces it: the
    // requirement is that the zone is droppable, not where that is arranged.
    const event = new Event('dragover', { cancelable: true, bubbles: true });
    zoneElement().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('swallows a dragover that missed the zone', () => {
    renderZone();

    const event = new Event('dragover', { cancelable: true, bubbles: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('lets the page have its drops back once it is gone', () => {
    const { unmount } = renderZone();
    unmount();

    const event = new Event('drop', { cancelable: true, bubbles: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('warms the models up when a pointer comes near', async () => {
    const onWarmUp = vi.fn();
    const user = userEvent.setup();
    renderZone({ onWarmUp });

    await user.hover(zoneElement());

    expect(onWarmUp).toHaveBeenCalledTimes(1);
  });

  it('warms up only once, however many times the pointer passes', async () => {
    const onWarmUp = vi.fn();
    const user = userEvent.setup();
    renderZone({ onWarmUp });
    const zone = zoneElement();

    await user.hover(zone);
    await user.unhover(zone);
    await user.hover(zone);

    // Fifteen megabytes of models. Compiling them twice is not a rounding error.
    expect(onWarmUp).toHaveBeenCalledTimes(1);
  });

  it('does not require a warm-up handler', async () => {
    const user = userEvent.setup();
    renderZone();

    await expect(user.hover(zoneElement())).resolves.toBeUndefined();
  });

  it('says an analysis is already running when it is', () => {
    renderZone({ busy: true });

    expect(screen.getByText(content.busyNote)).toBeInTheDocument();
  });

  it('says nothing about being busy when it is idle', () => {
    renderZone();

    expect(screen.queryByText(content.busyNote)).not.toBeInTheDocument();
  });

  it('still accepts a photograph while busy, rather than dropping it on the floor', async () => {
    const onFile = vi.fn();
    renderZone({ onFile, busy: true });

    const file = jpeg();
    dropFiles(file);

    await waitFor(() => {
      expect(onFile).toHaveBeenCalledWith(file);
    });
  });

  it('does not require a rejection handler', async () => {
    renderZone();

    dropFiles(notAnImage());

    expect(
      await screen.findByText(content.failures['unrecognised-format'].message),
    ).toBeInTheDocument();
  });

  it('renders a refusal the caller produced downstream, in the same place as its own', () => {
    // Everything a decoder discovers — damaged, too small, animated — arrives
    // this way. A second error block elsewhere on the page is how a reader
    // misses one.
    renderZone({ failure: ingestionFailures.decodeFailed('jpeg') });

    expect(screen.getByText(content.failures['decode-failed'].message)).toBeInTheDocument();
    expect(screen.getByText(content.failures['decode-failed'].remedy)).toBeInTheDocument();
  });

  it('prefers the refusal it detected itself over the one the caller is still reporting', async () => {
    renderZone({ failure: ingestionFailures.decodeFailed('jpeg') });

    dropFiles(notAnImage());

    // The caller's failure is about the previous file. Showing both would tell
    // the reader two different things about one photograph.
    expect(
      await screen.findByText(content.failures['unrecognised-format'].message),
    ).toBeInTheDocument();
    expect(screen.queryByText(content.failures['decode-failed'].message)).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderZone();

    await expectNoAxeViolations(container);
  });

  it('has no accessibility violations while showing a refusal', async () => {
    const { container } = renderZone();

    dropFiles(notAnImage());
    await screen.findByText(content.failures['unrecognised-format'].message);

    await expectNoAxeViolations(container);
  });
});
