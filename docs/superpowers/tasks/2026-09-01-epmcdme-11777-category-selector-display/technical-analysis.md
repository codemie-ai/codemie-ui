# Technical Research

**Task**: category selector filter multiselect display value
**Generated**: 2026-09-01T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix bug EPMCDME-11777: When all categories are selected in a category selector/filter component, the filtering works correctly but the selected value displayed in the selector input field (not the dropdown) appears empty. Expected: when all categories are selected, the input should show a meaningful label such as 'All categories' or a count. Additional user context: selecting all categories correctly filters, but the selected value in the selector input (not dropdown) is empty.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/form/MultiSelect/MultiSelect.tsx` — shared wrapper around PrimeReact's MultiSelect; manages sorting, `hiddenInputValue` for the form combobox, and the passthrough preset. Does **not** accept or forward `maxSelectedLabels` to PrimeReact.
- `src/components/form/MultiSelect/useMultiSelectLogic.ts` — prepares `preparedValue` and `handleChange`; always emits `e.value` (full selected array) unchanged on the event's `value` property and overrides only `target.value` with the last-clicked item.
- `src/components/form/MultiSelect/ptPreset.ts` — Tailwind-based passthrough preset. `ptPreset.label` is a function that adds `overflow-hidden whitespace-nowrap overflow-ellipsis px-3 py-2` for non-chip display.
- `src/components/Filters/Filters.tsx` — generic sidebar filter panel; renders `MultiSelect` for `FilterDefinitionType.Multiselect` definitions. Spreads `definition.config` at runtime via `{...(definition.config as Pick<MultiSelectProps, 'label' | 'id' | 'name'>)}` — TypeScript cast does not remove extra keys, so all config properties reach `MultiSelect` as props, but `MultiSelect` silently drops unrecognised ones (no `...rest` spread to PrimeReact).
- `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` — passes `maxSelectedLabels: 3` in the categories filter config, which does not reach PrimeReact.
- `src/pages/skills/components/SkillsFilters.tsx` — same pattern; `maxSelectedLabels: 3` in roles and categories configs.
- `src/pages/katas/components/KataFilters.tsx` — same pattern; `maxSelectedLabels: 3` in roles and tags configs.
- `src/pages/workflows/components/WorkflowsFilters.tsx` — same pattern.
- `src/pages/favorites/components/FavoritesAllFilters.tsx` — same pattern for project filter.
- `src/pages/integrations/components/UserSettings/UserSettings.tsx` and `ProjectSettings.tsx` — same pattern.
- `src/pages/assistants/components/CategorySelector/CategorySelector.tsx` — assistant form (not filter) component; limits selection to 3 via its own `onChange` guard; not the component described in the bug (no "all categories" scenario here).
- `src/components/Filters/__tests__/Filters.test.tsx` — renders major filter types; no test for label display when many or all items are selected.
- `src/components/form/MultiSelect/__tests__/MultiSelect.test.tsx` — one test covering the hidden combobox input staying controlled; no test for the visible label when all items are selected.

### Architecture and Layers Affected

- **Shared component layer**: `src/components/form/MultiSelect/MultiSelect.tsx` — the prop interface and the passthrough preset override are the primary fix targets.
- **Filter panel layer**: `src/components/Filters/Filters.tsx` — the config spread does not need to change if `MultiSelect` adds the prop; alternatively a `selectedItemsLabel` config key can be plumbed through.
- **Feature filter consumers**: all `*Filters.tsx` files listed above already pass `maxSelectedLabels: 3` in config and will benefit automatically once `MultiSelect` forwards the prop.

### Integration Points

- PrimeReact 10.9.5 `MultiSelect` (`primereact/multiselect`): `maxSelectedLabels` defaults to `null` in this version. `ObjectUtils.isNotEmpty(null)` returns `false`, so the "X items selected" code path is never reached when the prop is absent. The visible label is rendered by PrimeReact's `createLabel()` which calls `getLabelByValue()` for every selected value and concatenates them.
- Valtio snapshot (`useSnapshot(assistantsStore)`) provides `assistantCategories`; store data feeds the filter options.

### Patterns and Conventions

- `MultiSelectProps` uses an explicit TypeScript interface with no `...rest` spread. New props must be added to the interface and destructured explicitly before being passed to `PrimeMultiselect`.
- `preparedPreset` (inside `MultiSelect.tsx`) overrides `ptPreset.label` with `{ className: labelClassName }`, replacing a function that previously set `overflow-hidden whitespace-nowrap overflow-ellipsis`. This removes the truncation/ellipsis behaviour from the visible label and means a long concatenated label wraps and gets clipped by the container rather than receiving an ellipsis.
- Filter configs use `FilterDefinition.config: { [key: string]: unknown }` — any new config key (e.g., `selectedItemsLabel`) will be forwarded at runtime via the existing config spread in `Filters.tsx` without changes to `FilterDefinition`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` — confirms that new props require an explicit interface entry; no `...rest` pattern; extends HTML attributes only for native element wrappers.
- `.ai-run/guides/patterns/state-management.md` — not directly relevant.

### Architectural Decisions

No ADR or inline decision comment addresses `maxSelectedLabels` or multiselect display label behaviour.

### Derived Conventions

- PrimeReact passthrough (`pt`) is the mechanism for all visual customisation; changes to the label display must go through `ptPreset` or by forwarding new PrimeReact props.
- Consumer filter configs already anticipate `maxSelectedLabels: 3`; the convention is to configure display limits at the consumer level and forward them through the generic `MultiSelect` wrapper.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/form/MultiSelect/__tests__/MultiSelect.test.tsx` — one test: hidden combobox value is controlled after value changes. No coverage of visible label display.
- `src/components/Filters/__tests__/Filters.test.tsx` — two tests: search submit, presence of filter type elements. No coverage of multiselect label content with selected items.

### Testing Framework and Patterns

- Vitest with React Testing Library (`@testing-library/react`). Two test projects: `unit` and `integration` (see `vitest.workspace.ts`).
- Tests use `vi.fn()` mocks and `render`/`rerender` from RTL. No fixture factories; stores mocked via Valtio or direct mock functions.

### Coverage Gaps

- No test verifies the visible label text in the MultiSelect when 1, N, or all items are selected.
- No test verifies the "X items selected" display when `maxSelectedLabels` is exceeded.
- No test verifies the "All categories" or equivalent fallback label.
- `Filters.tsx` multiselect label is completely untested.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this feature area.

### Configuration Files

- `tailwind.config.ts` — defines theme colours including `text-text-unfocused`, `text-text-secondary`, `text-text-quaternary` used in label styling.

### Feature Flags and Deployment Concerns

None identified.

---

## 6. Risk Indicators

- **Silent prop drop**: `maxSelectedLabels` (and `selectedItemsLabel`) are passed in configs across at least eight consumer files but silently ignored by `MultiSelect.tsx`. Adding these to `MultiSelectProps` and wiring them through is a contained change but must be verified against all consumers.
- **ptPreset.label override removes ellipsis**: `preparedPreset` replaces `ptPreset.label` (which had `overflow-hidden whitespace-nowrap overflow-ellipsis`) with a plain `{ className: 'text-text-unfocused' }`. This means any value with many items produces long wrapping text clipped by the container rather than an ellipsis. Restoring the base label classes or merging them in `preparedPreset` may be needed alongside the `maxSelectedLabels` fix.
- **PrimeReact `maxSelectedLabels` default is `null`**: Without the prop, `ObjectUtils.isNotEmpty(null)` is false, so the "N items selected" branch never fires regardless of selection count. This is the confirmed code path behind the empty/overflowing display.
- **No tests for this state**: The fix will need tests covering the visible label under all-selected and over-limit conditions; no existing tests constrain this behaviour.
- **Multiple consumers affected**: The bug manifests wherever `Filters.tsx` renders a `Multiselect` definition with enough options to exceed any display limit — roles, tags, projects, categories across assistants, skills, katas, workflows, favourites, and integrations pages.
- **Type-only cast does not filter props**: `{...(definition.config as Pick<MultiSelectProps, 'label' | 'id' | 'name'>)}` is a runtime spread of all config keys; the cast is cosmetic. Any new `MultiSelectProps` key that also appears in a filter config will be forwarded automatically once `MultiSelect` destructures it.

---

## 7. Summary for Complexity Assessment

The bug sits at the intersection of two layers: the shared `MultiSelect` wrapper and the `Filters` panel. The root cause is that `MultiSelectProps` does not include `maxSelectedLabels` (or `selectedItemsLabel`), so the props passed in every filter config definition are silently discarded. PrimeReact 10.9.5 defaults `maxSelectedLabels` to `null`, meaning `ObjectUtils.isNotEmpty(null)` is false and the "N items selected" short-form label never fires; instead PrimeReact concatenates all selected labels into a single long string. Combined with `preparedPreset` overriding `ptPreset.label` and removing the `whitespace-nowrap overflow-ellipsis` classes, the resulting text wraps and gets clipped inside the fixed-height container, appearing empty or invisible to the user.

The file change surface is narrow: `MultiSelect.tsx` needs the new prop(s) added to `MultiSelectProps` and destructured/forwarded to `PrimeMultiselect`. If a special "All categories" label (rather than "N items selected") is required, either a custom `selectedItemsLabel` template or a computed `selectedItemsLabel` prop must be wired through, and the eight consumer filter files may need a config entry for that string. The `ptPreset.label` class override in `preparedPreset` is a related but separate styling gap worth addressing in the same change.

Test coverage is the primary risk: there are zero tests for the visible label content in `MultiSelect` or `Filters`, so the fix must be accompanied by new unit tests covering the over-limit and all-selected scenarios. The testing pattern (`render`/`rerender` with RTL + Vitest) is established and straightforward for this kind of state-driven label test.

---

## 8. External References

None named by the task.
