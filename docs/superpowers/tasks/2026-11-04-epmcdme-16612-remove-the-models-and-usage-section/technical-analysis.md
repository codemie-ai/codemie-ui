# Technical Research

**Task**: project overview models usage
**Generated**: 2026-11-04
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16612 Remove the “Models and usage” section from the project Overview tab

---

## 2. Codebase Findings

### Existing Implementations

Purpose: render the "Models and usage" section of the project Overview tab.
- `src/pages/settings/administration/projectsManagement/components/ProjectOverviewIndicators.tsx` — the only file containing the string "Models and usage" (heading, line ~150). Single consumer: `ProjectOverviewSection.tsx:31` (import), `:500-504` (render with props `projectName`, `canManageProject`, `isModelsConfigEnabled`).
- The component renders three cards inside the one `<section>`: "Model availability" and "Model usage · 30 days" (both only when `isModelsConfigEnabled`), and an **integrations count card** (title = count, "View" link to `PROJECTS_MANAGEMENT_INTEGRATIONS`, "Project-level integration(s)") that is always shown. The integrations card has no other section heading, so removing the section as a whole also removes it; the task does not say whether that is intended.
- Data calls made only here: `appInfoStore.getLLMModels` + `projectModelSettingsStore.fetchSettings` (availability), `analyticsStore.fetchTabularData(TabularMetricType.LLMS_USAGE, last 30 days, top 5)` (usage), `projectSettingsStore.listAllProjectSettings` (integrations count).
- Locals defined only in this file: `TOP_MODELS_LIMIT`, `USAGE_PERIOD`, `ModelUsageRow`, `ModelAvailabilitySummary`, `IndicatorCard`, `Unavailable`.

Other touched code:
- `ProjectOverviewSection.tsx`: props `canManageProject` (l.210/253) and `isModelsConfigEnabled` (l.211/254) are used in this file only to feed the indicators (grep shows no other use).
- `ProjectDetailsPage.tsx:264-265` passes both props to `ProjectOverviewSection`; both values are still used elsewhere in that page (tab list l.71-73, l.98, l.109).
- Tests: `components/__tests__/ProjectOverviewIndicators.test.tsx` (EPMCDME-16177, tests router models counted in availability) — tests only the removed component. `__tests__/ProjectOverviewSection.test.tsx:53` mocks `../components/ProjectOverviewIndicators` and passes `canManageProject={false}` (l.77, l.142).

### Decisions Already in the Code
- UI text is hard-coded English, no i18n resources: grep for "Models and usage", "Model availability", "Model usage" found hits only in the indicators component. No i18n keys, constants or mock-server entries to remove.
- Types/constants: none are dedicated to the section (all local to the component).

### Task Statements Checked Against the Code
- "Models and usage" section exists on the project Overview tab: holds (`ProjectOverviewIndicators`).
- Section contains only models/usage: contradicted in part; it also contains the integrations count card (see above).

### Consumers of Changed Contracts
Shared items the component imports, all still used elsewhere (must stay):
- `analyticsStore.fetchTabularData` / `LLMS_USAGE` / `TimePeriod.LAST_30_DAYS` — analytics widgets, `SpendingCard`, `InsightsTab`.
- `routerToModelOption` — `ProjectModelsSection`, chat selectors, `useProjectLLMModels`.
- `getConfigurableModels`, `isModelAvailable`, `settingsToSelection` (`components/projectModelConfiguration.ts`) — `ProjectModelsSection`, `ProjectMemberModelOverrideModal`.
- `projectSettingsStore.listAllProjectSettings` — also `ProjectIntegrationsSection`.
- `PROJECTS_MANAGEMENT_MODELS` — `ProjectDetailsNavigation`, `constants/routes.ts`; `PROJECTS_MANAGEMENT_INTEGRATIONS` — navigation, integrations pages.
- `projectModelSettingsStore.fetchSettings`, `appInfoStore.getLLMModels` — other consumers not searched exhaustively (Models tab uses them).

### Architecture and Layers Affected
Page components under `src/pages/settings/administration/` only. No store/API/type changes found as exclusive to the section.

### Integration Points
Backend endpoints called are all shared with other features (above).

### Patterns and Conventions
Page-level tests mock child sections via `vi.mock`.

---

## 3. Documentation Findings
Guides in `.ai-run/guides/` exist (not needed in depth); no docs mention the section. No ADRs found.

---

## 4. Testing Landscape
- Delete `ProjectOverviewIndicators.test.tsx`; update `ProjectOverviewSection.test.tsx` (remove mock, possibly props).
- Vitest + React Testing Library. The integrations card has no coverage other than through this component (its test file covers only availability).

---

## 5. Configuration and Environment
Feature flag `FEATURE_FLAGS.PROJECT_MODEL_OVERRIDE` (read in `ProjectDetailsPage.tsx:98`) gates the model cards; it still gates the Models tab and member override features, so it stays. No env vars involved.

---

## 6. Risk Indicators
- Integrations count card lives in the same section; scope decision needed (ticket silent). Removing the section drops it and the "View" shortcut to the Integrations tab (the tab itself remains).
- Speculative: `canManageProject` / `isModelsConfigEnabled` props on `ProjectOverviewSection` become unused if the whole component goes (lint may flag unused props; prop cleanup touches `ProjectDetailsPage.tsx` and the section test).
- Over-deleting shared helpers (`projectModelConfiguration.ts`, `routerToModelOption`, analytics constants) would break other features.
- Test-only coverage for the 16177 router-count behaviour is removed with the component; same logic remains in `projectModelConfiguration` tests.

---

## 7. Summary for Complexity Assessment

Small, frontend-only, single-directory change. One component file (`ProjectOverviewIndicators.tsx`) and its test are the only things exclusive to the section; one import/render in `ProjectOverviewSection.tsx`; optional prop cleanup through `ProjectDetailsPage.tsx` and `ProjectOverviewSection.test.tsx`. No i18n, store, type, constant or mock-server artifacts are exclusive to it.

Test posture: the removed component has its own test; the parent test mocks it. No new tests needed beyond updating the parent test. Main risk is the scope question about the integrations card sharing the section, and ensuring shared helpers are retained.

---

## 8. External References
None named by the task.
