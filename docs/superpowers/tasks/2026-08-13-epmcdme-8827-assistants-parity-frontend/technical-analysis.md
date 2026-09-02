# Technical Research

**Task**: workflows version-history yaml-config assistants-parity
**Generated**: 2026-08-13
**Research path**: filesystem

---

## 1. Original Context

Review docs/EPMCDME-8827-assistants-parity-frontend.md and implement changes from it

The spec document (source of truth, read in full) is `docs/EPMCDME-8827-assistants-parity-frontend.md`:

```
# EPMCDME-8827 — Frontend: Assistants Version History UX Parity

**Repository:** `codemie-ui`
**Branch:** `EPMCDME-8827_workflow-version-history-fe`
**Goal of this doc:** List frontend redundancies to remove and adjustments to make so Workflow YAML version history matches **Assistants System Instructions Version History UX**.

## Target UX (Assistants)

Reference: `SystemPrompt.tsx` / `SystemPromptExpandedModal` + shared `VersionedFieldHistoryTab`.

1. Open Version History from the editor chrome (beside related actions).
2. Select a prior version; label is FE-derived: `[NN] - date - author`.
3. Show a diff of selected prior content vs current editor value.
4. **Restore** copies the selected content into the form/editor only.
5. User must click **Save** to persist; no `.../rollback` call.
6. History data comes from the entity payload (`system_prompt_history`), not a separate versions store for that UI.

Workflows should mirror that: use `workflow.yaml_config_history`, client Restore, page Save.

## Current Workflow FE divergence

The Workflow branch today:

- Fetches `GET /v1/workflows/{id}/versions` (paginated summaries).
- Loads YAML via `GET /v1/workflows/{id}/versions/{version_id}`.
- On Restore confirm, calls `POST .../versions/{version_id}/rollback` and reloads the workflow (`EditWorkflowPage.handleRollbackConfirm`).
- Uses `version_id` / `version_number` / `is_current` / `created_at` from the versions API.

That is **stricter than Assistants’ Version History button** (and depends on backend surface that is redundant for Assistants UX parity).

## Redundant — remove

### Versions API client / store

| Path | Reason |
|---|---|
| `src/store/workflowVersions.ts` | `fetchVersions` / `fetchVersionDetail` / `rollbackVersion` against `/v1/workflows/.../versions` |
| `src/store/__tests__/workflowVersions.test.ts` | Tests for that store |
| `src/types/entity/workflowVersion.ts` | Types for versions API summaries/details |

### Server rollback orchestration on the edit page

In `src/pages/workflows/EditWorkflowPage.tsx`, remove:

- `rollbackLoading` / `restoreTarget` state used for **server** rollback
- `handleRollbackConfirm` calling `workflowVersionsStore.rollbackVersion`
- Confirm dialog copy/flow that implies immediate server restore without Save
- `listRefreshToken` / versions-list refresh after rollback errors
- Post-rollback `fetchWorkflow` + `reinitializeFromWorkflow` as the Restore success path

(Keep a confirm dialog only if product still wants “are you sure?” before putting YAML into the editor — Assistants currently restore without a separate server round-trip.)

### Popup logic tied to versions API

In `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx` (and its tests), remove:

- Loading/paging from `workflowVersionsStore`
- `fetchVersionDetail` / detail cache keyed by `version_id`
- Filtering on `is_current` from API summaries
- Labels from `version.version_number` + `version.created_at`
- `onRestoreRequest(versionSummary)` that expects a server rollback parent handler
- “Load more” / “Showing N of M versions” pagination UI (Assistants prompt history does not paginate via a versions API)

### Tests asserting server restore

Update or remove cases in:

- `WorkflowVersionHistoryPopup.test.tsx` that expect rollback/detail API usage
- Any `EditWorkflowPage` tests that assert `POST .../rollback`

## Adjustments — make (parity path)

### 1. Data source: embedded `yaml_config_history`

Drive the history UI from the loaded workflow (same idea as `assistant.system_prompt_history`):

- Type: existing `WorkflowConfigHistoryItem` on `src/types/entity/workflow.ts` (`yaml_config`, `date`, `created_by`).
- Pass `workflow.yaml_config_history` into the popup / history tab (via props from `EditWorkflowPage` / `WorkflowForm`), instead of fetching `/versions`.

Backend GET must return prior-only history for this to work (see companion backend doc).

### 2. Option labels: FE index math (Assistants pattern)

Match Assistants:

```ts
const versionNumber = history.length - index
label = `[${String(versionNumber).padStart(2, '0')}] - ${formatDateTime(entry.date, 'short')} - ${createdBy(entry.created_by)}`
```

Do not require `version_number` / `version_id` / `created_at` from a versions API.

Option `value` should identify a history row stably enough for the select (Assistants use `date`; Workflows previously used `yaml_config` in places — prefer something unique per entry, e.g. `date` + index, without inventing backend UUIDs).

### 3. Diff: selected history YAML vs current editor YAML

Keep side-by-side / unified diff against **current editor content** (prop like today’s `currentEditorYaml`).

Load selected YAML from the embedded history entry — **no** detail GET.

(Optional: diff vs the next-older history entry can stay client-side from the same array; do not fetch previous via `/versions/{id}`.)

### 4. Restore = write into the form only

Align with Assistants `handleRestore`:

- Set editor/form `yaml_config` to the selected history entry’s `yaml_config`.
- Close or leave the history UI as Assistants does.
- Toast that the value was restored in the editor (not “restored on server”).
- **Do not** call rollback.
- User confirms with the page **Save** button (existing workflow update).

Permissions: hide Restore for READ-only users (already intended); Save remains the write gate.

### 5. Keep Assistants-aligned chrome that is still useful

These can remain; they match or improve Assistants placement without needing the versions API:

- Version History entry in YAML header actions (`WorkflowYamlHeaderActions`, `YamlPanel`, `WorkflowConfigField`) beside Documentation.
- Shared `VersionedFieldHistoryTab` + `VersionHistoryDiffView` presentation.
- Single page-level popup owned by `EditWorkflowPage` (avoid duplicate history tabs inside both editors).
- No editable tags / notes / compare-two-versions table (already removed vs earlier messy UI).

### 6. After Save

Rely on normal workflow reload/refetch after successful Save so `yaml_config_history` updates (new prior entry prepended). No versions-store invalidation.

## Mapping: Assistants vs desired Workflows

| Concern | Assistants today | Workflows after parity |
|---|---|---|
| History source | `system_prompt_history` on assistant | `yaml_config_history` on workflow |
| Labels | FE `length - index` | Same |
| Diff | Selected vs current prompt | Selected vs current YAML |
| Restore | `onChange(oldPrompt)` | Put old YAML into form/editor |
| Persist | Form Save | Workflow Save |
| Rollback HTTP | Not used by this UI | **Do not use** |

## Dependency on backend

This FE direction assumes the backend companion doc:

- No requirement on `/v1/workflows/.../versions` or rollback.
- Workflow GET still returns prior-only `{ yaml_config, date, created_by }[]`.

If backend keeps the versions API temporarily, the FE should still stop calling it for this UX so the product behavior matches Assistants even before backend deletion.

## Suggested outcome

Workflow Version History becomes a UI over embedded history: select → diff → Restore into editor → user Saves — same interaction model as Assistants System Instructions Version History, without a workflow versions store or server rollback.
```

---

## 2. Codebase Findings

### Existing Implementations

#### Current file map (remove / keep / adjust)

**Remove (versions API + server rollback)**

| Path | Role today | Why remove |
|---|---|---|
| `src/store/workflowVersions.ts` | Valtio store: `fetchVersions`, `fetchVersionDetail`, `rollbackVersion`, `clearVersions`, `hasMoreVersions`, `DEFAULT_VERSIONS_LIMIT = 50` | Entire `/v1/workflows/{id}/versions*` client |
| `src/store/__tests__/workflowVersions.test.ts` | Unit tests for list/detail/**POST rollback** | Tied to store being deleted |
| `src/types/entity/workflowVersion.ts` | `WorkflowVersionAuthor`, `WorkflowVersionSummary`, `WorkflowVersionDetail`, `WorkflowVersionsFetchParams` | Versions-API-only types; not re-exported from `src/types/entity/index.ts` |

**Adjust (parity path — keep files, change data/restore semantics)**

| Path | Role today | Required change |
|---|---|---|
| `src/pages/workflows/EditWorkflowPage.tsx` | Owns popup + **server** restore | Remove `rollbackLoading`, `restoreTarget`, `handleRollbackConfirm`, `versionListRefreshToken` / `listRefreshToken`, rollback `ConfirmationModal`. Restore should write YAML into the form (see `replaceYamlConfig`) and toast editor restore. Pass `currentWorkflow.yaml_config_history` into the popup. Keep `showVersionHistory`, `versionHistoryYaml`, `handleShowVersionHistory`, `canWrite`. |
| `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx` | List/detail/paging via `workflowVersionsStore` | Stop importing the store. Drive options from `yaml_config_history` props. Labels via `history.length - index`. Restore = local YAML, not `onRestoreRequest(WorkflowVersionSummary)`. Drop `fetchVersionDetail` / `detailCacheRef` / Load more / `is_current` filter. |
| `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx` | Mocks versions store; asserts `fetchVersions` / `fetchVersionDetail` / pagination / `onRestoreRequest(summary)` | Rewrite for embedded history + client restore + FE labels. Keep `canWrite={false}` hides Restore. |

**Keep (chrome, shared presentation, entity history type, save path)**

| Path | Role | Keep reason |
|---|---|---|
| `src/types/entity/workflow.ts` | `WorkflowConfigHistoryItem` + `Workflow.yaml_config_history` | **Already present** — this is the Assistants-equivalent payload type |
| `src/pages/workflows/components/WorkflowYamlHeaderActions.tsx` | Version History button beside Documentation; `onShowVersionHistory(getVisibleYaml())` | Spec §5 keep |
| `src/pages/workflows/editor/configPanels/YamlPanel.tsx` | Visual editor header actions | Spec §5 keep |
| `src/pages/workflows/components/WorkflowConfigField.tsx` | Legacy YAML editor header actions | Spec §5 keep |
| `src/pages/workflows/components/WorkflowForm.tsx` | `onShowVersionHistory` plumbing; `replaceYamlConfig`; `reinitializeFromWorkflow`; echoes `yaml_config_history` on visual-editor Save | Keep chrome + `replaceYamlConfig` as client-restore primitive. Do **not** use `reinitializeFromWorkflow` as Restore success (that resets dirty baseline after **server** rollback). |
| `src/components/form/VersionedField/VersionedFieldHistoryTab.tsx` | Autocomplete + Restore; optional `canRestore`, `listStatusText`, `hasMore`, `onLoadMore` | Shared with Assistants. After parity, workflows stop passing paging props (Assistants already omit them). |
| `src/components/form/VersionedField/VersionHistoryDiffView.tsx` | Props: `historyText`, `currentText`, `previousHistoryText?`, `title` | Keep; selected YAML vs `currentEditorYaml`; previous sibling from the same array |
| `src/pages/assistants/.../SystemPrompt/SystemPrompt.tsx` | Reference UX | Read-only reference, no change required by this task |
| `src/pages/assistants/.../SystemPrompt/SystemPromptExpandedModal.tsx` | Expanded history modal | Reference only |
| `src/pages/workflows/details/hooks/useWorkflowData.ts` | Uses `yaml_config_history` to reconstruct execution-time YAML | **Do not change** — separate consumer of the same field |

#### Assistants reference UX (concrete names)

**Files**

- `src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPrompt.tsx`
- `src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptExpandedModal.tsx`
- `src/pages/assistants/components/AssistantForm/components/SystemPrompt/useSystemPromptState.ts` (`selectedHistoryOption`, `activeTab`, expand)
- `src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptVersionHistoryView.tsx` (re-export of `VersionHistoryDiffView`)
- `src/types/entity/assistant.ts` — `system_prompt_history`

**History source:** `assistant.system_prompt_history` on the GET entity. No versions store. **No rollback HTTP** in this UI.

**Type (inline on `Assistant`):**

```ts
system_prompt_history: {
  date: string
  system_prompt: string
  created_by: { id: string; username: string; name: string }
}[]
```

**Labels** (`SystemPrompt.tsx`):

```ts
const versionNumber = assistant.system_prompt_history.length - index
label: `[${String(versionNumber).padStart(2, '0')}] - ${formatDateTime(entry.date, 'short')} - ${createdBy(entry.created_by)}`
value: entry.date
```

**Restore** (`handleRestore`):

```ts
onChange(selectedHistoryOption.system_prompt)
setIsExpanded(false)
toaster.info('Assistant system instructions have been restored successfully!')
```

No confirm modal. Persist is the assistant form Save. Diff: `historyText` = selected `system_prompt`, `currentText` = form `value`, `previousHistoryText` = `history[selectedIndex + 1]?.system_prompt`.

**Permissions:** Assistants do **not** pass `canRestore` (defaults `true` on `VersionedFieldHistoryTab`).

#### Workflows today (concrete names)

**Store methods / URLs** (`src/store/workflowVersions.ts`, hardcoded paths, base = `VITE_API_URL`):

| Method | Path | Function |
|---|---|---|
| GET | `v1/workflows/${workflowId}/versions?limit=&offset=` | `fetchVersions` |
| GET | `v1/workflows/${workflowId}/versions/${versionId}` | `fetchVersionDetail` |
| POST | `v1/workflows/${workflowId}/versions/${versionId}/rollback` | `rollbackVersion` |

**Popup** (`WorkflowVersionHistoryPopupProps`): `visible`, `workflowId`, `canWrite`, `currentEditorYaml`, `listRefreshToken?`, `onHide`, `onRestoreRequest(version: WorkflowVersionSummary)`.

- Labels: `buildOptionLabel` uses `version.version_number` + `version.created_at` + `formatAuthor` → `createdBy(author)`
- Option `value`: `version.version_id`
- Filters `!v.is_current`, sorts by `version_number`
- Detail YAML from `fetchVersionDetail`; previous version via extra detail GET + `detailCacheRef`

**EditWorkflowPage state / handlers:**

- `showVersionHistory`, `versionHistoryYaml`, `versionListRefreshToken` (passed as `listRefreshToken`)
- `restoreTarget: WorkflowVersionSummary | null`
- `rollbackLoading: boolean`
- `handleShowVersionHistory(visibleYaml?: string)`
- `handleRestoreRequest(version)` → sets `restoreTarget`
- `handleRollbackConfirm` → `workflowVersionsStore.rollbackVersion(id, target.version_id)` → `workflowsStore.fetchWorkflow` + `formRef.reinitializeFromWorkflow` → toast ``Restored from version ${padStart(version_number)}``
- Rollback `ConfirmationModal` copy: *"Rollback creates a new current version and discards all unsaved Workflow edits. Continue?"*
- `canWrite = canEdit(currentWorkflow)` → popup `canRestore={canWrite}`

**Client restore primitive already on the form** (`WorkflowFormRef.replaceYamlConfig`):

```ts
replaceYamlConfig: (yaml: string) => {
  setYamlConfig(yaml)
  if (!isUsingVisualEditor && formFieldsRef.current) {
    formFieldsRef.current.setYamlConfig(yaml)
  }
  blockTransition()
}
```

This is the Assistants `onChange` analogue. AI refine already uses it (`handleRefined` / `handleRevertConfirm`). **Do not** call `reinitializeFromWorkflow` on Restore — that method’s comment is “Apply server workflow after rollback and treat it as the clean baseline.”

**Persist after Restore (parity):** existing `submit` → `workflowsStore.updateWorkflow` → `PUT v1/workflows/${id}`. Successful Save currently navigates away via `goBackFromWorkflowEdit` unless Save and Run. Next edit GET is what refreshes `yaml_config_history` (spec §6).

#### Types already present — `yaml_config_history` is **not** missing on GET types

`src/types/entity/workflow.ts`:

```ts
export interface WorkflowConfigHistoryItem {
  yaml_config: string
  date: string
  created_by: {
    user_id: string
    username: string
    name: string
  }
}

export interface Workflow {
  // ...
  yaml_config_history: WorkflowConfigHistoryItem[]  // required on the entity
}
```

`workflowsStore.fetchWorkflow` types the GET `v1/workflows/id/${id}` response `as Workflow`, so TypeScript already expects `yaml_config_history`.

**Used today:**

- `WorkflowForm.getFormValues` (visual editor) includes `yaml_config_history: workflow?.yaml_config_history || []` in the PUT payload
- `useWorkflowData.ts` reconstructs execution-time YAML from history + current `yaml_config`
- Fixtures (e.g. `EditWorkflowPage.integration.test.tsx`) already include history items with `{ date, yaml_config, created_by: { user_id, username, name } }`
- Clone/template helpers in `src/store/workflows.ts` set `yaml_config_history: []`

**Not used today by the version-history popup.** The popup never reads `workflow.yaml_config_history`.

**Author field shape vs Assistants:** history items use `user_id`; Assistants `system_prompt_history.created_by` uses `id`. `createdBy()` in `src/utils/helpers.ts` already accepts both `user_id` and `id`. Not a type-gap blocker.

#### Assistants vs Workflows comparison

| Concern | Assistants today | Workflows today | Workflows after parity |
|---|---|---|---|
| History source | `system_prompt_history` on GET | `GET .../versions` + detail GET | `yaml_config_history` on GET |
| Content field | `system_prompt` | `WorkflowVersionDetail.yaml_config` (fetched) | `WorkflowConfigHistoryItem.yaml_config` |
| Label index | `history.length - index` | `version.version_number` | `history.length - index` |
| Option value | `entry.date` | `version.version_id` | `date` + index (spec; Assistants use `date` alone) |
| Diff current | Form `value` | `currentEditorYaml` | Keep `currentEditorYaml` |
| Diff previous | Next array item | Extra `fetchVersionDetail` | Next array item (optional) |
| Restore handler | `handleRestore` → `onChange(...)` | `onRestoreRequest` → confirm → `rollbackVersion` | `replaceYamlConfig(entry.yaml_config)` |
| Persist | Form Save | Immediate POST rollback | Page **Save** → `PUT v1/workflows/${id}` |
| Rollback HTTP | Not used | `POST .../versions/{id}/rollback` | **Do not use** |
| Paging | None | Limit 50 + Load more | None |
| Store | None | `workflowVersionsStore` | None |
| Restore gate | Restore always shown | `canRestore={canWrite}` | Keep WRITE gate |
| Confirm modal | None | Server-rollback confirm | Drop unless product insists on “are you sure?” before editor write |
| Toast | “restored successfully” (editor) | “Restored from version NN” (server) | Editor restore, not server |

#### Integration / call graphs (current)

```
EditWorkflowPage.handleShowVersionHistory
  → WorkflowForm.onShowVersionHistory
    → WorkflowFormFields / WorkflowEditor → YamlPanel | WorkflowConfigField
      → WorkflowYamlHeaderActions.onShowVersionHistory(getVisibleYaml())

Restore today:
  VersionedFieldHistoryTab.onRestore
    → WorkflowVersionHistoryPopup.onRestoreRequest(selectedSummary)
    → EditWorkflowPage.handleRestoreRequest
    → ConfirmationModal → handleRollbackConfirm
    → POST rollback → fetchWorkflow → reinitializeFromWorkflow

Restore target (parity):
  VersionedFieldHistoryTab.onRestore
    → copy selected yaml_config into form via replaceYamlConfig
    → close/leave popup, toaster (editor)
    → user clicks page Save → PUT v1/workflows/{id}
```

Production importers of `workflowVersionsStore`: **only** `EditWorkflowPage.tsx` (`rollbackVersion`) and `WorkflowVersionHistoryPopup.tsx` (list/detail/clear/paging). Safe to delete the store once those two are adjusted.

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| **Pages** | `EditWorkflowPage` — popup ownership, restore semantics, drop rollback confirm |
| **Page components** | `WorkflowVersionHistoryPopup`, `WorkflowForm` (`replaceYamlConfig`), `WorkflowYamlHeaderActions`, `YamlPanel`, `WorkflowConfigField` |
| **Shared UI** | `VersionedFieldHistoryTab`, `VersionHistoryDiffView` → `TextDiffView` (`diff` package) |
| **Store** | **Remove** `workflowVersionsStore`. Keep `workflowsStore.fetchWorkflow` / `updateWorkflow` |
| **Types** | **Remove** `workflowVersion.ts`. Keep `WorkflowConfigHistoryItem` / `yaml_config_history` |
| **Details (out of scope)** | `useWorkflowData` continues to consume `yaml_config_history` for executions |

This is a UI-repo change: pages + components + one Valtio store deletion. No new architectural layer. Pattern already exists in Assistants (`SystemPrompt`).

### Integration Points

- **HTTP to drop:** `GET/POST v1/workflows/{id}/versions*` via `@/utils/api` (`fetch`). Paths are hardcoded in `workflowVersions.ts`; only `VITE_API_URL` prefixes them.
- **HTTP to keep:** `GET v1/workflows/id/${id}` (`fetchWorkflow`), `PUT v1/workflows/${id}` (`updateWorkflow`).
- **Shared helpers:** `formatDateTime(..., 'short')`, `createdBy` from `@/utils/helpers`.
- **Permissions:** `canEdit` / `ABILITIES.WRITE` on `user_abilities` — keep Restore hidden for READ.
- **Third-party:** `valtio` (store being removed from this feature), `primereact` Autocomplete/Dialog via `Popup`, `luxon` (dates), `diff` (diff view). Not antd/mobx.
- **Visual vs legacy editor:** both already funnel Version History through one page-owned popup. Restore must update both buffers via `replaceYamlConfig` (visual: `setYamlConfig`; legacy: also `formFieldsRef.setYamlConfig`).

### Patterns and Conventions

- Assistants: entity-embedded history, FE `length - index` labels, Restore = form write, Save persists.
- Workflows already use the same shared tab/diff primitives; divergence is data source + server rollback.
- Page-owned popup (Aug 11 decision) stays; YAML editors must not mount their own history UI.
- Modals: `Popup` for history; `ConfirmationModal` only for destructive confirms (AI revert stays; rollback confirm goes).
- State: Valtio domain stores in `src/store/`. After parity, this feature has **no** dedicated history store (matches Assistants).
- Dirty tracking: `replaceYamlConfig` → `blockTransition()` so unsaved Restore is gated like other editor edits.

---

## 3. Documentation Findings

### Guides and Architecture Docs

Frontend guides exist under `.ai-run/guides/` (this is a UI repo; root `AGENTS.md` still lists backend-oriented paths that are not on disk here). Relevant:

| Guide | Relevance |
|---|---|
| `.ai-run/guides/development/workflow-editor-patterns.md` | `EditWorkflowPage`, visual editor vs YAML |
| `.ai-run/guides/patterns/modal-patterns.md` | `Popup` / `ConfirmationModal` |
| `.ai-run/guides/patterns/state-management.md` | Valtio Component → Store → API |
| `.ai-run/guides/architecture/architecture.md` | Layers |
| `.ai-run/guides/testing/testing-patterns.md` | Vitest / Valtio mocks |

**No dedicated guide** for version history. Spec for this run: `docs/EPMCDME-8827-assistants-parity-frontend.md`.

Related task docs (older, **conflicting** with this spec):

- `docs/handoff-contract.md` — backend contract: use versions API + rollback; **“New UI should use the versions API above, not projected `yaml_config_history`.”**
- `docs/superpowers/tasks/2026-08-11-epmcdme-8827-workflow-version-history-frontend-update/` — approved Approach A: page-owned popup + **immediate backend rollback**
- Parity doc’s “companion backend doc” is **referenced by name only**; no companion file path in this repo

`CHANGELOG.md` has no version-history / rollback / `yaml_config_history` entries.

### Architectural Decisions

1. **This run’s source of truth:** Assistants parity — embedded `yaml_config_history`, client Restore, page Save, delete versions store.
2. **Superseded for this run:** Aug 11 spec + `handoff-contract.md` rollback/versions-API direction (already implemented on the feature branch).
3. **Still valid from Aug 11:** one page-owned popup; YAML header entry beside Documentation; no tags/notes/compare table; shared `VersionHistoryDiffView` + WRITE-gated Restore.
4. No formal ADR catalog in the repo.

### Derived Conventions

- Restore into editor should mark the form dirty (`blockTransition`), matching AI refine.
- Toast copy should describe editor restore, not server rollback.
- After Save, do not invent versions-store invalidation; GET on next load supplies updated history.
- `VersionedFieldHistoryTab` paging props (`hasMore`, `onLoadMore`, `listStatusText`) can remain on the shared component unused (Assistants already omit them).

---

## 4. Testing Landscape

### Existing Coverage

| Path | What it asserts | Action |
|---|---|---|
| `src/store/__tests__/workflowVersions.test.ts` | GET list/detail; **`rollbackVersion posts to rollback endpoint and returns new current detail`** → `POST v1/workflows/wf-1/versions/v-2/rollback` | **Delete** with the store |
| `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx` | Mocked store: `fetchVersions` on open, exclude current (`[03]` absent), select `[02]`, Load more / “Showing N of M”, `fetchVersionDetail` for diff, `clearVersions` on close, `onRestoreRequest(summary)`, hide Restore when `canWrite={false}` | **Rewrite** for `yaml_config_history` + client Restore + FE labels; drop API mocks |
| `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx` | AI Refine/Revert only. Fixture **has** `yaml_config_history`. **No** `POST .../rollback` or `/versions` assertions | Keep; optionally add Restore→editor→Save cases. Spec’s “any EditWorkflowPage tests that assert POST rollback” — **none exist today** |
| `src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx` | Version History button + visible YAML callback | **Keep** |
| `src/pages/workflows/components/__tests__/WorkflowConfigField.test.tsx` | Same for legacy editor | **Keep** |
| `src/components/form/VersionedField/__tests__/VersionHistoryDiffView.test.tsx` | Diff tabs; HistoryTab `canRestore` | **Keep** |
| `src/pages/workflows/components/__tests__/WorkflowForm.test.tsx` | `replaceYamlConfig` / `reinitializeFromWorkflow` | **Keep** `replaceYamlConfig` (parity restore primitive) |
| Assistants `SystemPrompt` history | **No tests** for labels / Restore / diff | No reference suite to copy |

### Testing Framework and Patterns

- **Vitest** 1.6.1 + Testing Library (`@testing-library/react`, `user-event`, `jest-dom`)
- Unit: `src/**/__tests__/**/*.{test,spec}.*`; integration: `*.integration.test.*`
- Store tests: `vi.mock('@/utils/api')`, `vi.resetModules()`, dynamic `import()`
- Popup tests: `proxy({...})` + `vi.mock('@/store/workflowVersions')`; HistoryTab/DiffView often mocked
- Integration: `mockAPI` + `renderPage` from `src/test-utils/integration.tsx`

### Coverage Gaps

- No test that Restore writes YAML into the editor without rollback
- No test that labels use `yaml_config_history.length - index`
- No EditWorkflowPage coverage of Version History at all
- No Assistants SystemPrompt history tests to mirror
- `WorkflowYamlHeaderActions` has no dedicated unit file (covered via YamlPanel / ConfigField)

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — API base for all calls (including workflows GET/PUT)
- `VITE_ENV`, `VITE_APP_VERSION`, `VITE_SUFFIX` — general UI
- **None** dedicated to version history, rollback, or `yaml_config_history`

Versions API paths are **hardcoded** in `workflowVersions.ts`, not env-driven.

### Configuration Files

- `vite.config.ts` — proxies `/api` → backend in local/dev; no workflow-versions-specific proxy
- `config.js` / Helm `deploy-templates/templates/configmap.yaml` — runtime `window._env_.VITE_API_URL`
- `src/utils/api.ts` — `BASE_URL` from `_env_` / `import.meta.env`

### Feature Flags and Deployment Concerns

- **No** feature flag for version history. `FEATURE_FLAGS.WORKFLOW_AI` gates Refine only.
- Customer config `workflowYamlDocumentation` / `workflowDocumentation` only toggles the Documentation link next to Version History.
- `isVisualEditorEnabled` currently hardcoded `true` in `src/utils/workflows.ts`.
- Removing versions/rollback calls is a product behavior change shipped with the UI build; backend may still expose those endpoints unused.
- Runtime blocker is **payload content**, not env: GET workflow must include prior-only `yaml_config_history`.

---

## 6. Risk Indicators

- **Conflicting contracts in-repo:** `docs/handoff-contract.md` and the 2026-08-11 task spec mandate versions API + `POST .../rollback`. This run’s spec (`docs/EPMCDME-8827-assistants-parity-frontend.md`) requires the opposite. Implementers must follow the parity doc; older artifacts will otherwise pull work back to rollback.
- **Backend companion doc missing in this repo.** Parity depends on GET returning prior-only `{ yaml_config, date, created_by }[]`. Types already declare `Workflow.yaml_config_history: WorkflowConfigHistoryItem[]` — **not** a FE type gap. Runtime failure mode if GET omits the array or includes the current version: empty/wrong history UI with no versions-API fallback (spec: still stop calling `/versions`).
- **`yaml_config_history` is present on GET types** (`Workflow` in `src/types/entity/workflow.ts`). The speculative blocker “missing on GET payload types” is **false**. Remaining blocker is live API shape vs type, plus `created_by.user_id` vs Assistants `created_by.id` (helpers already handle both).
- **PUT may echo stale history.** Visual-editor `getFormValues` sends `yaml_config_history: workflow?.yaml_config_history || []` with the new `yaml_config`. If the backend trusts the client array instead of computing history from the YAML change, Save after Restore will not prepend a new prior entry. Assistants Save has the same class of risk for `system_prompt_history`.
- **`reinitializeFromWorkflow` vs `replaceYamlConfig`:** using the former for Restore would reset the dirty baseline (looks saved) and was the **server rollback** path. Parity must use `replaceYamlConfig` + `blockTransition`.
- **Save navigates away** (`goBackFromWorkflowEdit`) unless Save and Run. History list will not refresh in-place on the edit page; that matches “reload after Save” only on the next GET.
- **Duplicate `date` option values:** Assistants key options on `entry.date`. Spec asks Workflows to prefer `date` + index if dates collide.
- **Behavior change vs current branch:** Restore today immediately mutates server state and discards unsaved edits (confirm copy says so). Parity Restore is draft-only; unsaved editor YAML is replaced locally until Save. Confirm-dialog removal changes that contract.
- **Test deletion surface is large relative to new coverage:** the only POST rollback assertion lives in `workflowVersions.test.ts`; popup tests are entirely versions-API-shaped; EditWorkflowPage has **zero** rollback tests to update. New client-restore tests must be written, not just deleted.
- **`useWorkflowData` must keep working** off the same `yaml_config_history` field — do not reshape or stop sending it in ways that break execution-time config reconstruction.
- **Shared tab paging API** (`hasMore` / `onLoadMore` / `listStatusText`) becomes unused by both Assistants and Workflows after this change; leaving the props is fine, using them would reintroduce non-parity UX.
- **No codegraph index** — research used filesystem tools only.
- **Thin prior FE history tests for Assistants** — no golden-path SystemPrompt history suite to clone.

---

## 7. Summary for Complexity Assessment

This task is a **parity refactor of an existing Workflow Version History UI**, not a greenfield feature. It touches the **Pages** layer (`EditWorkflowPage` restore orchestration), **page components** (`WorkflowVersionHistoryPopup` data/restore), and **deletes** a Valtio store + versions-API types (`workflowVersions.ts`, `workflowVersion.ts`, store tests). Shared presentation (`VersionedFieldHistoryTab`, `VersionHistoryDiffView`) and YAML header chrome (`WorkflowYamlHeaderActions`, `YamlPanel`, `WorkflowConfigField`) stay. Estimated change surface: about **6–8 production files** adjusted or deleted, plus **2 test files** rewritten/deleted and optional EditWorkflowPage coverage. `WorkflowConfigHistoryItem` / `yaml_config_history` already exist on the Workflow GET type and in fixtures — the popup simply does not use them yet.

Technical novelty is **low**: Assistants `SystemPrompt.handleRestore` + FE `length - index` labels is the pattern to copy; `WorkflowForm.replaceYamlConfig` is already the form-write primitive (used by AI refine). The work is subtracting REST (list/detail/rollback) and rewiring props. The main product risk is **intentional behavior change** (server rollback → draft Restore + Save) against an older approved spec/`handoff-contract.md`, plus **backend GET payload quality** (prior-only `yaml_config_history`). There is no FE type blocker for the history array.

Test posture is **mixed and currently wrong-shaped**: store and popup tests lock in versions API and the sole `POST .../rollback` assertion; EditWorkflowPage does not assert rollback at all; header-button and diff/`canRestore` tests can stay. After the change the affected area will need new tests for embedded history, FE labels, and client Restore — there is no Assistants history test suite to copy. Key complexity drivers: conflicting in-repo contracts, restore dirty-state choice (`replaceYamlConfig` vs `reinitializeFromWorkflow`), and PUT echoing `yaml_config_history`.
