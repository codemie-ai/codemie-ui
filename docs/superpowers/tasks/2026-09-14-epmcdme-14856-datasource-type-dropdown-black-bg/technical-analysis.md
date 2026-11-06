# Technical Research

**Task**: datasource dropdown dark-theme focus-state
**Generated**: 2026-09-14T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-14856: Datasource Type dropdown item has a black background after clicking the Description textarea.

## Description
The Datasource Type dropdown on the Create Data Source page displays an incorrectly styled dropdown item after the user interacts with the Description textarea and opens the dropdown again. This creates a visual inconsistency in the Create Data Source form and makes the selected dropdown option look broken or incorrectly highlighted.

## Preconditions
- User is authenticated in CodeMie.
- User has access to the Create Data Source page.
- The Create Data Source form is opened in dark theme or the currently used application theme shown in the attached screenshot.

## Steps to Reproduce
1. Open the Create Data Source page.
2. Open the Datasource Type dropdown.
3. Click the Description textarea.
4. Open the Datasource Type dropdown again.
5. Observe the background color of the selected dropdown item.

## Expected Result
The Datasource Type dropdown options are rendered with the correct background color according to the design system. The selected or focused item should not display an unexpected black background after interacting with the Description textarea.

## Actual Result
After clicking the Description textarea and reopening the Datasource Type dropdown, the selected dropdown item has a black background. Confirmed via screenshot: the selected 'Git' option shows a solid black row background instead of the theme's normal selected/hover highlight, while other rows in the dropdown render normally.

## Affected Areas
- Create Data Source page
- Datasource Type dropdown
- Frontend dropdown styling and focus/selection state handling
- Dark theme UI consistency

## Acceptance Criteria
1. The Datasource Type dropdown item does not get an unexpected black background after the user clicks the Description textarea and reopens the dropdown.
2. Selected and focused dropdown states are visually consistent with the design system.
3. The issue is verified on the Create Data Source page using the provided reproduction steps.
4. No visual regression is introduced for other dropdowns on the Create Data Source page.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/dataSources/DataSourceCreatePage.tsx` — renders `DataSourceForm` (Create Data Source page entry point; source not pulled in full, confirmed only via call graph: `DataSourceCreatePage → DataSourceForm`).
- `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` — the main form component. Imports `Textarea` from `@/components/form/Textarea` (used for the Description field, per form-field imports at the top of the file) and renders `DataSourceTypeSelector` (imported from `../index`) for the "Datasource Type" field.
- `src/pages/dataSources/components/DataSourceTypeSelector.tsx` — the "Datasource Type dropdown" itself. It is **not** a PrimeReact `Dropdown`/the shared `Select` component — it renders `@/components/form/Autocomplete` (PrimeReact `AutoComplete` underneath), populated with `indexTypeOptions` built from `INDEX_TYPES` plus dynamic provider types (`indexProviderSchemas`). Options are ordered via `orderBy(options, ['label'], ['asc'])`.
- `src/components/form/Autocomplete/Autocomplete.tsx` — shared Autocomplete wrapper around PrimeReact `AutoComplete`. Has a `handleFocus` handler gated on `!disabled && !isPanelOpen.current`, keyboard-driven `ArrowDown`/`ArrowUp` focus movement into rendered items (`items[0].focus()` / `items[items.length - 1].focus()`), and imports a `ptPreset` module (`./ptPreset`) for PrimeReact `pt` (pass-through) styling — **this file's `ptPreset.ts` was not retrieved in this research pass; it is the most likely place item/selected/hover background classes are defined** (see Risk Indicators).
- `src/components/form/Textarea/Textarea.tsx` — the shared Textarea used for the Description field. Exposes an imperative `focus()` / `scrollIntoView()` / cursor API via `TextareaRef`. The textarea element's class list includes `bg-surface-base-content ... focus:outline-none !text-text-primary`.
- `src/components/form/Select/Select.tsx` — a separate shared PrimeReact `Dropdown`-based `Select` component used elsewhere (e.g. `IntegrationSelectDropdown.tsx`) with its own `panelClassName`/pt wiring. Confirmed **not** used by `DataSourceTypeSelector` — relevant only as a sibling pattern for comparison, not as the buggy component itself.
- `src/components/ToolCallPolicyDropdown/ToolCallPolicyDropdown.tsx` and `src/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelectDropdown.tsx` — other PrimeReact `Dropdown`/`Select` consumers in the codebase, both pass explicit `pt.item` / `panelClassName` overrides (e.g. `item: { className: 'focus-visible:ring-0 !p-0 rounded-md cursor-pointer' }`), showing the established convention of styling dropdown item state via `pt` overrides and semantic Tailwind tokens rather than raw colors.
- `src/App.tsx` — wraps the whole app in `PrimeReactProvider value={primeReactPtOptions}` (from `@/constants/theme`), i.e. there is a single global PrimeReact pass-through options object that seeds defaults for every PrimeReact component including `AutoComplete`/`Dropdown`. **This file's contents (`src/constants/theme.ts`) were not retrieved in this pass** — it is a second candidate location for a too-broadly-scoped default focus/selected style (see Risk Indicators).

### Architecture and Layers Affected

- **Presentation/component layer**: `DataSourceForm` → `DataSourceTypeSelector` → `Autocomplete` (PrimeReact `AutoComplete`), and `DataSourceForm` → `Textarea` (Description field) sit side by side as sibling form fields inside the same form tree, both children of `DataSourceForm`.
- **Shared form-component layer**: `src/components/form/Autocomplete/` and `src/components/form/Textarea/` are both generic, reusable form primitives, each with their own local state (`Autocomplete` tracks `isPanelOpen` via a `useRef`, not tied to any shared/global focus store found in this research).
- **Theming layer**: `tailwind.config.ts` (`themeTokens`, `generateThemes`) plus `src/hooks/useTheme.ts` / `src/utils/themeService.ts` drive the dark/light theme class applied at a root level (`codemieDark` / `codemieLight` per `theme-management.md`). Semantic tokens (e.g. `bg-surface-base-float` for "Dropdowns, tooltips, popovers") are the intended source of any dropdown panel/item background.
- **Global PrimeReact configuration layer**: `PrimeReactProvider` in `App.tsx` with `primeReactPtOptions` from `@/constants/theme` — a single global styling seed point for every PrimeReact-based dropdown/autocomplete in the app; not inspected in depth this pass.

### Integration Points

- `DataSourceForm` ↔ `DataSourceTypeSelector`: passed `indexType`, `onIndexTypeChange`, `onIndexMetadataChange`, `clearErrors`, `hidden` — no shared focus state passed between them.
- `DataSourceTypeSelector` ↔ `Autocomplete`: options list built from `INDEX_TYPES` (static enum) plus `dataSourceStore.indexProviderSchemas` (dynamic, fetched async — `dataSourceStore.getProviderIndexSchemas()` is called in `DataSourceForm`'s init effect).
- `Autocomplete` ↔ PrimeReact `AutoComplete` component (`primereact/autocomplete`, inferred from `AutoComplete<FilterOption>` typing) ↔ its `ptPreset` module — internal to the component, no external store dependency found.
- No evidence in this research pass of an explicit shared "last focused element" store, DOM-global `document.activeElement` read, or cross-component CSS class toggle connecting the Textarea's focus/blur to the Autocomplete dropdown's rendering. The likely link (if any) is CSS-scoped rather than JS-state-scoped: a `:focus`/`:focus-visible`/`:focus-within` selector, or a PrimeReact pass-through class, that is not scoped tightly enough to the Autocomplete panel and therefore picks up a stale/leftover state once focus moves to the Textarea and back. This was not directly confirmed — `Autocomplete/ptPreset.ts` and `src/constants/theme.ts` (global PrimeReact `pt` options) were not retrieved in this pass and are the two most likely places to inspect next.

### Patterns and Conventions

- PrimeReact `Dropdown`/`AutoComplete` styling in this codebase is done via the `pt` (pass-through) prop with Tailwind semantic-token classes (see `ToolCallPolicyDropdown`'s `pt.item`, `pt.wrapper`, `pt.root`, `pt.input`, `pt.trigger`, and `panelClassName`), plus a component-local `ptPreset.ts`/`ptPreset` module pattern (seen imported by both `Autocomplete` and `DropdownButton`).
- Dropdown/popover/tooltip backgrounds are expected to use the `surface-base-float` semantic token per `theme-management.md`'s Surface Token Reference; `surface-base-content` is the token for form inputs/textareas. A black background is inconsistent with any documented semantic token — either a raw/arbitrary color, a missing token mapping, or a PrimeReact default (unthemed) style bleeding through are the plausible categories of root cause, not yet narrowed further.
- Theme tokens are per `[darkValue, lightValue]` array pairs in `tailwind.config.ts`; the theme guide explicitly warns against raw palette values or inline styles bypassing the token system — a hardcoded black (`#000`/`black`) anywhere in `Autocomplete`'s or PrimeReact's default item styling, if not properly overridden by `pt.item`, would reproduce exactly the reported symptom in dark theme (default PrimeReact unstyled/unstyled-preset item backgrounds can default to black/transparent-over-dark-page in certain interaction states).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/theme-management.md` — read in full. Describes the token system (`themeTokens` → `generateThemes` → Tailwind classes), the Surface/Border/Status token references, and DO/DON'T rules against raw palette values.
- `.ai-run/guides/styling/styling-guide.md` — exists (not read in this pass); guide index says it holds the "complete token reference and Tailwind rules," referenced from `theme-management.md` for the full Color Token Reference.
- `.ai-run/guides/components/component-patterns.md` — exists (not read); routed as P0 for "building or placing UI components."
- `.ai-run/guides/patterns/state-management.md` — exists (not read); covers Valtio stores, hooks, forms, modals, accessibility — relevant given the bug spans two form fields' interaction state.
- `.ai-run/guides/testing/testing-patterns.md` — exists (not read); would define the pattern for any regression test added for this bug.

### Architectural Decisions

- No ADR or inline comment specific to dropdown/textarea focus interaction was found in the files retrieved. The `theme-management.md` guide is prescriptive but does not call out any known interaction bug between form fields.

### Derived Conventions

- Dropdown item state styling is done per-consumer via PrimeReact `pt` overrides rather than global CSS overrides in the files inspected (`ToolCallPolicyDropdown`, `IntegrationSelectDropdown`) — but `Autocomplete`'s own `ptPreset.ts` was not inspected, so it is not yet confirmed whether `DataSourceTypeSelector`'s dropdown follows this same fully-scoped-override convention or relies on PrimeReact defaults for some states.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/dataSources/components/__tests__/DataSourceName.test.tsx` — covers `DataSourceName`, unrelated to this bug's components.
- `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts` — covers data source domain helper functions (reindex eligibility, SharePoint auth type checks, etc.), unrelated to dropdown/textarea rendering.
- `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` — exists and is referenced as a caller of `src/test-utils/component-interactions/select.ts`'s `selectDropdownOption` helper, meaning an integration test already exercises dropdown interaction on this page (though `selectDropdownOption`/`getSelect` target the shared `Select`/PrimeReact `Dropdown` `.p-dropdown` class, not the `.p-autocomplete` class `DataSourceTypeSelector` actually renders — confirm which selector helper this test actually invokes before reusing it for a regression test).
- `src/test-utils/component-interactions/autocomplete.ts` — provides `getAutocomplete`, `openAutocompleteDropdown`, `findAutocompleteOption`, `selectAutocompleteOption`, `typeInAutocomplete`, `getAutocompleteInputValue` — the correct test-utility surface for interacting with `DataSourceTypeSelector`, since it is Autocomplete-backed, not Dropdown/Select-backed.
- No test file was found (within the files retrieved) for `DataSourceForm.tsx`, `DataSourceTypeSelector.tsx`, `Autocomplete.tsx`, or `Textarea.tsx` directly — "no tests found within 3 caller hops" was reported for `DataSourceForm` and `DataSourceTypeSelector` specifically by the blast-radius analysis.

### Testing Framework and Patterns

- Vitest + React Testing Library, per `AGENTS.md` and confirmed by `describe`/`it`/`expect` usage and `@testing-library/react` / `@testing-library/user-event` imports in `src/test-utils/component-interactions/*.ts` and `src/utils/workflowEditor/**/__tests__/*.test.ts`.
- A dedicated `component-interactions` test-utility layer exists (`src/test-utils/component-interactions/`) with per-component-type helpers: `select.ts` (PrimeReact `Dropdown`/`.p-dropdown`), `autocomplete.ts` (PrimeReact `AutoComplete`/`.p-autocomplete`), `multi-select.ts`. These are the idiomatic way to drive dropdown interactions in tests in this codebase.

### Coverage Gaps

- No unit/integration test found that covers `DataSourceTypeSelector` in isolation.
- No unit/integration test found that covers the specific interaction sequence in this ticket (open dropdown → focus/blur Description textarea → reopen dropdown → assert item background/class). This is the core regression scenario and has no existing coverage.
- `DataSourceCreatePage.integration.test.tsx` exists and already exercises the Create Data Source page, but it is unconfirmed (not read directly) whether it currently uses the `Select`-family or `Autocomplete`-family test helper for the "Datasource Type" field, or covers focus-interaction sequences at all.

---

## 5. Configuration and Environment

### Environment Variables

- No feature-flag or env var specific to the Datasource Type dropdown, dark theme, or focus handling was found in the files retrieved. `src/types/global.ts` defines the general runtime `EnvConfig` (`VITE_ENV`, `VITE_API_URL`, `VITE_APP_VERSION`) — none of these govern dropdown styling.

### Configuration Files

- `tailwind.config.ts` — defines `themeTokens`, the raw `c` palette, and calls `generateThemes(themeTokens)`; this is where any missing/incorrect token for a dropdown-item background state would need to be added or fixed, per the theme system's own conventions.
- `src/constants/theme.ts` — supplies `primeReactPtOptions` to the app-wide `PrimeReactProvider` in `App.tsx`. Not read in this pass; worth inspecting for any global default `pt` styling applied to all PrimeReact `AutoComplete`/`Dropdown` instances that could be the source of a too-broadly-scoped rule.

### Feature Flags and Deployment Concerns

- None identified as relevant to this bug in the files retrieved.

---

## 6. Risk Indicators

- **`src/components/form/Autocomplete/ptPreset.ts` was not retrieved in this research pass.** This is the primary candidate location for the item/selected/hover/focus background classes that would explain the reported black background, and must be read directly before diagnosing or fixing the bug.
- **`src/constants/theme.ts` (`primeReactPtOptions`, the global `PrimeReactProvider` value) was not retrieved.** Speculative: if it defines a default `pt.item`/`pt.panel` style meant for one PrimeReact component family (e.g. `Dropdown`) but scoped broadly enough to also apply to `AutoComplete`, or vice versa, that would match the symptom of "unrelated field interaction changes unrelated dropdown's rendered state" described in the ticket. This needs confirmation from the source, not assumed.
- **No shared/global "last focused element" state or store was found linking the Textarea to the Autocomplete dropdown.** The leak described in the ticket is therefore more likely CSS-based (a `:focus`, `:focus-visible`, or `:focus-within` rule with too-broad a selector, or a PrimeReact internal class like `.p-focus`/`.p-highlight` combined with a stale inline style or CSS variable) than JS-state-based — but this is inferred from absence of evidence, not confirmed by reading the actual CSS/pt source.
- **No test coverage exists for `DataSourceTypeSelector` or the specific cross-field focus interaction in this ticket.** Any fix should be paired with a new regression test using the `src/test-utils/component-interactions/autocomplete.ts` helpers (not the `select.ts` helpers, since this component is Autocomplete-backed).
- **`DataSourceCreatePage.integration.test.tsx` exists but its Datasource Type field interaction pattern was not confirmed.** If it currently drives the field via the `Select`/`Dropdown` helper (`selectDropdownOption`) rather than `selectAutocompleteOption`, that mismatch should be resolved/clarified before extending it, since `DataSourceTypeSelector` is confirmed to render an `AutoComplete`, not a `Dropdown`.
- Speculative: because PrimeReact ships its own default (unstyled-preset-adjacent) CSS for focused/highlighted list items, and this codebase's convention is to override those via `pt`/`panelClassName` per-consumer, a plausible root cause is an incomplete `pt` override in `Autocomplete/ptPreset.ts` for one particular interaction state (item both "selected" and "not currently mouse-hovered, having lost then regained keyboard focus elsewhere") that isn't exercised by the component's more common open/select/close flow — this is a hypothesis for the fix phase to verify against the real source, not a confirmed finding.

---

## 7. Summary for Complexity Assessment

This bug sits entirely in the presentation/component layer of a single page: `DataSourceForm.tsx` renders the "Datasource Type" field via `DataSourceTypeSelector.tsx`, which wraps the shared `Autocomplete` component (a PrimeReact `AutoComplete`, not the codebase's separate `Select`/`Dropdown` wrapper), and renders the "Description" field via the shared `Textarea` component, as sibling fields in the same form. No shared state, store, or explicit JS wiring was found connecting the two fields' focus/blur behavior; the two most likely root-cause locations — `src/components/form/Autocomplete/ptPreset.ts` (PrimeReact pass-through style overrides for the Autocomplete panel/items) and `src/constants/theme.ts` (`primeReactPtOptions`, the single global `PrimeReactProvider` styling seed used by every PrimeReact component in the app) — were both identified as call-sites but not retrieved in this pass, so the exact CSS/class responsible for the black background is not yet confirmed.

Technical novelty is low: this is a styling/pass-through-configuration bug in an established, convention-following pattern (PrimeReact `pt` overrides plus Tailwind semantic theme tokens), not new architecture or a new interaction pattern. The theming system itself (`tailwind.config.ts` + `theme-management.md`) is well documented and prescriptive about avoiding raw color values, which narrows the likely fix to either adding/correcting a `pt.item` class in `Autocomplete/ptPreset.ts` or tightening an overly broad selector in the global PrimeReact `pt` defaults — a small, contained change once the exact source is located.

Test coverage is a real gap: no test exists for `DataSourceTypeSelector` in isolation, and no test exercises the specific cross-field focus sequence the ticket describes. An existing integration test (`DataSourceCreatePage.integration.test.tsx`) covers the Create Data Source page and may already touch this dropdown, but its interaction pattern (Select-style vs. Autocomplete-style test helper) was not confirmed and should be checked before this fix is verified or extended. The primary risk to implementation effort is diagnostic, not architectural: the two unread files above must be inspected to pinpoint the actual CSS rule before any fix can be written with confidence.

---

## 8. External References

None named by the task. `task_context` describes a UI bug via reproduction steps and a screenshot reference ("Confirmed via screenshot") but does not name any file path or external URL as a source of truth for this research to open.
