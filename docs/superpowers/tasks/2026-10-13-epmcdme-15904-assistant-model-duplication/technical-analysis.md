# Technical Research

**Task**: model selection dropdown, assistant chat, recommended model, model list rendering
**Generated**: 2026-10-13T00:00:00Z
**Research path**: filesystem (codegraph MCP tool not available in this environment)

---

## 1. Original Context

EPMCDME-15904 — Assistant chat: model marked as 'Recommended' is duplicated in the model selection list. In the project assistant chat, the model selection dropdown shows the same model twice. A model marked as 'Recommended' appears with the 'Recommended' tag, then appears again as a regular item in the 'Models' section. Each model should appear only once in the list. Acceptance Criteria: (1) A model marked as 'Recommended' is displayed only once in the model selection dropdown. (2) The model keeps its 'Recommended' label. (3) The model is not repeated as a regular item in the 'Models' section. (4) All other models are still displayed once each. (5) Search in the dropdown ('Search models…') does not return duplicated entries. Related story: EPMCDME-14349 (Project-Level Model Availability).

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — **This is the component the ticket describes.** It renders the chat-prompt-bar model dropdown with a "Default" row, an optional "Routers" section, and a "Models" section (the literal text "Models" is only produced by this file, at line 352-355, confirming this is the exact UI in the bug report).
- `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` — A second, unrelated model picker (chat *configuration* panel, not the prompt-bar dropdown). It delegates to the shared `LLMSelector` component (below) with `allowEmpty` set, which happens to avoid the sibling bug described below. Not implicated in this ticket but documented because it is easy to confuse with the prompt-bar selector.
- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — Shared `MultiSelect`-based selector used by `ChatConfigLlmSelector` and the Assistant Form. Contains the **same duplication anti-pattern** (see Risk Indicators) but is gated off by `allowEmpty=true` in the chat-config call path, so it does not reproduce today. Worth flagging as a latent sibling bug, not in scope for this fix unless the user wants it addressed too.
- `src/store/chats.ts` — `chatsStore.filteredModels` (declared line 199, initialized line 313) and `getModelsForCurrentChat()` (lines 1053-1074): fetches the project-scoped model list via `getFilteredModelsForProject(projectId, appInfoStore.llmModels)` and stores it in `filteredModels`. This is the `projectFilteredModels` the selector consumes.
- `src/utils/projectModelFiltering.ts` — `getFilteredModelsForProject()` (line 27): implements the EPMCDME-14349 project allow-list filtering (restricts the catalog to `project.allowed_models`, normalizing versioned ids). It passes the `isDefault` flag through untouched — it has no awareness of "recommended" and does no deduplication.
- `src/store/appInfo.ts` — `getLLMModels()` and the router loader map backend `model.default` / `router.default` → `isDefault` on each `ModelOption`/router object (lines 162, 367, 420). This is the single source of the "recommended" signal; there is no separate "recommended" store or API field.
- `src/store/llmModels.ts` — a second, apparently older/alternate mapper also setting `isDefault: m.default` (type at line 31, mapping at line 44). Not implicated in this bug (the chat selector uses `appInfoStore`/`chatsStore`, not this module), but a reader should not confuse it with the active path.

### Architecture and Layers Affected

- **Presentation layer only.** The bug is a pure rendering/list-construction defect inside one React component (`ChatPromptLlmSelector.tsx`). No store, API, or type change is required to fix it.
- The component composes a generic `SearchableCombobox` (`src/components/SearchableCombobox.tsx`) by handing it a flat `items: ComboboxItem<LlmValue>[]` array plus `renderOption`/`renderSeparatorBefore` callbacks that interpret special ids (`OPTION_ID_DEFAULT`, `OPTION_ID_RECOMMENDED`) to decide which section/header to draw. The combobox itself has no dedup logic — whatever `items` contains is rendered, once per entry.

### Root Cause — exact location

File: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx`

1. **How the "Recommended" model is selected** (lines 184-187):
   ```ts
   const defaultModel = useMemo(() => {
     if (defaultRouter) return null
     return modelsToDisplay.find((m) => m.isDefault) ?? modelsToDisplay[0] ?? null
   }, [modelsToDisplay, defaultRouter])
   ```
   `defaultModel` is simply the first model in `modelsToDisplay` with `isDefault === true` (falling back to the first model in the list). `modelsToDisplay` (lines 175-178) is either the project-filtered list (`chatsStore.filteredModels`) or the global list (`appInfoStore.llmModels`) — in both cases the **full** catalog, including the default/recommended model itself.

2. **How the regular "Models" list is built, with the missing filter** (lines 218-222 and 236-254):
   ```ts
   const filteredSearchResults = useMemo(() => {
     if (!search.trim()) return modelsToDisplay
     const q = search.toLowerCase()
     return modelsToDisplay.filter((m) => m.label.toLowerCase().includes(q))
   }, [modelsToDisplay, search])
   ...
   const items = useMemo<ComboboxItem<LlmValue>[]>(() => {
     const list: ComboboxItem<LlmValue>[] = []
     if (!search) {
       list.push({ id: OPTION_ID_DEFAULT, value: ASSISTANT_DEFAULT_VALUE })
       if (!isGrouped && defaultModel) {
         list.push({ id: OPTION_ID_RECOMMENDED, value: defaultModel.value })      // Recommended row (flat layout)
       }
     }
     filteredRouters.forEach((r) => { list.push({ id: optionIdForRouter(r.value), value: r.value }) })
     if (isGrouped && !search && defaultModel) {
       list.push({ id: OPTION_ID_RECOMMENDED, value: defaultModel.value })        // Recommended row (grouped layout)
     }
     filteredSearchResults.forEach((m) => {
       list.push({ id: optionIdForModel(m.value), value: m.value })              // <-- BUG: re-adds defaultModel, unfiltered
     })
     return list
   }, [search, defaultModel, filteredRouters, filteredSearchResults, isGrouped])
   ```
   `filteredSearchResults` is derived straight from `modelsToDisplay` with **no exclusion of `defaultModel.value`**. Whichever branch pushes `OPTION_ID_RECOMMENDED` (line 241 for the flat/no-router layout, line 248 for the grouped layout), the very next `filteredSearchResults.forEach(...)` loop (lines 250-252) iterates over the unfiltered list and pushes the same model's id a second time via `optionIdForModel(m.value)`. `renderOption` (lines 361-401) then renders two separate `<ModelOptionRow>`s with the same label/value — one tagged `recommended` (from the `OPTION_ID_RECOMMENDED` branch at line 371-379), one plain (from the generic model branch at line 392-400) under the "Models" header. This is exactly the bug described in the ticket.

3. **Why the fix is a single, narrow change**: this is the only place the "Models" section list is assembled. The fix is to exclude `defaultModel?.value` from the list that feeds `filteredSearchResults`/the `.forEach` at line 250 whenever the Recommended row is being shown (i.e., `!search && defaultModel`), for both the grouped and non-grouped layouts. A minimal patch point is filtering `filteredSearchResults` (or its input `modelsToDisplay`) by `m.value !== defaultModel?.value` when `!search`, or filtering directly inside the forEach at line 250.

4. **Search behavior (AC5)**: When `search` is non-empty, `OPTION_ID_RECOMMENDED` is never pushed — both branches (line 238's outer `if (!search)` and line 247's `isGrouped && !search`) are search-gated. So while actively typing in "Search models…", only the plain filtered model list renders; there is no second, separately-injected Recommended row to collide with it. The duplication is strictly an **empty-search / initial-open** rendering defect, not a separate search-time bug — fixing the root cause above (excluding `defaultModel.value` from the regular list when the Recommended row is shown) satisfies AC5 as a side effect, since the only state where both compete is `!search`.

### Patterns and Conventions

- `ComboboxItem<T>` list-building convention: a flat array of `{ id, value }` built imperatively with `list.push(...)` inside a single `useMemo`, with synthetic sentinel ids (`OPTION_ID_DEFAULT`, `OPTION_ID_RECOMMENDED`) used to special-case rendering in `renderOption`/`renderSeparatorBefore`. Any new "pinned" or "pulled-to-top" row in this combobox pattern must remember to exclude that row's underlying value from the generic enumeration loop — this bug is exactly a missed instance of that convention.
- `isGrouped` toggles between the legacy flat layout (Default → Recommended → Models) and the newer grouped layout (Default → Routers → Models-with-Recommended-first), introduced to support LLM routers. Both layouts share the same unfiltered-forEach defect.
- Section headers ("Routers", "Models") are injected via `renderSeparatorBefore`, keyed off whichever item id is first in that section — this header logic is unaffected by the fix.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` and `.ai-run/guides/components/component-patterns.md` cover Valtio store and component conventions generally but do not document this specific combobox-list-building pattern.
- No guide specifically documents the "Recommended model" / router-grouping feature. The intent and history of the grouped-vs-flat layout is instead recorded as inline comments in the component itself (lines 48-53, 93-96, 230-233 of `ChatPromptLlmSelector.tsx`) — this repo's prevailing convention is "self-documenting via comment, not a separate guide" for component-local decisions.
- No guides found for `.ai-run/guides/` specific to the LLM model selector; conventions above are derived from code exploration.

### Architectural Decisions

- Inline comment at lines 230-233 records the decision that grouped layout (Default/Routers/Models with Recommended first) only activates once `llmRouters.length > 0`; with zero routers the dropdown keeps the pre-router flat shape. Both code paths funnel into the same unfiltered forEach, so the bug reproduces in both layouts.
- Inline comment at lines 48-53 documents an earlier width/sizing fix (unrelated to this bug) — evidence this file has had several incremental UI tweaks; care should be taken that the duplication fix does not regress those documented layout decisions.

### Derived Conventions

- Model "recommended" status is purely the `isDefault` boolean already present on `ModelOption` (mapped from backend `model.default`); there is no separate "recommended models" API, config, or Valtio store to reconcile.
- Project-scoped model lists (EPMCDME-14349) are produced by filtering a global list down to an allow-list — they do not re-derive or clear `isDefault`, so a project's "recommended" model is whichever filtered model still carries that flag (or the first model in the filtered list as a fallback, per line 186).

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` is the primary test file for this component and already contains fixtures that reproduce the duplicate state without asserting against it:
  - Lines 668-679: fixture sets `mockAppInfoStore.llmModels` with `{ label: 'GPT-4', value: 'gpt-4', isDefault: true }` plus a second model, and a router fixture (`llmRouters`).
  - Lines 695-708 (`'groups into Default, then Routers, then Models (recommended model first) once a router exists'`): asserts only on **document order** of the Default row, Routers header, router row, Models header, and the `chat-llm-selector-option-recommended` element — it does not assert there is exactly one row for GPT-4.
  - Lines 763-768 (`'does not mark any concrete model as Recommended'`): asserts `screen.getAllByText('Recommended')).toHaveLength(1)` — checks the *label text* count, not the underlying model-row count, so it would still pass even with the duplicate plain "GPT-4" row present.
  - Lines 685-693 (`'renders the old flat list...'`): same gap for the non-grouped layout — checks `chat-llm-selector-option-recommended` exists but never checks `chat-llm-selector-option-gpt-4` (the plain row id for the same model) is *absent*.
- Other test files touching this component (not fully read, listed for completeness): `ChatPromptLlmSelector.tooltipStranding.test.tsx`, `ChatPromptLlmSelector.projectModels.test.tsx`, `ChatPremiumModelTipSlot.test.tsx`, `ChatPrompt.premiumTooltip.test.tsx`.
- Related store/util tests: `src/store/__tests__/appInfo.test.ts`, `src/store/__tests__/appInfo.projectLlmModels.test.ts`, `src/store/__tests__/chats.test.ts`, `src/utils/__tests__/projectModelFiltering.test.ts` — these cover the data layer (unaffected by this bug) and do not need changes for the fix itself, but are useful regression anchors to confirm the fix doesn't touch filtering semantics.

### Testing Framework and Patterns

- Vitest + React Testing Library. Mocked Valtio stores (`mockAppInfoStore`, `mockChatsStore`) assigned directly to plain objects standing in for `useSnapshot(...)` results. Assertions use `screen.getByRole('option', ...)`, `document.getElementById(<deterministic option id>)`, and `compareDocumentPosition` (`isBefore` helper, lines 663-666) to check ordering.

### Coverage Gaps

- No test asserts that a model marked `isDefault: true` appears **exactly once** in the DOM (e.g. via `document.getElementById('chat-llm-selector-option-gpt-4')` being `null` while `chat-llm-selector-option-recommended` exists, or `screen.getAllByRole('option', { name: /GPT-4/ })` having length 1). This is the direct test gap the fix must close for AC1/AC3.
- No test covers AC5 (searching for a recommended model's name/partial text does not yield two rows). Given the root-cause analysis above, this should already hold once the base-list fix lands, but there is no regression test pinning it down.
- No test covers AC4 ("all other models are still displayed once each") in a multi-model fixture after the fix — current fixtures use only 2 models (GPT-4 default, Claude-2 non-default); a 3+ model fixture would make a regression (e.g. an over-eager filter that drops more than the one recommended model) visible.

---

## 5. Configuration and Environment

### Environment Variables

- None relevant. No env var or feature flag gates the Recommended-model grouping or the router-grouped layout (`isGrouped` is derived purely from `llmRouters.length > 0`, which itself comes from backend-returned data via `appInfoStore`).

### Configuration Files

- None specific to this bug. General API base URL config (`VITE_API_BASE_URL`) and routing (`src/router.tsx`) are unaffected.

### Feature Flags and Deployment Concerns

- No feature flag wraps this dropdown or the grouped/flat layout toggle. Purely client-side rendering fix; no backend or deployment change required.

---

## 6. Risk Indicators

- **Root-cause fix is narrowly scoped but shared by two layout branches**: the fix must handle both the non-grouped (`!isGrouped`, line 241) and grouped (`isGrouped`, line 248) paths, since both push `OPTION_ID_RECOMMENDED` and both feed the same unfiltered `filteredSearchResults.forEach` loop at lines 250-252. A fix that only patches one branch will leave the bug present whenever `llmRouters.length > 0` (or `=== 0`), depending on which branch was patched.
- **No existing test enforces "appears exactly once"** — `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` lines 685-708, 763-768 reproduce the duplicate state in fixtures but assert only ordering/label-count, not row-count-per-model. New tests are required to pin AC1–AC5; this is a genuine coverage gap, not just a missing assertion.
- **Sibling latent bug in a shared component**: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` lines 180-197 has the identical anti-pattern — `options` pushes a `${defaultOptionLabelPrefix}: label` row for `defaultLlmModel` and then unconditionally spreads `models.map(...)`, which still includes `defaultLlmModel`. It does not reproduce today only because the one call site that triggers chat-dropdown behavior (`ChatConfigLlmSelector.tsx`) passes `allowEmpty=true`, which skips the `!allowEmpty && defaultLlmModel?.value` branch (line 183) that adds the "Recommended: X" row. Any future caller with `allowEmpty=false` plus a `defaultOptionLabelPrefix` would reproduce the same duplicate-row bug. Worth flagging to the user/reviewer as a related issue, likely out of scope unless they want both fixed together.
- **`defaultModel` fallback to `modelsToDisplay[0]`** (line 186) means that even when no model has `isDefault: true`, *some* model is still treated as "recommended" and rendered with the tag. The duplication bug therefore affects every project/chat state, not just ones with an explicitly backend-flagged default model — the fix must handle both the explicit-default and fallback-to-first-model cases identically (both flow through the same `defaultModel` variable, so a single fix location naturally covers both).
- **Project-level model filtering (EPMCDME-14349) is orthogonal but intersects**: `getFilteredModelsForProject()` can return a project-restricted list where the previously-"recommended" model might be excluded entirely (not in `allowed_models`) — in that case `defaultModel` falls back to `modelsToDisplay[0]` of the restricted list (line 186), and the duplication bug still applies to whichever model ends up tagged recommended within the restricted list. No special-case handling currently exists for "the project's allow-list excludes the catalog default" beyond this fallback; this is pre-existing behavior unrelated to the duplication fix, documented here only because it is adjacent code a reviewer might otherwise suspect.
- **codegraph MCP tool unavailable** — research was done via direct filesystem reads and one Explore subagent rather than semantic code graph search. Cross-reference coverage of this component's full caller graph (e.g. every place `ChatPromptLlmSelector` is mounted) was not exhaustively verified; however, a `Grep` for the component's usage and the "Models" section header text strongly indicates this file is the single implementation responsible for the reported UI.

---

## 7. Summary for Complexity Assessment

This is a **single-file, presentation-layer bug fix** with a precisely identified root cause: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx`, lines 218-222 and 236-254. The component already determines the "Recommended" model (`defaultModel`, lines 184-187) correctly from the existing `isDefault` flag on `ModelOption`, and already renders a distinct `OPTION_ID_RECOMMENDED` row with the "Recommended" label — the only defect is that the generic "Models" section loop (`filteredSearchResults.forEach`, line 250) iterates over the unfiltered model list and re-adds the same model as a plain row. No store, API, type, or routing changes are needed; the fix is to exclude `defaultModel?.value` from the list feeding that loop whenever the Recommended row is shown (both the grouped and non-grouped layout branches). Estimated file-change surface is 1 implementation file plus test additions/updates to the existing `ChatPromptLlmSelector.test.tsx` (and possibly the related `.projectModels.test.tsx` file) — roughly 1-3 files total.

Technical novelty is very low: the fix follows an established pattern already present in the file (special-casing one sentinel id and excluding it elsewhere), it does not introduce any new architecture, store, or component. Test coverage posture is the primary risk: the existing test suite already has fixtures that reproduce the exact duplicate-row DOM state but currently assert only on ordering and label counts, not per-model row uniqueness — meaning the bug has effectively been "tested around" rather than caught, and new/updated assertions are required to lock in AC1–AC5 (especially AC3's "not repeated in Models section" and AC5's search-no-duplicates, both of which need explicit `getAllByRole`/`queryByTestId` row-count assertions that do not currently exist).

Key risk factors for complexity scoring: (1) the fix must correctly handle two layout branches (grouped-with-routers vs. flat-without-routers) sharing one forEach loop — a partial fix is easy to accidentally ship; (2) a near-identical anti-pattern exists in the shared `LLMSelector.tsx` component used elsewhere in the app, which is latent today but could confuse a reviewer or tempt an over-broad fix — scope should stay confined to `ChatPromptLlmSelector.tsx` unless the user explicitly asks for the sibling to be fixed too; (3) the `defaultModel` fallback-to-first-model behavior (no model explicitly flagged default) means the fix must not assume `isDefault` is always true for exactly one model. Overall this should score as low complexity: a small, well-localized, well-understood change with a short, concrete acceptance-criteria list and a clear single-file fix location, offset slightly by the need for new regression tests to actually enforce the "once only" invariant.
