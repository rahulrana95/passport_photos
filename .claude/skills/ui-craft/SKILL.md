---
name: ui-craft
description: The refinement standard — how to make an interface look designed rather than assembled. Load after a component renders correctly but before it ships, when reviewing UI quality, when something "looks off" but it is not obvious why, or when asked to polish, refine, or improve the look and feel. Covers optical alignment, spacing rhythm, state coverage, contrast, focus, density and the failure modes that make interfaces read as amateur.
---

# UI craft

`design-system` says which values to use. This says whether the result is any good.

Most interfaces that "look unprofessional" are not badly styled — they are **inconsistent**. The eye detects a 2px difference between two things that should match long before anyone can name what is wrong.

## The one question

> **Does this look designed, or does it look assembled?**

Assembled means each piece was styled when it was written. Designed means the pieces share a rhythm. The tests below are how you tell the difference.

## Test 1 — the spacing audit

Take a screenshot and measure every vertical gap. Write the numbers down.

A designed screen produces a short list: `8, 16, 24, 32`. An assembled one produces `8, 14, 16, 20, 24, 25, 32`. **Every value not on the scale is a bug**, even when it looks fine on its own — it costs you the rhythm that makes the whole thing feel intentional.

Same for horizontal padding. If a card is `16px` and the row inside it is `12px` and the table cell is `14px`, that is three near-identical values doing one job.

## Test 2 — optical alignment beats mathematical alignment

Maths and eyes disagree, and the eye wins.

- **Icons next to text** sit ~1px high when vertically centred, because text has descenders and an icon does not. Nudge, then look.
- **Round shapes** need slightly more size than square ones to read as equal weight.
- **Punctuation and quotes** should hang outside the text block, not indent it.
- **Optical padding is asymmetric.** A button with a leading icon needs less left padding than right, or it looks lopsided.

If two things are meant to align, put a straightedge on the screenshot. They usually do not.

## Test 3 — every state, not just the happy one

A component is not finished until all of these exist and have been *looked at*:

| State | The question |
|-------|--------------|
| Empty | Does it explain what goes here, or just show nothing? |
| Loading | Does it reserve the final layout's height? (see CLS below) |
| Error | Does it say what to do, or only what broke? |
| Partial | One item, and three hundred items |
| Long content | A 90-character label. A word with no spaces. |
| Narrow | 320px, the smallest phone still in use |
| Dark | Not an inversion — genuinely re-checked |
| Focused | Visible ring, in **both** themes |
| Reduced motion | Nothing moves |
| Forced colours | Still legible with the palette stripped |

**Zero CLS is a design constraint, not a performance one.** A skeleton must match the real content's dimensions exactly. If the page jumps when data arrives, the skeleton was decorative rather than structural.

## Test 4 — colour is never the only signal

Roughly one in twelve men cannot separate red from green, and under Windows High Contrast every status colour in this product collapses to `CanvasText`.

So a status must carry **shape and words** as well as hue: a distinct icon, and a text label. This is already enforced for `RuleResultRow` by a test asserting all five statuses render visually distinct icons. Hold anything new to the same bar.

## Test 5 — contrast, actually measured

- Body text: **4.5:1** minimum against its own background
- Large text (24px+ or 18px bold): **3:1**
- Interactive borders and focus rings: **3:1**
- Disabled text is allowed to fail — but then it must not be the only way to convey the state

Check in **both** themes. Dark mode fails far more often, because a colour chosen against white rarely survives against near-black.

## Test 6 — the density question

This product is information-dense by nature: requirement tables, rule results, measurement values. Dense is correct. Cramped is not.

The difference is **grouping**. Dense content with clear groups reads fast; the same content evenly spaced reads as a wall. Use the proximity rule from `design-system`: tight within a group, one full step between groups.

Signs you have crossed from dense into cramped:
- Text touching a border
- Two interactive targets under 8px apart
- A tap target under 44×44px
- No visual rest between distinct groups

## What makes UI look amateur

Each of these is individually small. Together they are the whole difference.

1. **Inconsistent radii** — 4px here, 8px there, 6px in a third place
2. **Shadows doing a border's job** — everything floating, nothing anchored
3. **Too many type sizes** — five weights and seven sizes on one screen
4. **The accent used for decoration** rather than for meaning
5. **Uneven optical spacing** — mathematically equal, visually not
6. **Default focus rings**, or worse, `outline: none` with no replacement
7. **Text at full container width** — 120-character lines
8. **Borders that are almost but not quite the same colour**
9. **Icons at mismatched sizes** — 16, 18 and 20 in one row
10. **Transitions on `all`** — things moving that should not

## Prose that is part of the design

Words are design material here, not filler.

- **Errors name an action**, not just a fault. "That file is too large" leaves the reader stuck; "That file is larger than 50 MB — export it at a smaller size and drop it in again" does not. This is enforced by a test over the content module.
- **Controls say what happens.** "Check photo", then a result — not "Submit".
- **Never claim acceptance.** Product invariant, tested. "Meets the published requirements", never "will pass".
- **Numbers carry units and are locale-formatted.** Never `${value}mm` — that emits the wrong decimal separator for most of Europe.

## The review pass

Before a UI PR is ready:

1. Open the story in Storybook, **both themes**, both viewports
2. Run the spacing audit — write the numbers down
3. Put a straightedge on anything that should align
4. Tab through it. Can you reach and see everything?
5. Resize to 320px. Does anything overflow?
6. Read the copy aloud. Does it sound like a person?
7. `npm run test:visual` — then **actually look at the screenshots**, do not just note that they passed
8. Compare against the neighbouring component. Do they look like the same product?

Step 8 is the one people skip, and it is where consistency is actually won or lost.
