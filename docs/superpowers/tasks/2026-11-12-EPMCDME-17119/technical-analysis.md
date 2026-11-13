# Technical Research

**Task**: project models allowed_models settings
**Generated**: 2026-11-12
**Research path**: codegraph

---

## 1. Original Context

Review https://jiraeu.epam.com/browse/EPMCDME-17119 and implement the fix (UI). Backend is already done and can be validated against local docker-compose. Requirements: on the project Models tab (Settings > Administration > Projects management), when an admin ticks every model/router and applies, the project must be stored as "all models" (`allowed_models: null`) with the chosen default model, so it picks up models added to the platform later. A partial selection must keep being stored as a list (allow_list), as today. Acceptance criteria: (1) all selected + new model added to platform -> new model is selected/available for the project; (2) partial selection + new model -> new model not selected; (3) the tab reflects the saved selection after reload (null round-trips to all ticked + default). Known starting point: `persistDraft` in src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx always calls `selectionToSettings(savedSettings, selection, 'disable')`, which always yields mode 'allow_list' (snapshot of today's catalog). Existing special case to preserve: all ticked + platform default equals `defaultsDraft`, so `saveChanges` calls `persistReset` (DELETE -> NULL/NULL). Verify in code how `selectionToSettings` (components/projectModelConfiguration.ts), `saveSettings` (src/store/projectModelSettings.ts), `fromProjectResponse`/`toDraft` behave, and that no other UI file needs change; note `projectsStore.updateAllowedModels` (src/store/projects.ts) appears to have no callers.

(Jira page not fetched; ticket text is not available in this repository. Paths below are under `src/pages/settings/administration/projectsManagement/` unless absolute-from-src.)

---

## 2. Codebase Findings

### Existing Implementations

**Purpose A: store a project's model restriction (all vs. list)**
- `ProjectModelsSection.tsx:176` `persistDraft` — calls `selectionToSettings(savedSettings, targetDraft.selection, 'disable')` (line 182), then `projectModelSettingsStore.saveSettings(projectName, {..., default_model: targetDraft.defaultModel})`, then `applySaved(saved)`, `loadProjectModels()` (invalidates project LLM cache), success toast. Only caller of `selectionToSettings` outside tests.
- `ProjectModelsSection.tsx:207` `saveChanges` — guards `!draft || !hasChanges || !defaultIsValid`; if `isSameDraft(draft, defaultsDraft)` -> `persistReset()` (DELETE), else `persistDraft(draft)`. Also called by `applyChangesAndNavigate` (line 225, unsaved-changes popup).
- `ProjectModelsSection.tsx:194` `persistReset` — `resetSettings` (DELETE `v1/projects/{p}/allowed-models`), `applySaved`.
- `components/projectModelConfiguration.ts:49` `selectionToSettings(base, selection, policy)` — policy `'disable'` always returns `{...base, mode:'allow_list', models:<enabled ids>}`; policy `'enable'` returns `deny_list` of disabled ids, or `mode:'all', models:[]` when none disabled. The `'enable'` branch already exists and is unit-tested; the section never uses it.
- `components/projectModelConfiguration.ts:12` `getNewModelsPolicy(mode)` — allow_list -> 'disable', else 'enable'. Exported, tested, no non-test caller.
- `src/store/projectModelSettings.ts:88` `saveSettings` — payload `allowed_models: settings.mode === 'allow_list' ? settings.models : null`, `default_model: settings.default_model`; PATCH `v1/projects/{p}/allowed-models`. So `mode 'all'` and `'deny_list'` both serialize to `allowed_models: null` (deny list is not representable server-side). Response goes through `fromProjectResponse`; calls `appInfoStore.invalidateProjectLLMModels`.
- `src/store/projectModelSettings.ts:55` `fromProjectResponse` — `allowed_models != null` -> `mode 'allow_list'` + list; `null` -> `mode 'all'`, `models: []`. `default_model ?? null`. Other fields reset to `DEFAULT_PROJECT_MODEL_SETTINGS` (so `member_overrides` is always `{}` after a fetch/save response; backend does not store them).
- `src/store/projectModelSettings.ts:115` `resetSettings` — DELETE, same response mapping.
- `src/store/projectModelSettings.ts:137` `saveMemberOverrides` — fetch, then `saveSettings({...current, member_overrides})`; mode comes from fetch, so a null project re-saves as null and an allow-list project re-saves its list. Called from `components/ProjectMemberModelOverrideModal.tsx:251`.

**Purpose B: show saved selection on the tab (round-trip)**
- `ProjectModelsSection.tsx:41` `toDraft(settings, models, globalDefault)` — `selection: settingsToSelection(...)`, `defaultModel: settings.default_model ?? globalDefault`.
- `components/projectModelConfiguration.ts:33` `settingsToSelection` — mode `'all'` -> every model in the passed list `'enabled'` (including models added later); `allow_list` -> only listed; `deny_list` -> all but listed. Used by `toDraft`, and by `ProjectMemberModelOverrideModal.tsx:44` `getProjectModels`.
- Initial load `ProjectModelsSection.tsx:79-111` builds platform catalog = `appInfoStore.getLLMModels()` + `llmRouters.map(routerToModelOption)`, `getChecklistModels` (dedupes by value) -> `toDraft(settings, checklist, globalDefault)`. A saved `null` therefore already yields all ticked + stored default (or global default when `default_model` null). Read side needs no change for AC1/AC3.
- `isSameDraft` (line 50) compares `defaultModel` and selection key-by-key; `hasChanges` (line 113) drives Apply enablement.

**Purpose C: which models a project actually offers elsewhere**
- `src/store/appInfo.ts:422` `getProjectLLMModels` / `:444` `invalidateProjectLLMModels`; `src/hooks/useProjectLLMModels.ts:30` — project-scoped list comes from the backend (filtering is server-side); UI only caches/invalidates.
- `src/utils/projectModelFiltering.ts:27` `getFilteredModelsForProject` (used `src/store/chats.ts:1098-1099`) — reads `project.allowed_models`; `null`/empty -> returns all models. Already treats null as unrestricted.

**Dead/legacy**
- `src/store/projects.ts:499` `projectsStore.updateAllowedModels` — grep over `src` finds no caller outside `src/store/__tests__/projects.test.ts` (lines 747-871, 8 tests incl. a `null` case at 829). Not on the Models-tab path. Declared in interface at `projects.ts:86`.

**Other touched code**
- `src/types/entity/projectModelSettings.ts:20,27,36` — `ModelAvailabilityMode`, `ProjectModelSettings`, `DEFAULT_PROJECT_MODEL_SETTINGS` (mode 'all').
- `src/types/entity/projectManagement.ts:61` `ProjectDetail.allowed_models?: string[] | null`, `default_model`.
- Table component mocked in section test: `components/ModelConfigurationTable`, `components/DefaultModelsSelector`.

### Decisions Already in the Code
- Section hard-codes `'disable'` policy (allow-list snapshot) at `ProjectModelsSection.tsx:182`; `projectModelConfiguration.ts:9` comment defines policy as "what happens to models added after the project was configured". Alternative (`'enable'`) exists in the same function. Reason for choosing `'disable'`: none found.
- Server stores only flat allow-list; deny-list/premium/auto-routing/member overrides are client-side defaults only (`projectModelSettings.ts:50-54`). A `deny_list` result would be sent as `allowed_models: null` (silently dropping the disabled models) — the `'enable'` policy with a partial selection is therefore not storable.
- Convention: all-ticked-plus-global-default is persisted via DELETE (`persistReset`), not PATCH (`ProjectModelsSection.tsx:210`); tests assert `saveSettings` not called there (`ProjectModelsSection.test.tsx:176-177`).
- Convention: saving routes through store -> `applySaved` -> cache invalidation -> toast `'Model settings updated'`.
- Direction check: data is stored as `allowed_models` null/list and read back via `fromProjectResponse`; the task needs the same direction (null <-> all). Not against the grain.

### Task Statements Checked Against the Code
- "`persistDraft` always calls `selectionToSettings(..., 'disable')`, always yields 'allow_list'" — holds (`ProjectModelsSection.tsx:182`, `projectModelConfiguration.ts:55-61`).
- "Existing special case: all ticked + default equals `defaultsDraft` -> `persistReset`" — holds (`:210`; `defaultsDraft` built from `DEFAULT_PROJECT_MODEL_SETTINGS`, `:114`). Note `isSameDraft(draft, defaultsDraft)` requires default model == `globalDefaultModel` and every checklist key enabled.
- "`projectsStore.updateAllowedModels` has no callers" — holds for non-test code (only its own unit tests call it).
- "null round-trips to all ticked + default" — holds on read: `fromProjectResponse` null -> 'all' -> `settingsToSelection` all enabled; default via `settings.default_model ?? globalDefault`.
- "`saveSettings` stores null for all" — holds: mode 'all' -> `allowed_models: null` (`projectModelSettings.ts:93`; test `projectModelSettings.test.ts:104-114`).
- Backend behaviour (null + default_model accepted by PATCH; new model picked up) — unverified (outside this repository); settled by local docker-compose run. `saveSettings` already sends `default_model` alongside `allowed_models: null`.
- Existing test contradicts the new requirement: `__tests__/ProjectModelsSection.test.tsx:105-128` asserts that all ticked + changed default (router) is saved with `models: ['model-a','model-b','premium','router']` (allow_list). Keeps current behaviour in place for that case.

### Consumers of Changed Contracts
- `selectionToSettings` — callers: `ProjectModelsSection.tsx:182` only; tests `components/__tests__/projectModelConfiguration.test.ts:100-126` (both policies, base preserved). Signature change would affect those.
- `saveSettings` payload mapping — callers: `ProjectModelsSection.tsx:181`, `projectModelSettings.ts:147` (`saveMemberOverrides`); tests `src/store/__tests__/projectModelSettings.test.ts`.
- `fromProjectResponse` — private; used by `fetchSettings`, `saveSettings`, `resetSettings`.
- `toDraft` / `settingsToSelection` — `ProjectModelsSection.tsx` (initial load, `applySaved`, `defaultsDraft`), `ProjectMemberModelOverrideModal.tsx:44`. Mode 'all' already handled.
- `allowed_models` readers: `utils/projectModelFiltering.ts:42-46` (null -> unrestricted), `types/entity/projectManagement.ts:61`, `projects.ts:508`. All tolerate null.
- No other UI file found that serializes `allowed_models` or calls `selectionToSettings`.

### Architecture and Layers Affected
- Page component (`ProjectModelsSection.tsx`), pure helper module (`components/projectModelConfiguration.ts`), Valtio store (`src/store/projectModelSettings.ts`), types. Server filtering is outside this repo.

### Integration Points
- PATCH/DELETE `v1/projects/{p}/allowed-models`, GET `v1/projects/{p}`; `appInfoStore` project LLM model cache invalidation after every save.

### Patterns and Conventions
- Valtio store objects with `skipErrorHandling: true` and store-level `toaster.error`; section shows success toaster; helpers are pure and unit-tested; Apache licence header on files.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/` exists (state-management, testing-patterns, quality-gates, code-organization); not read in detail, no guide specific to project model settings found by file name.

### Architectural Decisions
- None recorded for allow-list vs all; only the JSDoc at `types/entity/projectModelSettings.ts:15-19` and `projectModelSettings.ts:50-54`.

### Derived Conventions
- Modes: 'all' = null on wire; 'allow_list' = list; 'deny_list' not persistable.

---

## 4. Testing Landscape

### Existing Coverage
- `__tests__/ProjectModelsSection.test.tsx` — load, count, router default save (asserts allow-list for all-ticked), partial save keeps `member_overrides`, reset via DELETE, empty-selection block, default-disabled error, load error.
- `components/__tests__/projectModelConfiguration.test.ts` — both `selectionToSettings` policies, `settingsToSelection` for all three modes.
- `src/store/__tests__/projectModelSettings.test.ts` — null<->'all' mapping, PATCH payloads, reset.
- `src/store/__tests__/projects.test.ts:747+` — `updateAllowedModels`.
- `src/utils/__tests__/projectModelFiltering.test.ts`, `components/__tests__/ProjectMemberModelOverrideModal.test.tsx`, `DefaultModelsSelector.test.tsx`.

### Testing Framework and Patterns
- Vitest + Testing Library; `vi.hoisted` mocks of `appInfoStore`, `projectModelSettingsStore`, toaster; `useBlocker` mocked; table replaced by toggle buttons (`name:on/off`). Run only on explicit request per AGENTS.md.

### Coverage Gaps
- No test for "all ticked + non-global default -> `mode:'all'` / `allowed_models: null`" and none for "a new platform model appears after an all-ticked save"; the existing router-default test encodes the opposite expectation.

---

## 5. Configuration and Environment

### Environment Variables
- None found relevant.

### Configuration Files
- None specific; `vite.config.ts` `test.projects` governs test runs.

### Feature Flags and Deployment Concerns
- None found for this tab. Backend validation via local docker-compose per the task.

---

## 6. Risk Indicators

- Speculative: `ProjectModelsSection.test.tsx:105-128` expects `models: [all four]` for all-ticked + changed default; it will disagree with a change that stores all-ticked as 'all'.
- `persistDraft` is the single write path with `'disable'`; `selectionToSettings` `'enable'` branch yields `deny_list` for partial selections, which `saveSettings` serializes as `allowed_models: null` (disabled models lost) — see Decisions section. Any use of `'enable'` for partial selections would hit this.
- Existing mechanism kept in place by the task: `persistReset` DELETE path for all-ticked + global default (`ProjectModelsSection.tsx:210`); consumers: reset-test, `isAtDefaults` button state.
- Legacy projects whose stored allow-list happens to cover the whole current catalog display all ticked but remain allow_list; Apply stays disabled until a change (`hasChanges` compares to initial draft, not to mode).
- Selection keys derive from the catalog at load time (`checklistModels`); models added after load are absent from `draft.selection` until reload.
- Backend acceptance of `allowed_models: null` plus `default_model` via PATCH: unverified in this repo.
- `projectsStore.updateAllowedModels` is unused outside its tests; changes there are not required for this tab.

---

## 7. Summary for Complexity Assessment

The change surface found is one write path: `persistDraft` in `ProjectModelsSection.tsx` always requests the `'disable'` policy, so `selectionToSettings` returns `allow_list`. The store (`saveSettings`) already serializes mode `'all'` as `allowed_models: null` with `default_model`, and the read path (`fromProjectResponse` -> `settingsToSelection` -> `toDraft`) already maps null to all ticked plus the stored default. The `'enable'` policy and `getNewModelsPolicy` already exist, tested, and unused by the page. Layers touched: one page component, optionally the pure helper module; no store, type, route or other UI consumer depends on the allow-list shape beyond what is listed.

Technical novelty is low; the logic is existing code paths with a different input. Test posture is good for the three involved modules, but one existing section test encodes the old all-ticked behaviour, and there is no test for the null round-trip at section level. Key risks: the partial-selection path must stay allow_list (deny_list is not representable on the server), the `persistReset` special case must keep taking precedence, and backend acceptance of null + default is verifiable only against docker-compose.

---

## 8. External References

- Jira EPMCDME-17119 (https://jiraeu.epam.com/browse/EPMCDME-17119): URL, not a local path; not fetched. Facts needed are given in `task_context` above (requirements and acceptance criteria 1-3).
