import { expect, test, type Page } from '@playwright/test';

/**
 * The panel driven the way a reader drives it, in a real browser.
 *
 * The unit suite reaches these paths through a stubbed FileList and a fake
 * decoder; this is what proves the stubs are not lying about the browser's own
 * machinery — a real picker, a real DataTransfer, real React state moving from
 * waiting to answered.
 *
 * The story injects a decoder and an analysis, so nothing here downloads a
 * model. The real engine has its own spec, against the real page.
 */

const STORY_URL = '/iframe.html?id=checker-checkerpanel--waiting&viewMode=story';

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const FILE_BODY_BYTES = 512;
const RESTART_LABEL = 'Check another photo';

const jpegBuffer = (): Buffer => {
  const bytes = Buffer.alloc(FILE_BODY_BYTES);
  Buffer.from(JPEG_HEADER).copy(bytes, 0);
  return bytes;
};

const open = async (page: Page): Promise<void> => {
  await page.goto(STORY_URL);
  await expect(page.getByText('Drop your photo here')).toBeVisible();
};

const choosePhoto = async (page: Page): Promise<void> => {
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'passport.jpg',
    mimeType: 'image/jpeg',
    buffer: jpegBuffer(),
  });
};

test.describe('checker panel', () => {
  test('turns a chosen photograph into an answer', async ({ page }) => {
    await open(page);

    await choosePhoto(page);

    // The restart control exists in exactly one state: the answered one.
    await expect(page.getByText(RESTART_LABEL)).toBeVisible();
  });

  test('replaces the dropzone with the answer rather than stacking them', async ({ page }) => {
    await open(page);

    await choosePhoto(page);
    await expect(page.getByText(RESTART_LABEL)).toBeVisible();

    // Two ways to start a check, one above the other, is two ways to be
    // confused about which photograph the answer on screen belongs to.
    await expect(page.getByText('Drop your photo here')).toHaveCount(0);
  });

  test('goes back to waiting when the reader starts over', async ({ page }) => {
    await open(page);

    await choosePhoto(page);
    await page.getByText(RESTART_LABEL).click();

    await expect(page.getByText('Drop your photo here')).toBeVisible();
    await expect(page.getByText(RESTART_LABEL)).toHaveCount(0);
  });

  test('checks against the document the reader picked', async ({ page }) => {
    await open(page);

    // Clicked by its label, which is what a reader clicks: the radio itself
    // sits underneath it, styled out of the way.
    await page.getByText('United Kingdom Passport').click();
    await choosePhoto(page);

    await expect(page.getByText(RESTART_LABEL)).toBeVisible();
    await expect(page.getByLabel('United Kingdom Passport')).toBeChecked();
  });
});
