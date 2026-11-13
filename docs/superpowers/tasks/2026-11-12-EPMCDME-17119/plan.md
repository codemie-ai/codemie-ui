# EPMCDME-17119: Save "all ticked" project models as all models Implementation Plan

**Goal:** On the project Models tab, ticking every model/router saves the project as "all models" (`allowed_models: null`) plus the chosen `default_model`; a partial selection keeps saving an allow list.

**Architecture:** One write path changes: `persistDraft` picks the `selectionToSettings` policy from the selection. `saveSettings` already serializes mode `'all'` as `allowed_models: null`, and the read path already maps null to all ticked, so nothing else changes.

Commit per task using the repository's existing convention (git work is handled outside this plan).

## Acceptance criteria

- All models ticked and applied: PATCH sends `allowed_models: null` with the chosen `default_model`, so a model added to the platform later is included.
- Partial selection and applied: still saved as an allow list; a model added later is not selected.
- After reload, a project saved as null shows every model ticked with its stored default.
- All ticked with the platform default model still goes through the reset (DELETE) path, not PATCH.

## Task 1: Choose the policy from the selection in `persistDraft`

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx:176-192`
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx`

Test-first: yes — updated router-default test (all four ticked, default changed to router) expects `saveSettings` called with `mode: 'all'` and `default_model: 'router'`; it fails while `persistDraft` still returns `allow_list`.

- [ ] **Step 1: Update and add tests** (same file, existing mocks and toggle-button helpers)
  - Test at lines 105-128: replace the `models: [...]` expectation with `mode: 'all'` and `models: []`, and rename it to say it saves all models with the router as default.
  - Add a test: tick nothing off, choose a non-router default (e.g. `model-b`) via the default dropdown, Apply; expect `saveSettings` called with `mode: 'all'` and `default_model: 'model-b'`.
  - Partial selection: the tests at lines 130-162 already cover allow-list saves; add `mode: 'allow_list'` to the `objectContaining` in the one at lines 130-143 so both outcomes are asserted explicitly.
  - Leave the reset test (lines 164-179) untouched; it guards the DELETE path.
- [ ] **Step 2: Run the section test file**, confirm the two `mode: 'all'` tests fail.
- [ ] **Step 3: Implement.** In `persistDraft`, compute `allEnabled = Object.values(targetDraft.selection).every((v) => v === 'enabled')` and pass `allEnabled ? 'enable' : 'disable'` instead of the literal `'disable'` at line 182; keep the `default_model` spread. Checking `allEnabled` first means the `deny_list` branch (not storable by the backend) is never reached. Do not touch `saveChanges`, `persistReset`, `saveSettings`, `fromProjectResponse`, `toDraft`, `projectModelFiltering.ts` or `projectsStore.updateAllowedModels`.
- [ ] **Step 4: Run the section test file and `projectModelConfiguration.test.ts`**, confirm all pass.

## Manual verification (not an implementation task)

Against local docker-compose: on a project's Models tab tick every model, pick a non-global default, Apply; confirm the PATCH with `allowed_models: null` and `default_model` is accepted, and that after reload every model is ticked with that default. Then untick one model, Apply, and confirm the stored value is a list.

## Negative-constraint pass

- Partial selection must not become a deny list or null: honored by Task 1 (`'disable'` policy kept when any entry is not enabled; test asserts `mode: 'allow_list'`).
- Reset path preserved: `saveChanges` unchanged, reset test untouched.
- No change to the store, helpers, types or the unused `updateAllowedModels`; no new files.
