## Task

Implements **PR #\<n\>** from `tasks.todo`.

Depends on: #\<n-1\> (merged)

## What this does

<!-- One paragraph. What changed and why. -->

## Implements

<!-- Copy the IMPLEMENTS checklist from tasks.todo and tick what landed. -->

## Edge cases covered

<!-- Copy the EDGE CASES checklist from tasks.todo. Tick what is handled and
     tested. For anything not handled, say so explicitly and why. -->

## SEO checklist

- [ ] Route is statically generated (or ISR) — nothing that should rank is client-only
- [ ] Unique `<title>` and meta description
- [ ] Canonical URL correct and absolute
- [ ] OG and Twitter tags present
- [ ] Structured data added and schema-validated
- [ ] All new navigation uses real `<a href>`
- [ ] Content that should rank is present in the server-rendered HTML
- [ ] Lighthouse budgets still pass (LCP < 1.2s, CLS < 0.1, TBT < 200ms)
- [ ] N/A — this PR touches no routes

## Definition of done

- [ ] `typecheck` clean
- [ ] `lint` clean
- [ ] Unit coverage 100% (statements, branches, functions, lines)
- [ ] Storybook stories for every new state
- [ ] Screenshot diffs reviewed
- [ ] Integration tests green
- [ ] axe clean
- [ ] `tasks.todo` updated

## Product invariants

- [ ] No user image leaves the device
- [ ] No retouching, smoothing or beautification added
- [ ] No copy implies guaranteed acceptance
- [ ] No hardcoded colours, numbers, routes or copy introduced
