# Overview Model Availability Card Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Overview tab's "Model availability" card (`ProjectOverviewIndicators.tsx`) so its model count includes router models and its "Premium models" label reflects actual premium-model availability, not the raw `hide_premium_models` flag.

**Architecture:** Mirror the existing, correct pattern already used by `ProjectModelsSection.tsx`: concatenate `appInfoStore.llmRouters.map(routerToModelOption)` onto the concrete-model catalog before deduping with `getConfigurableModels`. Replace the raw-flag-reading `hidePremiumModels` field with a derived `hasPremiumModelsEnabled` boolean computed via the existing `isModelAvailable` helper. No new store, API, or shared module — both fixes consume data/helpers the component already imports or has one additional existing store field away.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library, Valtio stores.

**Spec:** Requirements supplied inline (Jira EPMCDME-16177); no spec.md for this task. Technical analysis: `docs/superpowers/tasks/2026-10-21-epmcdme-16177-overview-model-section/technical-analysis.md`.

## Global Constraints

- Catalog must be built exactly as `ProjectModelsSection.tsx:82-99` does: `[...catalog, ...appInfoStore.llmRouters.map(routerToModelOption)]` before `getConfigurableModels`. No alternate mechanism (no `getEmbeddingsModels`).
- "Premium models" label text: `Visible` / `Not visible` (not `Hidden`/`Visible` as today).
- Do not change the `useEffect` dependency array (`[isModelsConfigEnabled, projectName]`) — AC4's refetch-on-return behavior must not regress.
- Commit per task using the repository's existing convention (ticket EPMCDME-16177; format `EPMCDME-16177: Capital sentence`, enforced by Tekton CI — see `.ai-run/guides/standards/git-workflow.md`).

## Review Focus

- Router-only premium model: a router with `isPremium: true` must count toward both the total and the premium-visibility check (routers are mapped through `routerToModelOption`, which preserves `isPremium`) — covered by Task 1/2 tests using a router fixture with `isPremium: true`.
- `hide_premium_models: true` with a premium model otherwise selected: `isModelAvailable` already folds in `hidePremiumModels`, so the derived boolean must read "Not visible" even though the model is in the allow list — covered by Task 2's "Not visible" test.
- Duplicate model between `llmModels` and `llmRouters` (same `value`): `getConfigurableModels` dedupes by `value` via a `Map`, so the later entry (router) wins; existing helper behavior, not re-tested here since `projectModelConfiguration.test.ts` already covers dedup.
- `isModelsConfigEnabled: false`: the card's whole data branch is skipped (`setModels(null)`) — unaffected by this fix; no new test needed since it's unchanged, pre-existing behavior path.
- Empty router list (`appInfoStore.llmRouters` is `[]`): catalog equals the pre-fix concrete-only list, so total/available must match current (correct, non-regressed) numbers — implicitly covered by Task 1's mixed-catalog test still passing when routers list is non-empty, and Task 2's premium tests which use `llmRouters: []`.

---

## Acceptance criteria

- [ ] Opening Overview with 63 total models (concrete + routers) shows "N of 63 models", not 60.
- [ ] Opening Overview shows "Premium models: Visible" when at least one premium model is enabled for the project.
- [ ] Opening Overview shows "Premium models: Not visible" when no premium model is enabled/selected for the project.
- [ ] Returning to Overview after changing model selection on the Models tab still re-fetches and updates all values (existing effect-based refetch; not regressed).

---

### Task 1: Include router models in the Overview card's total/available count

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectOverviewIndicators.tsx:9-19` (imports), `:89-107` (useEffect catalog build)
- Test: `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx` (new file)

**Interfaces:**
- Consumes: `appInfoStore.getLLMModels(): Promise<ModelOption[]>`, `appInfoStore.llmRouters: LLMRouterOption[]` (`@/store/appInfo`); `routerToModelOption(router: LLMRouterOption): ModelOption` (`@/utils/routerToModelOption`); `getConfigurableModels`, `isModelAvailable`, `settingsToSelection` (`./projectModelConfiguration`); `projectModelSettingsStore.fetchSettings(projectName): Promise<ProjectModelSettings>` (`@/store/projectModelSettings`).
- Produces: the mocking scaffold (`vi.hoisted` mock stores for `appInfoStore`, `projectModelSettingsStore`, `analyticsStore`, `projectSettingsStore`, and a `useVueRouter` mock) that Task 2's tests in the same file reuse.

- [ ] **Step 1: Write the failing test for router-inclusive total**

In the new test file, following the `vi.hoisted` mock pattern from `ProjectMemberModelOverrideModal.test.tsx:28-34`, mock `@/store/appInfo` (`getLLMModels`, `llmRouters`), `@/store/projectModelSettings` (`fetchSettings`), `@/store/analytics` (`fetchTabularData` resolving `null`), `@/store/projectSettings` (`listAllProjectSettings` resolving `[]`), and `@/hooks/useVueRouter` (returning `{ push: vi.fn() }`), per the conventions in `ProjectOverviewSection.test.tsx:24-55`.

```tsx
it('counts router models in the total alongside concrete models', async () => {
  mockAppInfoStore.getLLMModels.mockResolvedValue([
    { value: 'm1', label: 'Model 1', isDefault: false },
  ])
  mockAppInfoStore.llmRouters = [
    { value: 'r1', label: 'Router 1', tiers: {} as any },
  ]
  mockSettingsStore.fetchSettings.mockResolvedValue(DEFAULT_PROJECT_MODEL_SETTINGS)

  render(
    <ProjectOverviewIndicators
      projectName="p1"
      canManageProject={false}
      isModelsConfigEnabled
    />
  )

  expect(await screen.findByText(/of 2 models/)).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx -t "counts router models"`
Expected: FAIL — text shows "of 1 models" (router excluded), not "of 2 models".

- [ ] **Step 3: Fix the catalog build in `ProjectOverviewIndicators.tsx`**

Add `import { routerToModelOption } from '@/utils/routerToModelOption'`. In the `useEffect` (lines 89-107), change the `.then(([catalog, settings]) => {...})` body's first line from `const configurable = getConfigurableModels(catalog)` to build the merged catalog first: `const configurable = getConfigurableModels([...catalog, ...appInfoStore.llmRouters.map(routerToModelOption)])`, exactly mirroring `ProjectModelsSection.tsx:85-89`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx -t "counts router models"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/components/ProjectOverviewIndicators.tsx src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx
git commit -m "EPMCDME-16177: Include router models in overview model count"
```

**Test-first: yes — "counts router models in the total alongside concrete models" fails against current code (total excludes routers) before the catalog-merge fix.**

---

### Task 2: Derive "Premium models" Visible/Not visible from actual availability

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectOverviewIndicators.tsx:29-34` (`ModelAvailabilitySummary` interface), `:97-104` (returned summary object), `:178` (render)
- Test: `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx` (same file as Task 1, new `describe`/`it` blocks)

**Interfaces:**
- Consumes: Task 1's merged `configurable` list and `selection` (local to the `useEffect`); `isModelAvailable(model, selection, hidePremiumModels): boolean` (`./projectModelConfiguration`, already imported).
- Produces: `ModelAvailabilitySummary.hasPremiumModelsEnabled: boolean`, replacing `hidePremiumModels: boolean`. No other task consumes this interface.

- [ ] **Step 1: Write the failing tests for premium visibility**

```tsx
it('shows "Visible" when a premium model is enabled for the project', async () => {
  mockAppInfoStore.getLLMModels.mockResolvedValue([
    { value: 'm1', label: 'Model 1', isDefault: false, isPremium: true },
  ])
  mockAppInfoStore.llmRouters = []
  mockSettingsStore.fetchSettings.mockResolvedValue(DEFAULT_PROJECT_MODEL_SETTINGS) // mode: 'all', hide_premium_models: false

  render(
    <ProjectOverviewIndicators projectName="p1" canManageProject={false} isModelsConfigEnabled />
  )

  expect(await screen.findByText('Premium models: Visible')).toBeTruthy()
})

it('shows "Not visible" when no premium model is enabled/selected', async () => {
  mockAppInfoStore.getLLMModels.mockResolvedValue([
    { value: 'm1', label: 'Model 1', isDefault: false, isPremium: true },
  ])
  mockAppInfoStore.llmRouters = []
  mockSettingsStore.fetchSettings.mockResolvedValue({
    ...DEFAULT_PROJECT_MODEL_SETTINGS,
    mode: 'allow_list',
    models: [],
  })

  render(
    <ProjectOverviewIndicators projectName="p1" canManageProject={false} isModelsConfigEnabled />
  )

  expect(await screen.findByText('Premium models: Not visible')).toBeTruthy()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx -t "Premium models"`
Expected: FAIL — first test currently renders "Premium models: Visible" only by coincidence of `hide_premium_models: false`'s literal negation; second test FAILs because current code reads the raw flag (`false` → still renders "Visible", not "Not visible") — confirms today's component ignores selection.

- [ ] **Step 3: Replace `hidePremiumModels` with derived `hasPremiumModelsEnabled`**

In the `ModelAvailabilitySummary` interface (lines 29-34), replace `hidePremiumModels: boolean` with `hasPremiumModelsEnabled: boolean`. In the `useEffect`'s returned object (lines 97-104), replace `hidePremiumModels: settings.hide_premium_models` with `hasPremiumModelsEnabled: configurable.some((model) => model.isPremium && isModelAvailable(model, selection, settings.hide_premium_models))`. In the render (line 178), replace `Premium models: {models.hidePremiumModels ? 'Hidden' : 'Visible'}` with `Premium models: {models.hasPremiumModelsEnabled ? 'Visible' : 'Not visible'}`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx`
Expected: PASS (all tests in the file, including Task 1's)

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/components/ProjectOverviewIndicators.tsx src/pages/settings/administration/projectsManagement/components/__tests__/ProjectOverviewIndicators.test.tsx
git commit -m "EPMCDME-16177: Derive premium models visibility from selection"
```

**Test-first: yes — both "Visible"/"Not visible" tests are written and run against the current raw-flag-reading code first; the "Not visible" case fails there because the raw flag is false regardless of selection.**

---

## Self-Review

1. **Spec coverage:** AC1 (total includes routers) — Task 1. AC2/AC3 (Premium models Visible/Not visible derived from selection) — Task 2. AC4 (refetch on return) — explicitly not touched (Global Constraints), existing `useEffect` deps preserved; no task needed since nothing changes there.
2. **Step scan:** each step is one action (write test / run / fix one block / run / commit); no placeholder steps.
3. **Type consistency:** `hasPremiumModelsEnabled` named consistently in interface, assignment, and render across Task 2's three edit sites.
4. **Review Focus:** router-with-premium, hide_premium_models+selected-premium, dedup, config-disabled path, empty-router-list all addressed above (first two have dedicated tests in Task 1/2; dedup and config-disabled are pre-existing/unchanged behavior, noted as not needing new tests).
5. **Proportion:** plan body is small relative to the two-defect, one-file fix; code blocks are tests only, no reproduced "before" code, citations use `path:line-range`.

Negative-constraints check: requirement "do NOT use `appInfoStore.getEmbeddingsModels()`" — neither task references it. Requirement "not a redesign of the duplicate catalog logic" / "out of scope" refactor — no task touches `ProjectModelsSection.tsx` or introduces a shared selector. Requirement "do not regress" the AC4 effect-dependency refetch — Global Constraints forbids touching the dependency array, and no task step does. negative-constraints: all addressed above; none left unstated.
