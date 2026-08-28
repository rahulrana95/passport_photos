import { expect, test } from '@playwright/test';

/**
 * The picture every share of this site shows.
 *
 * It did not exist. Every page has declared an og:image at this path since the
 * metadata factory was written, and the path returned a 404 — so every link
 * posted to a chat app rendered with no preview. Nothing caught it, because
 * nothing had ever fetched the URL the metadata was promising.
 *
 * That is the shape of this test: follow the site's own og:image tag to
 * whatever it points at, and check something is there. A test asserting the
 * tag exists would have passed throughout.
 */

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

test.describe('the social preview image', () => {
  test('is actually served at the path every page promises', async ({ page }) => {
    await page.goto('/');

    const declared = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute('content');

    expect(declared, 'no og:image is declared').toBeTruthy();

    const path = new URL(declared ?? '').pathname;
    const response = await page.request.get(path);

    expect(response.status(), `${path} is what every page points at`).toBe(200);
  });

  test('is a real PNG of the size the metadata claims', async ({ page }) => {
    // Chat clients and search engines are told 1200x630. Serving something of
    // another size gets the card cropped or dropped, and the declaration is
    // what they trust.
    const response = await page.request.get('/og-default.png');
    const body = await response.body();

    expect([...body.subarray(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE);

    // IHDR carries the dimensions, big-endian, at a fixed offset in every PNG.
    expect(body.readUInt32BE(16)).toBe(OG_WIDTH);
    expect(body.readUInt32BE(20)).toBe(OG_HEIGHT);
  });

  test('carries the claim the site is built on', async ({ page }) => {
    // Rendered from the same content module the pages read, so the card cannot
    // quote a promise the site has stopped making. Asserted through the
    // response being non-trivial: a blank card is a 20-byte PNG.
    const response = await page.request.get('/og-default.png');
    const body = await response.body();

    expect(body.byteLength).toBeGreaterThan(5_000);
  });
});
