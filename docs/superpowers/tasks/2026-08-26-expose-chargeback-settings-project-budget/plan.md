# Chargeback Settings in Project Budget Flows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose feature-flag-gated chargeback settings (enable toggle, project-vs-cost_center attribution, inline cost-center create) in the project budget configuration modals, read-only for non-editors.

**Architecture:** A single shared `ChargebackSettings` sub-component is hosted by the three ticket-named budget modals. Chargeback persists as a project attribute via the existing `projectsStore.updateProject` PATCH. Inline create reuses `CostCenterFormPopup` stacked over the host modal, following the datasource `IntegrationSection` add-inline precedent. Save orchestrates create → link → save-budget, fail-fast with no rollback.

**Tech Stack:** React 18, TypeScript, react-hook-form + yup, Valtio, PrimeReact `@/components/Popup`, Vitest + React Testing Library (unit + integration projects).

**Spec:** `docs/superpowers/tasks/2026-08-26-expose-chargeback-settings-project-budget/spec.md`

## Global Constraints

- Attribution labels verbatim: `"This project's code"` (value `project`, default) and `"Cost center"` (value `cost_center`).
- Single **"Create Cost Center"** action only — never a general existing-cost-center picker.
- Cost-center linkage is a project PATCH `{ cost_center_id }` — no dedicated link endpoint.
- Do NOT migrate the `features:costCenters` raw-string flag into `FEATURE_FLAGS`.
- Do NOT alter the soft/hard budget-scaling algorithm or its `interactionInitRef`/`prevHardsRef` effect ordering in `UnifiedProjectBudgetModal.tsx` (lines 156-238).
- Partial-save failure is fail-fast, no rollback: stop at failed step, keep modal open with entered values, name the failed step, allow retry.
- Backend is out of scope. Commit per task using the repository's existing convention.
- `negative-constraints`: enumerated above; each honored by the task noted in the self-review pass.

---

### Task 1: Types + persistence whitelist

**Files:**
- Modify: `src/types/entity/projectManagement.ts` (`ProjectDetail`, `ProjectUpdatePayload`)
- Modify: `src/types/entity/project.ts` (`ProjectRequest`)
- Modify: `src/store/projects.ts:255-265` (PATCH field whitelist)
- Test: `src/store/__tests__/projects.test.ts`

**Interfaces:**
- Produces: `chargeback_enabled: boolean`, `chargeback_attribution: 'project' | 'cost_center'` on `ProjectDetail`/`ProjectUpdatePayload`/`ProjectRequest`.

**Test-first: yes** — extend `projects.test.ts` to assert `updateProject(name, { chargeback_enabled, chargeback_attribution })` includes both fields in the PATCH body sent to `v1/projects/{id}`; fails today because the whitelist drops them.

- [ ] Write the failing store test; run it, confirm FAIL (fields absent from body).
- [ ] Add the two fields to the three type declarations and to the whitelist map at `src/store/projects.ts:255-265`.
- [ ] Run the test, confirm PASS. Commit.

---

### Task 2: `features:projectChargeback` flag stack

**Files:**
- Modify: `src/constants/featureFlags.ts` (`FEATURE_FLAGS` map + `FeatureFlag` type)
- Modify: `src/utils/featureFlags.ts` (add `isProjectChargebackEnabled`)
- Modify: `src/hooks/useFeatureFlags.ts` (add `useProjectChargebackEnabled`)
- Test: `src/utils/__tests__/featureFlags.test.ts`

**Interfaces:**
- Produces: `FEATURE_FLAGS.PROJECT_CHARGEBACK = 'features:projectChargeback'`; `isProjectChargebackEnabled()`; `useProjectChargebackEnabled(): [boolean, boolean]`.

**Test-first: yes** — add a `featureFlags.test.ts` case mocking `appInfoStore.configs`/`isConfigFetched` that asserts `isProjectChargebackEnabled()` returns true only when the config enables the flag; mirror the existing `budgetManagement` case.

- [ ] Write the failing helper test; run, confirm FAIL.
- [ ] Add the flag to all three layers mirroring `budgetManagement`. Do not touch `features:costCenters`.
- [ ] Run the test, confirm PASS. Commit.

---

### Task 3: `ChargebackSettings` sub-component

**Files:**
- Create: `src/pages/settings/administration/components/ChargebackSettings.tsx`
- Test: `src/pages/settings/administration/components/__tests__/ChargebackSettings.test.tsx`

**Interfaces:**
- Consumes: `useProjectChargebackEnabled` (Task 2); `chargeback_enabled`/`chargeback_attribution` types (Task 1).
- Produces: `ChargebackSettings` props `{ value: { chargeback_enabled; chargeback_attribution }, linkedCostCenterName?: string, canEdit: boolean, onChange, onCreateCostCenter: () => void }`. Renders nothing when the flag is off.

Follow the `Switch`-in-`Controller` toggle precedent (`ProjectModal.tsx:242-258`). Attribution uses the two verbatim labels, shown only when the toggle is on, default `project`. When `cost_center` is chosen and `linkedCostCenterName` is undefined, render the single "Create Cost Center" action (no picker); when defined, render the linked name read-only. When `canEdit` is false, all controls are disabled.

**Test-first: yes** — RTL tests: (a) renders nothing when flag off; (b) toggle off hides attribution; (c) toggle on shows both labeled options with `project` selected; (d) `cost_center` + no link shows only the Create action and no combobox/picker; (e) `cost_center` + linked name shows it read-only; (f) `canEdit=false` disables toggle and attribution.

- [ ] Write the failing RTL tests; run, confirm FAIL.
- [ ] Implement the component. Run tests, confirm PASS. Commit.

---

### Task 4: Inline cost-center create (stacked popup) + focus/z-index check

**Files:**
- Create/extend: a `useInlineCostCenterCreate` hook or local handler co-located with the host wiring (Task 5), reusing `CostCenterFormPopup.tsx` and `costCentersStore.createCostCenter`.
- Test: `src/pages/settings/administration/components/__tests__/ChargebackSettings.inlineCreate.test.tsx`

**Interfaces:**
- Consumes: `onCreateCostCenter` from Task 3; `costCentersStore.createCostCenter` returning `{ id, name }`.
- Produces: a create flow that, on `CostCenterFormPopup` success, returns the new `{ id, name }` to the caller for linking; the host modal stays mounted throughout (mirror `IntegrationSection.tsx:143-149` — sibling popup, `onSuccess`/`onHide` callbacks, parent never unmounts).

**Test-first: yes** — RTL test: clicking "Create Cost Center" opens `CostCenterFormPopup` while the host content remains in the DOM; submitting a valid name calls `createCostCenter` and invokes the success callback with the created center. Add one targeted AC-10 assertion: the stacked popup mask/dialog is present and the create dialog's fields are focusable (query the popup, assert an input inside receives focus / is reachable) — no manual browser step.

- [ ] Write the failing inline-create + focus tests; run, confirm FAIL.
- [ ] Implement the create/link handler and popup wiring. Run tests, confirm PASS. Commit.

---

### Task 5: Wire into `UnifiedProjectBudgetModal` + save orchestration + permission threading

**Files:**
- Modify: `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx`
- Modify: `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx` (thread `project`, `canManageBudgets`)
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx` (pass project + `budgetMode`/`canManageBudgets` down)
- Test: `src/pages/settings/administration/components/__tests__/UnifiedProjectBudgetModal.chargeback.test.tsx`

**Interfaces:**
- Consumes: `ChargebackSettings` (Task 3), inline-create handler (Task 4), types/persistence (Task 1).

Mount `ChargebackSettings` in the modal driven by form state, with `canEdit` from the threaded `canManageBudgets`. Do not add fields or effects that touch the scaling block at lines 156-238. Save order: (1) create cost center only when `cost_center` chosen with none linked, (2) `updateProject({ cost_center_id, chargeback_enabled, chargeback_attribution })`, (3) save budget via `projectBudgetsStore`. On any step failure: stop, keep modal open with entered values, surface a message naming the failed step (including the backend `cost_center` validation error should it occur), no rollback.

**Test-first: yes** — RTL/integration tests: toggle+attribution render inside the modal gated by flag and permission; save with `cost_center`+new-center runs create→link→save in order; a failure at the link step keeps the modal open, shows the step-named message, and does not call the budget save; non-editor sees disabled controls.

- [ ] Write the failing modal tests; run, confirm FAIL.
- [ ] Thread permissions/project, mount the component, implement the ordered save. Run tests, confirm PASS. Commit.

---

### Task 6: Wire into `BudgetAssignmentsModal` and `ProjectBudgetModal` (verify-live first)

**Files:**
- Modify: `src/pages/settings/administration/components/BudgetAssignmentsModal.tsx`
- Modify: `src/pages/settings/administration/components/ProjectBudgetModal.tsx`
- Test: `src/pages/settings/administration/components/__tests__/BudgetAssignmentsModal.chargeback.test.tsx` (+ `ProjectBudgetModal` only if live)

**Interfaces:**
- Consumes: `ChargebackSettings` and the save handler pattern established in Task 5.

Before wiring each modal, confirm it is a live, reachable surface (grep its import/usage: `BudgetAssignmentsModal` is used by `UsersManagementPage`/`UsersManagementBulkActions`; `ProjectBudgetModal` currently appears only in its own file). Wire `ChargebackSettings` and the ordered save only into modals confirmed reachable; for any modal that is dead/unreachable, record that finding in the task notes and skip it rather than wiring a dead surface.

**Test-first: yes** — for each confirmed-live modal, an RTL test that `ChargebackSettings` renders gated by flag+permission and the ordered save is invoked; if `ProjectBudgetModal` is confirmed unreachable, note it and add no test for it.

- [ ] Verify reachability of both modals; write failing tests for the live one(s); run, confirm FAIL.
- [ ] Wire the confirmed-live modal(s). Run tests, confirm PASS. Commit.
