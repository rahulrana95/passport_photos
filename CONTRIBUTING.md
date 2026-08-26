# Contributing

These rules are enforced in CI. A reviewer should never have to ask for any of
them.

## Branching

```bash
git checkout main && git pull
git checkout -b <type>/<slug>
```

- One task from `tasks.todo` = one PR.
- A PR is **never** branched from another PR. If yours depends on unmerged work,
  wait for the merge.
- Squash-merge only. Linear history. Branch deleted on merge.

## TypeScript

`strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`.

- `any` is a lint error.
- `as` casts are a lint error outside `*.test.ts`.
- Every exported function has an explicit return type.
- `@ts-expect-error` requires a linked issue in the comment.

## File layout

One thing per file.

```
ResultRow.tsx          # the component, and nothing else
ResultRow.types.ts     # props and domain types
ResultRow.test.tsx     # unit + axe
ResultRow.stories.tsx  # every meaningful state
```

Banned filenames: `utils.ts`, `types.ts`, `helpers.ts`, and barrel `index.ts`
re-export files. Name things for what they hold: `measurement.utils.ts`,
`photo-spec.types.ts`.

## No hardcoded values

| Never | Instead |
|-------|---------|
| A colour literal in a component | A semantic CSS custom property |
| A magic number | A named export in `*.constants.ts`, with units in the name |
| A route string | A typed builder from `routes.constants.ts` |
| A copy string in JSX | A key from the content module |

Custom ESLint rules `no-raw-color`, `no-magic-number` and `no-literal-route`
fail the build.

## CSS

All tokens live in `src/styles/tokens.css`; Tailwind reads them through
`@theme inline`. Components compose utilities built from those tokens.

No `dark:` prefixes — theming swaps CSS variables on a `data-theme` attribute.
Remember there are **three** theme states: explicit light, explicit dark, and
the unstamped system default. A token defined only inside a `[data-theme]`
block will not apply in the third.

Print styles live in `src/styles/print.css`. This product gets printed.

## Testing

Every PR ships all four:

| Layer | Tool | Bar |
|-------|------|-----|
| Unit | Vitest + RTL | 100% statements, branches, functions, lines |
| Accessibility | axe-core, in every component test | Zero violations |
| Visual | Storybook 8 + `@storybook/test-runner` | A story per meaningful state; screenshot diffs fail CI |
| Integration | Playwright | Desktop and mobile viewports |

**Mocking.** This product has no backend API, so the thing that needs mocking is
the Web Worker and the MediaPipe model layer — not HTTP. PR #10 introduces a
detector interface with a deterministic fixture-driven fake, injected by a
Vitest setup file and a Storybook decorator. MSW covers the few real network
calls (the model CDN).

100% branch coverage on GPU-versus-CPU fallback paths is only reachable because
of that fake layer. A genuinely unreachable branch needs `/* c8 ignore */` **with
a comment explaining why**. Bare ignores get rejected.

## SEO

Every PR that touches a route ticks the SEO section of the PR template.

- Statically generated. Nothing that should rank may be client-only.
- Unique title, meta description, canonical, OG and Twitter tags.
- Navigation is real `<a href>`. No JS-only crawlable links.
- Structured data is schema-validated in CI.
- Lighthouse budgets: LCP < 1.2s, CLS < 0.1, TBT < 200ms.

## Definition of done

- [ ] `typecheck` clean
- [ ] `lint` clean
- [ ] Unit coverage at 100%
- [ ] Stories added for every new state
- [ ] Screenshot diffs reviewed
- [ ] Integration tests green
- [ ] axe clean
- [ ] SEO checklist ticked
- [ ] Lighthouse budgets pass
- [ ] `tasks.todo` status updated
