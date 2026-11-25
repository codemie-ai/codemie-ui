# EPMCDME-17495 Auditor project-count link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Let auditors follow the Cost Centers project-count link and use the cost-center filter on Project Management, like admin/maintainer.

**Architecture:** One shared helper in `src/utils/permissions.ts` replaces the two inline admin/maintainer gates. The write gate `canManageCostCenters` is untouched, so auditors stay read-only.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library.

Commit per task using the repository's existing convention (`EPMCDME-17495: Capitalised subject`).

## Acceptance criteria

- [ ] An auditor sees the project count on the Cost Centers page as a link to Project Management filtered by `cost_center_ids`.
- [ ] Admin and maintainer still get the link. A plain user (no role) still gets a plain count.
- [ ] The cost-center filter on Project Management is visible to an auditor when `FEATURE_FLAG_COST_CENTERS` is on.
- [ ] Auditors still get no create, edit or delete controls on the Cost Centers page.
- [ ] No backend change. The projects-list endpoint already accepts `cost_center_ids` for auditors.

## Global Constraints

- The helper must NOT check `FEATURE_FLAG_COST_CENTERS`. That check stays in `ProjectsManagementFull`.
- Keep module-level `ProjectCountCell` / `renderProjectCountColumn` (Sonar S6478). An empty link string means a plain count.
- No docs and no unrelated refactors.

## Task 1: Shared helper

**Files:** Modify `src/utils/permissions.ts` (after `canAccessUsersTab`, line ~23). Test `src/utils/__tests__/permissions.test.ts`.

**Interfaces:** Produces `canFilterProjectsByCostCenter(user: User | null | undefined): boolean`, true for `isAdmin || isMaintainer || isAuditor`.

Test-first: yes — a `describe('canFilterProjectsByCostCenter')` block fails with "not a function" until the helper exists.

- [ ] Step 1: Add tests next to the `canAccessUsersTab` ones, reusing `baseUser`. The helper returns true for admin, maintainer and auditor. It returns false for a plain user, `null` and `undefined`.
- [ ] Step 2: Run `npx vitest run src/utils/__tests__/permissions.test.ts`. Expect FAIL.
- [ ] Step 3: Implement the helper in the style of `canAccessUsersTab`, with a one-line doc comment. Run the same command. Expect PASS.

## Task 2: Cost Centers page link gate

**Files:** Modify `src/pages/settings/administration/CostCentersManagementPage.tsx:103-104`. Test `src/pages/settings/administration/__tests__/CostCentersManagementPage.test.tsx`.

**Interfaces:** Consumes `canFilterProjectsByCostCenter` from Task 1.

Test-first: yes — the flipped auditor test asserts a link and fails while the gate is the write gate.

- [ ] Step 1: Flip the test at ~147 ("plain count for auditor", `isAuditor: true`) to "renders a link for an auditor". Add a plain-user case (no role) that still renders a plain count with no link. If the file already asserts that write controls are hidden for non-managers, add the same assertion for an auditor. Otherwise add one only if it is a few lines.
- [ ] Step 2: Run `npx vitest run src/pages/settings/administration/__tests__/CostCentersManagementPage.test.tsx`. Expect the auditor-link test to FAIL.
- [ ] Step 3: Set `canLinkToFilteredProjects = canFilterProjectsByCostCenter(currentUser)`. Leave `canManageCostCenters` and its uses (~211-254) unchanged. Update the adjacent comment if it says the link follows the write gate. Re-run. Expect PASS.

## Task 3: Projects Management filter gate

**Files:** Modify `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:~243`. Test `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.initialLoad.test.tsx` (`it.each` at ~189-203).

**Interfaces:** Consumes `canFilterProjectsByCostCenter` from Task 1.

Test-first: yes — the new auditor row `[{ platform_role: 'auditor', isAuditor: true }, true]` fails because the filter is hidden for auditors.

- [ ] Step 1: Add the auditor row to the `it.each` table.
- [ ] Step 2: Run `npx vitest run src/pages/settings/administration/projectsManagement/ProjectsManagementFull.initialLoad.test.tsx`. Expect the auditor row to FAIL.
- [ ] Step 3: Set `canFilterByCostCenter = isCostCentersEnabled && canFilterProjectsByCostCenter(currentUser)`. Re-run. Expect PASS.

## Negative-constraint pass

- Helper must not include the feature flag: Task 3 keeps `isCostCentersEnabled &&` at the call site.
- Auditors stay read-only: Task 2 leaves `canManageCostCenters` unchanged and asserts it.
- No component defined inside a component (Sonar S6478): Task 2 touches only the gate.
- No backend, docs or refactors: no task includes them.
