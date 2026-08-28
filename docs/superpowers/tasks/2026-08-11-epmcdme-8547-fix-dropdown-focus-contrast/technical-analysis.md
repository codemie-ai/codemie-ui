# Technical Research

**Task**: dropdown focus contrast accessibility WCAG
**Generated**: 2026-08-11T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

[1.4.11] Non-contrast focus visible inside dropdowns. Steps to Reproduce: 1. Open https://codemie.lab.epam.com/#/data-sources/create as an authorised user. 2. Navigate to the 'Choose Datasource Type:' dropdown and open it. 3. Measure the contrast ratio between background dropdown option focused and not focused. Actual result: The contrast ratio between the focused option and non focused does not meet the requirements: focused color #ffffff0d non focused #212224 gives only 1.2:1. Expected result: The contrast ratio between the focused option and non focused should be at least 3:1. Notes: For all options inside all dropdowns, e.g. Show items per page.

---

## 2. Codebase Findings

### Existing Implementations

The project uses **PrimeReact 10.9.5** as its sole dropdown/select library. All styling is applied via PrimeReact's PassThrough (PT) API — project-owned TypeScript files that inject Tailwind class strings into every component slot. There is no PrimeReact CSS theme file; all styling is in project code and is fully overridable.

Three PT preset files govern dropdown item focus/hover appearance:

- `src/components/form/Autocomplete/ptPreset.ts` — PT preset for `AutoComplete` (PrimeReact); **root cause of the reported bug**. The `item` slot has a `context.selected` branch (`bg-white/5`) but **no `context.focused` branch at all**. Keyboard-focused items are completely unstyled.
- `src/styles/presets/lara/dropdown/index.ts` — PT preset for PrimeReact `Dropdown` (used by the `Select` wrapper and the Pagination "items per page" widget). Does have a `context.focused && !context.selected` branch using `bg-surface-interactive-active`, but in dark mode that token resolves to `#1A1A1A` against a panel background of `#212224` — only ~1.1:1 contrast.
- `src/components/form/MultiSelect/ptPreset.ts` — PT preset for PrimeReact `MultiSelect`. Uses the same `bg-surface-interactive-active` pattern for focus as lara/dropdown. Same dark-mode contrast failure.

Entry-point components:

- `src/components/form/Autocomplete/Autocomplete.tsx` — wraps PrimeReact `AutoComplete`; uses `ptPreset.ts` above
- `src/components/form/Select/Select.tsx` — wraps PrimeReact `Dropdown`; uses lara/dropdown preset
- `src/components/form/MultiSelect/MultiSelect.tsx` — wraps PrimeReact `MultiSelect`; uses its own `ptPreset.ts`
- `src/pages/dataSources/components/DataSourceTypeSelector.tsx` — the specific datasource-type field from the bug report; renders `<Autocomplete>`, receives its focus styling from `Autocomplete/ptPreset.ts`
- `src/components/Pagination/Pagination.tsx` — "Show items per page" widget mentioned in the bug notes; renders `<Select>`, receives styling from `lara/dropdown/index.ts`

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| Design Tokens | `tailwind.config.ts` — `surface-*` semantic token definitions |
| UI Primitive / PT Preset | `Autocomplete/ptPreset.ts`, `lara/dropdown/index.ts`, `MultiSelect/ptPreset.ts` |
| Reusable Form Component | `Select.tsx`, `Autocomplete.tsx`, `MultiSelect.tsx` |
| Page Component | `DataSourceTypeSelector.tsx`, `Pagination.tsx` |

No backend, API, or routing layers are involved.

### Integration Points

- PrimeReact 10.9.5 `AutoComplete`, `Dropdown`, `MultiSelect` — focus state is surfaced through PT `context.focused` boolean; the fix is entirely in the PT preset layer.
- Tailwind CSS semantic token system — new or adjusted tokens must be defined in `tailwind.config.ts` and follow the `[darkValue, lightValue]` two-element tuple convention enforced by `generateThemes`.
- Both `codemieDark` and `codemieLight` themes must be verified; the failure is most severe in dark mode.

### Patterns and Conventions

- All styling uses Tailwind semantic token classes (e.g. `bg-surface-interactive-active`). Raw palette classes and inline styles are prohibited by `styling-guide.md`.
- `bg-white/5` in `Autocomplete/ptPreset.ts` is a raw opacity shorthand — it violates the styling guide and must be replaced with a proper semantic token.
- PT preset files follow a consistent `({ context }) => ({ className: [...] })` factory pattern. The `context` object exposes `focused`, `selected`, `disabled`.
- New tokens are added to `tailwind.config.ts` in the `semanticTokens` map using a `[dark, light]` tuple referencing palette scale entries (e.g. `neutral['725']`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/styling-guide.md` — mandates Tailwind semantic tokens only; explicitly prohibits raw palette values and inline styles. The `bg-white/5` in `Autocomplete/ptPreset.ts` violates this guide.
- `.ai-run/guides/styling/theme-management.md` — documents the `[dark, light]` token tuple format, `generateThemes` utility, and `useTheme` hook.
- `.ai-run/guides/components/component-patterns.md` — component conventions.
- `.ai-run/guides/standards/qa-health.md`, `qa-strategy.md` — QA/test standards.
- `.ai-run/guides/testing/testing-patterns.md` — test patterns (Vitest).

### Architectural Decisions

- All dropdown styling flows through PT presets (no CSS overrides, no class injection at the page level). Fixes must be applied at the PT preset level, not in individual page components.
- Semantic tokens are the only approved way to express colors; raw hex or palette-scale values must not appear in component files.

### Derived Conventions

- When a PT preset item slot needs a focus style, it adds a conditional class inside the `className` array: `{ 'bg-<token> text-<token>': context.focused && !context.selected }`.
- When a semantic token does not exist for a specific UI state, the convention is to add one to `tailwind.config.ts` rather than use a raw value or existing close-but-wrong token.

### External Documentation Findings

Not applicable — PrimeReact PT API behavior for `context.focused` is well-established in the existing presets; no external doc lookup was required.

---

## 4. Testing Landscape

### Existing Coverage

- `src/hooks/__tests__/useFocusTrap.test.tsx` — tests keyboard focus trapping behavior only (not visual contrast).
- No test files reference "contrast", "WCAG", "a11y", or "accessibility".

### Testing Framework and Patterns

- **Vitest** is the test runner.
- React Testing Library is used for component tests.
- No `jest-axe`, `vitest-axe`, or `@testing-library/jest-axe` is installed.

### Coverage Gaps

- No automated contrast or accessibility assertion exists for any dropdown component.
- The fix will not be regression-tested by any existing test. A new accessibility test or a Playwright-based contrast check would need to be added if automated coverage is required.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are relevant to this styling-only fix.

### Configuration Files

- `tailwind.config.ts` — all semantic color tokens are defined here. Any new token for dropdown focus state must be added here. Token keys relevant to this fix:
  - `surface-interactive-active` — dark: `neutral['925']` = `#1A1A1A`, light: `blue['50']`
  - `surface-interactive-hover` — dark: `neutral['875']` = `#212224`, light: `blue['50']`
  - `surface-base-secondary` — dark: `neutral['875']` = `#212224` (panel background), light: `neutral['0']`
  - `surface-specific-dropdown-hover` — dark: `neutral['725']` = `#333436`, light: `blue['50']`

### Feature Flags and Deployment Concerns

None. This is a pure styling fix with no feature flag or deployment dependency.

---

## 6. Risk Indicators

- **No `context.focused` branch in `Autocomplete/ptPreset.ts`** — the keyboard-focused state for all `Autocomplete`-backed dropdowns (including the datasource-type field) is completely invisible. This is both a WCAG 1.4.11 failure and a WCAG 2.4.7 failure.
- **`bg-white/5` is a raw Tailwind opacity shorthand, not a semantic token** — violates `styling-guide.md`; must be replaced with a semantic token for the selected-item state.
- **`surface-interactive-active` dark value (`#1A1A1A`) against panel `#212224` is ~1.1:1** — the lara/dropdown and MultiSelect focus style is also failing 3:1 even though a `context.focused` branch exists. The token value is too close to the panel background.
- **No existing semantic token achieves ≥3:1 contrast for focused items in dark mode** — `surface-specific-dropdown-hover` (`#333436`) gives ~1.7:1 against `#212224`, still below 3:1. A new dedicated token (or a lighter neutral palette step) will be required.
- **Three separate PT preset files must be updated** — `Autocomplete/ptPreset.ts`, `lara/dropdown/index.ts`, and `MultiSelect/ptPreset.ts`. Risk of missing one.
- **Light theme must be verified** — `blue['50']` is used for several interactive tokens in light mode; it needs to be confirmed that focused state in light mode meets 3:1 against the light panel background.
- **No automated accessibility tests** — `jest-axe` / `vitest-axe` not installed; the fix cannot be covered by a contrast regression test without adding new tooling.

---

## 7. Summary for Complexity Assessment

The task is a targeted visual/accessibility fix confined to the styling layer of three PrimeReact PT preset files and one entry in `tailwind.config.ts`. No API, routing, backend, or business-logic code is affected. The file change surface is small: `Autocomplete/ptPreset.ts`, `lara/dropdown/index.ts`, `MultiSelect/ptPreset.ts`, and `tailwind.config.ts` — four files total, with changes limited to adding or adjusting a handful of Tailwind class strings and one or two token definitions.

The technical challenge is moderate because no existing semantic token in the dark palette achieves the WCAG 1.4.11 minimum of 3:1 contrast for a focused dropdown item against the panel background (`#212224`). A new `surface-specific-dropdown-focused` token (or equivalent) must be introduced with a dark palette value sufficiently lighter than `neutral['875']`. The implementer will need to verify the exact neutral scale step (e.g. `neutral['600']` ≈ `#505256` gives ~2.7:1, `neutral['550']` or lighter would reach 3:1) against the dark panel. Both themes must be checked. Additionally, `Autocomplete/ptPreset.ts` is missing the `context.focused` branch entirely, so the fix is not just a token swap — it requires adding the conditional class block.

Test coverage posture is weak: there are no existing accessibility or contrast tests, and no `axe`-family testing library is installed. The fix can be validated manually (Playwright screenshot + contrast measurement) or by adding a lightweight `vitest-axe` assertion, but neither is covered by existing CI. Risk is low overall (pure styling, no logic change, project-owned PT files make PrimeReact overrides straightforward), but attention is needed on the token value selection to actually reach 3:1 in dark mode and on covering all three PT preset files consistently.
