```json
[
  {
    "kind": "acceptance",
    "item": "AC1: Repro steps (open dropdown -> focus Description -> reopen) no longer show a black/unthemed background on any item",
    "status": "pass",
    "notes": "DataSourceTypeSelector.test.tsx (new) drives exactly this sequence via getAutocomplete/openAutocompleteDropdown/findAutocompleteOption and asserts the reopened 'Git' item carries bg-surface-interactive-active and neither bg-surface-base-navigation nor p-highlight/p-focus. Root cause addressed in both Autocomplete.tsx (object-identity value derivation) and ptPreset.ts (token swap)."
  },
  {
    "kind": "acceptance",
    "item": "AC2: Every visible item background state (default, hover, selected, post blur/reopen) resolves to an existing semantic token, never raw/hex or PrimeReact default",
    "status": "pass",
    "notes": "ptPreset.ts item pt callback: selected -> bg-surface-interactive-active (token also used by MultiSelect/ptPreset.ts and customAppearance/rules.ts, confirmed pre-existing token); hover -> hover:bg-surface-specific-dropdown-hover (unchanged); default -> transparent/text-text-primary (unchanged). No raw color introduced."
  },
  {
    "kind": "acceptance",
    "item": "AC3: New automated regression test using src/test-utils/component-interactions/autocomplete.ts helpers, driving open -> note class -> blur to Description -> reopen -> assert selected-token class retained",
    "status": "pass",
    "notes": "src/pages/dataSources/components/__tests__/DataSourceTypeSelector.test.tsx imports getAutocomplete/openAutocompleteDropdown/findAutocompleteOption from '@/test-utils/component-interactions/autocomplete' (not the Select/Dropdown select.ts helpers) and follows the exact open->blur->reopen->assert flow."
  },
  {
    "kind": "acceptance",
    "item": "AC4: No regression to other PrimeReact dropdowns; Select/Dropdown-family untouched; other Autocomplete consumers inherit the corrected shared styling",
    "status": "partial",
    "notes": "Diff touches only Autocomplete.tsx and ptPreset.ts; Select.tsx, ToolCallPolicyDropdown.tsx and IntegrationSelectDropdown.tsx are absent from the diff, so the Select/Dropdown family is untouched as required. However, 'inherit the corrected shared styling' does not hold for every Autocomplete consumer: src/pages/dataSources/components/IndexProviderForm.tsx:159 computes `const options = buildSelectOptions(field)` freshly inside `fields.map(...)` on every render (no useMemo), which is exactly the referentially-unstable pattern Autocomplete.tsx's new JSDoc warns can still reproduce the selection-identity failure this ticket fixes."
  }
]
```

- AC4 is **partial**: `src/pages/dataSources/components/IndexProviderForm.tsx:159` (`const options = buildSelectOptions(field)`, called inline inside the `fields.map()` render loop, no memoization) violates the referential-stability contract the diff's own `Autocomplete.tsx` JSDoc documents as required for the fix to hold. Provider-enum Autocomplete fields rendered by `IndexProviderForm` can still show the unstyled/black selected-item regression on re-render, e.g. when a sibling field changes.
