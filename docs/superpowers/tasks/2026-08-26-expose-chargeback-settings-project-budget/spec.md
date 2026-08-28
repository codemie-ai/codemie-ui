# Spec: Expose configurable chargeback settings in project budget flows

**Ticket**: EPMCDME-14404 (sub-task of EPMCDME-14387) · **Size**: M · **Date**: 2026-08-26

## Goal

Let a project maintainer configure chargeback for a project from the budget
configuration modals: turn chargeback on/off, choose an attribution target, and — when
attribution is by cost center and none is linked — create and link one inline without
leaving the modal. The whole surface is gated by the `features:projectChargeback` feature
flag and renders read-only for users without budget-edit permission.

## Why

Chargeback lets spend be attributed either to the project's own code or to a linked cost
center. The backend fields exist (or are coordinated via the backend sub-task); this task
is the frontend that exposes them, reusing the project-budget and cost-center UI patterns
already in the codebase rather than inventing new ones.

## Scope of change

**Types** — Add `chargeback_enabled: boolean` and `chargeback_attribution: 'project' |
'cost_center'` to `ProjectDetail` and `ProjectUpdatePayload` in
`src/types/entity/projectManagement.ts`, and to `ProjectRequest` in
`src/types/entity/project.ts`. Chargeback is a **project attribute**, not a budget-group
attribute (settled by AC 1).

**Persistence** — Extend the explicit PATCH field whitelist at
`src/store/projects.ts:255-265` to carry `chargeback_enabled` and
`chargeback_attribution`; unlisted fields are silently dropped, so this is required for the
values to reach `PATCH v1/projects/{id}`. Cost-center linkage stays a project PATCH
`{ cost_center_id }` via `projectsStore.updateProject` — there is no dedicated link
endpoint.

**Feature flag** — Add `features:projectChargeback` across the three-file stack, mirroring
`budgetManagement`: the `FEATURE_FLAGS` map in `src/constants/featureFlags.ts`, an
`isProjectChargebackEnabled` helper in `src/utils/featureFlags.ts`, and a
`useProjectChargebackEnabled` wrapper in `src/hooks/useFeatureFlags.ts`.

**Shared UI** — Introduce a single `ChargebackSettings` sub-component that renders: a
permission-gated `@/components/form/Switch` toggle (precedent: the `isMaintainer`-gated
Switch in `ProjectModal.tsx:242-258`); an attribution choice shown **only when the toggle
is on**, defaulting to `project` with `cost_center` as the alternative; and, when
`cost_center` is chosen, a **cost-center dropdown** that lists existing cost centers to link
and exposes an inline **"Create Cost Center"** action in the dropdown panel footer, mirroring
the integration-select pattern (`IntegrationSelectDropdown.tsx`). (Scope note: this
existing-center picker supersedes the original AC5 / parent-story AC3 "single create action,
no general picker" constraint, per an explicit product decision during Stage 7 verification.)
When a cost center is already linked it shows as the selected value. This component is hosted by all three ticket-named modals under
`src/pages/settings/administration/components/`: `UnifiedProjectBudgetModal.tsx`,
`ProjectBudgetModal.tsx`, and `BudgetAssignmentsModal.tsx`.

**Inline create** — The "Create Cost Center" action opens the existing
`CostCenterFormPopup.tsx` stacked on top of the host modal, which stays mounted so entered
values survive (required by "without leaving the budget modal"). On success, link the new
cost center to the project via `updateProject({ cost_center_id })` before saving.

**Save orchestration** — The host modal's Save performs, in order: (1) create cost center
(only when needed), (2) PATCH the project to link the cost center and persist the chargeback
fields, (3) save the budget configuration via `projectBudgetsStore`. This spans three stores
with inconsistent error surfaces (`createCostCenter` uses `skipErrorHandling`; budget-group
calls toast internally). Behavior on failure is **fail-fast, no rollback**: stop at the
failed step, keep the modal open with entered values, show a user-visible message naming
which step failed, and allow retry. A cost center already created or linked persists.

**Permissions** — Read-only rendering reuses the existing gate: `canManageBudgets =
isBudgetManagementEnabled && isMaintainer` and `budgetMode = 'manage' | 'view'` computed on
`ProjectDetailsPage.tsx` and threaded through `ProjectBudgetsSection`. Non-editors see the
toggle and attribution in a disabled/non-editable state, consistent with existing budget
permission behavior.

## Acceptance criteria

1. `chargeback_enabled` and `chargeback_attribution` on `ProjectDetail` and
   `ProjectUpdatePayload`.
2. `features:projectChargeback` present in the constants, utility, and hook layers.
3. Each host modal shows the chargeback toggle only when the flag is enabled.
4. When enabled, an attribution choice is shown with `project` default and `cost_center`
   alternative.
5. `cost_center` selected shows a cost-center dropdown listing existing centers to link, with
   an inline "Create Cost Center" action in the dropdown panel footer. (Revised per Stage-7
   product decision; supersedes the original "single action, no picker" wording.)
6. The inline create popup opens from the modal and, on success, links the new cost center
   to the project before saving the budget configuration.
7. Save handles create -> link -> save-budget, with fail-fast, no-rollback, user-visible
   partial-failure handling that names the failed step and allows retry.
8. Non-editors see the toggle and attribution in a non-editable state consistent with
   existing budget permission behavior.
9. Vitest coverage for the new modal state, feature-flag branching, attribution selection,
   the inline-create path, and read-only rendering.
10. Nested cost-center popup focus-trap and z-index behavior manually verified or covered by
    an appropriate UI check.

## Non-goals

- No backend implementation of chargeback endpoints or fields (backend sub-task).
- No dedicated cost-center "link" endpoint — linkage stays a project PATCH `{ cost_center_id }`.
- (Revised) The cost-center dropdown lists existing centers to link (a picker) — this was
  originally a non-goal but was brought into scope by a Stage-7 product decision.
- No changes to the soft/hard budget-scaling algorithm or its effect ordering in
  `UnifiedProjectBudgetModal.tsx` (lines 156-238).
- No automatic rollback of a created/linked cost center on partial save failure.
- No migration of the existing `features:costCenters` raw-string flag into `FEATURE_FLAGS`.
- No chargeback UI outside the budget configuration flow.

## Risks

- All `Popup` masks are forced to `!z-50` with `focusOnShow={false}` and there is no
  nested-popup precedent; stacking `CostCenterFormPopup` over a host modal may need an
  explicit z-index/focus-trap adjustment (AC 10).
- New fields must not perturb the load-bearing `interactionInitRef`/`prevHardsRef` scaling
  effect ordering in `UnifiedProjectBudgetModal.tsx`.
- `ProjectBudgetModal` and `BudgetAssignmentsModal` may be lightly used; implementation must
  verify each is a live, reachable surface before wiring `ChargebackSettings` into it.
- The four budget modals and `CostCenterFormPopup` have zero existing test coverage — AC 9
  stands up new test scaffolding rather than extending suites.
