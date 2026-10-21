
# Technical Research

**Task**: project overview model availability premium models embedding
**Generated**: 2026-10-21T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Jira EPMCDME-16177 (Sub-Bug, Major): Project details → Overview: the Model availability section
shows an incorrect number of available models, and Premium models value does not reflect the
project's selection.

Description: On the Overview tab of Project details, the Model availability section shows
incorrect values:
1. The number of available models is wrong. In total 63 models are available, but the section
   always shows 60. (Screenshot shows "6 of 60 models".)
2. Premium models: "Visible" always has the same value, even when no premium model is selected
   for the project.

Preconditions: platform has 63 available models; the models list includes premium models.

Acceptance Criteria:
1. Given 63 models are available, when the user opens the Overview tab, then the Model
   availability section shows 63 available models.
2. Given at least one premium model is selected for the project, when the user opens the
   Overview tab, then Premium models value is "Visible".
3. Given no premium model is selected for the project, when the user opens the Overview tab,
   then Premium models value is "Not visible".
4. Given the user changes the model selection on the Models tab, when they return to the
   Overview tab, then all values in the Model availability section are updated.

Related story: EPMCDME-14349 (Project-Level Model Availability).

Known lead (from user, unverified): the "total" count likely needs to include route/embedding
models in addition to the deduplicated LLM model catalog, and "Premium models" visibility should
be derived from whether at least one premium model is actually enabled/available for the project,
not from a raw settings flag.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/projectsManagement/components/ProjectOverviewIndicators.tsx`
  — renders the Overview tab's "Model availability" card (lines 164–182). Its data-loading
  `useEffect` (lines 89–107) builds the summary this way:
  ```ts
  Promise.all([
    appInfoStore.getLLMModels(),
    projectModelSettingsStore.fetchSettings(projectName),
  ]).then(([catalog, settings]) => {
    const configurable = getConfigurableModels(catalog)
    const selection = settingsToSelection(settings, configurable)
    return {
      available: configurable.filter((model) =>
        isModelAvailable(model, selection, settings.hide_premium_models)
      ).length,
      total: configurable.length,
      autoRoutingEnabled: settings.auto_routing_enabled,
      hidePremiumModels: settings.hide_premium_models,
    }
  })
  ```
  `catalog` here is only the return value of `appInfoStore.getLLMModels()`, which is
  `appInfoStore.llmModels` — concrete models only; routers are excluded (see below). `total` is
  `configurable.length`, i.e. the count of deduped concrete models, with no routers added. The
  rendered "Premium models" line (line 178) is `models.hidePremiumModels ? 'Hidden' : 'Visible'`
  — it reads the raw `hide_premium_models` settings flag directly, with no reference to the
  project's actual model selection/mode or to any model's `isPremium` flag.

- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx` (the Models
  tab, the page `ProjectOverviewIndicators`'s "Configure" button links to) builds its catalog
  differently (lines 82–99):
  ```ts
  Promise.all([
    appInfoStore.getLLMModels(),
    projectModelSettingsStore.fetchSettings(projectName),
    appInfoStore.getProjectLLMModels(projectName),
  ]).then(([availableModels, settings]) => {
    // getLLMModels lists concrete models only; routers live beside them in the store.
    const platformCatalog = [
      ...availableModels,
      ...appInfoStore.llmRouters.map(routerToModelOption),
    ]
    const configurable = getConfigurableModels(platformCatalog)
    const checklist = getChecklistModels(platformCatalog)
    ...
  })
  ```
  It explicitly appends `appInfoStore.llmRouters` (converted via `routerToModelOption`) to the
  concrete-model catalog before computing counts/checklists. The inline comment ("getLLMModels
  lists concrete models only; routers live beside them in the store") documents exactly why this
  step exists. `ProjectOverviewIndicators.tsx` has no equivalent step.

- `src/pages/settings/administration/projectsManagement/components/ProjectMemberModelOverrideModal.tsx`
  (line 43) calls `getConfigurableModels(catalog)` on a `catalog` prop; its caller was not
  traced in this pass — out of scope for this ticket but worth noting as a second potential
  consumer of the same catalog-without-routers pattern if it is ever reused for a count display.

- `src/store/appInfo.ts`:
  - `getLLMModels(projectId?)` (lines 352–383) calls `GET v1/llm_models`, splits the response
    into `routerEntries` (`is_router === true`) and `modelEntries` (`!is_router`), stores
    `modelEntries.map(mapLlmModel)` as `appInfoStore.llmModels` and
    `routerEntries.map(...)` as `appInfoStore.llmRouters` (a separate store field, typed
    `LLMRouterOption[]`), and **returns only `appInfoStore.llmModels`** (line 378). Callers that
    want routers too must separately read `appInfoStore.llmRouters`.
  - `getEmbeddingsModels()` (lines 429–439) calls a distinct endpoint, `GET v1/embeddings_models`,
    and stores the result in `appInfoStore.embeddingModels`, a field disjoint from `llmModels`
    and `llmRouters`. No code under `src/pages/settings/administration/projectsManagement/` reads
    `embeddingModels` or `getEmbeddingsModels()` — embedding models are not currently part of the
    project model-availability feature anywhere in the codebase.

- `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts`
  — the shared helper module both the Overview card and the Models tab import:
  - `getConfigurableModels(models)` (line 16) dedupes by `model.value` via a `Map`.
  - `getChecklistModels(models)` (line 23) is a second, equivalent dedupe implementation (filter +
    `Set`) used by the Models tab checklist; functionally interchangeable with
    `getConfigurableModels` for this purpose but kept as a separate export.
  - `settingsToSelection(settings, models)` (line 33) turns `ProjectModelSettings` (`mode`,
    `models: string[]`) into a `Record<string, 'enabled' | 'disabled'>`: for `mode: 'allow_list'`
    only listed models are enabled; for `mode: 'deny_list'` listed models are disabled; for
    `mode: 'all'` everything is enabled (regardless of whether any of those enabled models
    happen to be premium).
  - `isModelAvailable(model, selection, hidePremiumModels)` (line 66) —
    `selection[model.value] === 'enabled' && !(hidePremiumModels && model.isPremium)`. This is the
    function already used to decide, per model, whether it counts as "available" — it already
    folds in both the selection state and the premium-hiding flag. It is reused by the Overview
    card's `available` calculation but is not reused for the "Premium models" Visible/Not visible
    line.
  - `describeRouterAvailability(...)` (line 77) shows the existing convention for deriving a
    textual router-availability message from `autoRoutingEnabled`, `selection`, and
    `hidePremiumModels` together — a template for composing a derived status string rather than
    echoing a raw flag.

- `src/types/entity/projectModelSettings.ts` — `ProjectModelSettings` (lines 27–34): `mode:
  'all' | 'allow_list' | 'deny_list'`, `models: string[]`, `default_model`, `hide_premium_models:
  boolean`, `auto_routing_enabled: boolean`, `member_overrides`. `hide_premium_models` is a
  project-wide toggle that *hides* premium models when true; it says nothing about whether a
  premium model is *selected* (present in `models`/active per `mode`) when false.

- `src/types/entity/configuration.ts` — `ModelOption` (lines 39–53) carries `isPremium?: boolean`
  and `isRouter?: boolean`. `LLMRouterOption` (lines 67–79) is the separate shape used for
  `appInfoStore.llmRouters`, also carrying `isPremium?: boolean`.

- `src/utils/routerToModelOption.ts` — the adapter (`LLMRouterOption` → `ModelOption`, setting
  `isRouter: true`) that the Models tab uses to merge routers into a model-shaped catalog before
  calling `getConfigurableModels`/`getChecklistModels`.

### Architecture and Layers Affected

- **Store layer**: `src/store/appInfo.ts` (`appInfoStore.getLLMModels`, `appInfoStore.llmModels`,
  `appInfoStore.llmRouters`) and `src/store/projectModelSettings.ts`
  (`projectModelSettingsStore.fetchSettings`) — data sources the Overview card already calls; no
  evidence any store-layer change is needed, since the Models tab gets a correct total from the
  same stores.
- **Shared domain-logic layer**: `projectModelConfiguration.ts` — pure functions consumed by both
  the Overview card and the Models tab; this is the natural place for any premium-availability
  helper shared between the two surfaces, following the existing pattern of
  `isModelAvailable`/`describeRouterAvailability`.
- **Presentation layer**: `ProjectOverviewIndicators.tsx` — the component whose `useEffect` and
  JSX (lines 89–182) directly produce the reported wrong numbers.

### Integration Points

- `ProjectOverviewIndicators` → `appInfoStore.getLLMModels()` / `appInfoStore.llmRouters` (via
  `@/store/appInfo`), `projectModelSettingsStore.fetchSettings()` (via
  `@/store/projectModelSettings`), and `projectModelConfiguration.ts` (via relative import) — all
  three are the integration points this fix touches.
- `ProjectModelsSection.tsx` is not called by `ProjectOverviewIndicators` directly; the Overview
  card links to it only via a route button (`PROJECTS_MANAGEMENT_MODELS`). The two components
  independently fetch and recompute the same underlying data — there is no shared "project model
  summary" hook or selector that both consume, which is why their outputs diverged.
- The AC4 requirement ("when they return to the Overview tab, values are updated") depends on the
  existing `useEffect` dependency array (`[isModelsConfigEnabled, projectName]`, line 140)
  re-running on remount/navigation; `ProjectOverviewSection.test.tsx` mocks
  `ProjectOverviewIndicators` entirely, so no test currently exercises this re-fetch behaviour one
  way or the other.

### Patterns and Conventions

- Deduplicate-by-`value` catalogs via `getConfigurableModels`/`getChecklistModels`.
- Compose derived UI strings from raw settings via small pure functions in
  `projectModelConfiguration.ts` (`describeRouterAvailability` is the closest existing template
  for a "Visible"/"Not visible"-style derived label).
- `isModelAvailable` is the single existing source of truth for "is this model available to this
  project", already factoring in both selection and premium-hiding.
- Routers are merged into a model-shaped list via `routerToModelOption` before being run through
  the same dedupe/selection helpers — this is the convention the Models tab follows and the
  Overview card does not.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` and `.ai-run/guides/development/api-integration.md`
  are the P0/P1 guides this repo's `AGENTS.md` routes "State" tasks to; not read in depth here
  since the fix is localized to existing store calls and a shared pure-function module, not a new
  store or API integration pattern. No guide under `.ai-run/guides/` was found specifically
  describing model-availability or premium-model semantics.

### Architectural Decisions

- No ADR files were found. The clearest in-code "decision record" for this domain is the inline
  comment in `ProjectModelsSection.tsx` line 89: `// getLLMModels lists concrete models only;
  routers live beside them in the store.` — this is the documented reason the Models tab builds
  `platformCatalog` by concatenating routers, and the reason the Overview card's count is short by
  the router count.
- `projectModelConfiguration.ts` line 72–76 documents the router-availability rule used by
  `describeRouterAvailability` ("a router is offered only when auto routing is on and the project
  restricts nothing it could route to").

### Derived Conventions

- Shared, testable logic for this domain belongs in `projectModelConfiguration.ts`, imported by
  whichever page component needs it, rather than duplicated inline in a component's `useEffect`.
- When a count or label needs to agree across two surfaces (Models tab vs. Overview card), the
  codebase does not currently enforce that via a shared selector/hook — each page recomputes
  independently, which is the structural reason the two numbers disagree.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/components/__tests__/projectModelConfiguration.test.ts`
  covers `getConfigurableModels`, `getRouterModels`, `getChecklistModels`,
  `getNewModelsPolicy`, `isModelAvailable`, `selectionToSettings`, `settingsToSelection`, and
  `describeRouterAvailability` with plain-object fixtures (a `model(value, extra)` helper and a
  `settings(extra)` helper built on `DEFAULT_PROJECT_MODEL_SETTINGS`). It already includes a case
  combining regular models with an `isRouter: true` model.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectOverviewSection.test.tsx`
  renders `ProjectOverviewSection` but mocks `../components/ProjectOverviewIndicators` to `() =>
  <div />` (line 53–55), so **no existing test renders `ProjectOverviewIndicators` itself** or
  exercises its data-loading `useEffect`, the "N of M models" text, or the "Premium models" line.
- No file named `ProjectOverviewIndicators.test.tsx` (or similar) exists anywhere in the repo.

### Testing Framework and Patterns

- Vitest + React Testing Library (`@testing-library/react`), `describe`/`it`/`expect`/`vi` from
  `vitest`. Store/hook/util modules are mocked with `vi.mock('@/store/...', () => ({ ... }))` at
  the top of test files (see `ProjectOverviewSection.test.tsx` lines 24–59 for the pattern:
  mocking `@/utils/helpers`, `@/hooks/useFeatureFlags`, `@/hooks/useVueRouter`,
  `@/store/projectBudgets`, `@/store/user`, `@/store/analytics`, and sibling components).
- `projectModelConfiguration.test.ts` uses small local factory functions (`model(...)`,
  `settings(...)`) rather than a shared fixtures module — the established pattern for testing
  this domain's pure functions.

### Coverage Gaps

- `ProjectOverviewIndicators.tsx`'s own data-loading and rendering logic (the exact component this
  ticket's bug lives in) has zero direct test coverage — all three ACs about the Overview tab's
  displayed numbers are currently unverifiable by any existing automated test.
- No test exercises `appInfoStore.getLLMModels()` together with `appInfoStore.llmRouters` in the
  context of this specific card, nor the "model selection changed → Overview updates" flow in AC4.

---

## 5. Configuration and Environment

### Environment Variables

- None found referencing model availability, premium models, or this feature area specifically.
  `isModelsConfigEnabled` (a prop threaded from `ProjectOverviewSection` down to
  `ProjectOverviewIndicators`, default `false`) gates whether the "Model availability" and "Model
  usage" cards render at all; its upstream source (likely a feature flag passed from a parent
  page) was not traced further in this pass.

### Configuration Files

- No config file specific to this feature area was found; behaviour is driven entirely by
  `ProjectModelSettings` fetched per-project via `projectModelSettingsStore.fetchSettings`.

### Feature Flags and Deployment Concerns

- `isModelsConfigEnabled` prop (component-level gate, not a `useFeatureFlag`-style flag in this
  file) controls whether the Model availability/usage cards are shown; it is distinct from the
  `FEATURE_FLAGS.COST_CENTERS` / `FEATURE_FLAGS.ROUTING_ANALYTICS` flags used elsewhere in
  `ProjectOverviewSection.tsx` via `useFeatureFlag`. No deployment manifest or Dockerfile
  reference to this feature area was found.

---

## 6. Risk Indicators

- Speculative: fixing the "total" count will require merging `appInfoStore.llmRouters` into the
  catalog the Overview card builds, mirroring `ProjectModelsSection.tsx` lines 90–93 — if this is
  not done identically, the Overview and Models tab counts could continue to disagree even after
  the fix (a regression of the same class of bug this ticket reports).
- Speculative: fixing "Premium models" Visible/Not visible will require deriving the label from
  whether any premium model is actually enabled under the current `selection`/`mode`/
  `hide_premium_models` combination (e.g. checking `configurable.some(model => model.isPremium &&
  isModelAvailable(model, selection, settings.hide_premium_models))`), not just reading
  `settings.hide_premium_models` — a narrow fix that only flips the raw-flag label without
  checking actual premium-model presence/selection would satisfy AC2's common case but fail AC3's
  "no premium model selected yet `hide_premium_models` is false" case.
- `ProjectOverviewIndicators.tsx` has zero existing direct test coverage (Section 4), so any fix
  here is unverified by regression tests until new tests are added — the existing test for the
  parent component explicitly mocks this component out.
- Two independent code paths compute the same project-model-availability data
  (`ProjectOverviewIndicators.tsx` and `ProjectModelsSection.tsx`) with no shared hook/selector;
  this is the structural root cause of the discrepancy and is a repeat-regression risk even after
  a targeted point fix, since nothing currently enforces the two surfaces staying in sync.
  Embedding models (`appInfoStore.getEmbeddingsModels`/`embeddingModels`) are not referenced by
  either surface — the task's "known lead" mentioning embedding models does not match anything
  found in the codebase for this feature; only routers (`appInfoStore.llmRouters`) are missing
  from the Overview card's catalog.

---

## 7. Summary for Complexity Assessment

The bug is narrowly scoped to one component, `ProjectOverviewIndicators.tsx`
(`src/pages/settings/administration/projectsManagement/components/`), and its two defects have
distinct, already-identifiable root causes. The "60 vs 63" count is explained by
`appInfoStore.getLLMModels()` returning only concrete models (`appInfoStore.llmModels`), excluding
the separately-stored `appInfoStore.llmRouters`; the Models tab (`ProjectModelsSection.tsx`)
already demonstrates the correct pattern — concatenating `llmRouters.map(routerToModelOption)`
onto the catalog before deduping — making this a reference-pattern fix rather than novel design.
The "Premium models" defect is a semantic mismatch: the component reads the raw
`settings.hide_premium_models` boolean directly instead of deriving visibility from whether any
premium model is actually enabled under the project's current selection, which the existing
`isModelAvailable` helper in `projectModelConfiguration.ts` already has the pieces to compute.

No novel architecture, no new store, and no new API integration is implied by anything found —
both fixes consume data the component already fetches (or has one additional existing store field
away) and reuse existing shared helper functions. The primary risk is test coverage: this specific
component has no direct unit/integration tests today (the parent's test suite mocks it out
entirely), so verifying all four ACs — including AC4's "returning to the tab updates values" —
will require new tests rather than extending existing ones. A secondary, structural risk worth
flagging to the spec/plan stage is that the Overview card and Models tab independently recompute
overlapping data with no shared selector, so a point fix resolves this ticket's symptom without
addressing the underlying duplication that produced it.

---

## 8. External References

None named by the task. `task_context` describes the Jira ticket content directly and references
a related story (EPMCDME-14349) and a "known lead," but names no file path, directory, or URL as
a source of truth to read.
