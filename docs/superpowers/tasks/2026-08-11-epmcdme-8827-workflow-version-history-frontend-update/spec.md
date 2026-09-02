# EPMCDME-8827 — Workflow Version History Frontend Update

**Repository:** `codemie-ui`  
**Implementation branch:** `EPMCDME-8827_workflow-version-history-fe` (from latest `main`)  
**Depends on:** completed backend Workflow Version History update — contract in `docs/handoff-contract.md`

## Complexity and Factory Routing

Frontend-only assessment: **23/36 (L)**, routed to one brainstorming-led SDLC factory after the backend contract is final.

The scope is cohesive enough for one frontend run. The implementation plan should use separate internal checkpoints for:

1. shared Assistant/Workflow diff primitives and Assistant regression coverage;
2. Workflow popup, API state, and rollback orchestration;
3. both YAML editor entry paths and removal of obsolete UI.

Primary complexity drivers are the shared-component regression surface, clean editor reset after rollback, authorization-sensitive controls, and the number of affected production/test files.

## Goal

Make Workflow YAML version history look and behave like Assistant System Instructions version history:

- open history from the YAML editor beside Documentation;
- choose one historical version from a select control;
- inspect a side-by-side YAML diff against current or previous content;
- restore through the backend rollback API;
- remove tags, notes, the table workflow, separate compare popup, and legacy history tabs.

Consistency with Assistant version history is the primary UX requirement.

## Backend Dependency

Backend contract is published in `docs/handoff-contract.md`. Frontend must consume it as-is:

- `GET /v1/workflows/{workflow_id}/versions` (READ; `limit`/`offset`; max `limit=1000`);
- `GET /v1/workflows/{workflow_id}/versions/{version_id}` (READ; includes `yaml_config`);
- `POST /v1/workflows/{workflow_id}/versions/{version_id}/rollback` (WRITE; `200` returns new current `WorkflowVersionDetail`);
- Summary/detail fields: `version_id`, `version_number`, `is_current`, `created_at`, `created_by` (+ `yaml_config` on detail);
- No PATCH metadata; no `version_tag` / `description`;
- Error envelopes: `400` already-current, `403`, `404`, `500` corrupt history (do not retry until repaired).

## Current Branch Findings

The branch currently adds:

- a page-header Version History button;
- a paginated table;
- editable tags and version notes;
- checkbox selection of two versions;
- a separate compare popup;
- per-row Restore actions.

The older Workflow UI also still exposes Version History tabs in:

- visual editor `YamlPanel`;
- legacy `WorkflowConfigField`.

This creates overlapping entry points, data sources, and restore semantics. The update replaces them with one API-backed interaction.

## Entry Points and Placement

Remove Version History from the `EditWorkflowPage` header.

Add a secondary Version History button with the shared history icon in the YAML header action group, immediately beside Documentation:

- visual editor: `src/pages/workflows/editor/configPanels/YamlPanel.tsx`;
- legacy form editor: `src/pages/workflows/components/WorkflowConfigField.tsx`.

Use one shared header-actions component or equivalent shared rendering so both Workflow editor paths have the same order, icon, size, visibility, and accessible label.

Documentation remains conditional on configuration. Version History remains available while editing an existing Workflow even when Documentation is hidden. It is not shown for Workflow creation.

The button opens one page-level `WorkflowVersionHistoryPopup`. Keep popup orchestration and rollback/refetch behavior at `EditWorkflowPage`; pass an `onShowVersionHistory` callback through `WorkflowForm` to the active YAML editor path. Do not mount independent popup instances in both YAML components.

## Remove Legacy Workflow History Tabs

`YamlPanel` becomes a single edit view:

- remove `activeTab`;
- remove the legacy history selector and readonly Ace editor;
- remove local legacy Restore behavior;
- remove the `history` prop and associated types/imports;
- retain YAML validation, editor actions, and footer behavior.

`WorkflowConfigField` also becomes a single YAML edit view:

- remove its `VersionedField` history tab;
- remove embedded `yaml_config_history` option building;
- remove immediate-submit legacy Restore behavior;
- retain the YAML editor and documentation/history header actions.

Remove obsolete history prop plumbing from `ConfigPanel`, `WorkflowFormFields`, and related tests. This frontend no longer reads embedded `workflow.yaml_config_history` for version browsing. Backend compatibility projection remains outside this frontend scope.

## Assistant-Style Popup

Rewrite `WorkflowVersionHistoryPopup` as one full-width, approximately 90vh popup that follows the Assistant System Instructions history layout.

### Version selector

On open:

1. Fetch Workflow version summaries.
2. Exclude the `is_current` entry from restore choices.
3. Sort historical versions by descending `version_number`.
4. Select the newest historical version by default.

Each option label follows the Assistant format:

`[NN] - <formatted date> - <created by>`

The option value is the stable `version_id`, not a timestamp or YAML string.

Use the backend's maximum supported page size for the initial selector population, matching the existing Assistant history practical limit. If the final backend contract cannot return all supported history in one request, the implementation plan must add incremental loading without returning to a table UI.

### Inline diff

The popup displays the selected historical YAML as the right side of `TextDiffView`.

The left-side baseline has the same choices as Assistant history:

- Current Version: the YAML currently visible in the editor, including unsaved edits captured when the popup opens.
- Previous Version: the next older historical version relative to the selected item; disabled when none exists.

Fetch selected and previous version details lazily by ID. Cache details for the popup session to avoid duplicate requests when switching options or baselines.

Show:

- line numbers;
- synchronized side-by-side scrolling;
- the shared red/green diff legend;
- selected version date and author;
- loading indicators;
- focused error messages with Retry for failed detail requests;
- an empty state when no historical versions exist.

There is no checkbox selection, table, pagination footer, tag, note, or separate compare popup.

## Shared Assistant/Workflow Components

Reuse `VersionedFieldHistoryTab` for the selector, Restore action, legend, and empty-state structure.

Extract `SystemPromptVersionHistoryView` into a shared generic component, for example `VersionHistoryDiffView`, under the shared form/versioned-field area. Parameterize content and labels without adding Assistant or Workflow domain logic.

Update Assistant System Instructions to import the shared component with unchanged behavior and styling.

Do not force `SystemPromptExpandedModal` itself into a generic abstraction: its edit tab, prompt variables, Copy action, and Assistant-specific header are materially different. Workflow keeps a domain-specific popup composed from shared primitives.

Add focused tests for the shared component because Assistant version history currently has no direct regression coverage.

## Restore and Unsaved Changes

Restore is an immediate backend rollback, not an editor-only draft.

The Restore button:

- is visible only to users with Workflow WRITE ability;
- always opens a confirmation modal;
- clearly states that rollback creates a new current version and all unsaved Workflow edits will be discarded.

On confirmation:

1. Disable repeat submission and show progress.
2. Call `POST /v1/workflows/{workflow_id}/versions/{selected_version_id}/rollback`.
3. On success, close confirmation and history popups.
4. Refetch the Workflow and version summaries.
5. Reinitialize both visual and legacy editor state from the server response.
6. Clear dirty/transition-blocking state so the restored server version is the new clean baseline.
7. Show a success toast identifying the restored source version.

No additional Save is required.

On failure:

- keep the history popup open;
- preserve all current editor state;
- clear progress state;
- show the backend error with a retryable Restore action.

READ-only users can browse and diff history but cannot restore.

## State and API Changes

Keep and adapt:

- `workflowVersionsStore.fetchVersions`;
- `workflowVersionsStore.fetchVersionDetail`;
- `workflowVersionsStore.clearVersions`;
- `WorkflowVersion` and `WorkflowVersionDetail`.

Add:

- a rollback store/API action using the final backend contract;
- rollback loading and error state only if it is shared by more than one component; otherwise keep request state local to page orchestration.

Remove:

- `updateVersionMetadata`;
- `mutatingVersionId`;
- `mutationError`;
- `moveTagConflict`;
- `WorkflowVersionPatchRequest`;
- `version_tag` and `description` fields;
- move-tag tests.

Do not keep unused API compatibility code for the removed metadata feature.

## Component Cleanup

Delete:

- `src/pages/workflows/components/WorkflowVersionRow.tsx`;
- `src/pages/workflows/components/WorkflowVersionComparePopup.tsx`;
- their obsolete tests;
- `src/store/__tests__/workflowVersions.moveTag.test.ts`.

Rewrite:

- `WorkflowVersionHistoryPopup.tsx`;
- its integration tests;
- `EditWorkflowPage.tsx` history orchestration;
- `YamlPanel.tsx` and tests;
- `WorkflowConfigField.tsx` and tests;
- Workflow version types and store.

Remove top-level compare state, selected checkbox state, table columns, tag/note cell renderers, metadata confirmation, and post-save list refreshes that are no longer needed by an open table.

## Error and Edge Cases

- No history: show the Assistant-consistent empty state; Restore is unavailable.
- List failure: show inline error and Retry.
- Selected detail failure: retain selection and allow detail Retry.
- Previous detail failure: Current baseline remains usable; Previous shows its own Retry state.
- Workflow deleted or access revoked: show backend error and close only when navigation requires it.
- Rollback target became current concurrently: surface backend 400 and refresh version summaries.
- Popup reopened after rollback: newest historical selection and current baseline reflect refreshed server state.
- Closing the popup clears selection, detail cache, loading, and error state.

## Accessibility

- Version History buttons have a unique accessible name in each editor path.
- Selector and baseline tabs are keyboard operable.
- Disabled Previous Version communicates disabled state.
- Loading and error changes use appropriate live regions.
- Confirmation receives initial focus and returns focus to the Version History trigger when cancelled.
- Diff colors are not the sole indicator; preserve textual removed/added explanation.

## Testing

### Shared component

Cover:

- current and previous baseline switching;
- disabled previous baseline;
- labels and selected metadata;
- `TextDiffView` content mapping.

Run Assistant-focused tests to prove the extraction does not change Assistant behavior.

### Workflow popup

Cover:

- list loading, retry, empty state, and default newest selection;
- option labels and current-version exclusion;
- selected and previous detail loading;
- current editor YAML used as the Current baseline;
- inline side-by-side diff;
- no tags, descriptions, checkboxes, table, or separate compare action;
- READ-only browsing without Restore;
- WRITE Restore confirmation;
- duplicate-click prevention;
- rollback success, Workflow refetch, editor reset, clean state, and success toast;
- rollback failure preserving editor state.

### Entry points

Cover both visual and legacy Workflow editor modes:

- no page-header Version History button;
- no YAML Version History tab;
- Version History appears beside Documentation;
- popup opens from the YAML header;
- Documentation-hidden configuration still shows Version History;
- create mode does not show history.

## Design Decision

**Approach A (approved):** shared primitives + page-owned popup.

- Extract `VersionHistoryDiffView` from Assistant `SystemPromptVersionHistoryView`; reuse `VersionedFieldHistoryTab` (add WRITE gating without changing Assistant restore visibility unless required).
- Shared YAML header-actions helper so visual and legacy editors match (Documentation + Version History order/icon/a11y).
- Single `WorkflowVersionHistoryPopup` orchestrated on `EditWorkflowPage` (rollback, refetch, dirty/baseline reset). Pass `onShowVersionHistory` through `WorkflowForm` — do not mount independent popups in both YAML components.
- Rejected: fully generic Assistant+Workflow shell (B); popup mounted inside each YAML editor (C).

## Branch and Delivery Constraints

- Create a **new** feature branch `EPMCDME-8827_workflow-version-history-fe` from latest `origin/main`. Leave the old tip `EPMCDME-8827_workflow-versioning` alone (do not hard-reset it).
- Implement against the published backend handoff contract in `docs/handoff-contract.md` (list/detail/rollback; no PATCH metadata; `limit` max `1000`).
- Initial version list fetch uses `limit=1000` so the selector can populate in one request; only add incremental loading if that proves insufficient.
- Preserve the uncommitted local `vite.config.ts` change (do not commit it).
- Keep SDLC planning artifacts under `docs/superpowers/tasks/2026-08-11-epmcdme-8827-workflow-version-history-frontend-update/`; do not treat obsolete table/tag/compare WIP from the old branch tip as source of truth.
- Do not start frontend implementation against a provisional rollback response — use the handoff contract’s `200` `WorkflowVersionDetail` rollback body plus workflow refetch/editor reinit.

## Acceptance Criteria

1. Version History is absent from the Edit Workflow page header.
2. Both Workflow YAML editor paths show Version History beside Documentation.
3. Neither YAML editor contains a legacy Version History tab.
4. One popup provides a version selector and inline side-by-side YAML diff.
5. Diff behavior and visual structure match Assistant System Instructions history.
6. Tags, notes, table selection, and the separate compare popup are removed.
7. READ users can browse history; only WRITE users can restore.
8. Restore requires confirmation, immediately calls backend rollback, and discards unsaved edits.
9. Successful rollback reloads a clean editor with the new current server version.
10. Assistant behavior remains unchanged after shared-component extraction.
11. All updated frontend tests and required quality gates pass.

## Out of Scope

- Editing version tags, notes, or descriptions.
- Selecting arbitrary pairs of versions.
- Server-side diff rendering.
- Restoring only part of Workflow YAML.
- Preserving unsaved non-YAML edits during rollback.
- Removing backend legacy history projection.
- Backend implementation or migration changes.
