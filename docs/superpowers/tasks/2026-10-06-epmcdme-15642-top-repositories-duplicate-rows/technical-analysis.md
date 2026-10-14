# Technical Research

**Task**: cli analytics repositories store
**Generated**: 2026-10-06
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15642 [CLI Analytics] Number of rows in the "Top Repositories" table increases after navigating away from and back to the Overview tab. Steps: open CLI Analytics Overview, note Top Repositories rows, go to Repositories tab, go back to Overview -> extra/duplicated rows appear with no filter changes. Expected: table data refreshed/replaced, not appended; stable row count across tab navigation. Tech details: src/pages/analytics/components/cli-analytics/views/OverviewView.tsx and RepositoriesView.tsx both render a repositories table; when navigating from Repositories to Overview, rows in the Overview repo table look incorrect/duplicated. Suspected root cause: RepositoriesView and OverviewView share one store slot (`repositories`) and the store never clears it when a new fetch starts (possibly fetch appends / merges by includeBranches variant). Suggested fix: clear the slot on mount or when request type changes; fetchRepositories sets repositories = null before fetching, or the hook does it when includeBranches changes.

---

## 2. Codebase Findings

### Existing Implementations
- `src/store/cliAnalytics.ts` — Valtio `proxy` store. Single `repositories: CliAnalyticsRepositoriesData | null` slot (line 44, init 161). `fetchRepositories` (l.243-252) calls `fetchWithState(..., 'repositories', 'v1/analytics/cli-analytics/repositories')` and on success does `cliAnalyticsStore.repositories = data.data` — an assignment (replace), NOT an append/merge. `startRequest` (l.94-107) aborts the previous request for the key, bumps a generation counter, sets `loading[key]=true`, `error[key]=null`; it does NOT clear the data slot. Same pattern for every other slice (overview, activity, etc.).
- `src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsRepositories.ts` — reads `snap.repositories?.rows ?? []` directly (l.115); effect (l.74-107) calls `fetchRepositories` with params and aborts `abortControllers.get('repositories')` on cleanup. `includeBranches` adds `include_branches=true`; `initialPerPage===0` means fetch-all (no page/per_page). Hook has no knowledge of which variant produced the data currently in the slot.
- `views/OverviewView.tsx` l.207-213: `useCliAnalyticsRepositories(filters, repositories, false, 10)` (top 10, no branches); renders `RepositoriesTable` (l.309) without pagination props.
- `views/RepositoriesView.tsx` l.102-107: `useCliAnalyticsRepositories(filters, repositories, true, 0)` (all rows, with branches); rows aggregated by `aggregateRepos`.
- `views/RepositoriesTable.tsx` — presentational table shared by both views.

### Architecture and Layers Affected
Frontend only: page views -> hook (`hooks/useCliAnalyticsRepositories.ts`) -> Valtio store (`src/store/cliAnalytics.ts`) -> `api` util.

### Integration Points
Backend endpoint `v1/analytics/cli-analytics/repositories` (params: time_period, start_date, end_date, users, projects, repositories, search, page, per_page, include_branches). Tab switching is in `CliAnalyticsTab.tsx` (views unmount/mount per tab).

### Patterns and Conventions
Store slots are per-endpoint and singleton; hooks read via `useSnapshot`. Generation counter protects against stale responses for the same key only.

### Likely mechanism (from code reading, not reproduced)
Not an append. The slot is shared by two variants (Overview: 10 rows, no branches; Repositories: all rows, with branches). On returning to Overview, the hook renders the stale Repositories-variant rows from the slot (`snap.repositories.rows`) until the new response replaces it; with the Overview table having no pagination, the full/branch-expanded row set appears (extra rows) and then is replaced when the fetch lands. Also if the fetch fails/aborts, the stale rows persist since the slot is never cleared. Whether the extra rows persist after load (vs. flash) should be confirmed in the UI.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (patterns/state-management.md, development/api-integration.md, testing/testing-patterns.md per AGENTS.md); not read in detail for this analysis.

### Architectural Decisions
None found specific to this store.

### Derived Conventions
Store fetch methods assign result on success; loading/error tracked in `loading`/`error` maps keyed by slice.

---

## 4. Testing Landscape

### Existing Coverage
- `hooks/__tests__/useCliAnalyticsRepositories.test.ts` — spies on `cliAnalyticsStore.fetchRepositories`; checks params (page 0-indexed, include_branches), page reset, etc.
- `__tests__/RepositoriesView.test.tsx`, `RepositoriesTable.test.tsx`, `OverviewView.test.tsx`, `OverviewViewEmpty.test.tsx`, `CliAnalyticsTab.test.tsx`.

### Testing Framework and Patterns
Vitest + React Testing Library (unit and integration projects); `vi.spyOn` on store methods.

### Coverage Gaps
No store-level test found for `src/store/cliAnalytics.ts` slot behaviour across variants (grep for store tests not exhaustive); no test for stale rows across Repositories -> Overview remount.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
None.

---

## 6. Risk Indicators

- Speculative: the suggested fix (null the slot at fetch start) causes a loading flicker/empty state on every filter or page change in Repositories view, since `fetchRepositories` is also triggered by filter/search/page changes; clearing only on variant change or mount avoids this.
- Speculative: alternatives are separate store slots per variant (e.g. keyed by include_branches/fetch-all) which also avoids cross-view contamination but touches the store type and hook.
- Single-slot sharing means any other consumer of `snap.repositories` is affected by a change; grep showed only the hook reads it (check before changing).
- Root cause is inferred from code, not reproduced; the ticket's "append" hypothesis does not match the store code.
- Low overall risk: small, localized frontend change; tests exist around the hook.

---

## 7. Summary for Complexity Assessment

The change is confined to the frontend: the Valtio store `src/store/cliAnalytics.ts` and the hook `useCliAnalyticsRepositories.ts`, with `OverviewView.tsx` and `RepositoriesView.tsx` as the two consumers sharing the single `repositories` slot. The change surface is likely 2 source files plus tests.

The store replaces rather than appends data, so the ticket's append hypothesis is not supported. The most plausible cause is stale data from the other view's variant (all rows with branches vs top 10) being rendered from the shared slot on remount until the new fetch completes, and the slot is never cleared at request start. No novel patterns are involved.

Test coverage is decent at hook/view level but there is no regression test for cross-view stale slot data. Key risk is choosing a fix that does not cause loading flicker on regular filter changes.

---

## 8. External References

None named by the task.
