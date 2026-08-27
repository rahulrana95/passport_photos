import { expect, test, type Page } from '@playwright/test';

/**
 * The upload zone, driven the way a reader drives it: a real file picker, a
 * real drag-and-drop, a real clipboard paste, in a real browser.
 *
 * jsdom cannot construct a FileList, cannot run a picker, and implements no
 * DataTransfer, so the unit suite reaches these paths through a stub. This
 * spec is what proves the stub is not lying — everything here is the browser's
 * own machinery end to end.
 */

const STORY_URL = '/iframe.html?id=upload-uploadzone--idle&viewMode=story';

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const FILE_BODY_BYTES = 512;

/** Bytes that really do start with a JPEG signature. */
const jpegBuffer = (): Buffer => {
  const bytes = Buffer.alloc(FILE_BODY_BYTES);
  Buffer.from(JPEG_HEADER).copy(bytes, 0);
  return bytes;
};

const open = async (page: Page): Promise<void> => {
  await page.goto(STORY_URL);
  await expect(page.getByText('Drop your photo here')).toBeVisible();
};

/** The container the component renders, found through the copy it owns. */
const zone = (page: Page) =>
  page.locator('div').filter({ hasText: 'Drop your photo here' }).last();

test.describe('upload zone', () => {
  test('accepts a photograph chosen from the picker', async ({ page }) => {
    await open(page);

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'passport.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer(),
    });

    // No refusal is the visible outcome of acceptance here — the story's
    // handler is a spy, so the assertion is that nothing was rejected.
    await expect(page.getByText(/cannot be read|does not look like|is empty/)).toHaveCount(0);
  });

  test('refuses a file that is not an image, and says what to do', async ({ page }) => {
    await open(page);

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not a photograph'),
    });

    await expect(page.getByText('That does not look like an image file.')).toBeVisible();
    await expect(page.getByText(/JPEG, PNG and HEIC all work/)).toBeVisible();
  });

  test('refuses an empty file with the wording for a truncated download', async ({ page }) => {
    await open(page);

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'passport.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(0),
    });

    await expect(page.getByText('That file is empty.')).toBeVisible();
  });

  test('reads only the header, so a large file does not have to be loaded', async ({ page }) => {
    await open(page);

    // Four megabytes. If the component read the whole file to sniff its format
    // this would still pass, but it would do so slowly and on the main thread;
    // what is asserted here is that a large file is handled at all.
    const large = Buffer.alloc(4 * 1024 * 1024);
    Buffer.from(JPEG_HEADER).copy(large, 0);

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'large.jpg',
      mimeType: 'image/jpeg',
      buffer: large,
    });

    await expect(page.getByText(/does not look like an image/)).toHaveCount(0);
  });

  test('highlights while a file is dragged over it and lets go when it lands', async ({ page }) => {
    await open(page);
    const target = zone(page);

    // A genuine DataTransfer, built in the page. This is the object the unit
    // suite has to stub, and the whole reason this spec exists.
    const transfer = await page.evaluateHandle(() => {
      const data = new DataTransfer();
      const bytes = new Uint8Array(512);
      bytes.set([0xff, 0xd8, 0xff, 0xe0], 0);
      data.items.add(new File([bytes], 'dragged.jpg', { type: 'image/jpeg' }));
      return data;
    });

    await target.dispatchEvent('dragenter', { dataTransfer: transfer });
    await expect(target).toHaveAttribute('data-dragging', 'true');

    await target.dispatchEvent('drop', { dataTransfer: transfer });
    await expect(target).toHaveAttribute('data-dragging', 'false');
    await expect(page.getByText(/does not look like an image/)).toHaveCount(0);
  });

  test('stays highlighted while the pointer crosses a child element', async ({ page }) => {
    await open(page);
    const target = zone(page);

    const transfer = await page.evaluateHandle(() => new DataTransfer());

    // The flicker bug in its natural habitat: entering the hint text fires
    // dragenter on the child and dragleave on the parent.
    await target.dispatchEvent('dragenter', { dataTransfer: transfer });
    await page
      .getByText('JPEG, PNG or WebP, up to 50 MB')
      .dispatchEvent('dragenter', { dataTransfer: transfer });
    await target.dispatchEvent('dragleave', { dataTransfer: transfer });

    await expect(target).toHaveAttribute('data-dragging', 'true');
  });

  test('never navigates away when a photograph is dropped outside the zone', async ({ page }) => {
    await open(page);

    // The browser's default for a dropped file is to open it, discarding the
    // page. That is a total loss of the reader's progress, and it is the
    // default everywhere on the document, not only over the drop zone.
    await page.locator('body').dispatchEvent('drop', {
      dataTransfer: await page.evaluateHandle(() => {
        const data = new DataTransfer();
        data.items.add(new File([new Uint8Array(4)], 'stray.jpg', { type: 'image/jpeg' }));
        return data;
      }),
    });

    await expect(page).toHaveURL(new RegExp('upload-uploadzone--idle'));
    await expect(page.getByText('Drop your photo here')).toBeVisible();
  });

  test('takes a photograph from the clipboard, which is the HEIC remedy', async ({ page }) => {
    await open(page);

    // Our HEIC advice is Share, Copy Photo, paste. If the paste listener is
    // not wired in a real browser, that advice sends the reader nowhere.
    await page.evaluate(() => {
      const data = new DataTransfer();
      const bytes = new Uint8Array(512);
      bytes.set([0xff, 0xd8, 0xff, 0xe0], 0);
      data.items.add(new File([bytes], 'pasted.jpg', { type: 'image/jpeg' }));
      window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    });

    await expect(page.getByText(/does not look like an image/)).toHaveCount(0);
  });

  test('refuses a pasted file that is not an image', async ({ page }) => {
    await open(page);

    // The positive paste case cannot fail visibly, so the negative one is what
    // proves the listener ran at all.
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.items.add(new File(['not a photograph'], 'notes.txt', { type: 'text/plain' }));
      window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    });

    await expect(page.getByText('That does not look like an image file.')).toBeVisible();
  });

  test('uses the first of several dropped files and says how many it passed over', async ({
    page,
  }) => {
    await open(page);

    // Dropped rather than picked, because the picker is deliberately not
    // `multiple` — one photograph is the whole product, and offering a
    // multi-select would invite a choice that gets silently narrowed to one.
    // A drop cannot be constrained that way, so this is the path that has to
    // cope, and the only place the count is ever shown.
    await zone(page).dispatchEvent('drop', {
      dataTransfer: await page.evaluateHandle(() => {
        const data = new DataTransfer();
        const bytes = new Uint8Array(512);
        bytes.set([0xff, 0xd8, 0xff, 0xe0], 0);
        data.items.add(new File([bytes], 'one.jpg', { type: 'image/jpeg' }));
        data.items.add(new File([bytes], 'two.jpg', { type: 'image/jpeg' }));
        return data;
      }),
    });

    await expect(
      page.getByText('You dropped several files. We are using the first one.'),
    ).toBeVisible();
  });

  test('does not offer a multi-select picker', async ({ page }) => {
    await open(page);

    for (const input of await page.locator('input[type="file"]').all()) {
      await expect(input).not.toHaveAttribute('multiple', /.*/);
    }
  });

  test('opens the picker from the keyboard alone', async ({ page }) => {
    await open(page);

    // The inputs are visually hidden. If that were done with `hidden` or
    // display:none — the usual shortcut — they would leave the tab order and
    // the styled labels beside them would be unreachable without a mouse.
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const active = document.activeElement as HTMLInputElement | null;
      return { tag: active?.tagName, type: active?.type };
    });

    expect(focused).toEqual({ tag: 'INPUT', type: 'file' });
  });
});
