# Git FAQ Manual Reindex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users manually trigger a full reindex of a Git FAQ datasource regardless of scheduler state, by adding the missing Git FAQ branch to the existing per-index-type gating and dispatch functions.

**Architecture:** `canFullReindex` and `performFullReindex` in `dataSourceUtils.ts` already dispatch per index type via an `if`-chain, one branch per type, shared by every datasource's reindex action (list row menu and details view both call these same two functions already — confirmed, no component change needed). Git FAQ is the one KB index type missing a branch in both: `canFullReindex` falls through to `!isKBIndex(item)` (`false` for Git FAQ), and `performFullReindex` falls through to `updateApplicationIndex` (the wrong, Git-code endpoint). Add one `if` line and one `else if` branch, following the Confluence/XWiki branch as the precedent for the minimal `{ name, project_name }` + `full_reindex=true` payload shape.

**Tech Stack:** React + TypeScript, Valtio store (`dataSourceStore`), Vitest + React Testing Library (`unit` project).

**Spec:** `docs/superpowers/tasks/2026-10-15-git-faq-manual-reindex/spec.md`

## Global Constraints

- Payload for the new Git FAQ branch is `{ name: item.repo_name, project_name: item.project_name }` with `full_reindex=true` — no `link`, `branch`, `files_filter`, `setting_id`, or `cron_expression` fields (spec Approach, AC2, AC4).
- Dispatch the new branch via `updateKBIndex(INDEX_TYPES.GIT_FAQ, ...)` — the literal `INDEX_TYPES.GIT_FAQ` constant, not `item.index_type` (spec Approach; this is the one deliberate deviation from the Confluence/XWiki precedent, which uses `item.index_type`).
- `canForceReindex`, `performIncrementalReindex`, `DataSourceActions.tsx`, `DataSourceDetails.tsx`, the `DataSource`/`DataSourceDetailsResponse` types, the scheduler subsystem (`schedulers.ts`/`schedulerRuns.ts`), and `REINDEX_TYPES`/cron UI in `constants/dataSources.ts` are not modified (spec Non-goals).
- Every other index type's `canFullReindex`/`performFullReindex` behavior must remain byte-identical in outcome (spec AC5) — add branches, never reorder or edit existing ones.

## Review Focus

- A Git FAQ item with `completed: false, error: true` (failed scheduled run) must make `canFullReindex` return `true` — this is the ticket's whole reported scenario, not just the happy-path `completed: true` case.
- A Git FAQ item that is still running (`completed: false, error: false`) must still make `canFullReindex` return `false` (the existing `if (!item.completed && !item.error) return false` guard at line 73 already covers this for every type including Git FAQ — confirm no new branch bypasses it).
- `performFullReindex` for Git FAQ must call `updateKBIndex`, not `updateApplicationIndex` — assert the latter is never called for a Git FAQ item, not just that the former is called.
- Every other index type already covered by `dataSourceUtils.test.ts` (exercise at least the existing xWiki case) must keep returning the same `canFullReindex`/`performFullReindex` result after the new Git FAQ branches are added — a misplaced branch (e.g. before an existing `if`) could shadow a sibling type.
- The new `performFullReindex` payload must omit `cron_expression`, `link`, `branch`, `files_filter`, and `setting_id` — asserting only that `updateKBIndex` was called is not enough; assert the exact argument object.

---

### Task 1: Add Git FAQ branches to canFullReindex and performFullReindex

**Files:**
- Modify: `src/pages/dataSources/utils/dataSourceUtils.ts:20-33` (imports), `:66-86` (`canFullReindex`), `:172-251` (`performFullReindex`)
- Test: `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts`

**Interfaces:**
- Consumes: `isGitFaqIndex(info: IndexInfo): boolean` from `@/utils/indexing` (already exists, `src/utils/indexing.ts:43-45`, checks `index_type.includes('knowledge_base_git_faq')`); `INDEX_TYPES.GIT_FAQ` (`'git_faq'`) from `@/constants/dataSources`.
- Produces: no new exports — `canFullReindex` and `performFullReindex` keep their existing signatures; only their internal behavior for Git FAQ items changes.

Test-first: yes — a Git FAQ datasource with `error: true` currently gets `canFullReindex(item) === false` and, if dispatched anyway, would call `updateApplicationIndex` instead of `updateKBIndex`; the new tests fail against today's code for exactly that reason.

- [ ] **Step 1: Write the failing tests**

Add to `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts`: import `performFullReindex` alongside the existing `canFullReindex`/`canForceReindex` import, import `INDEX_TYPES` from `@/constants/dataSources`, add a `buildGitFaqDataSource` builder mirroring `buildXWikiDataSource` but with `index_type: 'knowledge_base_git_faq'` (drop the `xwiki` field), and add a new describe block:

```ts
describe('Git FAQ reindex capabilities', () => {
  it('allows a full reindex of a completed Git FAQ datasource', () => {
    expect(canFullReindex(buildGitFaqDataSource())).toBe(true)
  })

  it('allows a full reindex of a Git FAQ datasource whose scheduled run failed', () => {
    expect(canFullReindex(buildGitFaqDataSource({ completed: false, error: true }))).toBe(true)
  })

  it('does not allow a full reindex while a Git FAQ datasource is still indexing', () => {
    expect(canFullReindex(buildGitFaqDataSource({ completed: false, error: false }))).toBe(false)
  })

  it('dispatches performFullReindex to updateKBIndex with the minimal payload, not updateApplicationIndex', () => {
    const updateKBIndex = vi.fn()
    const updateApplicationIndex = vi.fn()
    const item = buildGitFaqDataSource({ error: true })

    performFullReindex(item, vi.fn(), updateKBIndex, updateApplicationIndex, vi.fn())

    expect(updateKBIndex).toHaveBeenCalledWith(
      INDEX_TYPES.GIT_FAQ,
      { name: item.repo_name, project_name: item.project_name },
      true
    )
    expect(updateApplicationIndex).not.toHaveBeenCalled()
  })
})
```

Also add one assertion confirming an unrelated, already-covered type is unaffected — extend the existing `describe('xWiki reindex capabilities', ...)` block with:

```ts
  it('still dispatches performFullReindex to updateKBIndex with item.index_type for xWiki (unaffected by the Git FAQ branch)', () => {
    const updateKBIndex = vi.fn()
    const item = buildXWikiDataSource()

    performFullReindex(item, vi.fn(), updateKBIndex, vi.fn(), vi.fn())

    expect(updateKBIndex).toHaveBeenCalledWith(
      item.index_type,
      { name: item.repo_name, project_name: item.project_name },
      true
    )
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts`
Expected: FAIL — the three new `canFullReindex`/Git-FAQ-dispatch assertions fail (`canFullReindex` returns `false` for the completed/errored Git FAQ cases; `performFullReindex` calls `updateApplicationIndex` instead of `updateKBIndex`). The new xWiki regression assertion and the "still indexing" assertion pass already — that's expected, they pin existing behavior.

- [ ] **Step 3: Implement the minimal code**

In `src/pages/dataSources/utils/dataSourceUtils.ts`:

Add to the existing import from `@/utils/indexing` (`:20-33`): `isGitFaqIndex`. Add a new import: `import { INDEX_TYPES } from '@/constants/dataSources'`.

In `canFullReindex` (`:66-86`), add one line to the `if` chain, directly above the `return !isKBIndex(item)` fallthrough:

```ts
  if (isGitFaqIndex(item)) return true
```

In `performFullReindex` (`:172-251`), add one branch directly above the final `else`:

```ts
  } else if (isGitFaqIndex(item)) {
    // Minimal payload, mirroring the Confluence/XWiki branch above: the backend
    // keeps the stored link/branch/files_filter/setting_id on a full reindex.
    updateKBIndex(
      INDEX_TYPES.GIT_FAQ,
      {
        name: item.repo_name,
        project_name: item.project_name,
      },
      true
    )
  } else {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts`
Expected: PASS — all tests in the file, including the new Git FAQ and xWiki-regression cases.

- [ ] **Step 5: Commit**

Commit per task using the repository's existing convention.

---

## Self-Review

**1. Spec coverage:** AC1 (visibility in both views) — covered: `canFullReindex` is the single shared gate both `DataSourceActions.tsx` and `DataSourceDetails.tsx` already call (confirmed in technical analysis and spec; no component task needed). AC2 (correct endpoint/payload) — covered by the `performFullReindex` dispatch test. AC3 (error surfaced) — no new code needed per spec; `updateKBIndex` already routes through `handleIndexResponse`, which already surfaces toaster errors for every other branch, so no task required. AC4 (schedule untouched) — covered: the payload in Step 3 carries no `cron_expression`, asserted via the exact-argument-object check in Step 1. AC5 (no regression) — covered by the added xWiki-dispatch assertion plus the pre-existing xWiki/other-type assertions already in the file, left unmodified. Non-goals — no task touches `canForceReindex`, `performIncrementalReindex`, either component file, the type definitions, or the scheduler subsystem. Open risk (backend reuses stored fields on full reindex) is explicitly deferred by the spec to implementation/QA verification against the live backend, not a plan-time concern.

**2. Placeholder scan:** none found — all code blocks are complete and runnable as written.

**3. Type consistency:** `performFullReindex(item, reIndexKBIndex, updateKBIndex, updateApplicationIndex, reindexProviderIndex, reindexMarketplace?)` signature in the test calls matches the function's existing declared parameter order (`src/pages/dataSources/utils/dataSourceUtils.ts:172-179`); `buildGitFaqDataSource`/`buildXWikiDataSource` both return `DataSource`, matching `canFullReindex`/`performFullReindex`'s existing parameter type.

**4. Review Focus:** all five lines above are each pinned by a specific assertion in Task 1, Step 1.

**Negative-constraints pass:** spec Non-goals re-scanned — "not modified: `canForceReindex`" (honored: Task 1 never edits lines 106-121), "not modified: `performIncrementalReindex`" (honored: never edits lines 129-161), "no change to `DataSourceActions.tsx`/`DataSourceDetails.tsx`" (honored: no file-touch in either), "no change to the `DataSource`/`DataSourceDetailsResponse` types or backend contract" (honored: payload uses only existing `repo_name`/`project_name` fields already on `DataSource`), "no change to the scheduler subsystem or `REINDEX_TYPES`/cron UI" (honored: neither file is touched), "payload carries no `cron_expression`" (honored: Step 3's payload literal has exactly `name`/`project_name`, pinned by Step 1's exact-object assertion). No task uses a forbidden mechanism to satisfy an AC — e.g. AC3 is not met by adding bespoke error-handling UI, which the spec rules out ("no bespoke error UI is added").
