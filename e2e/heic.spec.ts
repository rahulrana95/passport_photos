import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * HEIC support, checked in a real browser.
 *
 * The interesting risk here is not whether libheif can decode HEIC — that is
 * its entire job — but whether the lazily imported WebAssembly survives the
 * bundler at all. This project has already shipped one feature that passed
 * every unit test and was dead in the browser because a module was not built
 * the way the code assumed, and the only thing that catches that class of bug
 * is loading the real thing from the real build.
 */

const PAGE_PATH = '/passport-photo-checker';
const CHUNK_DIR = '.next/static/chunks';
const CHUNK_TIMEOUT_MS = 30_000;

/**
 * The built chunk libheif ended up in, found rather than hard-coded.
 *
 * Its name is a content hash and changes on every build, so the test reads the
 * build output the same way the SEO assertions do. Identified by size as well
 * as by content: our own loader module mentions HeifDecoder too, and it is the
 * megabyte-and-a-half one that matters here.
 */
const LIBHEIF_CHUNK_MIN_BYTES = 500_000;

const libheifChunk = async (): Promise<string> => {
  const names = await readdir(CHUNK_DIR);

  for (const name of names) {
    if (!name.endsWith('.js')) continue;

    const contents = await readFile(join(CHUNK_DIR, name), 'utf8');
    if (contents.length > LIBHEIF_CHUNK_MIN_BYTES && contents.includes('HeifDecoder')) {
      return name;
    }
  }
  throw new Error('No libheif chunk in the build. Did the dynamic import get dropped?');
};

/**
 * A file that is a HEIC as far as identification goes, written here rather
 * than checked in.
 *
 * An ISO base media file names its brand at offset 8, and 'heic' there is what
 * the sniffer keys on. It carries no image, deliberately: a real HEIC would
 * mean committing somebody else's photograph under a licence this repository
 * has not established, and what these tests need is the routing decision, not
 * a picture.
 */
const heicHeader = (): Buffer => {
  const box = Buffer.alloc(32);
  box.writeUInt32BE(32, 0);
  box.write('ftyp', 4, 'ascii');
  box.write('heic', 8, 'ascii');
  box.write('mif1', 16, 'ascii');
  return box;
};

test.describe('HEIC photographs', () => {
  test('the decoder is not shipped to anyone who does not need it', async ({ page }) => {
    // A megabyte and a half. If it were in the initial payload it would be
    // the largest thing on a page whose whole budget is a fast first paint,
    // and it would be paid for by every reader who uploads a JPEG.
    const chunk = await libheifChunk();
    const requested: string[] = [];
    page.on('request', (request) => { requested.push(request.url()); });

    await page.goto(PAGE_PATH);
    await page.getByText('Drop your photo here').waitFor();

    expect(requested.some((url) => url.includes(chunk))).toBe(false);
  });

  test('the decoder loads when a HEIC actually arrives', async ({ page }) => {
    // The bundler question, asked through the application's own code path
    // rather than a synthetic import. This project has already shipped one
    // feature that passed every unit test and was dead in the browser because
    // a module was not built the way the code assumed.
    const chunk = await libheifChunk();
    await page.goto(PAGE_PATH);
    await page.getByText('Drop your photo here').waitFor();

    const loaded = page.waitForResponse(
      (response) => response.url().includes(chunk) && response.status() === 200,
      { timeout: CHUNK_TIMEOUT_MS },
    );

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'photo.heic',
      mimeType: 'image/heic',
      buffer: heicHeader(),
    });

    await expect(loaded).resolves.toBeTruthy();
  });

  test('a HEIC is no longer refused before anything has tried to read it', async ({ page }) => {
    // The behaviour that changed. HEIC used to be rejected on sight, on every
    // browser including the ones that open it natively, with "this browser
    // cannot open HEIC photos". Whatever this file produces, it must not be
    // that: the pipeline has to have attempted the decode.
    await page.goto(PAGE_PATH);

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'photo.heic',
      mimeType: 'image/heic',
      buffer: heicHeader(),
    });

    await expect(page.getByText('cannot open HEIC')).toHaveCount(0);
  });

  test('the picker offers HEIC, which is where iPhone photos are', async ({ page }) => {
    await page.goto(PAGE_PATH);

    const accept = await page
      .locator('input[type="file"]')
      .first()
      .getAttribute('accept');

    expect(accept).toContain('image/heic');
  });
});
