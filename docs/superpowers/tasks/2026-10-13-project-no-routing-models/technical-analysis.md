# Technical Research

**Task**: project details models tab, routing models, model selection dropdown, project assistant chat
**Generated**: 2026-10-13
**Research path**: filesystem (codegraph MCP tool not available in this environment)

---

## 1. Original Context

EPMCDME-15905 (Sub-Bug): Project details: the model list on the Models tab does not contain the routing models.

Description: The Models tab in project details does not include the routing models 'Claude Router Standard v1', 'Claude Router Premium v1', and 'GPT Router Standard v1'. The same models appear in the model selection dropdown of the project assistant chat, so they can't be managed at project level, which is the purpose of parent story EPMCDME-14349 (Project-Level Model Availability).

Preconditions: A project exists, and the user has access to its project details. The routing models are available in the project assistant chat.

Steps to Reproduce:
1. Open the project assistant chat and open the model selection dropdown. The routing models appear.
2. Open the project details.
3. Go to the Models tab.
4. Look through the model list for the routing models.

Expected Result: The Models tab model list contains the routing models, consistent with the project assistant chat.
Actual Result: The Models tab lists only regular models; the routing models are missing.

Acceptance Criteria:
1. The Models tab contains 'Claude Router Standard v1', 'Claude Router Premium v1', and 'GPT Router Standard v1'.
2. The routing models on the Models tab match those in the project assistant chat.
3. Each routing model is displayed only once.
4. Regular models are still displayed on the Models tab.

Affected Areas: Project details Models tab (model list); Project assistant chat model selection dropdown (for list consistency).

---

## 2. Codebase Findings

### Existing Implementations

**Models tab (bug location):**
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — renders the `ProjectModelsSection` tab content when the "Models" tab (`id: 'models'`) is active. Tab is shown only when `canManageProject && isModelsConfigEnabled` (feature flag `FEATURE_FLAGS.PROJECT_MODEL_OVERRIDE = 'features:projectModelOverride'`, `src/constants/featureFlags.ts:49`). Route also gated via `<FeatureGuard featureFlags={FEATURE_FLAGS.PROJECT_MODEL_OVERRIDE}>` in `src/router.tsx:542`.
- `src/pages/settings/administration/projectsManagement/ProjectDetailsNavigation.tsx:30` — tab definition `{ id: 'models', label: 'Models', route: PROJECTS_MANAGEMENT_MODELS }`.
- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx` — orchestrates the Models tab. Around lines 68–93, it builds a `platformCatalog` that **correctly includes routers**:
  ```ts
  const platformCatalog = [
    ...availableModels,
    ...appInfoStore.llmRouters.map(routerToModelOption),
  ]
  const configurable = getConfigurableModels(platformCatalog) // <-- strips routers back out
  ```
  The `models` prop fed to `ModelConfigurationTable` and the `availableModels` fed to `DefaultModelsSelector` are both derived from `getConfigurableModels(catalog)` — i.e. routers are present in the component's data but are filtered out before ever reaching the UI.
- `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts` — **the exact root-cause file**:
  ```ts
  /** Routers are governed by the auto-routing switch, not by the model checklist. */
  export const getConfigurableModels = (models: readonly ModelOption[]) =>
    models.filter((model) => !model.isRouter)

  export const getRouterModels = (models: readonly ModelOption[]) =>
    models.filter((model) => model.isRouter)
  ```
  `getRouterModels` and `describeRouterAvailability` (also in this file) are **exported but never imported/used anywhere** in `ProjectModelsSection.tsx` or any other production file (confirmed via grep across the `projectsManagement` directory). This is the strongest signal that this is unfinished work from the parent story rather than intentional product behavior.
- `src/pages/settings/administration/projectsManagement/components/ModelConfigurationTable.tsx` — purely presentational; renders whatever `ModelOption[]` it is given (already supports `isPremium` badges, provider, capability columns, cost columns generically). It has **no router-specific filtering of its own** — it is not the culprit, and would render router rows correctly today if they were passed in.
- `src/pages/settings/administration/projectsManagement/components/DefaultModelsSelector.tsx` — default-model picker(s); also fed only the router-stripped `availableModels`, so default-model dropdowns in the tab are missing routers too.

**Project assistant chat dropdown (reference implementation, works correctly):**
- `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — reads `llmRouters` directly from `appInfoStore` via `useSnapshot` (no `isRouter` filtering applied) and renders a dedicated "Routers" section grouped alongside "Default" and "Models" (`isGrouped = llmRouters.length > 0`, lines ~224–254, ~335–341). For project-scoped chats, regular models come from `chatsStore.filteredModels` (populated via `getFilteredModelsForProject`, `src/utils/projectModelFiltering.ts`) — note routers in this path are **not** filtered by the project's `allowed_models`, which is a separate inconsistency not in scope for this ticket.
- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — the assistant-form model dropdown; uses `useProjectLLMModels(projectName)` and renders a "Router" badge via `LlmOptionRow`.
- `src/hooks/useProjectLLMModels.ts` — general-purpose hook that **correctly merges routers into the model list without filtering them out**:
  ```ts
  /** ... Routers are part of the list either way, flagged `isRouter`. */
  export const useProjectLLMModels = (projectName?: string | null): readonly ModelOption[] => {
    const { llmModels, llmRouters, projectLlmModels } = useSnapshot(appInfoStore)
    const projectModels = projectName ? projectLlmModels[projectName] : undefined
    const platformModels = useMemo<ModelOption[]>(
      () => [...llmModels, ...llmRouters.map(routerToModelOption)],
      [llmModels, llmRouters]
    )
    if (!projectName) return platformModels
    return projectModels ?? EMPTY_MODELS
  }
  ```
  This is the pattern the Models tab fix should mirror.

### Architecture and Layers Affected

1. **Store layer** — `src/store/appInfo.ts`:
   - `getLLMModels(projectId?)` splits the raw `GET v1/llm_models` payload by `is_router` into two separate arrays: `appInfoStore.llmModels` (never contains routers) and `appInfoStore.llmRouters` (routers only).
   - `getProjectLLMModels(projectName)` calls `GET v1/llm_models?project_id=<name>` and stores the **full response (models + routers merged, each flagged `isRouter` via `mapLlmModel`)** into `appInfoStore.projectLlmModels[projectName]` — this path does NOT split models/routers.
   - This inconsistency (one API path splits, the other doesn't) is a notable architectural quirk but not itself the bug — both paths ultimately make router data available; the bug is that `ProjectModelsSection.tsx` discards it via `getConfigurableModels`.

2. **Pure selector/filtering utilities**:
   - `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts` — `getConfigurableModels` (excludes routers — root cause), `getRouterModels` (unused), `isModelAvailable`, `describeRouterAvailability` (unused).
   - `src/utils/routerToModelOption.ts` — converts `LLMRouterOption` → `ModelOption` with `isRouter: true`, used by both the buggy and the working code paths.
   - `src/utils/projectModelFiltering.ts` — `getFilteredModelsForProject`, used only by the chat path for non-router models.

3. **Hooks** — `src/hooks/useProjectLLMModels.ts` (correct reference pattern, consumed by `LLMSelector.tsx` and elsewhere).

4. **Components (Models tab, buggy)** — `ProjectModelsSection.tsx`, `ModelConfigurationTable.tsx` (not buggy itself), `DefaultModelsSelector.tsx`.

5. **Components (chat/assistant dropdowns, correct)** — `ChatPromptLlmSelector.tsx`, `LLMSelector.tsx`.

6. **Precedent for router-specific UI** — `src/pages/help/ModelsCatalog/components/RoutersSection.tsx` (and `ModelsCatalogPage.tsx` / `ReadOnlyModelsCatalogPage.tsx`) render routers in a dedicated card section with provider/router-type/strategy/tier info — an alternative design precedent if a distinct router treatment (rather than merging into the flat table) is preferred.

### Integration Points

- Single backend endpoint `GET v1/llm_models` (global) and `GET v1/llm_models?project_id=<id>` (project-scoped) feed all model/router data; distinguished by `is_router` field in the raw payload.
- `ProjectModelSettings` (`src/types/entity/projectModelSettings.ts`) has an `auto_routing_enabled: boolean` field — this is the **existing** project-level governance mechanism for router availability (separate from the per-model allow/deny list). This matters for scoping the fix: the ticket asks only that routers be *visible/listed* in the Models tab consistent with the chat dropdown, not necessarily that they become independently toggleable in the allow/deny list — `describeRouterAvailability` already encodes the backend rule that "a router is offered only when auto routing is on and the project restricts nothing it could route to."
- `ModelOption.value` is the identity key used throughout (`selectionToSettings`/`settingsToSelection` key off `model.value`); any merge must dedupe on `.value` to satisfy acceptance criterion 3 ("each routing model displayed only once").

### Patterns and Conventions

- Strict **Component → Store → API** layering (per `.ai-run/guides/architecture/architecture.md` and `.ai-run/guides/patterns/state-management.md`) — no new store or direct API call should be introduced; `appInfoStore` already exposes `llmRouters` and project-scoped model data.
- `useSnapshot` for all store reads; `??` preferred over `||`.
- Existing badge pattern: `isPremium` → `StatusBadge` component (used in `ModelConfigurationTable.tsx` around line ~178) — a "Router" badge should follow the same `StatusBadge`/`cn()` convention rather than inventing new styling, consistent with how `LLMSelector.tsx`'s `LlmOptionRow` already renders a "Router" label.
- Component file-size guidance of ~300 lines (`.ai-run/guides/components/component-patterns.md`) — not currently violated by the files in scope here.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` and `.ai-run/guides/patterns/state-management.md` — confirm the Component → Store → API rule and the `useSnapshot` read-binding convention; the "Existing Stores" table is stale (omits `src/store/projectModelSettings.ts`, which exists and is used).
- `.ai-run/guides/development/api-integration.md` — "Backend Semantic Contracts" section: when a field's absence/emptiness has backend meaning, read the backend handler first and document the contract. Directly relevant here: router availability (`auto_routing_enabled`) is backend-derived semantics that should not be reinvented on the frontend.
- `.ai-run/guides/components/component-patterns.md` — general component conventions (props typing, `cn()`, `useSnapshot`-only store access); no tab-specific conventions beyond the general rules.

### Architectural Decisions

A **highly relevant retroactive spec/plan/technical-analysis bundle already exists** in this repo for the parent-adjacent ticket EPMCDME-14781 ("Project-level model availability settings"), at `docs/superpowers/tasks/2026-09-24-epmcdme-14781-project-details-model-settings/`. Key points directly explaining the current (buggy) state:

- The backend can see a Switchyard router's own candidate models but cannot see a LiteLLM auto-router's internal candidates, so a LiteLLM auto-router is offered "only when the project restricts nothing at all" — this is why routers were not simply added as independently toggleable checklist rows.
- `plan.md` Phase 2 for EPMCDME-14781 explicitly describes building "an `auto_routing_enabled` switch with per-router availability" inside `ProjectModelsSection.tsx` — i.e. the **original design intent included a router-visibility affordance**, not the current total absence of routers from the tab.
- `technical-analysis.md` from that bundle already flagged "the two Models-tab components" as needing router-awareness — meaning this gap was anticipated and apparently never fully closed before EPMCDME-14781 shipped, leaving EPMCDME-15905 as the follow-up bug.

Git history: `git log --oneline --all | grep -i 15905` returns no commits (sub-bug not yet started). EPMCDME-14349 has an extensive commit history including "Add default model selector to project settings", "Added Project Level Model Availability into different assets" (x3, apparently rebased/redone), "fix unit tests for project-level model availability UI", and the most recent "Fixed feature flag name so it aligns with BE changes" — confirming the feature flag and backend contract were still being finalized recently.

### Derived Conventions

- The `isRouter` boolean flag on `ModelOption` is the single source of truth distinguishing routers from regular models throughout the codebase (type defined in `src/types/entity/configuration.ts`).
- No existing dedupe/unique helper was found for merging model + router lists — current code relies on routers only ever being appended once (`...llmRouters.map(routerToModelOption)`), since `getLLMModels` partitions API data so there's no overlap today. Any new merge logic in `ProjectModelsSection.tsx` must avoid double-appending routers if `getRouterModels` is reintroduced on top of the existing `platformCatalog` build step.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx` — Vitest + RTL. Mocks `ModelConfigurationTable` entirely (replaced with a simple list) to test selection/policy logic directly. Uses a 4-item `CATALOG` fixture including one router (`{ label: 'Router', value: 'router', isDefault: false, isRouter: true }`) and currently **asserts `'3 of 3 models available'`** — i.e. this test currently codifies the buggy exclusion behavior as correct and will need to be updated as part of the fix.
- `src/pages/settings/administration/projectsManagement/components/__tests__/projectModelConfiguration.test.ts` — pure unit tests for `getConfigurableModels`, `getRouterModels`, `settingsToSelection`, `selectionToSettings`, `isModelAvailable`, `describeRouterAvailability`. Contains an explicit test `'separates routers from the configurable checklist'` that directly encodes the current router-exclusion behavior — this test (or its usage inside the production component) will need revisiting.
- Reference tests already covering routers correctly in other surfaces:
  - `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` and `.projectModels.test.tsx` — use `routerFixture: LLMRouterOption[]`, test grouped "Routers"/"Models" headers.
  - `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx` and `.projectModels.test.tsx` — also use `routerFixture`, test "Router" / "Router, Premium" badge text.
  - `src/hooks/__tests__/useProjectLLMModels.test.ts`.
  - `src/store/__tests__/appInfo.test.ts` — describe block `'appInfoStore.getLLMModels routers'` (lines ~466–536) covers router/model splitting from the raw API payload.
  - `src/pages/help/ModelsCatalog/components/__tests__/RoutersSection.test.tsx`.

No hardcoded production router names ("Claude Router Standard v1", "GPT Router Standard v1", etc.) exist anywhere in the repo (grepped, zero matches) — these are backend-provided values; tests use generic fixture names (`'Smart Router'`, `'Premium Router'`) and should continue that convention.

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`, `integration`) per `vite.config.ts`. Fixture-driven `LLMRouterOption[]` arrays are the established pattern for testing router-aware UI (value, label, isPremium, tiers).

### Coverage Gaps

- No test asserts router rows render correctly (badge/label/provider/capability columns) inside `ModelConfigurationTable` — routers never reach the table today.
- No test verifies dedup between a router entry and a model sharing the same `.value` (ticket's "no duplicates" acceptance criterion) — `getConfigurableModels` currently does a straight filter with no uniqueness check and this scenario is untested.
- `selectionToSettings`/`settingsToSelection` are tested only against non-router `MODELS` fixtures — their behavior with `isRouter: true` entries in the selection map is untested.
- `describeRouterAvailability` is unit-tested in isolation but has no call site in production code — if the fix wires it up, both the logic and its RTL-level rendering need new coverage.
- `ProjectModelsSection.test.tsx`'s `'3 of 3 models available'` assertion directly encodes the bug and must be updated, not just supplemented.

---

## 5. Configuration and Environment

### Environment Variables

None specific to routing-model visibility were found.

### Configuration Files

- `src/constants/featureFlags.ts:49` — `PROJECT_MODEL_OVERRIDE: 'features:projectModelOverride'`, gates the entire Models tab's visibility and its route (`src/router.tsx:542`). There is **no separate flag** gating routing-model visibility within the tab — the fix does not need new flag plumbing.

### Feature Flags and Deployment Concerns

- `ProjectModelSettings.auto_routing_enabled` (`src/types/entity/projectModelSettings.ts`) is the existing backend-governed toggle for router availability at the project level — distinct from simple list visibility. The fix should keep this governance semantics intact (per `describeRouterAvailability`) rather than making routers freely toggleable in the allow/deny checklist unless the ticket's scope is confirmed to include that.

---

## 6. Risk Indicators

- Root cause is precisely located and small in surface area: `getConfigurableModels` in `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts` filters out `isRouter` entries before they reach `ProjectModelsSection.tsx`'s `models`/`availableModels`. This significantly lowers implementation risk — the fix is likely a small, surgical change (reuse the existing `platformCatalog`/`getRouterModels` rather than discarding routers), not a new feature build.
- `getRouterModels` and `describeRouterAvailability` already exist and are unit-tested but are **dead code in production** — strong evidence this is unfinished work from the EPMCDME-14781 parent story rather than a design decision; low risk of unknown unknowns, but the fix must decide whether to wire up `describeRouterAvailability` for display text or keep the fix purely additive (list visibility only).
- `ProjectModelsSection.test.tsx` and `projectModelConfiguration.test.ts` both contain assertions that currently encode the buggy behavior (`'3 of 3 models available'`, `'separates routers from the configurable checklist'`) — these tests will need deliberate updates, not just new tests added alongside them; a naive fix could leave contradictory test expectations.
- Dedup risk: no existing dedupe-by-`.value` helper for merging model + router lists. `ProjectModelsSection.tsx` builds its catalog via a different code path (manual concatenation of `getLLMModels()` output + `appInfoStore.llmRouters`) than either of the two "project model filtering" approaches used elsewhere (`useProjectLLMModels` vs. `getFilteredModelsForProject`). If the fix reintroduces `getRouterModels` on top of `platformCatalog` without care, routers could be double-counted — acceptance criterion 3 ("each routing model displayed only once") should be explicitly tested.
- Minor scope-boundary risk: `ChatPromptLlmSelector.tsx` renders `llmRouters` globally (not project-filtered via `allowed_models`), which is a separate, pre-existing inconsistency not requested by this ticket — should not be conflated with this fix's scope.
- `DefaultModelsSelector.tsx` (default-model picker, same tab) is also fed the router-stripped list — the fix must confirm whether default-model dropdowns should also include routers, or whether that is intentionally out of scope (not explicitly covered by the acceptance criteria, which mention only the "model list").
- `.ai-run/guides/patterns/state-management.md`'s "Existing Stores" table is stale (omits `projectModelSettings.ts`) — not a blocker, but a documentation gap unrelated to this ticket.
- No codegraph MCP tool was available in this environment; filesystem research was used instead. All findings are corroborated by four independent research threads reaching the same root cause, which increases confidence despite the lack of codegraph cross-validation.

---

## 7. Summary for Complexity Assessment

This is a narrowly-scoped bug fix confined almost entirely to one architectural layer: a pure selector/filtering utility (`getConfigurableModels` in `projectModelConfiguration.ts`) and its single caller (`ProjectModelsSection.tsx`), both in `src/pages/settings/administration/projectsManagement/`. The root cause is already fully diagnosed and corroborated by four independent research passes: `getConfigurableModels` deliberately strips `isRouter: true` entries from the catalog before it reaches `ModelConfigurationTable` and `DefaultModelsSelector`, even though the catalog already contains the router data (via `routerToModelOption`) and even though the complementary `getRouterModels`/`describeRouterAvailability` helpers already exist, tested, but unused. The reference implementation to mirror already exists and works correctly in two other surfaces (`useProjectLLMModels.ts`, consumed by `LLMSelector.tsx`, and `ChatPromptLlmSelector.tsx`), so this follows an established pattern rather than introducing anything novel — no new store, API call, or component layer is needed, and `ModelConfigurationTable.tsx` itself requires no changes since it is already router-agnostic and prop-driven.

The estimated file change surface is small: likely `projectModelConfiguration.ts` (merge/dedupe logic), `ProjectModelsSection.tsx` (stop discarding routers, decide on default-model-selector scope), and possibly a small addition to `ModelConfigurationTable.tsx` for a "Router" badge (following the existing `isPremium`/`StatusBadge` convention). Two existing test files directly encode the current buggy behavior as "correct" (`ProjectModelsSection.test.tsx`'s `'3 of 3 models available'` assertion and `projectModelConfiguration.test.ts`'s `'separates routers from the configurable checklist'` test) and must be deliberately updated rather than left alongside new tests, which is the main source of implementation friction. Test coverage posture for the surrounding domain is otherwise strong and follows a consistent fixture pattern (`LLMRouterOption[]` fixtures with `isRouter`/`tiers`) already used successfully in four other test suites (chat dropdown, assistant dropdown, the model-availability hook, and the app-info store), so writing new coverage for the fix is low-risk and has clear precedent to copy.

Key risk factors for complexity scoring: (1) the "no duplicates" acceptance criterion needs explicit new test coverage since no existing dedupe-by-`.value` helper exists for merging model and router lists, and `ProjectModelsSection.tsx` builds its catalog via a third, bespoke code path distinct from the two patterns used elsewhere; (2) a scope decision is needed on whether `DefaultModelsSelector.tsx` (default-model dropdowns in the same tab) should also surface routers, since the acceptance criteria mention only the "model list"; (3) the existing `auto_routing_enabled` project-level governance semantics (documented in a prior retroactive spec for EPMCDME-14781) should be preserved — the fix is about list *visibility*, not necessarily making routers independently toggleable in the allow/deny checklist, and this distinction should be confirmed during planning. Overall, this reads as a low-to-moderate complexity bug fix with the root cause fully identified ahead of time.
