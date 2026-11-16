# Spec: Catalog Status Surfacing
**Slice**: `catalog-status-surfacing` · **Story**: EPMCDME-15077 · **Size**: S

## Problem

`ModelsCatalogPage.tsx` and the `LLMSelector` family display models from `GET /v1/llm_models` but have
no awareness of a model's lifecycle status (active / deprecated / disabled). When the backend slice
ships the `status` field, the UI would silently ignore it. Additionally, `PROVIDER_LABELS` and
`formatCost` are defined locally in `ModelsCatalogPage.tsx` and will be duplicated again when the
sibling branch (`EPMCDME-15077_model-management_FE`) and the not-yet-merged
`EPMCDME-14452_Project-settings-Available-models-UI` branch land — a third copy must be prevented.

## Goals

1. Surface the `status` field from `GET /v1/llm_models` **read-only** in `ModelsCatalogPage.tsx`.
2. Flag deprecated models in the `LLMSelector` family (assistant form, chat prompt, chat config) so
   users can see a model is deprecated before selecting it — without removing it from the list
   (existing configurations must not break).
3. Extract `PROVIDER_LABELS` and `formatCost` into a shared utility before a third copy is created.

## Non-Goals

- No admin mutation UI — no write paths, no per-row actions.
- No backend changes — the backend slice (`status-persistence-api`) owns the API contract.
- No hiding or disabling of deprecated models in selectors — selectable for backward compatibility.
- No notification rules or email triggers.
- No changes to `AdministrationPage.tsx` or any admin route.
- No feature-flag gating of the status column — once the field arrives it is always shown.
- No changes to the `disabled` display path in selectors — backend already filters `disabled`
  models from the regular `GET /v1/llm_models` response; if they ever appear, they are treated
  identically to `deprecated` display-wise.

## API Contract (agreed, consumed by this slice)

The backend slice adds `status: "active" | "deprecated" | "disabled"` to each item in the
`GET /v1/llm_models` JSON array. `status` is optional/absent on the wire for backward compatibility;
absence is treated as `"active"`. Field name follows the existing snake_case convention of the
endpoint (`base_name`, `is_premium`, `default_for_categories`).

## Design

### 1. Shared utility — `src/utils/modelCatalog.ts` (new file, owned by this branch)

Extract from `ModelsCatalogPage.tsx` (src/pages/help/ModelsCatalog/ModelsCatalogPage.tsx:24-33):

```ts
export const PROVIDER_LABELS: Record<string, string> = { /* existing map */ }
export const formatCost = (cost?: { input: number; output: number }): string => /* existing impl */
export type ModelStatus = 'active' | 'deprecated' | 'disabled'
```

`ModelsCatalogPage.tsx` imports from here. The sibling branch and
`AvailableModelsSection.tsx` import from here instead of defining their own copies.
This branch owns the file; the sibling branch must not re-create it.

### 2. `ModelOption` interface — `src/types/entity/configuration.ts:36-47`

Add one optional field:

```ts
status?: 'active' | 'deprecated' | 'disabled'
```

No other field changes.

### 3. `appInfoStore.getLLMModels()` — `src/store/appInfo.ts:326-337`

Map the new field in the existing `data.map(...)` block:

```ts
status: model.status ?? 'active',
```

### 4. `ModelsCatalogPage.tsx` — display changes

- **Import** `PROVIDER_LABELS`, `formatCost` from `src/utils/modelCatalog.ts`; remove local
  definitions.
- **Status column**: add a "Status" `<th>` after "Default for". For each row, render nothing when
  `status === 'active'` (no visual noise for the common case); render a "Deprecated" badge styled
  with amber/warning tokens (`text-aborted-primary border-aborted-primary`) matching the existing
  capability chip class (`capabilityChipClass`) when `status === 'deprecated'`.
- **Deprecated filter toggle**: add a checkbox control alongside the existing "Premium only"
  toggle — "Show deprecated" — default unchecked. When unchecked, deprecated models are hidden from
  the filtered list. This keeps the catalog clean without removing information for users who need it.
  The existing `premiumCount` summary line gains a `deprecatedCount` annotation when any deprecated
  models exist.
- **Row muting**: deprecated rows render with reduced opacity (`opacity-60`) and italic label text to
  signal their status at a glance without relying on the badge alone.

### 5. `LLMSelector` family — `deprecated` meta line

Each of the three selector components shows a second meta line under the model name for
`isPremium`. Extend the same pattern: when `status === 'deprecated'`, show a "Deprecated" span in
amber (`text-aborted-primary`) on that meta line, composable with the existing premium indicator.
The model remains fully selectable. No change to the trigger button appearance.

Affected files (read from analysis):
- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — `LlmOptionRow`
  component receives `status?: ModelStatus` and conditionally renders the deprecated meta span.
- `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — `OptionMeta` component
  (`ChatPromptLlmSelector.tsx:94-106`) gains a `isDeprecated` prop.
- `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` — passes through
  `status` from the model; no structural change of its own.

### 6. Tests

- `ModelsCatalogPage.test.tsx` — extend: assert Status column header present; assert deprecated
  badge rendered for a deprecated-status model; assert deprecated model hidden by default (toggle
  unchecked); assert deprecated model visible after toggling "Show deprecated".
- `LLMSelector.test.tsx` — extend: assert deprecated meta line appears for a model with
  `status: 'deprecated'`; assert it does not appear for `status: 'active'`.
- `ChatPromptLlmSelector.test.tsx` — same shape as above for `OptionMeta`.
- `ChatConfigLlmSelector.test.tsx` — assert deprecated meta line visible in the rendered selector.

## Acceptance Criteria

1. `src/utils/modelCatalog.ts` exports `PROVIDER_LABELS`, `formatCost`, and `ModelStatus`; no
   other file in the repo defines its own copy of either.
2. `ModelOption.status` is typed `'active' | 'deprecated' | 'disabled' | undefined`.
3. `appInfoStore.getLLMModels()` maps `model.status` to `ModelOption.status`, defaulting to
   `'active'` when absent.
4. `ModelsCatalogPage` renders a "Status" column; deprecated models show an amber "Deprecated"
   badge; active models show no badge.
5. Deprecated models are hidden by default in `ModelsCatalogPage`; a "Show deprecated" toggle
   reveals them.
6. Deprecated model rows are visually muted (reduced opacity, italic label).
7. Each `LLMSelector` family component renders a "Deprecated" meta line for models with
   `status === 'deprecated'`; that line is absent for active models.
8. Deprecated models remain selectable in all selectors.
9. All existing tests continue to pass without modification (field is optional; existing fixtures
   omitting `status` are treated as active).
10. New test cases cover the four display scenarios listed in §6.
