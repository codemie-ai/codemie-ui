# Spec: Git FAQ datasource — manual reindex independent of scheduler state

**Ticket**: EPMCDME-15924

## Problem

Git FAQ datasources support a cron-scheduled reindex, but the "Full Reindex" row/details
action — the user's only self-service refresh path — is hidden for every Git FAQ datasource
regardless of state. When a scheduled run fails, the user has no way to retrigger indexing
and must escalate to support.

## Root cause

`canFullReindex` (`src/pages/dataSources/utils/dataSourceUtils.ts:66-86`) has an explicit
`true` branch per supported index type, then falls through to `return !isKBIndex(item)`.
Every Git FAQ datasource satisfies `isKBIndex` (`src/utils/indexing.ts`), so this fallthrough
is always `false` for Git FAQ — the action is hidden independent of `completed`/`error`.
The function's state gate (line 73: proceed only when `item.completed || item.error`) already
matches this ticket's scenario; only the missing type branch blocks it.

`performFullReindex` (`dataSourceUtils.ts:172-251`) has the matching per-type dispatch chain;
its fallthrough `else` calls `updateApplicationIndex` — the Git *code* endpoint — which is the
wrong endpoint for Git FAQ (Git FAQ reindexes via `updateKBIndex(INDEX_TYPES.GIT_FAQ, ...)`,
confirmed by `useCreateIndex.ts`'s `createOrUpdateGitFaqIndex`).

## Approach

Add one explicit Git FAQ branch to each of the two functions, following the established
"one branch per index type" convention already used by the other 8 types in this file:

- **`canFullReindex`**: add `if (isGitFaqIndex(item)) return true` alongside the other
  type branches, before the `!isKBIndex` fallthrough.
- **`performFullReindex`**: add a Git FAQ branch that calls
  `updateKBIndex(INDEX_TYPES.GIT_FAQ, { name: item.repo_name, project_name: item.project_name }, true)`.

This payload mirrors the existing Confluence/XWiki branches (`dataSourceUtils.ts:184-194`),
which deliberately send only `name`/`project_name` with `full_reindex=true` and rely on the
backend to keep the already-stored type-specific fields (their comment: "optional on the
update schema and the backend keeps the stored values"). The same minimal shape is required
here for a second reason: the `DataSource` type consumed by both call sites
(`src/types/entity/dataSource.ts:177-229`) has no `branch`, `files_filter`, or `setting_id`
fields — only `DataSourceDetailsResponse` does — so a payload mirroring the edit form's
reindex request (which needs those fields) isn't buildable from data already in hand at
either call site without a disproportionate type/API extension.

Both `DataSourceActions.tsx` (list row menu, `canFullReindexItem`/`fullReindex`/
`confirmFullReindex`) and `DataSourceDetails.tsx` (details view, `showFullReindexButton`/
`showFullReindexConfirmation`/`confirmFullReindex`) already import and call these same two
shared functions — no separate change is needed in either component file.

Error reporting (AC3) and schedule safety (AC4) require no new code: `updateKBIndex`
(`src/store/dataSources.ts:279-290`) already goes through the shared `handleIndexResponse`
helper, which already surfaces a toaster error on failure for every other full-reindex branch;
and the chosen payload never includes `cron_expression`, matching the two sibling branches
that already prove this doesn't disturb the stored schedule.

## Acceptance Criteria

1. `canFullReindex` returns `true` for a Git FAQ datasource when `item.completed || item.error`,
   making the "Full Reindex" action visible in both the Data Sources list row menu and the
   details view.
2. Triggering it calls `dataSourceStore.updateKBIndex(INDEX_TYPES.GIT_FAQ, { name, project_name }, true)`
   (not `updateApplicationIndex`); a successful run updates the datasource's `update_date` and
   content to match the Git repository, same as a scheduled run.
3. A failed manual reindex surfaces the existing toaster error from `handleIndexResponse` —
   no bespoke error UI is added.
4. The reindex payload carries no `cron_expression` field; the configured schedule is
   unaffected.
5. `canFullReindex`/`performFullReindex` behavior for every other index type (Confluence,
   XWiki, Jira, Xray, Azure DevOps Wiki/WorkItem, SharePoint, Provider, LLM-routing, Platform,
   plain Git/code) is unchanged — covered by extending
   `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts` with Git FAQ cases
   (completed, errored, and each existing type's untouched expectation) rather than modifying
   its existing assertions.

## Non-goals

- `canForceReindex` (`dataSourceUtils.ts:106-121`) is not modified. It gates a different,
  unrelated state (`!item.completed && !item.error` — never run / in progress), which this
  ticket's scenario (a failed last run) never satisfies.
- `performIncrementalReindex` is not modified; Git FAQ has no incremental-reindex affordance
  today and this ticket does not request one.
- No change to the `DataSource` or `DataSourceDetailsResponse` types, the backend contract,
  or the KB index API.
- No change to `DataSourceActions.tsx` or `DataSourceDetails.tsx` — they already route through
  the two functions being fixed.
- No change to the scheduler subsystem (`src/store/schedulers.ts`, `schedulerRuns.ts`) or to
  `REINDEX_TYPES`/cron UI (`src/constants/dataSources.ts`) — scheduled reindex continues to run
  on its existing cron path, untouched.

## Open risk

Sending only `{ name, project_name }` with `full_reindex=true` for Git FAQ assumes the backend
reuses the datasource's already-stored `link`/`branch`/`files_filter`/`setting_id` on a full
reindex, as it already does for the Confluence/XWiki sibling types. This cannot be confirmed
by reading the frontend repo alone; verify against the live backend during implementation/QA
(AC2) rather than only via unit tests on the dispatch function.

## Revision (post-review)

Per reviewer feedback on the MR, `performFullReindex`'s Git FAQ branch was switched from the edit
endpoint (above) to the dedicated reindex route: `reIndexKBIndex(item.index_type,
item.project_name, item.repo_name)`, matching the LLM-routing branch already in the same
function. Both backend handlers did the same work, so behavior is unchanged, but the dedicated
route carries no dependency on the edit endpoint's "omitted field keeps the stored value" rule —
the open risk above no longer applies.
