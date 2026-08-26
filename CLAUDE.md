# Agent protocol

## Read this first, every session

0. **Any UI work — a component, a page, a stylesheet, a token, anything with a
   className — starts by loading the `design-system` skill, and ends by loading
   `ui-craft`.** They are in `.claude/skills/`. The lint rules catch violations
   of the token system; the skills carry the judgement the linter cannot.
1. Read `tasks.todo`. It is the single source of delivery truth.
2. Identify the lowest-numbered task with status `TODO`.
3. Confirm the previous task is **merged** before starting. Never stack PRs.
4. Read `CONTRIBUTING.md` for the standards. They are enforced by CI.

## Rules that override default behaviour

- **One task, one PR.** Branch fresh from `main`. Never branch from a branch.
- **Never start task N+1 while task N is open.** If N is blocked, say so and stop.
- **Propose before building** on anything not already specified in `tasks.todo`.
  A task's edge-case list is the spec; if reality differs from it, raise that
  first rather than improvising.
- **Update `tasks.todo`** in the same PR: tick the boxes you completed, and add
  any edge case you discovered that the list missed.

## Product invariants — never violate these

- No server-side processing of user images. Ever.
- No face retouching, smoothing or beautification.
- No accounts, no uploads, no stored photos.
- Never emit copy claiming guaranteed acceptance.
- Every `PhotoSpec` carries a `source` URL and a `lastVerified` date.
- No hardcoded colours, numbers, routes or copy anywhere.

## Definition of done

A task is done when CI is green on all of: typecheck, lint, 100% unit coverage,
storybook build, screenshot diffs, Playwright, axe, and the Lighthouse budgets.
