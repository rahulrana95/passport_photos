import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Captures every Storybook story as an image, in every theme and at every
 * viewport we support.
 *
 * The story list is read from the built index rather than hand-maintained, so a
 * new component cannot be added without its screenshots appearing — which was
 * the gap this suite exists to close.
 */

interface StorybookIndexEntry {
  readonly id: string;
  readonly title: string;
  readonly name: string;
  readonly type: string;
}

interface StorybookIndex {
  readonly entries: Record<string, StorybookIndexEntry>;
}

const index = JSON.parse(
  readFileSync(resolve(process.cwd(), 'storybook-static/index.json'), 'utf8'),
) as StorybookIndex;

const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');

const VARIANTS = [
  { name: 'desktop-light', colorScheme: 'light', width: 1280, height: 800 },
  { name: 'desktop-dark', colorScheme: 'dark', width: 1280, height: 800 },
  { name: 'mobile-light', colorScheme: 'light', width: 390, height: 844 },
] as const;

/** Turns a story title into a directory name: "Content/FaqList" -> "content-faqlist". */
const folderFor = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const settle = async (page: Page): Promise<void> => {
  // Animations, transitions and caret blink all produce pixel differences that
  // have nothing to do with the change under review.
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }`,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.readyState === 'complete');
};

test.describe('story screenshots', () => {
  test('the built Storybook contains stories to capture', () => {
    // Without this, an empty index would let the whole suite pass vacuously.
    expect(stories.length).toBeGreaterThan(0);
  });

  for (const story of stories) {
    for (const variant of VARIANTS) {
      test(`${story.title} · ${story.name} · ${variant.name}`, async ({ page }) => {
        await page.setViewportSize({ width: variant.width, height: variant.height });
        await page.goto(
          `/iframe.html?id=${story.id}&viewMode=story&globals=colorScheme:${variant.colorScheme}`,
        );

        const root = page.locator('#storybook-root');
        await root.waitFor({ state: 'visible' });
        await settle(page);

        await expect(root).toHaveScreenshot(
          [folderFor(story.title), `${folderFor(story.name)}-${variant.name}.png`],
          { animations: 'disabled' },
        );
      });
    }
  }
});
