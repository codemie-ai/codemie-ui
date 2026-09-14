# Technical Research

**Task**: chargeback project-administration settings feature-flags
**Generated**: 2026-09-08T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14757 — Chargeback appears twice in project administration.

Context:
- The Project details tab renders the read-only field "Chargeback" TWICE for administrators while the features:projectChargeback flag is on.
- Both blocks are gated on the same flag, but reached through different routes: shared useProjectChargebackEnabled() hook vs a locally re-declared flag constant.
- The two rows can disagree: one shows full status including cost-center attribution; one shows only Enabled/Disabled.
- There are also two places to change the setting: "Enable Chargeback" switch in the Project configuration modal, and the Chargeback section in the project budget modal. Both write the same project field, so one can silently override the other.
- Introduced by EPMCDME-14086 against a tree that did not yet include EPMCDME-14404.
- Automated tests didn't catch it because details-page tests don't exercise an administrator and the feature-flag mock doesn't distinguish which flag was requested.

Root Cause (from ticket, needs verification against current code):
- src/pages/settings/administration/ProjectDetailsPage.tsx:262-273 — gated on isChargebackFeatureEnabled, uses useProjectChargebackEnabled(), renders fuller status with cost-center attribution.
- src/pages/settings/administration/ProjectDetailsPage.tsx:284-289 — gated on isAdmin && isProjectChargebackEnabled, local constant pointing to the same features:projectChargeback flag, renders only Enabled/Disabled.
- Duplicate editing surfaces writing project.chargeback_enabled:
  - Retained: src/pages/settings/administration/components/ChargebackSettings.tsx, rendered by components/UnifiedProjectBudgetModal.tsx:621
  - To be retired: "Enable Chargeback" switch in src/pages/settings/administration/projectsManagement/ProjectModal.tsx:277-292

Acceptance Criteria:
1. Chargeback status listed exactly once on the project details tab for an admin.
2. When chargeback enabled + cost-center attribution, status states both enabled and the cost-center attribution (retain the fuller wording).
3. Non-admin viewers see the single Chargeback status matching what admin sees.
4. Project configuration dialog has NO chargeback control — enabling/disabling only happens in the project budget dialog.
5. Toggling chargeback in the budget dialog and returning to details tab reflects the change in the single status.
6. When chargeback is disabled platform-wide, no Chargeback status/control appears in either the details tab or config dialog.
7. Automated tests cover an admin viewing the details tab and fail if a second Chargeback field is reintroduced.
8. Existing tests asserting the configuration-dialog switch are updated (not deleted/skipped) to assert new behavior; suite passes.

---

## 2. Codebase Findings

### Existing Implementations

**Duplicate render blocks — `src/pages/settings/administration/ProjectDetailsPage.tsx`** (confirmed at current line numbers, close to but not identical to the ticket's cited ranges):

- Lines 85-88 declare three flag reads in the component body:
  ```
  const [isCostCentersEnabled] = useFeatureFlag(FEATURE_FLAG_COST_CENTERS)
  const [isProjectChargebackEnabled] = useFeatureFlag(FEATURE_FLAG_PROJECT_CHARGEBACK)
  const [isChargebackFeatureEnabled] = useProjectChargebackEnabled()
  ```
  `FEATURE_FLAG_PROJECT_CHARGEBACK` (line 52) is a locally declared string constant `'features:projectChargeback'`; `useProjectChargebackEnabled()` (imported from `@/hooks/useFeatureFlags`) internally calls `useFeatureFlag(FEATURE_FLAGS.PROJECT_CHARGEBACK)` where `FEATURE_FLAGS.PROJECT_CHARGEBACK` is the same string, defined once in `src/constants/featureFlags.ts:32`. Both flag reads resolve to the identical flag — the ticket's claim of "different routes" refers to the code path, not a different flag value.
- Block A — lines 263-274: `{isChargebackFeatureEnabled && (...)}`, renders a "Chargeback" label and calls `chargebackStatusLabel(project.chargeback_enabled, project.chargeback_attribution, isCostCentersEnabled)` (helper defined lines 54-65), which returns `'Enabled, attributed to a cost center'`, `'Enabled'`, or `'Disabled'`.
- Block B — lines 285-290: `{isAdmin && isProjectChargebackEnabled && (...)}`, renders a second "Chargeback" label with `{project.chargeback_enabled ? 'Enabled' : 'Disabled'}` only — no cost-center attribution.
- Both blocks sit inside the same `grid grid-cols-2` details card (lines 221-299), interleaved with Type, Enforce member spend limits, Created by, Created at rows.
- `isAdmin` (line 96) is `currentUser?.isAdmin ?? false`, sourced from `useSnapshot(userStore)`.

**"To retire" switch — `src/pages/settings/administration/projectsManagement/ProjectModal.tsx`**:
- Lines 74-75 re-declare the same flag constants (`FEATURE_FLAG_COST_CENTERS`, `FEATURE_FLAG_PROJECT_CHARGEBACK`) independently of `ProjectDetailsPage.tsx`.
- Line 83: `const [isProjectChargebackEnabled] = useFeatureFlag(FEATURE_FLAG_PROJECT_CHARGEBACK)`.
- Lines 41-60: `ProjectFormData` and the internal `ProjectModalFormValues` both carry `chargeback_enabled`; `chargeback_attribution` is present on `ProjectFormData` but not settable from this modal's form (no field renders it).
- Lines 99-121: `chargeback_enabled` is seeded into the form's `defaultValues` and reset from `project.chargeback_enabled`.
- Lines 142-163 (`handleFormSubmit`): submits `chargeback_enabled: isAdmin && isProjectChargebackEnabled ? data.chargeback_enabled : undefined` and always submits `chargeback_attribution: needsAttributionReset ? 'project' : undefined` (a reset-only path tied to clearing the linked cost center, lines 144-149 — this needsAttributionReset logic is not itself part of the chargeback-editing surface being retired, it exists to keep `chargeback_attribution` consistent when a cost center is unlinked).
- Lines 278-294: the "Enable Chargeback" `<Switch>` itself, gated on `isAdmin && isProjectChargebackEnabled`, label "Enable Chargeback", hint "When enabled, this project's usage is tracked for chargeback billing."
- `ProjectDetailsPage.handleSaveProject` (lines 137-173) forwards `chargeback_enabled` and `chargeback_attribution` from `ProjectModal`'s `onSubmit` payload straight into `projectsStore.updateProject`.

**Retained editing surface — `ChargebackSettings.tsx` + `UnifiedProjectBudgetModal.tsx`**:
- `ChargebackSettings.tsx` (103 lines) is a presentational component taking `value: {chargeback_enabled, chargeback_attribution}`, `hasCostCenter`, `costCentersEnabled`, `canEdit`, `onChange`. It self-gates on `useProjectChargebackEnabled()` (line 52-56) and returns `null` when off. It renders an "Enable chargeback" switch, and — only when `chargeback_enabled && costCentersEnabled` — an "Attribute to a cost center" switch, disabled when `!hasCostCenter`.
- `UnifiedProjectBudgetModal.tsx` renders `<ChargebackSettings>` at line 621, inside a `{!distributionOnly && (...)}` block (line 619-633), passing `hasCostCenter={Boolean(project?.cost_center_id)}`, `costCentersEnabled={isCostCentersEnabled}`, `canEdit={canManageBudgets}`.
- `chargebackWritable` (line 204): `isChargebackFeatureEnabled && canManageBudgets`. On submit (`onFormSubmit`, lines 374-401), if `chargebackWritable`, it calls `projectsStore.updateProject(projectName, { chargeback_enabled, chargeback_attribution })` **before** the budget-group save, fail-fast with no rollback (comment at lines 379-382).
- `UnifiedProjectBudgetModal` is rendered by `ProjectBudgetsSection.tsx:229`, with `canManageBudgets={hasFullAccess}` (line 237), where `hasFullAccess = access === 'full'` (line 54) — `access` is the `budgetsAccess` prop computed in `ProjectDetailsPage.resolveBudgetsAccess` (lines 67-79): maintainers get `'full'`, admins/project-admins get `'distribution'`, others `'view'`. **This means only maintainers (not platform admins) can currently write chargeback through the retained surface** — worth flagging for the plan stage, not asserted here as a requirement.

### Architecture and Layers Affected

- **Page/route layer**: `ProjectDetailsPage.tsx` (read-only status display, edit-popup orchestration for `ProjectModal`).
- **Form/modal layer**: `ProjectModal.tsx` (project configuration dialog — the switch to remove), `UnifiedProjectBudgetModal.tsx` (project budget dialog — the retained chargeback editing surface), `ChargebackSettings.tsx` (presentational sub-component of the budget modal).
- **Section/composition layer**: `ProjectBudgetsSection.tsx` (wires `UnifiedProjectBudgetModal` into the details page, computes `hasFullAccess`/`canManageBudgets`).
- **Hooks layer**: `src/hooks/useFeatureFlags.ts` (`useFeatureFlag`, `useProjectChargebackEnabled`).
- **Constants layer**: `src/constants/featureFlags.ts` (`FEATURE_FLAGS.PROJECT_CHARGEBACK = 'features:projectChargeback'`) and the two local re-declarations of the same string in `ProjectDetailsPage.tsx:52` and `ProjectModal.tsx:75`.
- **Store layer**: `src/store/projects.ts` (`projectsStore.updateProject`, `getProject` — passthrough for `chargeback_enabled`/`chargeback_attribution`, no chargeback-specific logic found).
- **Types layer**: `src/types/entity/project.ts` (`Project`, `ProjectRequest`, `ChargebackAttribution`), `src/types/entity/projectManagement.ts` (`ProjectListItem`, `ProjectDetail`, `ProjectUpdatePayload`, `ProjectPayload`).

### Integration Points

- `ProjectDetailsPage` → `ProjectModal` (props: `visible`, `project`, `onHide`, `onSubmit`); `ProjectModal`'s `onSubmit` payload flows into `projectsStore.updateProject`.
- `ProjectDetailsPage` → `ProjectBudgetsSection` → `UnifiedProjectBudgetModal` → `ChargebackSettings`; `UnifiedProjectBudgetModal` also calls `projectsStore.updateProject` directly (separate call from `ProjectModal`'s), and separately `projectBudgetsStore.updateProjectBudgetGroup` / `createProjectBudgetGroup`.
- Both `ProjectModal` and `UnifiedProjectBudgetModal` write to the same backend field `project.chargeback_enabled` (and `chargeback_attribution`) via independent `projectsStore.updateProject` calls — no coordination between them, confirming the ticket's "one can silently override the other" claim structurally (last save wins; no client-side merge or lock).
- After a `ProjectModal` save, `ProjectDetailsPage.handleSaveProject` calls `loadProject()` (or navigates on rename) to refresh the details view; after a `UnifiedProjectBudgetModal` save, `onSaved` (wired from `ProjectBudgetsSection`) similarly triggers `onProjectChanged={loadProject}` — both paths do reload the project, so the "single status reflects change" acceptance criterion (AC5) is plumbing that already exists for whichever block survives.

### Patterns and Conventions

- Feature-flag access has two parallel idioms in this codebase: (a) call `useFeatureFlag(FEATURE_FLAGS.X)` directly with the shared constant from `src/constants/featureFlags.ts`, or (b) call a named wrapper hook (`useProjectChargebackEnabled`, `useBudgetManagementEnabled`, etc.) from `src/hooks/useFeatureFlags.ts` that wraps the same call. Both idioms exist side by side across the codebase (e.g. `useBudgetManagementEnabled` vs. raw `useFeatureFlag(FEATURE_FLAG_COST_CENTERS)` in the very same files) — the duplication is not simply "a bug used the wrong hook," it's that this file independently re-declared a **local string constant** (`FEATURE_FLAG_PROJECT_CHARGEBACK`) that happens to equal the constant already centralized in `FEATURE_FLAGS.PROJECT_CHARGEBACK`, rather than importing the existing named hook, and then a second contributor added a second block using the shared hook without noticing the first.
- Non-reactive counterpart utilities exist in `src/utils/featureFlags.ts` (`isFeatureEnabled`, `isProjectChargebackEnabled`) for non-React contexts; not used by any of the files in scope here.
- Presentational gating pattern: `ChargebackSettings` self-gates and returns `null` — a pattern for a component to own its own flag check rather than have the parent conditionally render it. `ProjectDetailsPage`'s two blocks instead gate inline in JSX rather than delegating to a shared sub-component.
- Form pattern: `react-hook-form` + `yupResolver`, `Controller`-wrapped inputs, matches `.ai-run/guides/patterns/form-patterns.md` conventions (not read in full here but file exists at that path).

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists with directories: `architecture`, `components`, `development`, `integration`, `onboarding`, `patterns`, `security`, `standards`, `styling`, `testing`, plus `project.md`, `quality-gates.md`, `README.md`. None of these guides mention "chargeback" by name (not grepped exhaustively beyond directory listing); the relevant general guides for this task are `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/patterns/form-patterns.md`, `.ai-run/guides/patterns/modal-patterns.md`, and `.ai-run/guides/testing/testing-patterns.md` (partially read — see below), per `AGENTS.md` task routing for "State" and "Forms & Modals" categories.

### Architectural Decisions

No ADR files or `DECISION:`/`ADR:` inline markers were found in the chargeback-related files. In-code comments do record local design decisions relevant to this task:
- `ProjectDetailsPage.tsx:60-61` (in `chargebackStatusLabel`): "Cost-center attribution is only meaningful when the feature is on; otherwise the project is the only possible target, so never surface a cost center." — explains why `isCostCentersEnabled` gates the fuller wording.
- `UnifiedProjectBudgetModal.tsx:379-382`: explains the fail-fast, no-rollback save order (chargeback persisted before the budget group).
- `UnifiedProjectBudgetModal.tsx:134-136`: explains why chargeback state is seeded only on the `visible` open-transition, not on every `project` prop change (prevents wiping in-progress edits).
- `ChargebackSettings.tsx:29-40`: doc comments on why the cost-center link itself is edited elsewhere (project edit form) and why the toggle is hidden entirely when `costCentersEnabled` is false.

### Derived Conventions

- Ticket keys are cited in commit messages and occasionally in code/test comments (e.g. `EPMCDME-13486`, `EPMCDME-13962`, `EPMCDME-13165` appear as inline references in `ProjectDetailsPage.test.tsx`). Following this convention, any change addressing EPMCDME-14757 would likely reference the ticket key in new/updated test names or commit messages, consistent with repository history.
- Git history confirms the ticket's stated root cause precisely: commit `966fa9b80` "EPMCDME-14404: Expose configurable chargeback settings in project budget flows" (Aug 28, 2026) added the fuller block (`isChargebackFeatureEnabled` / `useProjectChargebackEnabled`, +5 lines to `ProjectDetailsPage.tsx`) first; commit `fa02ca313` "EPMCDME-14086: Add Enable Chargeback switch to project configuration" (Sep 2, 2026) added the second block (`isAdmin && isProjectChargebackEnabled`, +9 lines to `ProjectDetailsPage.tsx`) on a branch that predated 14404's merge, and both landed on `ProjectDetailsPage.tsx` without a merge conflict since they touch disjoint line ranges within the same grid.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` (448 lines): covers the chargeback display block (`Enabled, attributed to a cost center`, cost-centers-disabled degradation, `Disabled` state, flag-off hiding) and the `budgetsAccess` resolution matrix (project-admin/platform-admin/maintainer/auditor/regular-user). **None of the chargeback-display tests set `mockUserStore.user.isAdmin = true`** — the top-level `describe('ProjectDetailsPage', ...)` block never assigns `mockUserStore.user` before these tests run, so `isAdmin` defaults to `false` and Block B (`isAdmin && isProjectChargebackEnabled`) never renders during these assertions. This is the concrete mechanism behind the ticket's "details-page tests don't exercise an administrator" claim.
- `vi.mock('@/hooks/useFeatureFlags', ...)` in this file (lines 112-116) maps **both** `useFeatureFlag` and (indirectly, via the same underlying mock) `useProjectChargebackEnabled` — but critically, `useFeatureFlag: () => costCentersFlag()` ignores the flag-name argument entirely and always returns the cost-centers mock value, regardless of whether the calling code asked for `FEATURE_FLAG_COST_CENTERS` or `FEATURE_FLAG_PROJECT_CHARGEBACK`. This is the concrete mechanism behind the ticket's "the feature-flag mock doesn't distinguish which flag was requested" claim — `isProjectChargebackEnabled` (line 86, driven by `useFeatureFlag`) in the component under test actually receives the `costCentersFlag()` mock value, not a chargeback-specific one, in every existing test in this file.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectModal.test.tsx` (384 lines): `describe('ProjectModal — chargeback Switch visibility', ...)` (lines 302-336) has three tests asserting the switch is hidden when flag off, hidden when non-admin, and shown when flag-on + admin (`switch-chargeback_enabled` test id, "Enable Chargeback" text). These are the tests AC8 requires to be updated (not deleted) to assert the switch's absence.
- `src/pages/settings/administration/components/__tests__/ChargebackSettings.test.tsx` (145 lines): thorough coverage of the retained component in isolation (flag-off renders nothing, enable/disable toggle, cost-center attribution toggle, `hasCostCenter`/`costCentersEnabled`/`canEdit` gating).
- `src/pages/settings/administration/components/__tests__/UnifiedProjectBudgetModal.chargeback.test.tsx` (305 lines): covers rendering gating, save-order (`updateProject` before `updateProjectBudgetGroup`), cost-centers-disabled coercion to `'project'` attribution, failed-save handling, and re-seed-avoidance on prop identity change. Does not test admin-vs-non-admin — gating here is `canManageBudgets` (derived from budget access level), not `isAdmin` directly.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectBudgetsSection.test.tsx`: has a `describe('ProjectBudgetsSection chargeback prop wiring', ...)` block; not read in full, but confirmed to reference `chargeback_enabled`/`chargeback_attribution` fixture data and a comment "chargeback lives on the project" near a refetch assertion.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library, two workspace projects (`unit`, `integration`) per `vitest.workspace.ts`. `*.test.tsx` → unit project; `*.integration.test.tsx` → integration project (none found for chargeback specifically).
- AAA (Arrange/Act/Assert) pattern documented in `.ai-run/guides/testing/testing-patterns.md`.
- `SettingsLayout` and `useVueRouter` are mocked globally in `setupTests.tsx` per the guide; `ProjectDetailsPage.test.tsx` nonetheless re-mocks `SettingsLayout` locally (line 73-81) and `useVueRouter` (line 58-63) — a possible deviation from the stated global-mock convention, noted for awareness only.
- Feature flags are mocked per-file via `vi.mock('@/hooks/useFeatureFlags', ...)`, with varying fidelity: `ChargebackSettings.test.tsx` and `UnifiedProjectBudgetModal.chargeback.test.tsx` correctly stub `useProjectChargebackEnabled` as its own mock function distinct from `useFeatureFlag`; `ProjectDetailsPage.test.tsx` does not (see Coverage Gaps).

### Coverage Gaps

- No `ProjectDetailsPage` test currently renders the page as an admin (`isAdmin: true`) while asserting on chargeback content — the exact scenario named in AC1/AC7.
- No test asserts there is exactly one "Chargeback" element for any user role (all existing assertions use `getByText('Chargeback')`, which passes with either one or, ambiguously, would throw a "multiple elements" error only if RTL's single-match query is used — worth confirming query behavior when drafting new tests, since `getByText` throws on multiple matches, meaning existing single-block tests may already be silently relying on Block B never rendering rather than positively asserting singularity).
- No test in `ProjectDetailsPage.test.tsx` or `ProjectModal.test.tsx` exercises the interaction between the two write surfaces (config-dialog switch vs. budget-dialog `ChargebackSettings`) to show one overriding the other — the "silently override" scenario from the ticket has no regression test.
- `ProjectModal.test.tsx`'s chargeback-visibility tests will need rewriting per AC8 rather than deletion.

---

## 5. Configuration and Environment

### Environment Variables

None specific to chargeback found. Feature flags in this codebase are runtime config delivered via `appInfoStore` (backend-driven config, not `import.meta.env`/`window._env_` build/runtime env vars) — confirmed by `useFeatureFlag`'s implementation reading `appInfoStore.configs`/`isConfigFetched` (`src/hooks/useFeatureFlags.ts:62-70`) and `src/utils/featureFlags.ts:44-51`.

### Configuration Files

- `src/constants/featureFlags.ts` — single source of truth for the flag-name string `FEATURE_FLAGS.PROJECT_CHARGEBACK = 'features:projectChargeback'` (and `FEATURE_FLAGS.COST_CENTERS = 'features:costCenters'`), duplicated as local string literals in `ProjectDetailsPage.tsx:52` and `ProjectModal.tsx:75` rather than imported.
- No dedicated chargeback config file; the flag is one entry in the broader backend-driven customer configuration surfaced through `appInfoStore` / `customerConfiguration.ts` (referenced in `fa02ca313`'s diff stat but not read in full here).

### Feature Flags and Deployment Concerns

- `features:projectChargeback` — the single flag gating all chargeback UI in scope.
- `features:costCenters` — a second, related flag that further gates whether cost-center attribution wording/controls are shown; it does not gate chargeback's existence, only the attribution-to-cost-center refinement.
- No Dockerfile, CI/CD, or deployment manifest references to "chargeback" were found via the `grep -l` scan in Step 1 (the file list returned only `src/` paths).

---

## 6. Risk Indicators

- **Test-mock fidelity risk**: `ProjectDetailsPage.test.tsx`'s `useFeatureFlag` mock (lines 112-116) is flag-name-blind — it returns `costCentersFlag()` for every call regardless of which flag string is passed. Any fix that keeps two independently-gated code paths reading `useFeatureFlag` directly (rather than consolidating on one hook) risks this mock continuing to mask divergence. Speculative: a durable regression test for AC7 likely needs a flag-name-aware mock (e.g. a `vi.fn((flag: string) => ...)` keyed by the flag string) rather than the current fixed-return-value stubs.
- **Access-level asymmetry between the two write surfaces**: the config-dialog switch (to be retired) gates writability on `isAdmin`; the retained `ChargebackSettings` in the budget modal gates on `canManageBudgets`, which is `hasFullAccess` (`access === 'full'`), which per `resolveBudgetsAccess` in `ProjectDetailsPage.tsx:67-79` is granted to **maintainers**, not platform admins (admins get `'distribution'` access, not `'full'`). Speculative: removing the admin-facing switch without revisiting this access mapping could leave platform admins unable to toggle chargeback anywhere, which is a functional regression beyond what the ticket's acceptance criteria currently describe — worth surfacing to spec/plan.
- **Two independent `projectsStore.updateProject` call sites** (`ProjectDetailsPage.handleSaveProject` via `ProjectModal`, and `UnifiedProjectBudgetModal.onFormSubmit`) write overlapping fields (`chargeback_enabled`, `chargeback_attribution`) with no shared debounce/lock/optimistic-concurrency mechanism found in `src/store/projects.ts` — removing one call site (the config dialog's) resolves the override risk for chargeback specifically, but the underlying "two callers write the same resource" shape remains for any other field both dialogs still share (none currently identified as shared besides chargeback).
- **RTL query ambiguity**: existing `ProjectDetailsPage.test.tsx` assertions use `screen.getByText('Chargeback')`/`findByText('Chargeback')`, which throw on multiple DOM matches — meaning a straightforward "assert exactly one" test needs an explicit multiplicity check (e.g. `getAllByText('Chargeback')` with a length assertion) rather than relying on `getByText` alone, since `getByText` would already fail-loud today for a non-admin user once an admin path additionally renders. No such role-parameterized test exists yet.
- **Local flag-constant duplication is a broader pattern, not isolated to this bug**: `FEATURE_FLAG_PROJECT_CHARGEBACK` and `FEATURE_FLAG_COST_CENTERS` are each independently re-declared as string literals in both `ProjectDetailsPage.tsx` and `ProjectModal.tsx` instead of importing `FEATURE_FLAGS` from `src/constants/featureFlags.ts`. Fixing only the duplicate-render symptom without addressing this duplication leaves the same class of drift possible for the cost-centers flag or future flags.
- **No guide found specifically covering feature-flag hook selection** (when to use `useFeatureFlag(FEATURE_FLAGS.X)` directly vs. a named wrapper hook) — `.ai-run/guides/patterns/state-management.md` and `custom-hooks.md` exist but were not read in full; if they are silent on this, the convention has to be inferred from code, which is itself inconsistent (see Patterns above).

---

## 7. Summary for Complexity Assessment

The change touches four files directly (`ProjectDetailsPage.tsx`, `ProjectModal.tsx`, plus their two test files) and reads through two more without modification (`ChargebackSettings.tsx`, `UnifiedProjectBudgetModal.tsx`, and `ProjectBudgetsSection.tsx`) to confirm the retained editing surface's access gating. All affected code sits in a single architectural layer — page and modal components in `src/pages/settings/administration/` — with no store, type, or API-contract changes evident from the ticket's stated acceptance criteria (both `chargeback_enabled` and `chargeback_attribution` already exist on `Project`/`ProjectRequest`/`ProjectUpdatePayload`/`ProjectDetail`, and `projectsStore.updateProject` already accepts them). The root cause is precisely reproducible from git history: two independent commits (`966fa9b80` for EPMCDME-14404, `fa02ca313` for EPMCDME-14086) added disjoint, functionally-overlapping blocks to the same file without a merge conflict, and no test caught the collision because of two compounding test gaps documented above.

Technical novelty is low — this is a deletion/consolidation task (remove one display block, remove one write-control, keep the fuller/canonical versions of each) rather than new capability. The primary risk is not implementation difficulty but scope-boundary discipline: the access-level asymmetry between the switch being removed (`isAdmin`-gated) and the surface being retained (`hasFullAccess`/maintainer-gated) is a real behavioral question the ticket's acceptance criteria do not address, and resolving it either way is a design decision for spec/plan, not something this research should decide.

Test-coverage posture is mixed: `ChargebackSettings` and `UnifiedProjectBudgetModal` chargeback behavior are both well covered in isolation with flag-name-correct mocks; `ProjectDetailsPage` and `ProjectModal` tests exist but have the two specific, now-documented gaps (no admin-role rendering test; a flag-name-blind mock) that let the duplication ship. AC7 and AC8 map directly onto closing those two gaps, which is procedurally straightforward once the production code is consolidated, but the new admin-covering test needs a flag-mock rewrite in `ProjectDetailsPage.test.tsx`, not just a new `it` block, since the existing mock structure cannot currently distinguish the two flags it stubs.

---

## 8. External References

None named by the task. `task_context` cites only in-repo file paths (`src/pages/...`) as the basis for its stated root cause, all of which were read directly and are reported in Section 2 above; it names no path or URL outside this repository as a source of truth.
