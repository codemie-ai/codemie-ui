# Technical Research

**Task**: project filter display-name project-admin assistants skills workflows
**Generated**: 2026-07-16T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix project filter showing technical project name after page refresh for Project Admin not assigned to the project. When a Project Admin is not assigned to a project, they can still search entities by using the Project field filter on the Assistants, Skills, and Workflows pages. Searching by the project display name works correctly before refresh. However, after refreshing the page, the Project filter field shows the project technical name instead of the display name. Expected: after page refresh, the Project filter field keeps showing the selected project display name. Actual: after page refresh, the Project filter field shows the selected project technical name instead of the display name. Affects Assistants, Skills, and Workflows pages.

---

## 2. Codebase Findings

### Existing Implementations

**Filter persistence layer:**
- `src/utils/filters.ts` — `getFilters`, `setFilters`, `updateUrlWithFilters`; stores/reads the project filter as an array of technical names (`project.name`) in both localStorage and URL query params (key: `project`, multi-value via `searchParams.getAll('project')`). Storage key format: `${userId}_filters_${entityKey}`.
- `src/hooks/useSearchParams.ts` — Persists filter strings in `sessionStorage` keyed by pathname; restores on empty-search mount.

**Filter hook layer (per-page state restoration):**
- `src/pages/assistants/hooks/useAssistantFilters.ts` — Reads saved filter state from localStorage/URL via `getFilters`; restores `project: string[]` (technical names) on mount. Reference restore pattern at lines 79–87: `updateUrlWithFilters(saved)` called on mount.
- `src/pages/skills/hooks/useSkillsFilters.ts` — Same filter-restore pattern as `useAssistantFilters`.

**Filter component layer (project options loading):**
- `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` — Calls `userStore.getProjects('')` on mount to populate `projectOptions`; maps each project with `getProjectDisplayName`; does **not** resolve display names for saved filter values not in the loaded options.
- `src/pages/skills/components/SkillsFilters.tsx` — Identical pattern to `AssistantFilters`.
- `src/pages/workflows/components/WorkflowsFilters.tsx` — Same pattern; calls `loadProjectOptions('')` on mount.

**Generic rendering layer:**
- `src/components/Filters/Filters.tsx` — `mapToMultiselectOptions` / `getHiddenOptions` (lines 138–158): creates fallback options `{ label: val, value: val }` for selected values absent from loaded options. This is the direct render-level cause — the raw technical name becomes the displayed chip label when no matching option is found.

**Store / data layer:**
- `src/store/user.ts` — `getProjects(query)` routes `isAdmin: true` users to `getAdminProjects`; `getAdminProjects('')` short-circuits and returns **only roster projects** when `search.length < 3` (gated by `VITE_SHOW_ALL_PROJECTS`).
- `src/store/projectDisplayNames.ts` — Reactive Valtio cache; `ensure(projectName)` fetches `GET v1/projects/:name` and caches `display_name`. Currently triggered only for Super Admins via table-cell components — **not used by any of the three filter components**.

**Existing display name resolution (already correct, but not wired to filters):**
- `src/hooks/useProjectDisplayNames.ts` — Builds `Map<technicalName, displayName>`; calls `projectDisplayNamesStore.ensure()` for `isAdmin` users on names not in their roster. Used by `ProjectNameCell`, `AssistantDetails`, `SkillDetails` — **not called by filter components**.
- `src/utils/projectDisplayName.ts` — `getProjectDisplayName(project)`: returns `display_name?.trim() || name`. Pure utility, no async.

**Page entry points:**
- `src/pages/assistants/AssistantsListPage.tsx` — Mounts `AssistantFilters` and calls `useAssistantFilters`.
- `src/pages/skills/SkillsListPage.tsx` — Mounts `SkillsFiltersComponent` and calls `useSkillsFilters`.
- `src/pages/workflows/WorkflowsListPage.tsx` — Mounts `WorkflowsFilters` with `scope`.

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| Page | `AssistantsListPage`, `SkillsListPage`, `WorkflowsListPage` |
| Filter hooks | `useAssistantFilters`, `useSkillsFilters` (restore from localStorage/URL) |
| Filter components | `AssistantFilters`, `SkillsFilters`, `WorkflowsFilters` (load options, pass to generic Filters) |
| Generic Filters UI | `Filters.tsx` — `getHiddenOptions` fallback creates `label=technicalName` |
| Store / data | `userStore.getAdminProjects` (roster gate), `projectDisplayNamesStore` (on-demand cache) |
| Persistence | `utils/filters.ts` (localStorage + URL), `useSearchParams.ts` (sessionStorage) |
| API | `GET v1/admin/applications` (admin project list), `GET v1/projects/:name` (individual display name) |

### Integration Points

**Internal module dependencies:**
- `AssistantFilters` / `SkillsFilters` / `WorkflowsFilters` → `userStore.getProjects` → `userStore.getAdminProjects` (returns only roster on empty search)
- `AssistantFilters` / `SkillsFilters` / `WorkflowsFilters` → `Filters` → `getHiddenOptions` (creates `label=technicalName` fallback)
- `useAssistantFilters` / `useSkillsFilters` → `utils/filters.getFilters` → localStorage (restores technical names)
- `ProjectNameCell` / `AssistantDetails` / `SkillDetails` → `useProjectDisplayNames` → `projectDisplayNamesStore.ensure` (correct resolution path — NOT used by filter components)
- `useProjectDisplayNames` → `projectDisplayNamesStore` → `api.get('v1/projects/:name')`

**External API calls:**
- `GET v1/admin/applications?search=<query>` — fetches all admin-visible projects (only called when `VITE_SHOW_ALL_PROJECTS='true'` or `search.length >= 3`)
- `GET v1/projects/:name` — fetches a single project's `display_name` for on-demand resolution

### Patterns and Conventions

- Filter values are **always stored as technical project names** (`project.name`), never display names. Display labels are resolved at render time against the loaded options list.
- `getAdminProjects` has a **3-character search gate**: empty search returns roster only, 3+ chars queries all admin projects. Controlled by `VITE_SHOW_ALL_PROJECTS` flag.
- `Filters.tsx` `getHiddenOptions` pattern: intentionally preserves any selected value not found in options by creating a synthetic `{ label: val, value: val }` entry — useful for preventing accidental de-selection, but surfaces the bug when the value is a technical name.
- `projectDisplayNamesStore.ensure()` is the established on-demand fetch pattern for resolving non-roster project display names — used consistently in table cells and detail pages.
- State management: Valtio proxy stores (`userStore`, `projectDisplayNamesStore`); components subscribe via `useSnapshot`.
- Filter restore pattern from `useAssistantFilters.ts:79–87`: `updateUrlWithFilters(saved)` called on mount to re-sync URL after navigation strips query params.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/.ai-run/guides/architecture/architecture.md` — Primary architecture reference. Documents the Valtio proxy store pattern, data flow (Page → Store → API), the `getFilters`/`setFilters`/`updateUrlWithFilters` filter persistence system via `src/utils/filters.ts`, and the `useAssistantFilters.ts` URL-sync pattern. Directly relevant to this task.
- `docs/superpowers/tasks/2026-07-09-fix-templates-search-state/technical-analysis.md` — Most directly analogous prior fix. Documents the full filter persistence pattern and the reference restore pattern in `useAssistantFilters.ts:79–87`.
- `docs/superpowers/specs/2026-06-02-analytics-me-filter-persistence-design.md` — Prior analytics filter persistence fix. Documents the root cause pattern (filter value stored by ID/technical key, display state derived at runtime) and the fix strategy of separating persisted identity from display state.

### Architectural Decisions

- No formal ADR files exist. The pattern of storing technical keys and resolving display labels at render time is a convention derived from prior fixes, documented in the analogous task and spec files above.
- The `projectDisplayNamesStore` / `useProjectDisplayNames` pattern was established as the canonical solution for the same class of problem in table cell and detail page contexts. The decision to not wire it to filter components was likely an oversight rather than a deliberate choice.

### Derived Conventions

- Technical names are the authoritative filter identity (persisted, queried against the API). Display names are presentation-only, resolved at render time.
- On-demand display name resolution uses `projectDisplayNamesStore.ensure(name)` followed by reactive reads via `useSnapshot(projectDisplayNamesStore)`.
- Filter components should supplement their `projectOptions` with resolved display names for any saved values that fall outside the options returned by `loadProjectOptions('')`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/projectDisplayNames.test.ts` — Unit tests for `projectDisplayNamesStore`: fetch, cache, dedup, retry, invalidate logic.
- `src/hooks/__tests__/useProjectDisplayNames.test.ts` — Unit tests for `useProjectDisplayNames`: roster mapping, whitespace trim, admin lazy-fetch merge, cache read-back, non-admin guard.
- `src/hooks/__tests__/useProjectOptions.test.ts` — Unit tests for `useProjectOptions`: `display_name`-vs-name fallback when building filter option label/value pairs.
- `src/utils/__tests__/projectDisplayName.test.ts` — Unit tests for `getProjectDisplayName` / `generateProjectName` pure utilities.
- `src/components/Filters/__tests__/Filters.test.tsx` — Unit tests for generic `Filters` component: renders filter types; does NOT test `getHiddenOptions` / fallback-label behaviour.
- `src/components/ProjectNameCell/__tests__/ProjectNameCell.test.tsx` — Unit tests for `ProjectNameCell`.
- `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` — Integration tests for Assistants list page; one filter test covers only text-search debounce — no project-filter test.
- `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` — Includes `Project filter applies correctly` (line 842) but uses `display_name: null` fixtures; only asserts the technical name is passed as the query param, not that a display name appears in the filter chip. Covers `restores persisted search filter` for template name filter but not for project filter with display name.
- `src/pages/skills/components/__tests__/SkillCard.test.tsx` — Unit tests for `SkillCard`; does not test project filter.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 (workspace: `unit` and `integration` projects), @testing-library/react 16.3.0, @testing-library/user-event 14.6.1
- Integration project uses a custom jsdom environment (`vitest-env-integration.ts`)
- `vi.hoisted` + `vi.mock` for module-level mocks (stores, valtio `useSnapshot`, API utility)
- `mockAPI(method, url, data, status?)` helper in `src/test-utils/integration.tsx` — builds Response factories in a `requestRegistry` Map, consumed by patched `global.fetch`
- `renderPage(path)` — uses React Router `createMemoryRouter` + `RouterProvider` with real route config
- Fixture factories: `createAssistantFixture`, `createWorkflowFixture` with spread overrides
- `localStorage` mock via `localStorageMock` in `setupTests.tsx` for filter persistence tests
- `vi.spyOn` for verifying store method calls

### Coverage Gaps

- No test for the core bug scenario: Project Admin (`is_admin: true`) with a non-roster project selected, then page refresh — filter chip shows technical name instead of display name.
- `AssistantsListPage` has no project-filter integration test (no project selection, no display name verification in filter chip).
- `SkillsListPage` has **zero integration tests** — `SkillsFilters` project display name path is entirely uncovered.
- `WorkflowsListPage` project filter test uses `display_name: null` fixtures — never exercises the `getProjectDisplayName` label mapping.
- `Filters.tsx` `getHiddenOptions` fallback (`{ label: val, value: val }` synthetic option) is completely untested.
- No integration test covers `projectDisplayNamesStore.ensure()` being triggered by a project filter value read from URL/localStorage on refresh for a non-roster project.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_SHOW_ALL_PROJECTS` — **Directly relevant to the bug.** When `'true'`, removes the 3-character minimum gate in `getAdminProjects`, so `loadProjectOptions('')` on mount does reach `v1/admin/applications` and returns non-roster projects. Default is `'false'` in `config.js`, which is the environment where the bug manifests. Read in `src/store/user.ts` line ~339.
- `VITE_API_URL` — Base URL for all API calls (`/api` by default); read via `window._env_?.VITE_API_URL || import.meta.env.VITE_API_URL` in `src/utils/api.ts`.
- `VITE_ENV` — Runtime environment name.
- `VITE_ENABLE_USER_MANAGEMENT` — Toggles user management UI; indirectly controls whether Project Admin UI paths are reachable.

### Configuration Files

- `config.js` — Runtime `window._env_` injection for all `VITE_*` variables; templated per deployment environment via Docker/nginx.
- `src/types/global.ts` — TypeScript interface `EnvConfig` typing `window._env_`; contract for all `VITE_*` variables the app reads.
- `src/utils/filters.ts` — Central filter persistence layer; URL param key `project` is multi-value.
- `src/store/user.ts` — `getProjects` / `getAdminProjects` / `getUserProjects` logic; governs which projects appear in the filter dropdown per role.

### Feature Flags and Deployment Concerns

- `VITE_SHOW_ALL_PROJECTS='true'` effectively masks this bug by loading all admin projects on mount — but this is not the correct fix, as it changes load behaviour globally and the underlying display-name resolution gap remains.
- The bug is **environment-dependent**: absent on deployments with `VITE_SHOW_ALL_PROJECTS='true'`, present on all others.
- The URL param named `project` stores the technical name; this is load-bearing and must not be changed (it maps directly to backend query parameters).

---

## 6. Risk Indicators

- **Core bug path untested**: No integration test covers the Project Admin + non-roster project + page refresh scenario across any of the three pages.
- **SkillsListPage has zero integration tests**: The entire `SkillsFilters` component is untested at page level; the fix will have no test harness without new test creation.
- **`Filters.tsx` `getHiddenOptions` is untested**: The fallback that renders `label=technicalName` has no test coverage; a regression here would be invisible.
- **Three symmetric files require the same change**: `AssistantFilters.tsx`, `SkillsFilters.tsx`, `WorkflowsFilters.tsx` all have the identical gap. Risk of inconsistent fix application or missed file.
- **Async resolution timing**: `projectDisplayNamesStore.ensure()` is async. The filter component must handle the loading state (between mount and display name resolution) so that the chip doesn't flash the technical name briefly before switching to the display name.
- **`useProjectDisplayNames` guard**: The hook contains `if (!user?.isAdmin) return` — must verify the guard is compatible with Project Admin (vs Super Admin) user type before relying on it.
- **`WorkflowsListPage` test uses `display_name: null` fixtures**: The existing project filter test would not catch a display name regression even after the fix is applied, unless fixtures are updated.
- **No documentation for the `getHiddenOptions` fallback pattern**: Its intent (preserve unknown selections) must be inferred from source — `src/components/Filters/Filters.tsx` lines 138–158.
- **`DataSourceFilters.tsx:54` has a TODO** referencing the same `loadProjectOptions`/`loadCreatedByOptions` pattern, suggesting wider technical debt in this area.

---

## 7. Summary for Complexity Assessment

This task is a targeted bug fix with a precisely identified root cause and a clear resolution path. The bug exists in three symmetric locations — `AssistantFilters.tsx`, `SkillsFilters.tsx`, and `WorkflowsFilters.tsx` — and stems from a single missing integration: these components do not call `projectDisplayNamesStore.ensure()` for project filter values that fall outside the roster returned by `loadProjectOptions('')` on mount. The correct resolution pattern (`useProjectDisplayNames` hook backed by `projectDisplayNamesStore`) already exists in the codebase and is used consistently in table cell and detail page contexts. The fix involves wiring this existing mechanism into the three filter components, with care for async timing so that the display name chip does not flash the technical name before resolution completes.

The affected architectural layers are: Filter Components (presentation), Filter Hooks (state restoration), Store/Data (`userStore`, `projectDisplayNamesStore`), and the generic `Filters.tsx` `getHiddenOptions` fallback. The file change surface is small — primarily the three filter component files, possibly their parent hooks if display name resolution is lifted to that layer. The pattern is entirely established; no novel approach is required. The main technical nuance is ensuring the async `ensure()` call is triggered at the right point relative to the restored filter state read (i.e., after `getFilters` returns technical names on mount, before or alongside `Filters.tsx` renders the chip).

Test coverage posture for this area is mixed. The `projectDisplayNamesStore` and `useProjectDisplayNames` hook are well-tested in isolation. However, the integration path — project filter chip label on Assistants/Skills/Workflows pages after refresh with a non-roster project — has no test coverage on any of the three pages. `SkillsListPage` has no integration tests at all. New integration tests will be needed to validate the fix and prevent regression; the `WorkflowsListPage` existing project filter test fixture should also be updated to use a non-null `display_name` value. Overall complexity is low-to-medium: the logic change is small and the pattern is established, but the test gap is significant and filling it correctly (especially for `SkillsListPage`) adds non-trivial effort.
