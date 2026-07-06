# Spec: EPMCDME-13249 — Fix in-progress color contrast under custom theme

## Problem

When any custom theme preset is active, the `--colors-in-progress-primary`,
`--colors-in-progress-secondary`, and `--colors-in-progress-tertiary` CSS variables all
receive the same RGB channel string. `mapRule('accentColor', [...])` in
`src/utils/customAppearance/rules.ts` maps the raw accent hex to all three vars
simultaneously. Components that combine `bg-in-progress-tertiary text-in-progress-primary`
(the Intermediate badge on AI Katas cards, category tags in MCPs management, StatusBadge,
and 15+ other consumers) render unreadable text because the background and text colors are
identical.

The base (non-custom) theme is unaffected because it sets each tier to a distinct
blue family value via `tailwind.config.ts`.

## Solution

Remove `--colors-in-progress-primary`, `--colors-in-progress-secondary`, and
`--colors-in-progress-tertiary` from the `mapRule('accentColor', [...])` array and replace
them with a single §2-style derive rule that generates a proper three-tier color family from
`accentColor` using `deriveAlternateOklchLightness`.

### Semantic tiers

| Tier | CSS variable | Semantic | Value |
|---|---|---|---|
| primary | `--colors-in-progress-primary` | text / dot | raw `accentColor` RGB |
| secondary | `--colors-in-progress-secondary` | border | small OKLCH lightness shift from accent |
| tertiary | `--colors-in-progress-tertiary` | background | large OKLCH lightness shift from accent |

The `deriveAlternateOklchLightness` function darkens accent colors with `L > 0.5` and
lightens those with `L ≤ 0.5`, so the background always moves away from the text color
regardless of whether the accent is light or dark.

### Constants (added to `rules.ts`)

```
IN_PROGRESS_BORDER_L_THRESHOLD = 0.5
IN_PROGRESS_BORDER_L_AMOUNT    = 0.15   // border: slight shift
IN_PROGRESS_BG_L_THRESHOLD     = 0.5
IN_PROGRESS_BG_L_AMOUNT        = 0.45   // background: large shift
```

## Files changed

| File | Change |
|---|---|
| `src/utils/customAppearance/rules.ts` | Remove 3 vars from `mapRule('accentColor', [...])`. Add 4 named constants. Add one new §2 derive rule. |
| `src/utils/customAppearance/__tests__/rules.test.ts` | Add `describe('derive.inProgressGroup', ...)` with 2 tests (all three vars differ; `tertiary ≠ primary` across preset accent colors). |

No other files change. `schema.ts`, `apply.ts`, and all component files are unchanged.
All 15+ in-progress badge consumers are fixed automatically via the engine.

## Acceptance criteria

- The Intermediate label on AI Katas cards is readable after selecting any custom theme preset.
- The Categories column in MCPs management is readable after selecting any custom theme preset.
- Text and background colors are visually distinct for all 12 built-in presets.
- No regressions in other theme-dependent UI elements.
- `npm run lint`, `npm run typecheck`, and `npm run test:unit` all pass.
