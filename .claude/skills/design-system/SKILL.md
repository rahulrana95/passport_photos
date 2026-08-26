---
name: design-system
description: The visual rules for this product — tokens, spacing, type, colour, component anatomy, and the Mantine-versus-plain-HTML boundary. Load before writing or changing ANY UI: a component, a page, a stylesheet, a token, or anything with a className. Also load when reviewing UI for consistency, or when a value like a padding, width, colour or font size is about to be chosen.
---

# Design system

## The thesis: an instrument, not an app

This product answers one anxious question — *will my document be accepted?* — about a government submission that costs money and time to get wrong.

So it should feel like a **precision instrument**: calm, exact, quietly authoritative. The reference points are Stripe's documentation, Linear's density, and a well-set official form. Not a consumer app.

Concretely, that means:

| Do | Don't |
|----|-------|
| Let neutrals carry the page | Reach for the accent to create interest |
| Let **type** create hierarchy | Create hierarchy with boxes and colour |
| Hairline 1px borders | Shadows on everything |
| Dense but breathable | Generous whitespace as a substitute for structure |
| One accent, used rarely | A palette of decorative colours |
| Motion only on state change | Decorative animation, ever |

If a screen looks like it could belong to a marketing site, it is wrong for this product.

## Never write a raw value

Every colour, space, size, radius, shadow and duration comes from a token in
`src/styles/tokens.css`. This is enforced: `stylelint` rejects a hex literal
outside the token layer, and `eslint` rejects a bare number.

```css
/* NO */                          /* YES */
padding: 12px;                    padding: var(--tk-space-xs);
color: #3b4e4a;                   color: var(--tk-text-secondary);
border-radius: 6px;               border-radius: var(--tk-radius-md);
transition: all 0.2s;             transition: color var(--tk-duration-base) var(--tk-easing-standard);
```

Need a value the scale doesn't have? **The scale is probably right and the design is wrong.** Adding a token is a deliberate act: add it to `tokens.css`, register it in `design-tokens.constants.ts`, and the parity test will hold you to defining it in all three theme states.

## Spacing — a 4px grid, no exceptions

| Token | Value | Use for |
|-------|-------|---------|
| `--tk-space-3xs` | 4px | Icon-to-label, tight inline pairs |
| `--tk-space-2xs` | 8px | Inside a control; between tightly-related lines |
| `--tk-space-xs` | 12px | Cell padding, compact card padding |
| `--tk-space-sm` | 16px | Standard card padding; between sibling fields |
| `--tk-space-md` | 24px | Between distinct groups within a section |
| `--tk-space-lg` | 32px | Between sections |
| `--tk-space-xl` | 48px | Page-level blocks |
| `--tk-space-2xl` | 64px | Above and below a page |

**Two rules that matter more than the table:**

1. **Space belongs to the parent, not the child.** Lay siblings out with `display: flex; gap:` — never with margins on each child. Margins collapse, double, and drift; `gap` cannot.
2. **Proximity encodes relationship.** Two things 8px apart read as one thing; 24px apart read as two. If a label looks detached from its field, the spacing is lying about the structure.

## Type — the hierarchy engine

| Token | Size | Use |
|-------|------|-----|
| `--tk-text-xs` | 12px | Metadata, provenance, captions |
| `--tk-text-sm` | 14px | Dense UI, table cells, secondary body |
| `--tk-text-md` | 16px | Body. The default. |
| `--tk-text-lg` | 18px | Lead paragraph, section intro |
| `--tk-text-xl` | 24px | Section heading (h2) |
| `--tk-text-2xl` | 32px | Page heading on mobile |
| `--tk-text-3xl` | 44px | Page heading on desktop |

- **Line height**: 1.1–1.2 for headings, 1.5 for dense UI, 1.6–1.65 for reading.
- **Measure**: body text never exceeds `var(--tk-measure)` (68ch). Long lines are the most common readability failure and the easiest to fix.
- **`text-wrap: balance`** on every heading. Free, and it removes orphaned words.
- **Weight, not size**, for small distinctions. 600 against 400 at the same size separates a label from its value more cleanly than bumping a step.
- **Tighten as you go up.** `letter-spacing: -0.02em` at 44px; none below 24px.

## Colour — the accent is a scarce resource

**Neutrals do the work.** `--tk-surface` on `--tk-ground`, separated by
`--tk-border-default`. That is the whole page.

The accent (`--tk-accent`) appears in exactly four places:
1. Links in prose
2. The single primary action on a screen
3. Focus rings
4. The active state of a control

**Never** as a background for a decorative panel, a heading colour, or an icon that isn't interactive.

**Status colours are not decoration.** `--tk-status-pass/warn/fail/manual` mean a rule outcome and nothing else. And they are never the only signal — see `ui-craft`, which is not negotiable here: under `forced-colors` every one of them collapses to `CanvasText`.

**Text colour is a three-step hierarchy**, not a gradient:
`--tk-text-primary` for content · `--tk-text-secondary` for supporting · `--tk-text-tertiary` for metadata. If you want a fourth, you want a different size or weight instead.

## Borders, radius, elevation

- **1px borders, `--tk-border-default`.** Separation by border, not by shadow.
- **Radius**: `--tk-radius-sm` (2px) for inline chips and swatches, `--tk-radius-md` (6px) for cards, rows, inputs and buttons, `--tk-radius-lg` (12px) for modals only. Never mix radii inside one component.
- **Shadows are for things that float**: dropdowns, popovers, modals. A card sitting in the page uses a border. `--tk-shadow-sm` is for a raised control, `--tk-shadow-md` for a true overlay. Nothing else.

## Motion

`--tk-duration-fast` (120ms) for hover and focus. `--tk-duration-base` (200ms) for a panel appearing. Always `--tk-easing-standard`.

Animate `color`, `background`, `border-color`, `opacity`, `transform`. **Never `all`** — it animates properties you did not intend, including layout.

`prefers-reduced-motion` is already handled globally. Do not re-implement it per component.

## Layout

- Page container: `max-inline-size: var(--tk-container-max)` (72rem), `margin-inline: auto`, `padding-inline: var(--tk-space-sm)`.
- Reading column: `var(--tk-measure)`.
- Grids use `repeat(auto-fill, minmax(<min>, 1fr))` so they reflow without media queries. Reach for a breakpoint only when the *layout concept* changes, not to adjust a number.
- Breakpoints are Mantine's: 36 / 48 / 62 / 75 / 88em. Use `@media (width <= 48em)` range syntax.

## Mantine or plain HTML

This decision is load-bearing for both performance and SEO. Mantine components are Client Components; using one for static text ships a hydration bundle for content that never changes.

| Use Mantine | Use plain semantic HTML + CSS Modules |
|-------------|----------------------------------------|
| The checker tool: dropzone, modal, tabs, combobox, progress, buttons | Headings, body copy, requirements tables, breadcrumbs, footer links |
| Anything with real interactive state | Anything a crawler needs to read |

Two hard rules that follow:
- **FAQs are native `<details>/<summary>`**, never a JS accordion. The answers are ranking content and feed the FAQPage structured data.
- **Navigation is real `<a href>`**, never a `Select` that navigates on change.

## Themes — there are three states, not two

1. Explicit light — `[data-mantine-color-scheme='light']`
2. Explicit dark — `[data-mantine-color-scheme='dark']`
3. **System default — no attribute at all**, only `prefers-color-scheme`

A token defined *only* inside an attribute selector is invisible in state 3, and the page renders one theme's text on the other theme's background. `tokens-parity.test.ts` enforces this. Never write `dark:`-style conditionals in a component; the theme swaps variables, components never know which theme they are in.

## Before you commit

- [ ] No raw colour, size, space, radius or duration anywhere
- [ ] Sibling spacing uses `gap`, not child margins
- [ ] Every heading has `text-wrap: balance`
- [ ] Body text is inside a measure constraint
- [ ] The accent appears only in its four permitted roles
- [ ] Borders separate; shadows only float
- [ ] Wide content scrolls in its own container — the page body never scrolls sideways
- [ ] `npm run test:visual` reviewed, not just passed
