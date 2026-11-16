# Plan: Catalog Status Surfacing
**Slice**: `catalog-status-surfacing` · **Story**: EPMCDME-15077 · **Branch**: EPMCDME-15077_model-management_FE_catalog

Commit per task using the repository's existing convention (ticket prefix `EPMCDME-15077`).

**Negative-constraint pass**
- "No admin mutation UI / no write paths" — no task introduces mutation; all changes are read/display only. ✓
- "No backend changes" — no task touches anything outside `codemie-ui/src/`. ✓
- "No dedicated filter UI for disabled" — disabled models are absent from the payload; no filter task exists. ✓
- "No feature-flag gating" — no `useFeatureFlag` call added anywhere. ✓
- "No changes to AdministrationPage or admin routes" — no task touches those files. ✓
- "Deprecated models must be NON-SELECTABLE in LLMSelector family" — Task 4 enforces this via disabled option items. ✓
- "No hiding/removing deprecated from catalog page — Show deprecated toggle shows/hides" — Task 3 hides by default with a toggle to reveal, not a permanent removal. ✓

negative-constraints: all stated constraints are honored; no task violates any of them.

---

## Task 1 — Extract shared model-catalog utilities

**Test-first: no** — pure extraction, no logic change; existing passing tests confirm no regression.

`src/utils/modelCatalog.ts` is a new file. Create it with the content moved verbatim from `ModelsCatalogPage.tsx:24-33`:

```ts
export const PROVIDER_LABELS: Record<string, string> = {
  azure_openai: 'Azure OpenAI',
  aws_bedrock: 'AWS Bedrock',
  google_vertexai: 'Google Vertex AI',
  anthropic: 'Anthropic',
  'vertex_ai-anthropic_models': 'Vertex AI Anthropic',
}

export const formatCost = (cost?: { input: number; output: number }): string =>
  cost ? `$${(cost.input * 1_000_000).toFixed(2)} / $${(cost.output * 1_000_000).toFixed(2)}` : '—'

export type ModelStatus = 'enabled' | 'deprecated' | 'disabled'
```

In `ModelsCatalogPage.tsx:24-33`, replace the two local definitions with:
```ts
import { PROVIDER_LABELS, formatCost } from '@/utils/modelCatalog'
```

All other files in the repo that define their own `PROVIDER_LABELS` or `formatCost` (notably the unmerged `AvailableModelsSection.tsx` on the sibling branch) must import from this module instead — this branch owns the file.

---

## Task 2 — Add `status` to `ModelOption` and store mapping

**Test-first: no** — type addition is structural; the store test is covered in Task 5 alongside the display changes.

`src/types/entity/configuration.ts:46` (after `cost?` field in `ModelOption`): add

```ts
status?: 'enabled' | 'deprecated' | 'disabled'
```

`src/store/appInfo.ts:336` (inside the `data.map(...)` block of `getLLMModels()`): add

```ts
status: model.status ?? 'enabled',
```

Wire value `'enabled'` aligns with the agreed contract (wire values: `"enabled" | "deprecated" | "disabled"`; absent → `"enabled"`).

---

## Task 3 — Extend `ModelsCatalogPage` with status display and filter

**Test-first: yes** — add failing assertions to `ModelsCatalogPage.test.tsx` before editing the page:
1. Status column `<th>` is present.
2. A model with `status: 'deprecated'` renders an amber "Deprecated" badge.
3. A deprecated model is absent from the table when the "Show deprecated" toggle is unchecked (default).
4. The same model is visible after checking the "Show deprecated" toggle.

Then implement in `ModelsCatalogPage.tsx`:

1. Remove local `PROVIDER_LABELS` and `formatCost`; import from `@/utils/modelCatalog`.
2. Add `showDeprecated` state (default `false`) alongside the existing `premiumOnly` state.
3. Extend the `filtered` memo to exclude deprecated models when `!showDeprecated`:
   add `&& (showDeprecated || (m.status ?? 'enabled') !== 'deprecated')` to the filter predicate.
4. Add `deprecatedCount` constant alongside `premiumCount`:
   `const deprecatedCount = llmModels.filter((m) => m.status === 'deprecated').length`
5. Add a "Show deprecated" checkbox label in the filter bar after "Premium only", mirroring the same pattern.
6. Extend the summary span to include `· {deprecatedCount} deprecated` when `deprecatedCount > 0`.
7. In `<thead>`, add `<th className="text-left px-3 py-2 font-medium">Status</th>` after "Default for".
8. In each `<tr>`, extend the `cn(...)` call to include `'opacity-60'` when `m.status === 'deprecated'`.
9. Wrap the label text in `<span className={cn(m.status === 'deprecated' && 'italic')}>{m.label}</span>`.
10. Add a `<td>` for the Status column: empty when `status !== 'deprecated'`; amber badge chip when deprecated:
    ```tsx
    <td className="px-3 py-2">
      {m.status === 'deprecated' && (
        <span className={cn(capabilityChipClass, 'text-aborted-primary border-aborted-primary')}>
          Deprecated
        </span>
      )}
    </td>
    ```

---

## Task 4 — Make deprecated models non-selectable in `LLMSelector` family

**Test-first: yes** — add failing assertions before editing the components:
- `LLMSelector.test.tsx`: (a) deprecated meta line appears for `status: 'deprecated'`; (b) deprecated option item is disabled/non-interactive; (c) line absent for `status: 'enabled'`.
- `ChatPromptLlmSelector.test.tsx`: deprecated option is non-selectable; deprecated meta visible.
- `ChatConfigLlmSelector.test.tsx`: deprecated model option is non-selectable.

**LLMSelector.tsx**

1. In `LlmOptionRow` props (line ~37), add `status?: ModelStatus`. Show deprecated meta span when `status === 'deprecated'`:
   ```tsx
   {status === 'deprecated' && (
     <span data-testid="llm-option-meta" className="truncate text-xs text-text-tertiary">
       <span className="text-aborted-primary">Deprecated</span>
     </span>
   )}
   ```
   Composable after the existing `isPremium` span so both can appear together.

2. In the `options` memo (line ~128), pass `status` through:
   `models.map(({ label, value, isPremium, status }) => ({ label, value, isPremium, status }))`

3. Mark deprecated options as disabled in the options array:
   add `disabled: status === 'deprecated'` to each mapped option object.

4. In `renderOption` (line ~163), pass `status` to `LlmOptionRow`:
   `return <LlmOptionRow label={option.label} isPremium={option.isPremium ?? false} status={option.status} />`

**ChatPromptLlmSelector.tsx**

1. `OptionMeta` (line ~94): add `isDeprecated?: boolean` prop. When true, render an amber "Deprecated" span after the existing premium span (same composition pattern):
   ```tsx
   {isDeprecated && <span className="text-aborted-primary">Deprecated</span>}
   ```

2. `ModelOptionRow` (line ~111): add `status?: ModelStatus`. Pass `isDeprecated={status === 'deprecated'}` to `OptionMeta`.

3. In the render callback where `ModelOptionRow` is constructed (lines ~244-259): pass `status={model.status}` through from the model object. Also mark deprecated items as disabled in the PrimeReact option objects passed to the selector.

**ChatConfigLlmSelector.tsx**

This component delegates to `LLMSelector` (line ~19). No structural changes are needed — the `LLMSelector` changes in step above already handle disabled rendering. No edits required unless the wrapping component overrides the options array; verify at implementation time.

---

## Task 5 — Update existing tests to pass with optional `status` field

**Test-first: no** — these are green-ifying updates following the interface change.

The `status` field is optional (`status?: ...`) and defaults to `'enabled'`, so existing test fixtures that omit `status` continue to exercise the enabled path without modification. This task is only needed if any existing fixture or mock assertion explicitly checks the mapped model shape and would fail on the added field.

Check `ModelsCatalogPage.test.tsx`, `LLMSelector.test.tsx`, `ChatConfigLlmSelector.test.tsx`, `ChatPromptLlmSelector.test.tsx` for any `toEqual` / `toMatchObject` assertions over the full model shape. If found, add `status: 'enabled'` to those fixture objects. No logic changes.
