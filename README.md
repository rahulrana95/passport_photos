# Passport Photo Checker

A passport and visa photo compliance checker that runs entirely in the browser.

**We measure. We do not retouch.** Since 1 January 2026 the US automatically
flags photos touched by AI background replacement, face retouching or filters
before a human reviewer sees them. Tools that "enhance" a photo now risk causing
the rejection they promise to prevent. This one measures the photo against the
issuing authority's published specification and tells you what to change.

**Your face never leaves your device.** A passport photo is biometric data —
special-category data under GDPR Article 9. Nothing here is uploaded. You can
verify that yourself in the browser's network tab.

---

## Non-negotiables

| Rule | Why |
|------|-----|
| No server-side processing | Biometric data. The trust position collapses the moment one photo is uploaded. |
| No retouching, smoothing or beautification | Actively causes rejections under the 2026 US rules. |
| No accounts, no stored photos | No reason to exist, every reason not to. |
| Never claim guaranteed acceptance | We check against the published spec; the authority decides. |
| Every spec carries a source URL and a verification date | A silently stale requirement is worse than no requirement. |
| SEO is an acceptance criterion, not a follow-up | The product reaches people through search or not at all. |

## Working on this

1. Read `tasks.todo`. It is the single source of delivery truth.
2. One task is one PR. Branch fresh from `main` every time.
3. Do not start task N+1 until task N is merged.
4. Read `CONTRIBUTING.md` before your first PR — the standards are enforced by
   CI, not by reviewers.

## Stack

Next.js 16 (App Router, SSG) · TypeScript strict · Tailwind CSS 4 ·
MediaPipe Tasks Vision (WASM) · mozjpeg via jSquash (WASM) ·
Vitest + React Testing Library · Playwright · Storybook 8 · MSW
