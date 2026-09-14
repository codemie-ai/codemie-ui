# EPMCDME-14757 — Chargeback appears twice in project administration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the Chargeback status exactly once on the project details tab (keeping the fuller, cost-center-aware wording), and remove the redundant "Enable Chargeback" switch from the project configuration dialog so chargeback is only ever edited via the project budget dialog.

**Architecture:** Pure deletion/consolidation in two existing components — no new files, no store/type/API changes. `ProjectDetailsPage.tsx` keeps only the `isChargebackFeatureEnabled`-gated display block and drops the `isAdmin`-gated one. `ProjectModal.tsx` drops its chargeback form field and switch entirely; the retained editing surface (`ChargebackSettings.tsx` via `UnifiedProjectBudgetModal.tsx`) is untouched.

**Tech Stack:** React 18, TypeScript, react-hook-form + Yup, Vitest + React Testing Library.

**Spec:** No spec.md — requirements were supplied inline by the ticket (EPMCDME-14757); acceptance criteria below are the direct source of truth.

**Commits:** One commit per task using the repository's existing convention (ticket key in the message).

## Global Constraints

- Do not widen `ChargebackSettings`' `canManageBudgets`/`hasFullAccess` gate to include `isAdmin` — accepted scope per explicit user decision; platform admins may view but not edit chargeback after this fix.
- Do not modify `ChargebackSettings.tsx` or `UnifiedProjectBudgetModal.tsx` production code.
- Normalize the local `FEATURE_FLAG_COST_CENTERS`/`FEATURE_FLAG_PROJECT_CHARGEBACK` string-literal duplication only inside the two files already being edited (`ProjectDetailsPage.tsx`, `ProjectModal.tsx`) — no repo-wide sweep.
- RTL "exactly once" assertions must use `getAllByText(...).toHaveLength(1)`, never `getByText` (throws on multiple matches, proving nothing).

---

## Acceptance criteria

- [ ] AC1: Admin viewing the project details tab sees Chargeback status listed exactly once.
- [ ] AC2: When chargeback is enabled + attributed to a cost center, the single status states both "enabled" and the attribution (the `isChargebackFeatureEnabled`/`useProjectChargebackEnabled` wording, not the `isAdmin`-only wording).
- [ ] AC3: Non-admin viewers see the same single Chargeback status as admins.
- [ ] AC4: `ProjectModal.tsx` has no chargeback control at all — the "Enable Chargeback" switch is fully deleted, not hidden.
- [ ] AC5: Toggling chargeback in the budget dialog and returning to the details tab reflects the change in the single status (existing `loadProject`/`onProjectChanged` reload plumbing already covers this — no new task needed).
- [ ] AC6: When `features:projectChargeback` is off, no Chargeback status or control appears in either the details tab or the configuration dialog.
- [ ] AC7: An automated test covers an administrator viewing the details tab and fails if a second Chargeback field is reintroduced (`getAllByText` + length assertion).
- [ ] AC8: Existing `ProjectModal.tsx` switch tests are updated (not deleted/skipped) to assert the switch's absence; full suite passes.

**Negative-constraints pass:**
- AC4 ("no chargeback control at all") → Task 2 deletes the switch, its `Controller`, its form field, and its submit-payload entry — no `disabled`/hidden variant left behind.
- AC7/AC1 ("exactly once", test must fail on regression) → Task 1's new test uses `getAllByText('Chargeback').toHaveLength(1)`, not `getByText`.
- AC8 ("updated, not deleted") → Task 2 rewrites the existing `describe('ProjectModal — chargeback Switch visibility', ...)` block in place; it is not removed.
- Access-gating non-goal → no task touches `ChargebackSettings.tsx`, `UnifiedProjectBudgetModal.tsx`, or `ProjectBudgetsSection.tsx`'s `canManageBudgets`/`hasFullAccess` logic.

---

### Task 1: Collapse the duplicate Chargeback display in `ProjectDetailsPage.tsx`

**Files:**
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx:51-52,85-90,137-151,263-290`
- Test: `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx:106-116,143-194`

**Test-first: yes — new test asserts `screen.getAllByText('Chargeback')` has length 1 when rendered as an admin with chargeback enabled; this fails today because Block B (`isAdmin && isProjectChargebackEnabled`, lines 285-290) renders a second "Chargeback" element that no existing test's `mockUserStore.user` ever triggers (it stays `null`/non-admin in all current chargeback tests).**

- [ ] Step 1: In the test file, make the `useFeatureFlag` mock (lines 112-116) flag-name-aware instead of always returning `costCentersFlag()`: `useFeatureFlag: (flag: string) => (flag === FEATURE_FLAGS.COST_CENTERS ? costCentersFlag() : [false, true])`, importing `{ FEATURE_FLAGS }` from `@/constants/featureFlags`. Add a new test in the top-level `describe`: set `mockUserStore.user = { isAdmin: true, isMaintainer: false, isAuditor: false, applicationsAdmin: [] }`, `chargebackFlag.mockReturnValue([true, true])`, render `<ProjectDetailsPage />`, and assert `(await screen.findAllByText('Chargeback')).length` equals `1`. Add a second assertion (same test or a sibling one) that a non-admin render (`mockUserStore.user` left `null`) produces the identical single status text, covering AC3.
- [ ] Step 2: Run `npx vitest run src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — expect the new test(s) to FAIL (two "Chargeback" elements render for the admin case).
- [ ] Step 3: In `ProjectDetailsPage.tsx`: import `{ FEATURE_FLAGS }` from `@/constants/featureFlags`; delete the local `FEATURE_FLAG_PROJECT_CHARGEBACK` constant (line 52) and repoint `FEATURE_FLAG_COST_CENTERS` usage to `FEATURE_FLAGS.COST_CENTERS` (delete line 51, update line 85's call site). Delete the `isProjectChargebackEnabled` flag read (line 86) — its only consumer is being removed. Delete Block B entirely (lines 285-290, the `{isAdmin && isProjectChargebackEnabled && (...)}` block). Keep Block A (lines 263-274) and `chargebackStatusLabel` unchanged. In `handleSaveProject` (lines 137-151), remove the `chargeback_enabled: payload.chargeback_enabled,` line from the `updateProject` call (line 149) — `ProjectModal` no longer produces this field after Task 2 — and keep `chargeback_attribution: payload.chargeback_attribution,`.
- [ ] Step 4: Run the same test command — expect all tests in the file to PASS, including the new admin-role and non-admin-role length-1 assertions.
- [ ] Step 5: Commit.

### Task 2: Remove the "Enable Chargeback" switch from `ProjectModal.tsx`

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectModal.tsx:41-51,53-60,74-75,83,93-123,142-163,278-294`
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectModal.test.tsx:302-336`

**Interfaces:**
- Consumes: `ProjectFormData` (this file) is the payload type `ProjectDetailsPage.handleSaveProject` (Task 1) already destructures — `chargeback_attribution?: ChargebackAttribution` must remain on it; `chargeback_enabled` must not.

**Test-first: yes — rewrite the existing `describe('ProjectModal — chargeback Switch visibility', ...)` block so its three cases assert `screen.queryByTestId('switch-chargeback_enabled')` is `null` under flag-on+admin, flag-on+non-admin, and flag-off+admin; this fails today because the flag-on+admin case currently asserts the switch IS present.**

- [ ] Step 1: In the test file, update lines 302-336: rename the `describe` to `'ProjectModal — chargeback switch removed'`, and change all three `it` bodies to assert `expect(screen.queryByTestId('switch-chargeback_enabled')).toBeNull()` (keep the same three flag/role combinations already set up in each test's arrange step) instead of the old presence/absence split. Do not delete or skip the block.
- [ ] Step 2: Run `npx vitest run src/pages/settings/administration/projectsManagement/__tests__/ProjectModal.test.tsx` — expect the flag-on+admin case to FAIL (switch still renders).
- [ ] Step 3: In `ProjectModal.tsx`: import `{ FEATURE_FLAGS }` from `@/constants/featureFlags`; delete `FEATURE_FLAG_PROJECT_CHARGEBACK` (line 75) and repoint `FEATURE_FLAG_COST_CENTERS` to `FEATURE_FLAGS.COST_CENTERS` (delete line 74, update line 82's call site). Delete the `isProjectChargebackEnabled` flag read (line 83). Remove `chargeback_enabled?: boolean` from `ProjectFormData` (line 49) — keep `chargeback_attribution?: ChargebackAttribution` (line 50). Remove `chargeback_enabled: boolean` from `ProjectModalFormValues` (line 59). Remove `chargeback_enabled: false` from the `useForm` `defaultValues` (line 99) and from both `reset({...})` calls in the visible/project effect (lines 111 and 120). In `handleFormSubmit`, remove the `chargeback_enabled: isAdmin && isProjectChargebackEnabled ? data.chargeback_enabled : undefined,` line (lines 158-159) — keep `needsAttributionReset` (lines 144-149) and `chargeback_attribution: needsAttributionReset ? 'project' : undefined,` (line 160) unchanged. Delete the entire `{isAdmin && isProjectChargebackEnabled && (<Controller name="chargeback_enabled" ...>...</Controller>)}` block (lines 278-294).
- [ ] Step 4: Run the same test command — expect all tests in the file to PASS, including the three rewritten switch-removed cases.
- [ ] Step 5: Commit.
