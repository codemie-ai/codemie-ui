# EPMCDME-16994 Activity widgets in browser local time — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three CLI Analytics > Activity widgets show sessions in the browser's local hour/weekday instead of UTC.

**Architecture:** A pure helper rotates the API's UTC 7x24 `heat` matrix by the browser's whole-hour UTC offset (wrapping across weekdays, Mon=0), then derives `by_hour` and `by_weekday` from the rotated matrix. `ActivityView` applies it in a `useMemo`; hook, store, type and API stay unchanged.

**Tech Stack:** React 18, TypeScript, Vitest + RTL (both test files run in the `unit` project). Follow `.ai-run/guides/testing/testing-patterns.md`.

Commit per task using the repository's existing convention.

## Acceptance criteria

- With a UTC+1 browser, a session the API buckets at `heat[5][18]` (Sat 18 UTC) shows in the heatmap at Sat 19, in "By hour of day" at 19, and in "By weekday" under Sat.
- A UTC bucket that crosses midnight after shifting moves to the next/previous weekday in the heatmap and in "By weekday"; Sun 23 UTC with +1 lands on Mon 0.
- With a UTC offset of 0 the widgets render exactly what the API returned.
- No UTC (or other time-zone) label is added to the widgets.
- No backend change, no change to `../codemie`, no new API parameter.

## Global Constraints

- UI-only: do not touch the store, hook, request params, types or the backend.
- Do not add a "UTC" label or time-zone text to widget titles/descriptions.
- Weekday index convention: 0=Mon … 6=Sun (backend `datetime.weekday()`, `src/types/cliAnalytics.ts:219`).

## Assumptions (recorded)

1. **Offset source:** `-new Date().getTimezoneOffset()` minutes, read at render time (the browser's current offset). Accepted limitation: wrong for windows that span a DST change.
2. **Non-whole-hour offsets:** `shiftHours = Math.floor(offsetMinutes / 60)` — each UTC hour bucket is placed in the local hour in which it *begins* (e.g. +5:30 → +5, -3:30 → -4). Inexact by design; accepted limitation.
3. **by_hour / by_weekday are recomputed from the shifted heatmap** (row sums / column sums), not shifted independently. Valid because the backend fills `heat`, `by_hour` and `by_weekday` from the same rows in the same loop (`cli_analytics_handler.py:1222-1236`, analysis §2), so the matrix holds exactly the same session set.

---

### Task 1: `shiftActivityToLocal` helper

**Files:**
- Create: `src/pages/analytics/components/cli-analytics/activityTimezone.ts`
- Test: `src/pages/analytics/components/cli-analytics/__tests__/activityTimezone.test.ts` (sibling pattern: `__tests__/format.test.ts`)

**Interfaces:**
- Produces: `browserUtcOffsetMinutes(): number`, `shiftActivityToLocal(data: CliAnalyticsActivityData, offsetMinutes: number): CliAnalyticsActivityData` (type from `@/types/cliAnalytics`). Returns a new object; never mutates input.

Test-first: yes — `shiftActivityToLocal` cases fail because the module does not exist.

- [ ] **Step 1: Write failing tests.** Build fixtures with a small `emptyHeat()` helper and one non-zero cell. Cases:
  - offset `+60`: `heat[5][18]=1` → result `heat[5][19]=1`, `by_hour[19]=1`, `by_weekday[5]=1`, all else 0.
  - offset `-120`: `heat[2][10]=3` → `heat[2][8]=3`.
  - offset `0`: output deep-equals input `heat`, and `by_hour`/`by_weekday` equal the matrix sums.
  - day wrap forward: offset `+180`, `heat[1][22]=1` → `heat[2][1]=1`, `by_weekday[2]=1`.
  - day wrap backward: offset `-60`, `heat[3][0]=1` → `heat[2][23]=1`.
  - Sun→Mon wrap: offset `+60`, `heat[6][23]=1` → `heat[0][0]=1`; and Mon→Sun: offset `-60`, `heat[0][0]=1` → `heat[6][23]=1`.
  - non-whole offsets: `+330` behaves as `+5`, `-210` behaves as `-4`.
  - input object is not mutated.
  - `browserUtcOffsetMinutes()` returns `60` when `vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-60)` (restore in `afterEach`).
- [ ] **Step 2: Run** `npx vitest run --project unit src/pages/analytics/components/cli-analytics/__tests__/activityTimezone.test.ts` — expect FAIL (module not found).
- [ ] **Step 3: Implement:**

```ts
import type { CliAnalyticsActivityData } from '@/types/cliAnalytics'

const DAYS = 7
const HOURS = 24
const WEEK_HOURS = DAYS * HOURS

export const browserUtcOffsetMinutes = (): number => -new Date().getTimezoneOffset()

// UTC bucket h lands in the local hour it begins in; non-whole-hour offsets round down.
export const shiftActivityToLocal = (
  data: CliAnalyticsActivityData,
  offsetMinutes: number
): CliAnalyticsActivityData => {
  const shift = Math.floor(offsetMinutes / 60)
  const heat = Array.from({ length: DAYS }, () => Array<number>(HOURS).fill(0))
  for (let wd = 0; wd < DAYS; wd++) {
    for (let h = 0; h < HOURS; h++) {
      const idx = (((wd * HOURS + h + shift) % WEEK_HOURS) + WEEK_HOURS) % WEEK_HOURS
      heat[Math.floor(idx / HOURS)][idx % HOURS] += data.heat[wd]?.[h] ?? 0
    }
  }
  const by_weekday = heat.map((row) => row.reduce((a, b) => a + b, 0))
  const by_hour = Array.from({ length: HOURS }, (_, h) => heat.reduce((a, row) => a + row[h], 0))
  return { ...data, heat, by_hour, by_weekday }
}
```

- [ ] **Step 4: Run** the same command — expect PASS.

### Task 2: Use local buckets in `ActivityView`

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/views/ActivityView.tsx:34-68`
- Test: `src/pages/analytics/components/cli-analytics/__tests__/ActivityView.test.tsx`

**Interfaces:**
- Consumes: `shiftActivityToLocal`, `browserUtcOffsetMinutes` from `../activityTimezone`.

Test-first: yes — a heatmap cell from UTC `heat[5][18]` with a UTC+1 browser renders with title `Sat 19:00 — 1 session`; currently it renders as `Sat 18:00`.

- [ ] **Step 1: Write failing test** in `ActivityView.test.tsx`: `vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-60)` (restore in `afterEach`), `mockReturnValueOnce` the hook with `heat[5][18]=1`, `by_hour[18]=1`, `by_weekday[5]=1`; assert `screen.getByTitle('Sat 19:00 — 1 session')` exists and `queryByTitle('Sat 18:00 — 1 session')` is null. Existing zero-data tests stay as they are.
- [ ] **Step 2: Run** `npx vitest run --project unit src/pages/analytics/components/cli-analytics/__tests__/ActivityView.test.tsx` — expect the new test to FAIL.
- [ ] **Step 3: Implement.** After line 34 add `const localData = useMemo(() => (data ? shiftActivityToLocal(data, browserUtcOffsetMinutes()) : data), [data])`, and replace every subsequent `data?.` read (lines 36, 47, 62, 99) and the `[data]` memo deps with `localData`. Titles and descriptions stay unchanged.
- [ ] **Step 4: Run** the same command — expect PASS for all ActivityView tests.

---

## Negative-constraint pass

- "No backend changes, nothing in ../codemie" — both tasks touch only `codemie-ui/src`; honored by Tasks 1-2.
- "Do not add any UTC label" — Task 2 Step 3 keeps titles/descriptions unchanged; no task adds tz text.
- Hook/store/type left untouched (Global Constraints) — no task modifies them.
