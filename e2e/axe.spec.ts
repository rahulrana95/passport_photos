import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';

/**
 * axe, on whole pages, in a real browser.
 *
 * There was already axe here, and it ran on components in jsdom. That catches
 * a component with a missing label; it cannot catch what happens when the
 * components are put together on a page, because in jsdom they never are.
 *
 * The heading-order defect on every country page is the worked example: each
 * component was individually fine, the composition jumped h1 to h3, and the
 * only thing that noticed was a Lighthouse run over a route. This closes that
 * gap directly rather than relying on Lighthouse's accessibility score, which
 * reports a number where this reports the rule and the element.
 */

const require = createRequire(import.meta.url);

const ROUTES = [
  '/',
  '/passport-photo-checker',
  '/us/passport-photo',
  '/germany/passport-photo',
  '/35x45mm-photo',
  '/why-was-my-passport-photo-rejected',
  '/passport-photo-head-size',
  '/passport-photo-background-check',
];

/**
 * WCAG 2.2 AA, which is the level a public service is held to.
 *
 * Named explicitly rather than left to axe's defaults: the default set moves
 * between releases, and a suite that silently starts checking more or less
 * than it did yesterday is one nobody can reason about.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Anything under a millisecond is the global override, not an animation. */
const REDUCED_MOTION_CEILING_S = 0.001;

interface AxeViolation {
  readonly id: string;
  readonly help: string;
  readonly impact: string | null;
  readonly nodes: readonly { readonly target: readonly string[] }[];
}

const axeSource = async (): Promise<string> =>
  readFile(require.resolve('axe-core'), 'utf8');

/**
 * Loads the route in the given scheme and reports what axe finds.
 *
 * The scheme is set BEFORE navigating, which is not a detail. Setting it after
 * a load makes the page swap themes while axe is sampling, and contrast is
 * then computed against a half-applied palette — dark text still, light
 * background already. That produced a colour-contrast violation on roughly one
 * run in two, which looks exactly like a real intermittent defect and is
 * entirely the test's fault. It is also what a real reader does: they arrive
 * with their preference already set.
 */
const violationsOn = async (
  page: Page,
  route: string,
  theme: 'light' | 'dark',
): Promise<readonly AxeViolation[]> => {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  await page.addScriptTag({ content: await axeSource() });

  return page.evaluate(async (tags) => {
    const runner = (globalThis as unknown as { axe: { run: (ctx: unknown, o: unknown) => Promise<{ violations: AxeViolation[] }> } }).axe;
    const results = await runner.run(document, { runOnly: { type: 'tag', values: tags } });
    return results.violations;
  }, TAGS);
};

const describeViolations = (violations: readonly AxeViolation[]): string =>
  violations
    .map((v) => `[${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n    at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    .join('\n');

test.describe('accessibility', () => {
  for (const route of ROUTES) {
    test(`has no violations on ${route}`, async ({ page }) => {
      const violations = await violationsOn(page, route, 'light');

      expect(violations.length, `${route}\n${describeViolations(violations)}`).toBe(0);
    });
  }

  test('has no violations in dark mode either', async ({ page }) => {
    // Contrast is the rule that differs between themes, and a token that works
    // on one background can fail on the other. Checked on the two pages that
    // carry the most colour: verdicts, difficulty badges, callouts.
    for (const route of ['/us/passport-photo', '/why-was-my-passport-photo-rejected']) {
      const violations = await violationsOn(page, route, 'dark');

      expect(violations.length, `${route} (dark)\n${describeViolations(violations)}`).toBe(0);
    }
  });

  test('survives forced-colors mode', async ({ page }) => {
    // Windows high contrast, and the reason it gets its own test: it throws
    // away the palette entirely. Anything that carried meaning through a
    // background colour alone — a verdict, a difficulty badge, a callout —
    // becomes indistinguishable, and a control drawn with no border becomes
    // invisible rather than merely plain.
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/us/passport-photo');
    await page.waitForLoadState('networkidle');

    // The controls a reader needs must still be there to see and to press.
    await expect(page.getByText('Drop your photo here')).toBeVisible();
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
    await expect(page.locator('table').first()).toBeVisible();

    await page.addScriptTag({ content: await axeSource() });
    const violations = await page.evaluate(async (tags) => {
      const runner = (globalThis as unknown as { axe: { run: (ctx: unknown, o: unknown) => Promise<{ violations: AxeViolation[] }> } }).axe;
      return (await runner.run(document, { runOnly: { type: 'tag', values: tags } })).violations;
    }, TAGS);

    expect(violations.length, `forced colors\n${describeViolations(violations)}`).toBe(0);
  });


  test('honours a request for reduced motion', async ({ page }) => {
    // There is a global override in globals.css. What this checks is that it
    // APPLIES — a rule scoped a level too deep, or beaten by a more specific
    // selector on a component, would still read correctly in the stylesheet
    // while every transition kept running.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/us/passport-photo');

    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('a, button, [class*="card"], [class*="Card"]')]
        .slice(0, 30)
        .map((node) => getComputedStyle(node).transitionDuration)
        .filter((value) => value !== ''),
    );

    expect(durations.length, 'nothing on the page was checked').toBeGreaterThan(0);
    for (const duration of durations) {
      // Parsed rather than matched against a shape. The override sets 0.01ms
      // and the engine reports it as "1e-05s" — which is the rule landing, and
      // which a pattern written for "0s" calls a failure.
      expect(
        Number.parseFloat(duration),
        `a transition survived prefers-reduced-motion: ${duration}`,
      ).toBeLessThan(REDUCED_MOTION_CEILING_S);
    }
  });

});
