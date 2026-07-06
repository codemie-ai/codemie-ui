# Technical Research

**Task**: theme custom appearance color contrast AI-Katas MCPs
**Generated**: 2026-07-06T00:00:00Z

---

## 1. Original Context

EPMCDME-13249: Custom theme: Intermediate label and MCPs Categories text are unreadable due to matching text and background colors.

Description: When a user applies a custom theme preset, some UI elements lose readable contrast. Specifically:
- The 'Intermediate' label on AI Katas cards
- The 'Categories' column in MCPs management

Both display text with the same color as the background, making the text unreadable.

Steps to Reproduce:
1. Navigate to Settings
2. Select Custom theme
3. Select any theme in the Preset dropdown
4. Navigate to AI Katas - observe the 'Intermediate' label on each card
5. Navigate to Settings > MCPs management - observe the 'Categories' column

Expected: Text has sufficient contrast against the background for any custom theme preset.
Actual: Background color and text color are the same in both affected elements, making the text unreadable.

Acceptance Criteria:
- The 'Intermediate' label on AI Katas cards remains readable after selecting any custom theme preset
- The 'Categories' column in MCPs management remains readable after selecting any custom theme preset
- Text and background colors have sufficient contrast in the affected UI elements
- The fix works for any custom team using custom theme presets
- No visual regressions are introduced in other theme-dependent UI elements

---

## 2. Codebase Findings

### Existing Implementations

**Directly mentioned components:**

- `src/pages/katas/components/AIKatasContent.tsx` — Renders the 'Intermediate' level badge on AI Katas cards. The `getLevelColorClasses` function at line 124 returns `'bg-in-progress-tertiary text-in-progress-primary border-in-progress-secondary'` for `KataLevel.INTERMEDIATE`. These three Tailwind classes map to three distinct semantic CSS variables: `--colors-in-progress-tertiary` (background), `--colors-in-progress-primary` (text), `--colors-in-progress-secondary` (border).

- `src/pages/settings/administration/utils/columnRenderers.tsx` — Contains the `categories` column renderer at line 41. Each category tag uses hardcoded classes `"px-2 py-1 rounded text-xs bg-in-progress-tertiary text-in-progress-primary border border-in-progress-secondary"`. This does not use the `getCategoryColor` helper from `src/utils/mcp.ts` — it applies the same in-progress color group regardless of the specific MCP category name.

**Root cause — custom appearance engine:**

- `src/utils/customAppearance/rules.ts` — The `RULES` array at line 69 starts with a `mapRule('accentColor', [...])` call that maps the `accentColor` input field to `--colors-in-progress-primary`, `--colors-in-progress-secondary`, AND `--colors-in-progress-tertiary` simultaneously. All three receive the identical RGB channel string derived from the single `accentColor` hex value. Result: background, text, and border all resolve to the exact same color, making text invisible.

- `src/utils/customAppearance/engine.ts` — Executes all rules via `runRules(inputs)`, folding each rule's `CssVarOverrides` map into a single output. The order of application means later rules can override earlier ones, but no later rule currently overrides the three in-progress variables.

- `src/utils/customAppearance/apply.ts` — Calls `html.style.setProperty(property, value)` for each CSS var in the overrides map. The three in-progress vars appear in `CUSTOM_COLOR_VARIABLES` (lines 60–62), confirming they are within the override surface and cleared/re-set on every theme apply.

- `src/utils/customAppearance/schema.ts` — `CssVar` type already includes `'--colors-in-progress-primary'`, `'--colors-in-progress-secondary'`, `'--colors-in-progress-tertiary'`. No schema change required.

- `src/utils/customAppearance/presets.ts` — Defines 12 built-in presets (Clean White, Clean Black, Rosé Pine Dawn, Dracula, Nord, etc.). All presets go through the same rules engine and are affected by the bug.

- `src/utils/customAppearance/colorUtils.ts` — Provides `deriveAlternateOklchLightness(hex, threshold, amount)`: darkens if `L > threshold`, lightens otherwise, by `amount` in OKLCH lightness space. This is the primary tool for creating contrast-safe derived colors. Also provides `hexToRgbValue`, `isDarkColor`, `blendColors`, and `deriveContrastGray`.

- `src/utils/themeService.ts` — `ThemeService.applyTheme()` at line 94: when `theme === CUSTOM_THEME_KEY`, it adds the `.custom` class to `<html>` and calls `applyOverrides(html, runRules(values))`. This is the single dispatch point for the rules engine.

**Additional components affected by the same underlying bug (all use `in-progress` badge pattern):**

- `src/components/StatusBadge/StatusBadge.tsx` — The `InProgress` status case at line 45 uses `'bg-in-progress-tertiary text-in-progress-primary border border-in-progress-secondary'`. Same token group; same broken contrast under custom theme.
- `src/utils/mcp.ts` — `MCP_CATEGORY_COLORS` map: `Development` and `API` categories use `'bg-in-progress-tertiary text-in-progress-primary border border-in-progress-primary'`. Also affected.
- `src/components/StatusIndicator.tsx`, `src/styles/presets/lara/tag/index.ts`, `src/pages/katas/components/KataDetailView.tsx`, `src/pages/katas/components/LeaderboardContent.tsx`, `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerList/WorkflowDrawerListItem.tsx`, and several other files — all use `in-progress-primary` / `in-progress-tertiary` tokens in badge-style contexts.

**Theme token system:**

- `tailwind.config.ts` — Defines `themeTokens['in-progress']` at lines 430–434:
  - `primary: [c['blue']['300'], c['blue']['300']]` — same in dark and light (text/dot color)
  - `secondary: [c['blue']['600'], c['blue']['300']]` — border (dark: deeper blue)
  - `tertiary: [c['blue']['800'], c['blue']['50']]` — background (dark: very dark blue; light: very pale blue)
  The base theme has strong contrast because `tertiary` is either very dark or very light, while `primary` is a mid-tone blue. The custom theme rule destroys this by assigning all three the same accent value.

### Architecture and Layers Affected

- **Custom Appearance Engine** (pure utility layer): `src/utils/customAppearance/rules.ts`, `engine.ts`, `apply.ts`, `colorUtils.ts`
- **Theme Service** (singleton service): `src/utils/themeService.ts`
- **UI Component Layer**: `AIKatasContent.tsx`, `columnRenderers.tsx`, and 12+ badge/status components — these are correct consumers of the token system and do not themselves need to change
- **Tailwind / CSS Variable Layer**: `tailwind.config.ts` defines the base-theme values for `in-progress.*`; the engine overrides them via `html.style.setProperty` for custom themes

### Integration Points

- `runRules` (from `customAppearance/engine.ts`) is the sole path from `AppearanceInputs` to CSS variable overrides. Any change to the `RULES` array in `rules.ts` will affect all custom theme presets and all components that consume `in-progress` tokens.
- `CUSTOM_COLOR_VARIABLES` in `apply.ts` must include any new CSS vars written by rules (all three in-progress vars are already listed).
- `CssVar` type in `schema.ts` must declare any vars written (all three already present).
- `src/utils/customAppearance/__tests__/rules.test.ts` — existing test suite that covers the rules engine; new derive behavior will need test cases added here.

### Patterns and Conventions

- **Derive rule pattern**: Established in `rules.ts` §2. A rule's `apply` function calls `deriveAlternateOklchLightness(inputHex, L_THRESHOLD, L_AMOUNT)` to create a lightness-shifted variant of an input color. Constants are defined at the top of the file with descriptive names (e.g., `ACCENT_HOVER_L_THRESHOLD = 0.5`, `ACCENT_HOVER_L_AMOUNT = 0.1`).
- **mapRule factory**: Used when one input field maps directly to multiple vars with the same value. The in-progress group can no longer use this pattern because the three tiers require distinct values.
- **RGB channel format**: All `CssVarOverrides` values are `"R G B"` channel strings (not hex, not `rgb(...)` syntax). Use `hexToRgbValue` to convert derived hex colors.
- **`isDarkColor` check**: Used in §3 rules to branch on whether a color is dark or light. Available for the in-progress derive rule to decide shift direction.
- **Constants naming convention**: `<COMPONENT>_<PROPERTY>_<L|THRESHOLD>` (e.g., `ACCENT_HOVER_L_THRESHOLD`, `PRIMARY_BTN_HOVER_L_AMOUNT`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/theme-management.md` — Directly relevant. Documents the `in-progress` token family, its three-tier pattern (`primary` = active progress/dot, `secondary` = border, `tertiary` = light bg), and the rule that components must use semantic tokens rather than palette values. Confirms the intended semantic of the `tertiary` tier as a background that contrasts with `primary`.
- `.ai-run/guides/styling/styling-guide.md` — Documents the mandatory rule to use only Tailwind semantic tokens. Confirms raw-palette bypass would break the theme.
- `.ai-run/guides/quality-gates.md` — Specifies the full pre-MR gate: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`.
- `.ai-run/guides/project.md` — Identifies Jira project (EPMCDME), MR target branch (main).

### Architectural Decisions

- The custom appearance engine (rules + engine + apply) is intentionally isolated: all CSS var overrides are computed in `runRules`, applied atomically via `applyOverrides`, and cleared via `clearOverrides`. This prevents partial-state leaks across theme switches.
- The `CssVar` type and `CUSTOM_COLOR_VARIABLES` array serve as the authoritative whitelist of what the engine may write. Any new CSS var must be added to both (`schema.ts` and `apply.ts`). Since the three in-progress vars are already listed, no new additions are needed.
- The comment in `rules.ts` at the top of §1 states: "Rules mirror custom-appearance/CURRENT-RULES.md 1:1." A `CURRENT-RULES.md` file was not found in the repository, suggesting it may exist outside the repo or has been removed. The rules file itself is the authoritative source.
- The `mapRule` factory encodes the design decision that an input field produces identical RGB values in multiple CSS vars. Removing in-progress vars from `mapRule('accentColor')` and adding a derive rule is a deliberate deviation from that design — it introduces a new pattern of generating a whole color family (primary/secondary/tertiary) from a single input, which is consistent with how the base-theme `themeTokens` defines the family.

### Derived Conventions

- Badge-style elements consistently use the three-tier `{status}-primary / {status}-secondary / {status}-tertiary` pattern (text / border / background) across all status families.
- The `advanced` color group in `tailwind.config.ts` (purple family) is NOT in the custom appearance rules at all — it falls back to the base-theme static values. This means `bg-advanced-tertiary text-advanced-primary` renders correctly under custom themes because no rule touches those vars.
- The gap in coverage: `in-progress` is the only status family that was connected to the rules engine (via `accentColor`), but it was connected incorrectly by collapsing all three tiers into one value.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/customAppearance/__tests__/rules.test.ts` — Covers `runRules` engine determinism, map rule RGB output, `sidebarToggle`, `navigationFadeText`, font family, `bottomNavigationLabelSurface`, and gradient block. Does **not** test the in-progress color derive behavior or any contrast assertion for the three in-progress tokens.
- `src/utils/customAppearance/__tests__/storage.test.ts` — Covers localStorage persistence.
- `src/utils/customAppearance/__tests__/apply.test.ts` — Covers `applyOverrides` and `clearOverrides` DOM manipulation.
- `src/hooks/__tests__/useCustomAppearance.test.tsx` — Tests hook subscription and state updates.
- `src/utils/__tests__/themeService.test.ts` — Tests `ThemeService` methods.
- No tests exist for `AIKatasContent.tsx`, `columnRenderers.tsx`, or `StatusBadge.tsx` as isolated components in the test base found.

### Testing Framework and Patterns

- **Framework**: Vitest (configured via `vitest.workspace.ts`), separate `unit` and `integration` projects.
- **Test structure**: Tests co-located under `__tests__/` subdirectories; `describe → it` blocks.
- **Input helper pattern**: `rules.test.ts` uses an `inputs(overrides)` helper that spreads `DEFAULT_PRESET.values` with overrides — this pattern should be followed for new test cases.
- **Assertion style**: Direct value equality (`expect(result['--colors-text-accent']).toBe(channels)`); no snapshot tests for CSS variables.

### Coverage Gaps

- No test asserts that `--colors-in-progress-primary`, `--colors-in-progress-secondary`, and `--colors-in-progress-tertiary` differ from each other when an accent color is applied.
- No test verifies contrast between `in-progress-tertiary` (background) and `in-progress-primary` (text) in any preset.
- The `rules.test.ts` file is the correct location for a new `describe('derive.inProgressGroup', ...)` block to cover this behavior.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are involved in theme or color contrast behavior. Theme selection is stored in `localStorage` via `THEME_KEY` and `APPEARANCE_KEY` constants (from `src/constants/index.ts`).

### Configuration Files

- `tailwind.config.ts` — Defines the base-theme values for all semantic tokens including `in-progress`. Not modified by this fix; the fix is solely in the runtime override engine.
- `src/utils/customAppearance/rules.ts` — The single file requiring change.
- `vitest.workspace.ts` — Test project configuration; no changes needed.

### Feature Flags and Deployment Concerns

- Custom appearance is gated behind the `CUSTOM_THEME_KEY` (`'custom'`) theme selection — the fix only affects behavior when the user explicitly selects the Custom theme. Standard dark/light themes are unaffected (they do not call `runRules`).
- No environment variables, feature flags, or deployment-level changes are involved.

---

## 6. Risk Indicators

- **Root cause confirmed in a single rule**: The entire fix resides in `src/utils/customAppearance/rules.ts` — specifically in removing three vars from `mapRule('accentColor', [...])` and adding a new derive rule. The change surface is one file.
- **Broad impact of the fix**: The in-progress token group is consumed by 15+ components across pages and shared components. The fix via the rules engine corrects all of them simultaneously, which is correct — but any miscalculation in the derive constants could introduce regressions across all those components.
- **No tests for in-progress contrast**: The current `rules.test.ts` does not assert that `--colors-in-progress-tertiary` differs from `--colors-in-progress-primary`. New test cases are required to prevent regression.
- **OKLCH shift direction depends on accent lightness**: The `deriveAlternateOklchLightness` function darkens colors above the threshold and lightens below it. For very low-lightness accent colors (e.g., very dark purples with `L ≈ 0.2`), a large shift amount is needed to reach a usable background lightness. The shift constants must be validated against the full set of built-in presets (12 presets, covering both dark and light base themes with varied accent colors).
- **`advanced` group is unaffected**: The `advanced` status family is not in the rules engine, so it uses static base-theme values and is not broken. This is not a risk but confirms the scope boundary.
- **`StatusBadge.tsx` is a shared component**: Used widely across the application. The in-progress status badge will be fixed automatically — no component-level changes needed — but visual review of `StatusBadge` under all presets is prudent.
- **`columnRenderers.tsx` does not use `getCategoryColor`**: The categories column uses a hardcoded `in-progress` token group for all category names, rather than the `getCategoryColor` helper from `src/utils/mcp.ts` which provides per-category color mappings. This is a pre-existing inconsistency (not introduced by this bug) but should be noted — the fix will correct readability for the hardcoded class regardless.
- **No `CURRENT-RULES.md` document found**: The comment in `rules.ts` references `custom-appearance/CURRENT-RULES.md` as a document that should stay in sync 1:1 with the rules. This file was not found in the repo. If it exists elsewhere (external wiki, etc.), it must be updated alongside the code change.

---

## 7. Summary for Complexity Assessment

The bug has a single, precisely located root cause in `src/utils/customAppearance/rules.ts`. The `mapRule('accentColor', [...])` call incorrectly maps the accent color to all three `in-progress` CSS variables (`--colors-in-progress-primary`, `--colors-in-progress-secondary`, `--colors-in-progress-tertiary`) simultaneously, assigning them identical RGB channel values. Both reported symptoms — the 'Intermediate' Kata label and the MCP Categories column — use the same token group with the same `bg-in-progress-tertiary text-in-progress-primary` pattern, so both break from the same single-line mapping error. The fix is to remove the three in-progress vars from the `mapRule` call and add a new derive rule (following §2 patterns already in the file) that generates proper OKLCH lightness-shifted variants: keeping `primary` as the accent color (text), deriving `tertiary` with a large lightness shift for the background, and deriving `secondary` with a medium shift for the border. The change touches only `rules.ts` plus a new test block in `rules.test.ts`.

The task follows fully established patterns: the `deriveAlternateOklchLightness` function, named constants, and the `§2 derive rules` section of `rules.ts` all provide direct implementation templates. No new architecture, no new utilities, no schema changes, and no component-level edits are required. The only novelty is that the new rule generates a three-token color family from a single input, rather than a single derivative — but this is an extension of the existing pattern, not a departure from it.

Test coverage for the affected domain is thin: no test currently asserts anything about the three in-progress variables, and there are no component-level tests for the badge consumers. The new test cases needed are unit-level assertions in `rules.test.ts` (consistent with the existing test file structure), verifying that `--colors-in-progress-tertiary` and `--colors-in-progress-primary` differ for a representative set of accent colors, covering both dark and light cases. The main risk factor is choosing the correct OKLCH shift constants to ensure the derived background has sufficient contrast against the text across all 12 built-in presets, particularly for edge-case accent colors near the lightness threshold.
