# Technical Research

**Task**: bottom-nav color-utils contrast rules
**Generated**: 2026-09-10T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

work on ticket EPMCDME-8467 - Fix contrast ratio failure for bottom-navigation-label on hover. The fix is already committed on branch EPMCDME-8467_bottom-nav-label-contrast. The ticket is about WCAG AA contrast ratio (4.5:1) failure on bottom-nav label hover background in appearance presets. The fix uses blendColorsHex() to compute proper contrast-aware hover background color instead of hardcoded black/white logic.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/customAppearance/colorUtils.ts` — Color utility functions using the `culori` library. Exports `blendColors` (returns "R G B" channel string), `blendColorsHex` (returns hex string for re-derivation), `deriveContrastGray` (WCAG contrast-aware neutral gray derivation), `hexToRgbValue`, `deriveAlternateOklchLightness`, `deriveThemedOklchLightness`, `isDarkColor`.
- `src/utils/customAppearance/rules.ts` — Rule engine entries that map `AppearanceInputs` to CSS variable overrides. Contains the two rules affected by this fix:
  - `--colors-text-specific-bottom-navigation-label`: uses `blendColors(navigationTextColor, navigationBackground, 0.8)` to pre-blend the label text at 80% alpha.
  - `--colors-surface-specific-bottom-navigation-label`: uses `deriveContrastGray(blendColorsHex(navigationTextColor, navigationBackground, 0.8), 4.55)` to compute a hover background that achieves ≥4.55:1 contrast against the blended text color.
- `src/utils/customAppearance/schema.ts` — `AppearanceInputs` interface defining all preset fields; `CssVar` union type enumerating every CSS variable the engine may write.
- `src/utils/customAppearance/presets.ts` — `PRESETS` array of `BuiltinPreset` objects; each holds `PresetValues` (= `AppearanceInputs`) with `navigationBackground` and `navigationTextColor` fields.
- `src/utils/themeService.ts` — `ThemeService` class that calls `runRules(values)` and `applyOverrides` to write all derived CSS vars to the document root.

### Architecture and Layers Affected

- **Theme/appearance engine layer** (`src/utils/customAppearance/`): the change lives entirely here — specifically in `rules.ts` and `colorUtils.ts`.
- **CSS variable output layer**: the two CSS vars `--colors-text-specific-bottom-navigation-label` and `--colors-surface-specific-bottom-navigation-label` are the output surface; they are consumed downstream by Tailwind utility classes.
- **Preset data layer** (`presets.ts`): no change to preset values; the rule derives the hover background dynamically from existing `navigationBackground` + `navigationTextColor` inputs.

### Integration Points

- `blendColorsHex` (new caller in rules.ts) → `culori` library (`interpolate`, `formatHex`).
- `deriveContrastGray` (existing, now called with a hex-blended color) → `culori` (`wcagLuminance`, `converter`).
- `runRules` (engine, `src/utils/customAppearance/engine.ts`) folds rule outputs; called by `ThemeService.applyTheme`.
- All `SidebarNavigation` consumers (6+ pages) and `ReleaseNavButton` use `bg-surface-specific-dropdown-hover` for their hover states; the bottom-nav label hover uses the distinct `--colors-surface-specific-bottom-navigation-label` var, so those components are unaffected.

### Patterns and Conventions

- All rules follow the `Rule` interface: `{ apply: (inputs: AppearanceInputs) => CssVarOverrides }`.
- Color values emitted to CSS vars are plain `"R G B"` channel strings (not `rgb()` wrappers) to support Tailwind's `rgb(var(--x) / <alpha-value>)` pattern. `blendColorsHex` is used only as an intermediate for re-derivation — it does not emit directly.
- Named constants for all numeric thresholds (`MIN_LABEL_CONTRAST = 4.55`, `BOTTOM_NAV_LABEL_ALPHA = 0.8`) at the top of `rules.ts`.
- `culori` is the single color-science dependency; all raw color math routes through it.

---

## 3. Documentation Findings

### Guides and Architecture Docs

Relevant guides found under `.ai-run/guides/`:
- `.ai-run/guides/architecture/architecture.md` — overall system design.
- `.ai-run/guides/styling/styling-guide.md` — Tailwind conventions and theming.
- `.ai-run/guides/styling/theme-management.md` — theme store and custom appearance system.
- `.ai-run/guides/patterns/accessibility-patterns.md` — accessibility conventions.

No guide specifically documents the `customAppearance` rule engine internals; conventions are derived from code and the inline `CURRENT-RULES.md` reference noted in `rules.ts`.

### Architectural Decisions

- The rules file references `custom-appearance/CURRENT-RULES.md` as the authoritative spec (`rules.ts` line 16): "Rules mirror custom-appearance/CURRENT-RULES.md 1:1." This doc governs which CSS vars exist and what §-numbered rule group owns them.
- Pre-blending opacity into a plain RGB channel string (§3 rules) is a recorded workaround for tailwindcss-themer's consumption pattern; the comment at lines 236–238 of `rules.ts` explains it.

### Derived Conventions

- `blendColorsHex` exists as a companion to `blendColors` specifically for re-derivation paths (comment at `colorUtils.ts` lines 46–49).
- The `4.55` target (above 4.5) is intentional headroom against sRGB channel rounding in `deriveContrastGray` (comment at `rules.ts` lines 37–39).

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/customAppearance/__tests__/rules.test.ts` — Vitest unit tests for `runRules`. Contains a dedicated `describe('opacity.bottomNavigationLabelSurface')` block (lines 178–198) with two tests:
  - Verifies WCAG AA ≥4.5:1 on a dark background (`#000000` nav bg, `#A3A3A3` text).
  - Verifies WCAG AA ≥4.5:1 on a light background (`#ffffff` nav bg, `#525252` text).
- `src/utils/customAppearance/__tests__/apply.test.ts` — tests for `applyOverrides` / `PRESETS`.
- `src/utils/customAppearance/__tests__/e2e.persistence.test.ts` — persistence / preset round-trip tests.
- `src/utils/__tests__/themeService.test.ts` — `ThemeService` integration tests.

### Testing Framework and Patterns

- Vitest (two projects: `unit` and `integration`).
- Tests use a shared `inputs()` helper that spreads `DEFAULT_PRESET.values` with overrides.
- Inline WCAG math (luminance + contrast ratio) duplicated in tests rather than importing from `colorUtils`, keeping tests self-contained.

### Coverage Gaps

- `blendColorsHex` itself has no direct unit test in `colorUtils`; it is exercised only through the `opacity.bottomNavigationLabelSurface` rule tests in `rules.test.ts`.
- No test covers the full preset matrix (all `PRESETS` × both background/text combos) for this specific contrast rule — only the two representative cases above are tested.

---

## 5. Configuration and Environment

### Environment Variables

None specific to the color-utils or contrast rules; the appearance system is entirely client-side, driven by `window._env_` / `import.meta.env` only for global app config.

### Configuration Files

- `src/utils/customAppearance/presets.ts` — preset values are static constants; `navigationBackground` and `navigationTextColor` are the two fields read by the bottom-nav label rules.
- `src/utils/customAppearance/schema.ts` — `CssVar` union type must enumerate any CSS var the engine writes; `--colors-surface-specific-bottom-navigation-label` is already present.

### Feature Flags and Deployment Concerns

No feature flags. The custom appearance system is activated by selecting a custom theme in the UI; the fix applies only when `CUSTOM_THEME_KEY` is active (gated in `ThemeService.applyTheme`).

---

## 6. Risk Indicators

- **`CURRENT-RULES.md` sync requirement**: `rules.ts` states it mirrors `custom-appearance/CURRENT-RULES.md` 1:1. If that document was not updated alongside `rules.ts`, it is out of sync — but this is documentation debt, not a runtime risk.
- **`blendColorsHex` test coverage gap**: the function is not independently unit-tested; if its behavior drifts (e.g. `culori` upgrade changes `interpolate` semantics), the only signal is the rule-level contrast test.
- **Partial preset coverage in tests**: only two background/text combinations are asserted for WCAG AA compliance; a highly chromatic or mid-luminance preset combination could theoretically fail the 4.5 threshold despite passing the two sampled cases.
- **`deriveContrastGray` returns a neutral gray**, which may look visually incongruous on vivid chromatic nav backgrounds — this is an intentional trade-off (WCAG correctness over chromatic fidelity) but is not documented in the test or rule comment.
- No risks related to external service dependencies, deployment manifests, or secrets.

---

## 7. Summary for Complexity Assessment

The change is confined to a single file (`rules.ts`) and its color utility companion (`colorUtils.ts`), both inside `src/utils/customAppearance/`. The architectural surface is narrow: one new CSS variable (`--colors-surface-specific-bottom-navigation-label`) derived by chaining two existing utilities — `blendColorsHex` (new in this ticket, a 1-line variant of the existing `blendColors`) and `deriveContrastGray` (pre-existing, already used for border contrast). No component files, no store files, and no preset data changed. The `ThemeService` pipeline and `runRules` engine consumed the fix without modification.

Test coverage is adequate for the stated acceptance criterion: a `describe('opacity.bottomNavigationLabelSurface')` block in `rules.test.ts` asserts ≥4.5:1 contrast for representative dark and light navigation backgrounds. The test infrastructure is already in place (Vitest, inline WCAG math helpers) and the new tests follow the established pattern exactly. The only notable gap is that `blendColorsHex` is not independently tested and the preset matrix is sampled rather than exhaustive.

The primary risk is documentation drift: `rules.ts` references `CURRENT-RULES.md` as a 1:1 mirror, and that document may not have been updated. Runtime risk is low — the fix replaces a hardcoded black/white branch with a mathematically correct derivation, the `culori` dependency is already in use throughout the module, and the output type (`"R G B"` channel string) is unchanged.

---

## 8. External References

None named by the task.
