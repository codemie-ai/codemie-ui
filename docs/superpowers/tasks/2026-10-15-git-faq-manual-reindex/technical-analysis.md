# Technical Research

**Task**: dataSources git-faq reindex indexing
**Generated**: 2026-10-15T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15924 — Git FAQ datasource: not allow manual reindex when scheduled reindexing fails. Users of Git FAQ datasources need a way to start reindexing manually when the scheduled reindex did not run or failed. Currently, if a scheduled reindex of a Git FAQ datasource fails, the user has no way to refresh the datasource content from the Data Sources screen and must rely on support intervention. The manual reindex action should be available for Git FAQ datasources and should not depend on the scheduler state.

Preconditions:
- A Git FAQ datasource exists and was indexed at least once.
- The datasource has a configured cron schedule, and the last scheduled reindex failed or did not run.
- The user has permission to manage the datasource.

Scenarios of Use:
1. The user opens the Data Sources list and finds a Git FAQ datasource whose scheduled reindex failed.
2. The user selects the reindex action for this datasource.
3. The system runs a full reindex of the Git FAQ datasource and shows its progress and result.
4. After a successful run, the Updated timestamp and the indexed FAQ content reflect the latest repository state.
5. The scheduled reindex continues to run according to its cron expression.

Affected Areas:
- Git FAQ datasource indexing
- Data Sources list and details UI (reindex action)
- Datasource reindex status and error handling

Acceptance Criteria:
1. A user can start a manual reindex of a Git FAQ datasource from the Data Sources list and details view.
2. A manual reindex completes with the same result as the scheduled reindex: the Updated timestamp changes and the content matches the Git repository.
3. If the manual reindex fails, the user sees an actionable error message.
4. The manual reindex does not change or break the configured cron schedule.
5. Manual reindex for other datasource types is not regressed.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/dataSources/utils/dataSourceUtils.ts` — `canFullReindex(item)`, `canForceReindex(item)`, `canIncrementalReindex(item)`, `canResumeIndexing(item)`, `performFullReindex(...)`, `performIncrementalReindex(...)`, `performResumeIndexing(...)`. These are the gating/dispatch functions behind the Data Sources list row actions.
- `src/pages/dataSources/components/DataSourceActions.tsx` — row-level actions menu (list view); renders "Full Reindex" / "Incremental Index" / "Resume Indexing" / "Force Reindex" menu items, each `hidden` by the corresponding `can*` predicate above, each `onClick` wired to the corresponding `perform*` function.
- `src/pages/dataSources/components/DataSourceDetails.tsx` — details view; pulls `reindexProviderIndex`, `updateKBIndex`, `reIndexKBIndex`, `updateApplicationIndex`, `reindexMarketplace` from `dataSourceStore` directly (its reindex wiring was not fully read in this pass — see Risk Indicators).
- `src/utils/indexing.ts` — `isGitFaqIndex`, `isKBIndex`, `isConfluenceIndex`, `isJiraIndex`, etc. `isGitFaqIndex` checks `index_type.includes('knowledge_base_git_faq')`; `isKBIndex` checks `index_type.includes('knowledge_base_')` — every Git FAQ index therefore also satisfies `isKBIndex`.
- `src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts` — `createOrUpdateGitFaqIndex(values)`: on edit, calls `dataSourceStore.updateKBIndex(INDEX_TYPES.GIT_FAQ, request, withReindex)` where `request` carries `link`, `branch`, `files_filter`, `setting_id` only when `withReindex` is true (full reindex) or the source fields changed; on create, calls `dataSourceStore.createKBIndexGitFaq(...)`.
- `src/store/dataSources.ts` — `dataSourceStore` exposes `getIndexDetails`, `createApplicationGitIndex`, `updateApplicationIndex`, `resumeApplicationIndex`, `getJiraFields`, etc. (file is large; only parts were read — `updateKBIndex`, `reIndexKBIndex`, `createKBIndexGitFaq`, `reindexProviderIndex`, `reindexMarketplace` are referenced from callers but their bodies were not retrieved in this pass).
- `src/store/schedulers.ts` / `src/store/schedulerRuns.ts` — a separate, generic scheduler subsystem keyed by `SchedulerResourceType = 'Assistant' | 'Workflow' | 'Datasource'`, with `SchedulerLastRunStatus = 'completed' | 'failed' | 'running' | 'never'` and `SchedulerRunTrigger = 'scheduled' | 'manual'`. Surfaced via `src/pages/schedulers/SchedulerRunHistoryPage.tsx`.
- `src/constants/dataSources.ts` — `REINDEX_TYPES = { SCHEDULER: 'scheduler' }`, `ReindexType`, `REINDEX_TYPE_OPTIONS` — used only by `CronScheduleInput` to label the schedule's trigger type; there is no `'manual'` value in this specific enum.

### Root-cause finding
`canFullReindex` (dataSourceUtils.ts:66-86) has explicit `true` branches for LLM-routing, Confluence, XWiki, Jira, Xray, Azure DevOps Wiki/WorkItem, SharePoint, and Provider index types, then falls through to `return !isKBIndex(item)`. Because `isGitFaqIndex` implies `isKBIndex`, this fallthrough evaluates to `false` for every Git FAQ datasource regardless of `completed`/`error` state — the "Full Reindex" menu item is hidden (`hidden={!canFullReindexItem}` in `DataSourceActions.tsx`) for Git FAQ today. `canForceReindex` (lines 106-121) has the identical fallthrough, but it is additionally short-circuited by `if (item.completed || item.error) return false` — so for a datasource whose last scheduled run failed (`item.error === true`), `canForceReindex` returns `false` before reaching the Git FAQ case at all.

`performFullReindex` (dataSourceUtils.ts:172-251) likewise has no Git FAQ branch; its final `else` calls `updateApplicationIndex(item.project_name, item.repo_name, true)` — the Git *code* application-index endpoint used by plain Git datasources (`createOrUpdateGitIndex` in useCreateIndex.ts), not the `updateKBIndex(INDEX_TYPES.GIT_FAQ, request, true)` call that `createOrUpdateGitFaqIndex` uses for Git FAQ. If `canFullReindex` were simply relaxed without adding a matching Git FAQ branch in `performFullReindex`, the action would call the wrong backend endpoint for Git FAQ datasources.

### Architecture and Layers Affected
- **UI / components layer**: `DataSourceActions.tsx` (list row menu), `DataSourceDetails.tsx` (details view) — both render reindex affordances.
- **Utility / business-logic layer**: `src/pages/dataSources/utils/dataSourceUtils.ts` (gating + dispatch) and `src/utils/indexing.ts` (index-type predicates).
- **Store layer**: `src/store/dataSources.ts` (`dataSourceStore` — HTTP calls to `v1/index*` and `v1/application/*` endpoints).
- **Adjacent, likely-unrelated layer**: `src/store/schedulers.ts` / `schedulerRuns.ts` — a generic per-resource scheduler/run-history model that already models a `'manual'` trigger, but for a different page (`SchedulerRunHistoryPage`) and keyed abstractly by `SchedulerResourceType`, not wired to `DataSourceActions`.

### Integration Points
- `DataSourceActions` → `dataSourceUtils.ts` (`can*`/`perform*`) → `dataSourceStore` methods → backend `v1/index` (KB) and `v1/application` (Git code) endpoints.
- `useCreateIndex.ts` → `dataSourceStore.updateKBIndex` / `createKBIndexGitFaq` — the only other place that performs a Git FAQ reindex today (via the edit-and-save form flow, not a direct one-click reindex action).
- `CronScheduleInput.tsx` / `constants/dataSources.ts` (`REINDEX_TYPES`, `CRON_PRESETS`) — governs the schedule configuration shown on the datasource form; unrelated to the row-action reindex trigger.

### Patterns and Conventions
- Index-type dispatch is done via small boolean predicate functions in `src/utils/indexing.ts` (`isXIndex`), composed in `if`-chains inside `canFullReindex`/`canForceReindex`/`performFullReindex`/`performIncrementalReindex`/`performResumeIndexing`. Any new type-specific behavior conventionally adds one more `if (isXIndex(item)) ...` branch before the generic fallthrough.
- Valtio stores (`dataSourceStore`) hold both state and the async methods that mutate it; components read via `useSnapshot`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/architecture/architecture.md`, `.ai-run/guides/development/code-organization.md`, `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/development/api-integration.md`, `.ai-run/guides/testing/testing-patterns.md` exist (per `.ai-run/guides/` index) but none is Git-FAQ- or reindex-specific; general React/Valtio/API conventions only, not read in full for this pass since the code itself already shows the concrete pattern to follow (predicate + dispatch functions in `dataSourceUtils.ts`).

### Architectural Decisions
- None found specific to reindex gating; the `canFullReindex`/`canForceReindex` fallthrough-to-`!isKBIndex` design appears to be an incidental omission (every other KB-prefixed type listed explicitly returns `true`; Git FAQ is the only KB index type without its own branch) rather than a documented decision.

### Derived Conventions
- New datasource types are expected to get an explicit branch in each of `canFullReindex`, `canForceReindex`, and `performFullReindex` — Git FAQ is currently the one index type missing from all three.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts` — tests `canFullReindex`/`canForceReindex`/etc. for other index types (via `canEdit` callers list); Git FAQ-specific cases not confirmed present.
- `src/pages/dataSources/__tests__/faqIndexHelpers.test.ts` — tests `isGitFaqIndex`.
- `src/pages/dataSources/utils/__tests__/dataSourceStatus.test.ts` — tests `getDataSourceStatusInfo` (status badge/title derivation from `completed`/`error`/`is_queued`/`is_fetching`).
- `src/pages/dataSources/hooks/__tests__/useDataSourceStatusAnnouncer.test.ts` — status-change announcements.
- `src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx` — schedule input, including `REINDEX_TYPE_OPTIONS`.
- `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx` — details view.
- `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useCreateIndex.xwiki.test.ts` — only XWiki case of `useCreateIndex` is covered by this filename; a Git FAQ equivalent was not found.

### Testing Framework and Patterns
Vitest + React Testing Library, two Vitest projects (`unit`, `integration`) per `vite.config.ts` (per AGENTS.md stack section — not independently re-verified here).

### Coverage Gaps
- No test confirmed to assert `canFullReindex`/`canForceReindex` behavior for a Git FAQ item in an errored (`error: true`) state — exactly the scenario this ticket targets.
- No test found for `performFullReindex` dispatching correctly for a Git FAQ item (which endpoint/store method it should call).
- `DataSourceDetails.tsx`'s own reindex wiring (separate from `dataSourceUtils.ts`) was not inspected in this pass; its test coverage for Git FAQ reindex is unconfirmed.

---

## 5. Configuration and Environment

### Environment Variables
None found specific to Git FAQ or reindex; no `VITE_*`/`window._env_` reference turned up in the explored files for this feature area.

### Configuration Files
- `src/constants/dataSources.ts` — `REINDEX_TYPES`, `REINDEX_TYPE_OPTIONS`, `CRON_PRESETS`, `CRON_HELP_TEXT`/`CRON_HELP_URL`, `CRON_PLACEHOLDER` govern the cron-schedule UI, not the manual-trigger action.

### Feature Flags and Deployment Concerns
None found.

---

## 6. Risk Indicators

- `canFullReindex` and `canForceReindex` (`src/pages/dataSources/utils/dataSourceUtils.ts`) both fall through to `!isKBIndex(item)` for Git FAQ, which is `false` — this is the concrete, verified cause of the reported behavior (manual reindex unavailable for Git FAQ).
- `performFullReindex`'s fallthrough `else` branch calls `updateApplicationIndex` (the Git *code* index endpoint), not `updateKBIndex(INDEX_TYPES.GIT_FAQ, ...)` (the endpoint Git FAQ create/edit actually uses per `useCreateIndex.ts`). Speculative: a correct fix likely needs its own `isGitFaqIndex(item)` branch in `performFullReindex` building a request shape mirroring `createOrUpdateGitFaqIndex`'s reindex payload (`link`, `branch`, `files_filter`, `setting_id`), rather than only relaxing the `canFullReindex` gate.
- `DataSourceDetails.tsx` (details view) was not fully inspected; it reads `reindexProviderIndex`/`updateKBIndex`/`reIndexKBIndex`/`updateApplicationIndex`/`reindexMarketplace` directly rather than visibly reusing `canFullReindex`/`performFullReindex`. Acceptance criterion 1 requires the action from both list and details view — unverified whether a fix to `dataSourceUtils.ts` alone reaches the details view, or whether the details view needs its own equivalent change.
- A second, generic scheduler subsystem exists (`src/store/schedulers.ts`, `src/store/schedulerRuns.ts`, `SchedulerRunHistoryPage.tsx`) with its own `SchedulerRunTrigger = 'scheduled' | 'manual'` and a `'failed'` last-run status, independent of the DataSource's own `completed`/`error` fields and of `DataSourceActions`. Not established whether this ticket's "manual reindex" is expected to interact with that subsystem at all, or is scoped purely to the existing `DataSourceActions`/`dataSourceUtils.ts` path the acceptance criteria describe.
- No test was found exercising `canFullReindex`/`canForceReindex`/`performFullReindex` for a Git FAQ item specifically — the fix's correctness and the "other datasource types not regressed" criterion both rely on tests that do not yet clearly exist.
- `REINDEX_TYPES` (`src/constants/dataSources.ts`) currently only defines `'scheduler'`; it has no `'manual'` member, so this enum is not an existing hook for a "manual" concept at the UI layer — any manual/scheduled distinction surfaced to the backend request would be a new addition, not an extension of an existing one.

---

## 7. Summary for Complexity Assessment

The task touches three layers already identified by name: the row-action menu/details view (UI), the predicate+dispatch utilities in `dataSourceUtils.ts` (business logic), and the Valtio store methods in `dataSourceStore` that call the backend KB/application index endpoints. The root cause is narrow and concretely located: `canFullReindex` and `canForceReindex` fall through to a shared `!isKBIndex(item)` check that is `false` for every Git FAQ item, and `performFullReindex`'s fallthrough dispatches to the wrong store method (`updateApplicationIndex` instead of `updateKBIndex(INDEX_TYPES.GIT_FAQ, ...)`) for Git FAQ. All three functions already follow a consistent "one explicit branch per index type" convention, so the shape of the fix is well precedented by the eight other index types already handled this way.

Novelty is low — the pattern to extend is already established and used by eight sibling types — but the change surface has two open edges this analysis could not close without reading more: whether `DataSourceDetails.tsx` (details view) needs an independent fix because it does not visibly route through `dataSourceUtils.ts`, and whether the request payload `performFullReindex` must build for Git FAQ needs to mirror `createOrUpdateGitFaqIndex`'s reindex-specific fields exactly. Test coverage for the specific scenario (Git FAQ + `error: true`) is not confirmed to exist for either the gating predicates or the dispatch function, which is the main regression risk given acceptance criterion 5 ("other datasource types not regressed") — the fix sits inside shared functions used by every other index type.

---

## 8. External References

None named by the task.
