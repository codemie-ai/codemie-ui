```json
[
  {
    "kind": "implementation",
    "item": "src/utils/modelCatalog.ts exports PROVIDER_LABELS, formatCost, and ModelStatus; no other file in the repo defines its own copy of either",
    "status": "partial",
    "notes": "File is created and exports all three. However ModelStatus is typed 'enabled' | 'deprecated' | 'disabled' instead of 'active' | 'deprecated' | 'disabled' as the spec requires. The type name matches but its literal set diverges from the API contract."
  },
  {
    "kind": "implementation",
    "item": "ModelOption.status is typed 'active' | 'deprecated' | 'disabled' | undefined",
    "status": "fail",
    "notes": "configuration.ts line 47 types the field as 'enabled' | 'deprecated' | 'disabled' — 'active' is absent and 'enabled' is present instead, contradicting the spec and the API contract."
  },
  {
    "kind": "implementation",
    "item": "appInfoStore.getLLMModels() maps model.status to ModelOption.status, defaulting to 'active' when absent",
    "status": "fail",
    "notes": "appInfo.ts line 337 defaults to 'enabled' not 'active'. The fallback value does not match the spec requirement."
  },
  {
    "kind": "implementation",
    "item": "ModelsCatalogPage renders a Status column; deprecated models show an amber Deprecated badge; active models show no badge",
    "status": "pass",
    "notes": "Status <th> added; Deprecated chip with text-aborted-primary/border-aborted-primary applied when status === 'deprecated'; active rows render empty cell."
  },
  {
    "kind": "implementation",
    "item": "Deprecated models are hidden by default in ModelsCatalogPage; a Show deprecated toggle reveals them",
    "status": "pass",
    "notes": "showDeprecated state defaults false; filter excludes deprecated unless toggle is checked; checkbox labelled 'Show deprecated' is present."
  },
  {
    "kind": "implementation",
    "item": "Deprecated model rows are visually muted (reduced opacity, italic label)",
    "status": "pass",
    "notes": "opacity-60 applied to the <tr> and italic class applied to the label <span> when status === 'deprecated'."
  },
  {
    "kind": "implementation",
    "item": "Each LLMSelector family component renders a Deprecated meta line for status === 'deprecated'; absent for active models",
    "status": "pass",
    "notes": "All three selectors (LLMSelector, ChatPromptLlmSelector, ChatConfigLlmSelector) pass status through to the row/meta components and render the Deprecated span conditionally."
  },
  {
    "kind": "implementation",
    "item": "Deprecated models remain selectable in all selectors",
    "status": "fail",
    "notes": "The diff sets disabled: status === 'deprecated' on ComboboxItem entries in both ChatPromptLlmSelector and LLMSelector, and the SearchableCombobox sets the HTML disabled attribute and blocks click/Enter. The spec explicitly states models must remain selectable. This is a direct contradiction between implementation and non-goal #3."
  },
  {
    "kind": "implementation",
    "item": "All existing tests continue to pass without modification (field is optional; existing fixtures omitting status are treated as active)",
    "status": "pending-stage-7",
    "notes": "Existing fixtures omit status; the store now defaults to 'enabled' not 'active', but filter logic uses !== 'deprecated' so functional behaviour is unaffected. Test suite must be run to confirm."
  },
  {
    "kind": "implementation",
    "item": "New test cases cover the four display scenarios listed in spec §6",
    "status": "partial",
    "notes": "ModelsCatalogPage.test.tsx and ChatPromptLlmSelector.test.tsx cover the required scenarios. LLMSelector.test.tsx covers deprecated meta line and non-selectable assertion. ChatConfigLlmSelector.test.tsx covers non-selectable assertion but not the deprecated meta line visibility directly. Additionally the non-selectable assertions use a CSS class sniff (.p-disabled) rather than the HTML disabled attribute set by SearchableCombobox, so those assertions may not correctly verify the actual disabled state."
  }
]
```

## Failures and partials

- **AC 1 (partial)**: `ModelStatus` in `src/utils/modelCatalog.ts` uses `'enabled'` where the spec mandates `'active'`.
- **AC 2 (fail)**: `ModelOption.status` in `src/types/entity/configuration.ts` is `'enabled' | 'deprecated' | 'disabled'`; spec and API contract require `'active' | 'deprecated' | 'disabled'`.
- **AC 3 (fail)**: `appInfoStore.getLLMModels()` defaults absent `status` to `'enabled'`; spec requires `'active'`.
- **AC 8 (fail)**: `disabled: status === 'deprecated'` is set on `ComboboxItem` entries in both `ChatPromptLlmSelector` and `LLMSelector`, and `SearchableCombobox` enforces that flag with the HTML `disabled` attribute and keyboard guard. The spec explicitly lists "No hiding or disabling of deprecated models in selectors — selectable for backward compatibility" as a non-goal.
- **AC 10 (partial)**: `ChatConfigLlmSelector.test.tsx` does not assert the deprecated meta line (only the disabled state); the non-selectable assertions in both `LLMSelector.test.tsx` and `ChatConfigLlmSelector.test.tsx` sniff `.p-disabled` CSS class rather than using `toBeDisabled()`, which does not match how `SearchableCombobox` actually marks items disabled.
