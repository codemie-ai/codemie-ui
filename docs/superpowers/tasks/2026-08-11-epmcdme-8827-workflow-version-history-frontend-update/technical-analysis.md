# Technical Research

**Task**: workflow version history yaml assistant
**Generated**: 2026-08-11T16:01:00+03:00
**Research path**: filesystem

---

## 1. Original Context

Review and implement EPMCDME-8827 Workflow Version History Frontend Update based on existing spec at docs/superpowers/tasks/2026-08-11-epmcdme-8827-workflow-version-history-frontend-update/spec.md. Backend handoff contract is at docs/handoff-contract.md. Goal: Make Workflow YAML version history look and behave like Assistant System Instructions version history — open history from YAML editor beside Documentation, select historical version, side-by-side YAML diff, restore via backend rollback API, remove tags/notes/table/compare popup/legacy history tabs. Preserve uncommitted vite.config.ts (local setup). Implement on branch EPMCDME-8827_workflow-versioning.

---

## 2. Codebase Findings

### Existing Implementations

**Workflow version history (current — to rewrite/delete)**

- `src/pages/workflows/EditWorkflowPage.tsx` — page-header “Version History” button; mounts history + compare popups; `handleRestoreVersion` / `handleCompareVersions`; restore today = `fetchVersionDetail` → `formRef.replaceYamlConfig` → toast “Version loaded into editor — save to apply” (no rollback POST).
- `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx` — paginated `Table`, checkbox select (max 2), Compare, tag/note columns, per-row Restore (WRITE-gated).
- `src/pages/workflows/components/WorkflowVersionRow.tsx` — tag/note inline editors + Restore; exports `WorkflowVersionTagCell` / `WorkflowVersionNoteCell` (delete per spec).
- `src/pages/workflows/components/WorkflowVersionComparePopup.tsx` — second popup; dual `fetchVersionDetail`; `TextDiffView` older→newer (delete per spec).
- `src/store/workflowVersions.ts` — Valtio store: `fetchVersions`, `fetchVersionDetail`, `updateVersionMetadata` (PATCH + `move_tag`), `clearVersions`, move-tag conflict state — **no rollback action**.
- `src/types/entity/workflowVersion.ts` — `WorkflowVersion`, `WorkflowVersionDetail`, `WorkflowVersionPatchRequest`; still includes `version_tag` / `description`.

**YAML editor entry points / legacy history tabs**

- `src/pages/workflows/editor/configPanels/YamlPanel.tsx` — visual YAML: Edit + Version History tabs from embedded `yaml_config_history`; Documentation in header only; no Version History button beside Documentation.
- `src/pages/workflows/editor/ConfigPanel.tsx` — passes `history={workflow?.yaml_config_history || []}` into `YamlPanel`; remounts with `key={yamlConfig}`.
- `src/pages/workflows/components/WorkflowConfigField.tsx` — legacy YAML via `VersionedField`; history tab from `yaml_config_history`; Documentation as `headerContent`.
- `src/pages/workflows/components/WorkflowFormFields.tsx` — `onRestore` → immediate `onSubmit(updatedWorkflow)` (PUT path).
- `src/pages/workflows/components/WorkflowForm.tsx` — visual vs legacy switch; `replaceYamlConfig`; embeds `yaml_config_history` in save payload; `useUnsavedChanges`.

**Assistant System Instructions (shared extraction target)**

- `src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptVersionHistoryView.tsx` — Current/Previous baseline tabs + `TextDiffView` — **extract to shared** (spec: `VersionHistoryDiffView`).
- `src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptExpandedModal.tsx` — full-width ~90vh popup; Assistant-specific (do **not** genericize).
- `src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPrompt.tsx` — history options `[NN] - date - author`; client-side restore via `onChange`.
- `src/components/form/VersionedField/VersionedField.tsx` — Edit / Version History tabs shell.
- `src/components/form/VersionedField/VersionedFieldHistoryTab.tsx` — selector + Restore + red/green legend + empty state (reuse; currently no `canWrite` prop to hide Restore).
- `src/components/TextDiffView/TextDiffView.tsx` (+ `diffProcessors.ts`, `types.ts`) — side-by-side synced scroll, line/word diffs via npm `diff`.

**Shared utilities**

- `src/utils/entity.ts` — `canEdit` / `canView` / `canDelete` via `user_abilities`.
- `src/constants/index.ts` — `ABILITIES.{READ,WRITE,DELETE}`, `ABILITY_KEY = 'user_abilities'`.
- `src/hooks/useUnsavedChangesWarning.tsx` — dirty baseline (`initialValues` set once); no API to re-seed after rollback.
- `src/pages/workflows/utils/compareWorkflowData.ts` — workflow dirty comparator.
- `src/store/workflows.ts` — `fetchWorkflow`, `updateWorkflow`, `currentWorkflow*`.
- `src/types/entity/workflow.ts` — `yaml_config_history` / `WorkflowConfigHistoryItem` (legacy; new UI must use versions API).
- `src/assets/icons/history.svg` — shared history icon (Assistant already uses).

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| Presentation | `EditWorkflowPage`, `YamlPanel`, `WorkflowConfigField`, `WorkflowVersion*` popups (delete/rewrite); Assistant `SystemPrompt*` / `VersionedField*` / `TextDiffView` / `Popup` |
| State | `workflowVersionsStore`, `workflowsStore` (Valtio) |
| Integration | `src/utils/api.ts` (store-only calls per guides) |
| Types | `workflowVersion.ts`, `workflow.ts` |
| Utils/hooks | `canEdit`, date/author helpers, `useUnsavedChanges`, `compareWorkflowData` |

**Observed data flows today**

- List/detail: history/compare popups → `workflowVersionsStore` → `api.get`
- Metadata: `WorkflowVersionRow` → `updateVersionMetadata` → `api.patch` (contract: remove)
- Restore (page header): draft into editor — **not** rollback
- Restore (legacy tab): immediate PUT via `onSubmit`
- Restore (YamlPanel tab): local `setValue` only

### Integration Points

| Integration | Current behavior |
|---|---|
| Versions API | `GET v1/workflows/{id}/versions?limit&offset`; `GET .../versions/{versionId}` |
| Rollback API | **Not implemented**; contract: `POST .../versions/{version_id}/rollback` |
| Metadata PATCH | Present in store/UI/types; handoff forbids it |
| Workflow refetch | `workflowsStore.fetchWorkflow(id)` → `GET v1/workflows/id/{id}` |
| Embedded legacy history | `workflow.yaml_config_history` still fed to YamlPanel / WorkflowConfigField / save payload |
| Details page | `useWorkflowData.ts` still reads `yaml_config_history` (out of edit-popup scope) |
| Unsaved changes | `WorkflowForm` + ConfigPanel form IDs; baseline not resettable after rollback |
| Toast / confirm | `toaster.*`; `ConfirmationModal` (used for AI revert / tag-move; not for version restore today) |

**Cross-domain sharing:** Workflow and Assistant share `TextDiffView` + `VersionedField` primitives only — no shared version-history popup/store today. Spec wants extract of `SystemPromptVersionHistoryView` under shared form components.

**Handoff contract alignment (`docs/handoff-contract.md`)**

| Contract | Frontend today |
|---|---|
| `GET .../versions` | Present |
| `GET .../versions/{version_id}` | Present |
| `POST .../versions/{version_id}/rollback` | **Absent** |
| No PATCH / no `version_tag` / `description` | Frontend **has** PATCH + tag/description UI + types |
| New UI must not use projected `yaml_config_history` | Legacy YAML tabs still use it |

### Patterns and Conventions

- **Layering**: Component → Valtio store → `api.*`; no `api` calls in components (`.ai-run/guides/architecture/architecture.md`, `api-integration.md`).
- **Shared vs domain UI**: extract generic diff view; keep Workflow domain popup composed from shared primitives (`component-organization` / reusable-components guides).
- **Assistant UX to mirror**: option label `` `[${padStart(2)}] - ${formatDateTime(date, 'short')} - ${createdBy(...)}` ``; option value = stable `version_id` (not date); historical on right; left baseline Current (editor text) or Previous (next older).
- **Popup shell**: Assistant `Popup` `isFullWidth` + `h-[90vh]`; Workflow Compare already uses full-width pattern.
- **Ability**: `canEdit(entity)` ≡ `user_abilities` includes `'write'`; list/detail = READ; rollback = WRITE.
- **Modals**: `Popup` / `ConfirmationModal` only — no PrimeReact `Dialog` (`modal-patterns.md`).
- **Config-gated Documentation**: `isConfigItemEnabled(..., 'workflowYamlDocumentation')`; Version History must remain when docs hidden; not shown on create.
- **Diff stack**: npm `diff` + local `TextDiffView`; YAML editing via `ace-builds` (not Monaco/antd).

**Dirty state / refetch / reinitialize after restore (critical gap)**

1. Current page-header restore: detail → `replaceYamlConfig` → leave dirty → require Save. No `POST` rollback, no `fetchWorkflow`, no dirty clear.
2. `WorkflowForm.replaceYamlConfig`: updates yaml state; legacy path sets RHF `shouldDirty: true`; `blockTransition()` does **not** reset unsaved baseline.
3. `useUnsavedChanges`: `initialValues` set **once**; no re-seed API after rollback.
4. `WorkflowForm` initializes from `workflow` via `useState` with **no** `useEffect` to adopt prop changes after `fetchWorkflow`.
5. Spec target: rollback → close popups → refetch workflow + versions → reinitialize editors → **clear dirty** → success toast. Current form/hook plumbing does not support this without explicit work.

**Ability checks**

- Workflow WRITE = `canEdit` / `user_abilities` includes `write`; READ users can browse when popup is open.
- History popup Restore and tag/note editors gated by `canWrite`.
- Assistant `VersionedFieldHistoryTab` always shows Restore when options exist — Workflow WRITE gating needs a prop or wrapper.

---

## 3. Documentation Findings

### Guides and Architecture Docs

Frontend guides under `.ai-run/guides/` (relevant):

- `development/workflow-editor-patterns.md` — visual/legacy editor architecture
- `quality-gates.md` — lint → typecheck → unit → integration
- `testing/testing-patterns.md` — Vitest co-located `__tests__/`, `mockAPI`
- `architecture/architecture.md` — Component → Store → API
- `development/api-integration.md` — store-only API, pagination
- `patterns/state-management.md` — Valtio store conventions
- `patterns/modal-patterns.md` — Popup / ConfirmationModal
- `components/component-patterns.md`, `reusable-components.md`, `styling/styling-guide.md`

Task docs:

- `docs/handoff-contract.md` — authoritative backend contract
- `docs/superpowers/tasks/2026-08-11-epmcdme-8827-workflow-version-history-frontend-update/spec.md` — implementation directive (complexity 23/36 L)

No dedicated guide for workflow or assistant version history.

**Note:** Root `AGENTS.md` describes itself as a backend guide and lists backend guide paths that are **not** present in this UI repo; on-disk guides are the frontend set above.

### Architectural Decisions

- No formal ADR catalog.
- Prior FE-1/FE-2 8827 specs recorded table/tag/PATCH/save-to-apply approach — **superseded** by Aug 11 spec (Assistant-aligned selector + inline diff + rollback).
- Aug 11 spec decisions: entry beside Documentation; extract `SystemPromptVersionHistoryView`; reuse `VersionedFieldHistoryTab`; delete row/compare/move-tag; preserve uncommitted `vite.config.ts`; build from latest `main` after backend contract is final.

### Derived Conventions

- Apache 2.0 headers on `.ts`/`.tsx`.
- Feature UI under `src/pages/workflows/components/`; shared under `src/components/`.
- Three overlapping restore semantics exist today (page draft / YamlPanel local / legacy immediate PUT) — must collapse to single rollback path.
- Assistant history is embedded `system_prompt_history` (client-side restore); Workflow history is dedicated versions REST API — shared UX primitives, different data sources.

---

## 4. Testing Landscape

### Existing Coverage

| Path | Covers |
|---|---|
| `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.integration.test.tsx` | Header button, table, tags, compare, READ vs WRITE, editor-load restore (obsolete under new UX) |
| `src/pages/workflows/components/__tests__/WorkflowVersionComparePopup.test.tsx` | Compare popup loading/error/diff (delete with component) |
| `src/pages/workflows/components/__tests__/WorkflowVersionRow.test.tsx` | Tag/note/Restore ability gating (delete with component) |
| `src/store/__tests__/workflowVersions.moveTag.test.ts` | PATCH move-tag only (delete per spec) |
| `src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx` | YAML validation only — no history/Documentation entry coverage |

Adjacent: `EditWorkflowPage.integration.test.tsx` (AI refine; no VH assertions); `WorkflowFormFields.test.tsx` mocks `WorkflowConfigField`.

### Testing Framework and Patterns

- Vitest 1.6.1: unit (`**/__tests__/**/*.{test,spec}.*`) vs integration (`*.integration.test.*`)
- RTL + user-event + jest-dom; istanbul coverage
- No MSW — integration uses `mockAPI` + `requestRegistry` from `src/test-utils/integration`
- Unit: `vi.hoisted` + `vi.mock` for stores/api; stub `TextDiffView` / `Popup` where needed

### Coverage Gaps

- No dedicated tests for `TextDiffView`, `SystemPromptVersionHistoryView`, `VersionedField*`, `WorkflowConfigField`
- No `POST .../rollback` mocks or success/failure paths (refetch, editor reset, dirty clear, preserve-on-error)
- No YAML-header entry-point tests (beside Documentation; create-mode absence; no page-header button; no legacy tab)
- No store unit tests for `fetchVersions` / `fetchVersionDetail` / `clearVersions` / future rollback
- Spec requires: rewrite popup/YamlPanel/WorkflowConfigField tests; add shared `VersionHistoryDiffView` + Assistant regression; delete obsolete row/compare/move-tag tests

---

## 5. Configuration and Environment

### Environment Variables

- API base: `VITE_API_URL` via `window._env_` (preferred) or `import.meta.env` (`src/utils/api.ts`)
- Also: `VITE_ENV`, `VITE_APP_VERSION`, `VITE_SUFFIX`, assistant slug vars
- **No** env var gates workflow version history

### Configuration Files

- `vite.config.ts` — uncommitted local setup: `/api` proxy → `http://codemie:8080` — **must preserve**
- `.env` / root `config.js` / Helm ConfigMap — runtime `VITE_*`
- Documentation visibility: customer config keys `workflowYamlDocumentation` / `workflowDocumentation` from `/v1/config` (not env)

### Feature Flags and Deployment Concerns

- `FEATURE_FLAGS.WORKFLOW_AI` exists; **not** used for version history
- No feature flag for version history / compare / rollback / tags
- `isVisualEditorEnabled` currently returns `true` unconditionally
- Backend deploy/migration (Alembic `w3x4y5z6a7b8`, JSONB backfill) is out of frontend scope; handoff warns `500` on corrupt history — do not retry until repaired
- Spec: do not implement against provisional rollback response; build from latest `main` after contract is final

---

## 6. Risk Indicators

- **No rollback client** — `workflowVersionsStore` lacks `POST .../rollback`; restore is editor-draft only; largest functional gap vs handoff/spec.
- **Surplus PATCH/tag/note stack** — store, types (`version_tag`, `description`, `WorkflowVersionPatchRequest`), UI cells, move-tag 409 flow, and `workflowVersions.moveTag.test.ts` must all be removed; easy to leave dead code.
- **Dual history sources** — versions API (table UI) + embedded `yaml_config_history` (YamlPanel / WorkflowConfigField tabs); incomplete removal leaves conflicting UX.
- **Dirty-state / reinit gap** — `useUnsavedChanges` one-shot baseline + `WorkflowForm` no prop-sync `useEffect` means post-rollback “clean editor” is not supported without deliberate form/hook changes.
- **Three restore semantics today** — page draft, YamlPanel local, legacy immediate PUT; risk of leaving a secondary path live.
- **`VersionedFieldHistoryTab` always shows Restore** — no WRITE gate; Workflow READ users need hide/disable without breaking Assistant.
- **Obsolete tests dominate coverage** — integration suite asserts table/tags/compare/save-to-apply; will fail or mislead until rewritten; shared extraction (`SystemPromptVersionHistoryView`) has zero regression tests.
- **Assistant vs Workflow identity keys differ** — Assistant options use `date`; Workflow must use `version_id`; shared component must stay value-agnostic.
- **Form remount / visual editor state** — ConfigPanel `key={yamlConfig}` remounts YamlPanel; visual editor field graph may need explicit reinit after rollback beyond yaml string replace.
- **Corrupt-history `500`** — contract says do not retry; UI must surface failure and preserve editor state.
- **Uncommitted `vite.config.ts`** — must not be committed/reverted as part of this feature; local proxy to `codemie:8080`.
- **Prior FE-1/FE-2 docs vs Aug 11 spec** — superseded table/tag/save-to-apply model still matches current branch code; implementers must follow Aug 11 spec + handoff, not older task docs.
- **AGENTS.md / guide mismatch** — root AGENTS.md references backend guides absent in this UI repo; use `.ai-run/guides/` frontend set.
- **Out-of-scope `yaml_config_history` on details page** — `useWorkflowData.ts` still consumes projected history; not part of edit popup but can confuse QA.
- **No feature flag** — rollout is all-or-nothing once shipped; depends on backend rollback availability.

---

## 7. Summary for Complexity Assessment

This task touches **Presentation** (EditWorkflowPage orchestration, YamlPanel / WorkflowConfigField headers, rewrite of WorkflowVersionHistoryPopup, deletion of Row/Compare), **shared Components** (extract SystemPromptVersionHistoryView → VersionHistoryDiffView; extend VersionedFieldHistoryTab for WRITE gating), **State** (workflowVersionsStore: remove PATCH/move-tag, add rollback; workflowsStore refetch), **Types** (strip tag/description/patch), and **Hooks/forms** (dirty baseline reset + editor reinitialize after rollback). Estimated change surface is roughly **10–20 files** including tests: several deletes, one major popup rewrite, two YAML entry-point edits, store/types cleanup, shared extraction + Assistant import update, and form/dirty plumbing.

Technical novelty is **moderate-low for UI** (Assistant pattern already exists and is the extraction target) but **moderate-high for restore lifecycle**: backend rollback + refetch + clean dirty state is new relative to both current Workflow draft-restore and Assistant client-side `onChange` restore. Dual history sources and obsolete FE-1/FE-2 UI must be fully removed to avoid regressions.

Test posture is **mixed-to-weak for the target design**: existing coverage is dense around the obsolete table/tag/compare/save-to-apply UX and must be deleted or rewritten; TextDiffView, SystemPromptVersionHistoryView, VersionedFieldHistoryTab, WorkflowConfigField, and rollback paths have little or no coverage. Key scoring risks: dirty-state reinit gap, WRITE gating on shared history tab, complete removal of PATCH/legacy tabs, and rewriting integration tests to assert rollback + YAML-header entry points.
