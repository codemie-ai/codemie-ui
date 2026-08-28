# Technical Research

**Task**: project-budget chargeback cost-center feature-flag
**Generated**: 2026-08-26
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14404 — UI: expose configurable chargeback settings in project budget flows (Sub-task of parent story EPMCDME-14387).

Summary: Expose configurable chargeback settings in the project budget UI.

Description: Implements the frontend part of configurable chargeback for project budgets. It adds a chargeback toggle and attribution target choice to existing budget configuration flows, supports inline cost center creation when cost-center attribution is selected and no cost center is linked, and renders the settings as read-only for users without budget-edit permission. The UI must use the existing `features:projectChargeback` feature flag and existing project budget and cost center UI patterns.

Preconditions:
- Backend support for `chargeback_enabled` and `chargeback_attribution` is available or coordinated through the backend sub-task.
- Existing cost center creation flow and project budget modal components are available for reuse.

Scenarios of Use:
1. A project maintainer opens a project budget configuration modal and sees the current chargeback state.
2. The maintainer enables or disables chargeback for the project budget.
3. When chargeback is enabled, the maintainer chooses between this project's code and cost center attribution.
4. If cost center attribution is selected and no cost center is linked, the maintainer can create a cost center inline and continue without leaving the budget modal.
5. A user without budget-edit permission can view the chargeback settings but cannot edit them.

Affected Areas (from ticket):
- codemie-ui
- UnifiedProjectBudgetModal, BudgetAssignmentsModal, ProjectBudgetModal, ProjectBudgetsSection
- Project management types and update payloads (ProjectUpdatePayload, ProjectDetail)
- Feature flag constants, utility, and hook for `features:projectChargeback`
- Cost center creation popup integration
- Project, cost center, and budget store/API calls

Acceptance Criteria:
1. ProjectUpdatePayload and ProjectDetail include chargeback_enabled and chargeback_attribution.
2. Frontend feature flag handling includes features:projectChargeback in the constants, utility, and hook layers.
3. Budget configuration modals display a chargeback enabled toggle when the feature flag is enabled.
4. When chargeback is enabled, the UI displays an attribution target choice with `project` as default and `cost_center` as alternative.
5. If cost_center is selected and no cost center is linked, the UI offers a single "Create Cost Center" action and does not provide a general existing cost center picker.
6. The inline cost center creation popup opens from the budget modal and, on success, links the newly created cost center to the project before saving the budget configuration.
7. The save flow handles the sequence create cost center -> link cost center to project -> save budget configuration, including user-visible handling for partial failures.
8. Users without budget-edit permission see the chargeback toggle and attribution target in a non-editable state consistent with existing budget permission behavior.
9. Tests cover the new modal state, feature-flag behavior, attribution target selection, inline cost center creation path, and read-only rendering.
10. Focus-trap and z-index behavior for the nested cost center popup is manually verified or covered by appropriate UI checks.

---

## 2. Codebase Findings

### Existing Implementations

Budget configuration modals (all under `src/pages/settings/administration/components/`):
- `UnifiedProjectBudgetModal.tsx` — the primary "Create/Update Budget" modal. Uses `react-hook-form` + `yupResolver`, wraps `@/components/Popup`, drives category distribution via `UnifiedBudgetDragBar`/`BudgetCategoryTable`, and persists through `projectBudgetsStore.createProjectBudgetGroup` / `updateProjectBudgetGroup`. This is the modal `ProjectBudgetsSection` actually opens today. It receives `projectName`, `onSaved`, `forceCreate` — it does not currently receive the project object, permission flags, or cost-center context.
- `ProjectBudgetModal.tsx` — a per-category create/edit budget modal (`ProjectBudgetCreatePayload`/`ProjectBudgetUpdatePayload`), form-driven, category `Select` is disabled. Not wired into `ProjectBudgetsSection` in the current path.
- `BudgetAssignmentsModal.tsx` — thin wrapper over `BudgetAssignmentsEditor` for per-member assignments; unrelated to project-level chargeback but named in the ticket.
- `CostCenterFormPopup.tsx` — reusable create/edit cost-center form (name regex `^[a-z0-9]+-[a-z0-9]+$`, description). `onSubmit` returns `Promise<void>` and surfaces API errors inline via `submitError`. Consumed today by `CostCentersManagementPage.tsx` and `CostCenterDetailsPage.tsx`, each of which owns the `visible` state and passes a `handleCreateCostCenter` that calls `costCentersStore.createCostCenter`.

Section host:
- `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx` — renders the Budgets card, `DropdownButton` with Manage/Reset/Rebalance/Delete, and mounts `UnifiedProjectBudgetModal`. Takes `mode: 'manage' | 'view'` — this is the existing view/edit gate for budgets.
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — computes `canManageBudgets = isBudgetManagementEnabled && isMaintainer`, `budgetMode = canManageBudgets ? 'manage' : 'view'`, and renders `ProjectBudgetsSection`. This is the page that owns the project object and the permission booleans.

Cost-center linking to a project (the existing pattern AC 6/7 must reuse):
- Projects are linked to a cost center by patching `cost_center_id` through `projectsStore.updateProject(projectName, { cost_center_id })`. Examples: `AssignProjectToCostCenterPopup.tsx:132`, `CostCenterProjectsManager.tsx:170`, `ProjectModal.tsx` submit path. There is no dedicated "link" endpoint — linkage is a project PATCH.

### Architecture and Layers Affected

- Types layer: `src/types/entity/projectManagement.ts` (`ProjectDetail`, `ProjectListItem`, `ProjectUpdatePayload`, `ProjectPayload`), `src/types/entity/project.ts` (`Project`, `ProjectRequest`). None of these currently carry chargeback fields.
- Feature-flag layer (three files): `src/constants/featureFlags.ts` (`FEATURE_FLAGS` const map, `FeatureFlag` type), re-exported by `src/constants/index.ts`; `src/utils/featureFlags.ts` (non-reactive `isFeatureEnabled` helpers); `src/hooks/useFeatureFlags.ts` (reactive `useFeatureFlag` hook + typed wrappers).
- Component layer: budget modals + `ProjectBudgetsSection` + `CostCenterFormPopup` as above.
- Page layer: `ProjectDetailsPage.tsx` owns permissions and the project object.
- Store/API layer: `src/store/projects.ts` (`updateProject` maps to `PATCH v1/projects/{id}`), `src/store/costCenters.ts` (`createCostCenter` -> `POST v1/admin/cost-centers`), `src/store/projectBudgets.ts` (budget group CRUD).

### Integration Points

- `projectsStore.updateProject` -> `PATCH v1/projects/{id}` (whitelists a fixed field set: `name`, `display_name`, `clear_display_name`, `description`, `cost_center_id`, `clear_cost_center`, `enforce_member_spend_limits` — see `src/store/projects.ts:255-265`). Any new chargeback field on the payload is silently dropped here unless added to this map.
- `costCentersStore.createCostCenter` -> `POST v1/admin/cost-centers` with `skipErrorHandling: true` (caller handles errors) returning `CostCenterListItem` (has `id`, `name`).
- `projectBudgetsStore` — budget group create/update; the save target for the modal.
- Existing cost-center feature gate uses the raw string `'features:costCenters'` in `ProjectModal.tsx:71` and `ProjectDetailsPage.tsx:45` rather than a `FEATURE_FLAGS` constant.

### Patterns and Conventions

- Modals: PrimeReact `Dialog` via `@/components/Popup` with `focusOnShow={false}`; mask forced to `!z-50` (`src/components/Popup/Popup.tsx:155,181`). All popups share the same z-index band.
- Forms: `react-hook-form` + `Controller` + `yup` schemas; `@/components/form/*` inputs (`Input`, `Select`, `Switch`, `Textarea`, `Autocomplete`).
- Toggle pattern: `enforce_member_spend_limits` in `ProjectModal.tsx:242-258` uses `@/components/form/Switch` inside a `Controller`, gated by `isEdit && isMaintainer` — the closest existing precedent for a permission-gated boolean toggle on a project.
- Feature flags: reactive components use `useFeatureFlag(FLAG)` returning `[isEnabled, isLoaded]`.
- Auto-focus in modals: `useFocusOnVisible(inputRef, visible)` (`.ai-run/guides/patterns/modal-patterns.md:151-157`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` is present and rich. Relevant guides:
- `.ai-run/guides/patterns/modal-patterns.md` — modal construction, focus (`useFocusOnVisible`), keyboard. Note it states "Restore focus on close — `Popup` handles internally"; there is no documented nested-popup / z-index stacking pattern.
- `.ai-run/guides/patterns/state-management.md` and `.ai-run/guides/patterns/form-patterns.md` — Valtio store + form conventions.
- `.ai-run/guides/development/api-integration.md` — backend calls, error handling, constants.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest two-project setup (see Section 4).
No guide mentions "chargeback" or budget-specific UI; those conventions are derived from code.

### Architectural Decisions

No ADR or inline `DECISION:`/`NOTE:` markers found for chargeback. `UnifiedProjectBudgetModal.tsx` carries extensive inline comments documenting the soft/hard budget scaling algorithm (lines 156-238), which any change to that modal must preserve.

### Derived Conventions

- New feature flag should be added to the `FEATURE_FLAGS` map in `src/constants/featureFlags.ts` and given a `useXEnabled()` wrapper in `src/hooks/useFeatureFlags.ts` and an `isXEnabled()` helper in `src/utils/featureFlags.ts`, mirroring `BUDGET_MANAGEMENT`/`TEAMS_BOT_INTEGRATION`. (Existing `features:costCenters` deviates by using a raw string — the ticket asks for the constants/utility/hook layering, so follow the fuller `FEATURE_FLAGS` precedent.)
- Read-only/permission gating precedent: `ProjectBudgetsSection` `mode` prop and `ProjectModal`'s `isMaintainer`-gated Switch.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/featureFlags.test.ts` — pattern for testing flag helpers by mocking `appInfoStore.configs` / `isConfigFetched`. Directly reusable for a `isProjectChargebackEnabled` helper.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectModal.test.tsx` — pattern for testing a project form modal (cost-center autocomplete, permission gating).
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — page-level test; covers member budget tracking status, not chargeback.
- `src/store/__tests__/projects.test.ts` — store PATCH coverage.

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`, `integration`) via `vitest.workspace.ts`. Unit setup (`setupTests.tsx` + `setupTests.unit.ts`) mocks `useSnapshot` and `@/utils/api`; integration uses real fetch/valtio. `SettingsLayout` and `useVueRouter` are mocked globally — do not re-mock. Common imports: `render, screen, fireEvent` from `@testing-library/react`, `describe/it/expect/vi` from `vitest`.

### Coverage Gaps

No dedicated test files exist for: `UnifiedProjectBudgetModal`, `ProjectBudgetModal`, `BudgetAssignmentsModal`, `ProjectBudgetsSection`, or `CostCenterFormPopup` (confirmed by grep across `*.test.tsx`). The modal that must carry the new chargeback UI (`UnifiedProjectBudgetModal`) has zero current test coverage — AC 9 requires building this test surface from scratch. The nested-popup focus/z-index behavior (AC 10) has no existing automated check.

---

## 5. Configuration and Environment

### Environment Variables

No env vars govern chargeback. Feature flags are delivered at runtime via customer config (`appInfoStore.configs`, `id`/`settings.enabled`), fetched by `appInfoStore.fetchCustomerConfig()` — not through `import.meta.env`/`window._env_`.

### Configuration Files

Feature-flag enablement is data-driven (backend customer config), not a tracked config file. The frontend only declares the flag string and reads it reactively; there is no local flag registry file beyond `src/constants/featureFlags.ts`.

### Feature Flags and Deployment Concerns

- Existing flags in `FEATURE_FLAGS`: `enterpriseEdition`, `userManagement`, `budgetManagement`, `favorites`, `pinnedAssistants`, `favoritesPage`, `mcpConnect`, `showAllProjects`, `requestHedging`, `teamsBotIntegration`, `workflowAI`, `chatContextualNaming`. `features:projectChargeback` and `features:costCenters` are not in this map today.
- Chargeback UI intersects with the `features:costCenters` and `features:budgetManagement` flags already read on `ProjectDetailsPage`.

---

## 6. Risk Indicators

- `projectsStore.updateProject` PATCH body is an explicit field whitelist (`src/store/projects.ts:255-265`). Speculative: if chargeback is persisted via the project PATCH, new fields must be added there and to `ProjectRequest`/`ProjectUpdatePayload`, or they will be dropped before reaching the backend.
- Speculative: AC 1 asks for `chargeback_enabled` / `chargeback_attribution` on `ProjectDetail` and `ProjectUpdatePayload`; these fields are absent from `src/types/entity/projectManagement.ts` today. Whether chargeback is a project attribute or a budget-group attribute is unresolved by the code — `ProjectBudgetsSection`/`UnifiedProjectBudgetModal` persist through `projectBudgetsStore`, not `projectsStore`, so the save path in AC 7 spans two stores.
- Nested Popup risk (AC 10): every `Popup` mask is forced to `!z-50` and `Dialog` uses `focusOnShow={false}` (`src/components/Popup/Popup.tsx:141,155,181`). Opening `CostCenterFormPopup` from inside `UnifiedProjectBudgetModal` stacks two same-band modals; PrimeReact's auto-increment normally handles ordering, but there is no existing nested-popup precedent in this codebase and no documented pattern, so focus-trap/backdrop-dismiss interactions are genuinely untested here.
- The target modal `UnifiedProjectBudgetModal` contains a delicate soft/hard budget scaling algorithm with load-bearing effect ordering (comments at lines 156-238); adding form fields/state must not disturb `interactionInitRef`/`prevHardsRef` timing.
- Multi-step save (create cost center -> PATCH project link -> save budget) is a new orchestration with partial-failure handling (AC 7); no existing flow chains these three calls, and `createCostCenter` uses `skipErrorHandling` (caller-owned errors) while budget-group calls toast internally — inconsistent error surfaces to reconcile.
- Zero existing test coverage on the four budget modals and the cost-center popup means AC 9 requires standing up new test scaffolding, not extending existing suites.
- Feature-flag layering inconsistency: `features:costCenters` uses raw strings while the ticket asks for constants/utility/hook layering — choosing the fuller pattern is a small convention decision but touches three files.

---

## 7. Summary for Complexity Assessment

This is a cross-layer frontend change concentrated in the project-budget administration area. It touches the types layer (`projectManagement.ts`, `project.ts`), the three-file feature-flag stack (`constants/featureFlags.ts`, `utils/featureFlags.ts`, `hooks/useFeatureFlags.ts`), one or more budget modals (primarily `UnifiedProjectBudgetModal`, with `ProjectBudgetModal`/`BudgetAssignmentsModal`/`ProjectBudgetsSection` named), the `CostCenterFormPopup` for inline reuse, the page host `ProjectDetailsPage`, and up to three stores (`projects`, `costCenters`, `projectBudgets`). The file change surface is moderate-to-large: roughly 8-12 source files plus new tests. Established patterns exist for every individual piece — react-hook-form + Popup modals, `useFeatureFlag`, `Switch` toggles gated by permission, and cost-center linkage via `updateProject({ cost_center_id })` — so most work is composition rather than novel invention.

The genuine novelty and risk sit in three places. First, the multi-step save orchestration (create cost center -> link to project -> save budget) with user-visible partial-failure handling has no existing precedent and spans two stores with inconsistent error conventions. Second, opening a nested `CostCenterFormPopup` from within a budget modal is untested in this codebase; all popups share a forced `!z-50` mask with `focusOnShow={false}`, and AC 10 explicitly flags focus-trap/z-index verification. Third, the chosen host modal (`UnifiedProjectBudgetModal`) has intricate, comment-documented budget-scaling effect ordering that new fields and state must not disturb, and it currently has zero test coverage.

Test posture is the weakest area: none of the four named budget modals nor the cost-center popup have dedicated tests, so AC 9's coverage requirement means building new test scaffolding across modal state, feature-flag branching, attribution selection, the inline-create path, and read-only rendering. The permission model to reuse is clear (`canManageBudgets = isBudgetManagementEnabled && isMaintainer`, `budgetMode`), which lowers risk on AC 8. Overall: medium complexity driven by breadth (many small files), one new multi-store save flow, and a from-scratch test surface, with a discrete UI risk around nested modals.

---

## 8. External References

None named by the task. `task_context` points only at in-repo components, types, flags, and stores, all of which were located and read directly (see Sections 2-5). The preconditions reference a backend sub-task for `chargeback_enabled`/`chargeback_attribution` support but name no path, spec file, or URL to source.
