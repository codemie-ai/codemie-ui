# Data Source Status Screen-Reader Announcements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Screen readers announce data-source status changes (Queued/Fetching/Processing +
percentage/Completed/Error) as they occur on the data-sources list, without re-announcing on every
5s poll when nothing changed.

**Architecture:** Extract the existing visual status-title derivation out of `DataSourceStatus.tsx`
into a shared pure helper, reuse it from a new per-row diffing hook that feeds the repo's existing
`Announcement` + `useAnnouncementQueue` primitives (WCAG 4.1.3 pattern already used in
`FilesDropzone.tsx`/`ToasterAnnouncer.tsx`), and wire that hook into `DataSourcesPage.tsx` where the
poll already lives.

**Tech Stack:** React 18 + TypeScript, Valtio, Vitest + RTL (`unit` and `integration` projects).

## Global Constraints

- Commit per task using the repository's existing convention (no commit-command blocks below).
- Never announce on a poll tick where a row's status did not change — only on transitions. This is
  the ticket's explicit "not on every poll tick" requirement; Task 2's diffing logic is what
  enforces it, and Task 3's integration test asserts it end-to-end.
- Track rows by their stable `id`, not array index, so add/remove/reorder across polls diff
  correctly.
- Announced text must mirror the visible badge text exactly (plus `ProgressBar` percentage).

---

## Acceptance criteria

- [ ] AC1: While a data source is being created/indexed, a screen reader announces its current status.
- [ ] AC2: Announced values include 0%, Fetching, Completed, and Error (mirroring the visible badge/percentage).
- [ ] AC3: An announcement fires only on an actual status transition per row, never on every unchanged 5s poll tick.
- [ ] AC4: This works on the data-sources list page, which is what the create flow navigates back to and where status is polled/rendered.

---

### Task 1: Extract a shared status-title helper

**Files:**
- Create: `src/pages/dataSources/utils/dataSourceStatus.ts`
- Modify: `src/pages/dataSources/components/DataSourceStatus.tsx:28-83`
- Test: `src/pages/dataSources/utils/__tests__/dataSourceStatus.test.ts`

**Interfaces:**
- Produces: `getDataSourceStatusInfo(item: DatasetResponse['data'][number]): { title: 'Queued' | 'Fetching' | 'Processing' | 'Completed' | 'Error'; classes: string; dotColor: string; isProviderInProgress: boolean; isTag: boolean; isInProgress: boolean }` — pure function, no React.

Test-first: yes — failing test asserting `getDataSourceStatusInfo` returns `title: 'Fetching'` for
`{ is_fetching: true, error: false, completed: false, is_queued: false, ... }`, and `'Completed'`,
`'Error'`, `'Queued'`, `'Processing'` for the other four branches (five cases from the existing
`DataSourceStatus.tsx:29-35,45-83` branching).

- [ ] **Step 1:** Write `dataSourceStatus.test.ts` with the five title-branch cases above, importing
  `getDataSourceStatusInfo` from the not-yet-created module.
- [ ] **Step 2:** Run the test file; confirm it fails on missing module.
- [ ] **Step 3:** Create `dataSourceStatus.ts` by moving the `statusInfo`/`title`/`classes`/`dotColor`
  logic verbatim out of `DataSourceStatus.tsx:29-83` into `getDataSourceStatusInfo`, taking `item`
  as its only argument.
- [ ] **Step 4:** Update `DataSourceStatus.tsx` to call `getDataSourceStatusInfo(item)` in place of
  the inline `statusInfo`/`useMemo` block, keeping the rendered JSX (`title`/`classes`/`dotColor`/
  `isProviderInProgress`/`isTag`/`isInProgress`) unchanged.
- [ ] **Step 5:** Run `dataSourceStatus.test.ts`; confirm it passes. Manually re-check
  `DataSourceStatus.tsx` still compiles against the new return shape (no behavior change expected).
- [ ] **Step 6:** Commit.

---

### Task 2: Per-row transition-only announcement hook

**Files:**
- Create: `src/pages/dataSources/hooks/useDataSourceStatusAnnouncer.ts`
- Test: `src/pages/dataSources/hooks/__tests__/useDataSourceStatusAnnouncer.test.ts`

**Interfaces:**
- Consumes: `getDataSourceStatusInfo` from Task 1 (`src/pages/dataSources/utils/dataSourceStatus.ts`);
  `useAnnouncementQueue` from `src/hooks/useAnnouncementQueue.ts` (`{ announcement, announce }`).
- Produces: `useDataSourceStatusAnnouncer(items: DatasetResponse['data']): { announcement: string }` —
  call once per poll result; diffs against a `useRef<Map<string, string>>` keyed by `item.id`
  storing each row's last announced text, calls `announce()` only when a row's text differs from
  its stored value (or the row is new), then updates the map. Announced text per row is the
  `title` from `getDataSourceStatusInfo`, plus `` `${Math.round((item.current_state / item.complete_state) * 100)}%` `` appended when `isInProgress && !isProviderInProgress` (mirrors `ProgressBar`'s
  percentage). Rows no longer present are dropped from the map (no announcement on removal).

Test-first: yes — failing test: render the hook via `renderHook`, call it first with one row at
`Fetching`, then again with the same row still `Fetching` (identical text) and assert `announce`
fires exactly once total; then call it with the row now `Completed` and assert a second, distinct
announcement fires. Assert a brand-new row's first sighting announces once.

- [ ] **Step 1:** Write `useDataSourceStatusAnnouncer.test.ts` with the three scenarios above,
  mocking/spying on `useAnnouncementQueue`'s `announce`.
- [ ] **Step 2:** Run it; confirm it fails on missing module.
- [ ] **Step 3:** Implement `useDataSourceStatusAnnouncer.ts`:

```ts
import { useEffect, useRef } from 'react'

import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import { getDataSourceStatusInfo } from '@/pages/dataSources/utils/dataSourceStatus'
import { DatasetResponse } from '@/types/entity/dataSource'

export function useDataSourceStatusAnnouncer(items: DatasetResponse['data']) {
  const { announcement, announce } = useAnnouncementQueue()
  const previousRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    const previous = previousRef.current
    const next = new Map<string, string>()

    items.forEach((item) => {
      const info = getDataSourceStatusInfo(item)
      const percentage =
        info.isInProgress && !info.isProviderInProgress
          ? ` ${Math.round((item.current_state / item.complete_state) * 100)}%`
          : ''
      const text = `${item.repo_name}: ${info.title}${percentage}`

      next.set(item.id, text)
      if (previous.get(item.id) !== text) announce(text)
    })

    previousRef.current = next
  }, [items, announce])

  return { announcement }
}
```

- [ ] **Step 4:** Run the test; confirm it passes.
- [ ] **Step 5:** Commit.

---

### Task 3: Wire the announcer into `DataSourcesPage`

**Files:**
- Modify: `src/pages/dataSources/DataSourcesPage.tsx:1-45` (imports, top of component), `:166-188`
  (JSX return)
- Test: `src/pages/dataSources/__tests__/DataSourcesPage.accessibility.test.tsx`

**Interfaces:**
- Consumes: `useDataSourceStatusAnnouncer(items)` from Task 2; `Announcement` from
  `@/components/Announcement`.

Test-first: yes — failing integration test (pattern: `renderPage`/`mockAPI` per
`DataSourceActions.accessibility.test.tsx`): mock `getIndexesStatuses`'s underlying endpoint to
return one row at `Fetching`, render `/data-sources`, assert the hidden `output[aria-live="polite"]`
region eventually contains text mentioning `Fetching`; then mock the same row now `Completed`,
trigger the next poll tick, and assert the region updates to mention `Completed` — and assert that
re-polling with an *unchanged* row does not change the region's content a second time (no
re-announcement on a no-op tick).

- [ ] **Step 1:** Write `DataSourcesPage.accessibility.test.tsx` with the three assertions above.
- [ ] **Step 2:** Run it; confirm it fails (no live region rendered yet).
- [ ] **Step 3:** In `DataSourcesPage.tsx`, import `useDataSourceStatusAnnouncer` and `Announcement`;
  call `const { announcement } = useDataSourceStatusAnnouncer(indexStatuses)` alongside the existing
  `useSnapshot` destructure (`:52-54`); render `<Announcement announcement={announcement} />` as a
  sibling of the top-level `<div className="flex h-full">` return (`:166-188`).
- [ ] **Step 4:** Run the test; confirm it passes.
- [ ] **Step 5:** Commit.
