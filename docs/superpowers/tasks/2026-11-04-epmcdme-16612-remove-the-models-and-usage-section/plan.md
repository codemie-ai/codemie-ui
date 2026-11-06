# EPMCDME-16612 Remove "Models and usage" section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The project Overview tab no longer renders the "Models and usage" section (including the integrations count card).

**Architecture:** Pure removal in `src/pages/settings/administration/projectsManagement/`. Delete the one exclusive component and its test, drop its render and the two props that only fed it, and stop passing those props from the page.

**Tech Stack:** React, TypeScript, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-11-04-epmcdme-16612-remove-the-models-and-usage-section/spec.md`

Commit per task using the repository's existing convention (ticket key EPMCDME-16612 required). Whole-suite gates and browser verification are owned by later stages and are not tasks here.

## Global Constraints

- Keep all shared code: `analyticsStore.fetchTabularData` / `LLMS_USAGE`, `routerToModelOption`, `projectModelConfiguration.ts`, `projectSettingsStore.listAllProjectSettings`, `projectModelSettingsStore`, `appInfoStore.getLLMModels`, route constants, `FEATURE_FLAGS.PROJECT_MODEL_OVERRIDE`.
- No changes to Models or Integrations tabs; no backend, SDK or mock-server changes; no replacement for the integrations count card.
- Repo rule: tests are written only when explicitly asked; this plan only deletes or updates existing tests.

## Review Focus

- Dangling references to `ProjectOverviewIndicators` or unused imports/props after removal (lint/type-check catch these).
- Shared helpers accidentally deleted (Models tab, chat selectors, analytics would break).

---

### Task 1: Remove the section from ProjectOverviewSection and delete the component

**Files:**
- Delete: `src/pages/settings/administration/projectsManagement/components/ProjectOverviewIndicators.tsx`
- Delete: `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx`
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectOverviewSection.tsx` (import l.31; render l.~500-504; props at l.~210-211 and l.~253-254)
- Modify: `src/pages/settings/administration/projectsManagement/__tests__/ProjectOverviewSection.test.tsx` (mock l.53; `canManageProject` props l.77, l.142)

**Interfaces:**
- Produces: `ProjectOverviewSection` props no longer include `canManageProject` or `isModelsConfigEnabled` (Task 2 relies on this).

- [ ] **Step 1:** Grep `ProjectOverviewIndicators` across `src/`; confirm the only references are its own file, its own test, and the section component and test. Stop and report if any other importer exists.
- [ ] **Step 2:** Delete the component and its test file.
- [ ] **Step 3:** In `ProjectOverviewSection.tsx`, remove the import and the render block, and remove `canManageProject` and `isModelsConfigEnabled` from the props type and destructuring. Remove any imports left unused.
- [ ] **Step 4:** In `ProjectOverviewSection.test.tsx`, remove the `vi.mock` of `../components/ProjectOverviewIndicators` and the `canManageProject` props. Do not add tests.
- [ ] **Step 5:** Run `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectOverviewSection.test.tsx`; expect pass (quote the `Test Files` line).

Test-first: no — pure removal; repo rule forbids writing new tests unasked, and the only affected tests are deleted or trimmed (the deleted test covered only the removed component; router-model counting stays covered by `projectModelConfiguration` tests).

### Task 2: Stop passing removed props from ProjectDetailsPage

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectDetailsPage.tsx:264-265`

**Interfaces:**
- Consumes: `ProjectOverviewSection` without `canManageProject` / `isModelsConfigEnabled` (Task 1).

- [ ] **Step 1:** Remove the two props at l.264-265 from the `ProjectOverviewSection` usage. Leave the page's own `canManageProject` and `isModelsConfigEnabled` values, which are still used for tabs (l.71-73, 98, 109).
- [ ] **Step 2:** Run `npx tsc --noEmit` (or the type-check script from `package.json`); expect no errors and no unused-variable findings in the touched files.

Test-first: no — prop-passing cleanup with no behavior of its own; type-check proves it and no new tests are to be written.
