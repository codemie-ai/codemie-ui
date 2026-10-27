# EPMCDME-16235 Scheduler multi-select Project/Resource filters: Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]` syntax.

**Goal:** Keep `projectId` / `resourceId` as `string[]` at every hop (filter form, URL, store query, request) so multi-selection sticks.

**Architecture:** Three hops collapse arrays today: `SchedulerFilters.handleApply` (`[0]`), `SchedulersPage` URL (`get`/`set`), and scalar `SchedulersQuery`. Widen each to `string[]`. `api.ts` already emits arrays as repeated params (`queryParamArrayHandling: 'separate'`), so it stays unchanged.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL.

**Spec:** `docs/superpowers/tasks/2026-10-21-epmcdme-16235-scheduler-multi-project-filter/spec.md`

Commit per task using the repository's existing convention (`.ai-run/guides/standards/git-workflow.md`, ticket EPMCDME-16235).

**Type-check note:** the three tasks share one type contract. `SchedulersPage.tsx` has expected type errors after Tasks 1–2, and Task 3 fixes them. Run `tsc` after Task 3 only.

## Global Constraints

- Do not change `src/utils/api.ts`, `ProjectSelector`, `src/components/Filters/Filters.tsx`, `src/hooks/useSearchParams.ts`, `SchedulerRunFilters.tsx` or the `/scheduler-runs*` code.
- Use repeated params only (`?projectId=a&projectId=b`). No comma-separated format.
- OR semantics belong to the backend. The frontend sends only the user's selection: no widening and no "match all" toggle.
- Project values stay project **names**, exactly as `ProjectSelector` emits them.
- Leave the owner type, search and type-switch filters unchanged.

## Review Focus

1. Clearing every selection (`[]`) sends no param and `areFiltersEmpty` returns true (AC6). Owned by Tasks 1 and 2.
2. An old URL or a `sessionStorage` entry with one `?projectId=a` still filters by `['a']`. Owned by Task 3.
3. A blank `?projectId=` becomes `[]`, not `['']`. Without this the selector shows a phantom empty selection. Owned by Task 3.
4. Unchecking one of several values keeps the rest, because the `refreshOnValuesUpdate` round-trip is lossless. Owned by Task 2.
5. Resource filter parity with Project (AC4). Owned by Tasks 2 and 3.

---

### Task 1: Store: array `projectId` / `resourceId` in `SchedulersQuery`

**Files:** Modify `src/store/schedulers.ts:61-71` (`SchedulersQuery`) and `:115-145` (`fetchSchedulers`). Test: create `src/store/__tests__/schedulers.fetchSchedulers.test.ts`, mocking `@/utils/api` the same way `schedulers.filterOptions.test.ts` does.

**Produces:** `SchedulersQuery.projectId?: string[]` and `SchedulersQuery.resourceId?: string[]`.

**Test-first: yes.** Failing test: `fetchSchedulers({ projectId: ['A','B'], resourceId: ['r1','r2'] })` calls `api.get('/v1/schedulers', { params: objectContaining({ projectId: ['A','B'], resourceId: ['r1','r2'] }) })`. With `{ projectId: [], resourceId: [] }`, `params` has neither key (AC6).

- [ ] Write both tests and run `npx vitest run --project unit src/store/__tests__/schedulers.fetchSchedulers.test.ts`. Expect FAIL.
- [ ] Widen the two fields to `string[]` and widen the `params` record to `Record<string, string | number | string[]>`. Set each key only when `query.x?.length` is non-zero, and pass the array as-is.
- [ ] Re-run the tests. Expect PASS.

### Task 2: `SchedulerFilters`: pass the full arrays

**Files:** Modify `src/pages/schedulers/SchedulerFilters.tsx`: L28-35 (`SchedulerFilterValues`), L81-94 (definitions), L113-122 (`areFiltersEmpty`) and L124-138 (`handleApply`). Test: `src/pages/schedulers/__tests__/SchedulerFilters.test.tsx`.

**Produces:** `SchedulerFilterValues.projectId?: string[]` and `SchedulerFilterValues.resourceId?: string[]`.

**Test-first: yes.** Failing tests:
- Rewrite `applies the selected project as projectId`: check two projects, then expect `onApply` called with `objectContaining({ projectId: ['Platform Team', 'Growth Squad'] })`.
- Rewrite the "clears projectId" test: pass `values={{ projectId: ['Platform Team'] }}`, uncheck it, then expect `projectId: []` or `undefined`. The implementer picks one and keeps it consistent with Task 1's empty handling.
- New test: with `values={{ projectId: ['Platform Team', 'Growth Squad'] }}`, uncheck `Growth Squad`. Expect `projectId: ['Platform Team']`, and the `Platform Team` item still shows as checked.
- New tests: the same check-two and uncheck-one cases for Resource (multiselect index 1). Expect `resourceId: ['r1','r2']`, then `['r1']`.

Steps:
- [ ] Write or rewrite the tests and run `npx vitest run --project unit src/pages/schedulers/__tests__/SchedulerFilters.test.tsx`. Expect FAIL.
- [ ] Change the types to `string[]`.
- [ ] Set definition `value: values.projectId ?? []` (same for `resourceId`).
- [ ] In `handleApply`, pass `projectIdArr` / `resourceIdArr` whole, with no `[0]`.
- [ ] In `areFiltersEmpty`, use `!values.projectId?.length && !values.resourceId?.length`.
- [ ] Re-run the tests. Expect PASS.

### Task 3: `SchedulersPage`: multi-value URL sync

**Files:** Modify `src/pages/schedulers/SchedulersPage.tsx`: L94-106 (`filters` memo) and L131-144 (`handleApplyFilters`). Test: `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx`.

**Consumes:** the `string[]` fields from Tasks 1 and 2.

**Test-first: yes.** Failing test: `restores multi-value projectId/resourceId from the URL`.
1. Call `window.history.replaceState({}, '', '/schedulers?projectId=A&projectId=B&resourceId=r1')`. `useSearchParams` reads `window.location`, not the memory router.
2. Spy on `schedulersStore.fetchSchedulers` and call `renderPage('/schedulers?projectId=A&projectId=B&resourceId=r1')`.
3. Expect `fetchSchedulers` called with `objectContaining({ projectId: ['A','B'], resourceId: ['r1'] })` (AC7, and the single-value backward compatibility case).
4. Restore the URL in cleanup.

A second case: with `?projectId=` the spy receives `projectId: []` or no `projectId`.

Steps:
- [ ] Write the tests and run `npx vitest run --project integration src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx`. Expect FAIL.
- [ ] Read with `searchParams.getAll('projectId').filter(Boolean)`, and the same for `resourceId`. This follows `src/utils/filters.ts:148`.
- [ ] Write with `values.projectId?.forEach((v) => next.append('projectId', v))`, and the same for `resourceId`.
- [ ] Leave `clearParams` and the other filters untouched.
- [ ] Re-run the tests. Expect PASS. Then run `npx tsc --noEmit`. Expect a clean result.

---

**Negative-constraint pass**
- No change to `api.ts` / `ProjectSelector` / `Filters` / `useSearchParams`: no task touches them. Task 1 relies on the existing `'separate'` mode.
- No comma format: Task 1 passes arrays and Task 3 uses `append`.
- `SchedulerRunFilters` / Run History untouched: no task touches them.
- No AND semantics, no widening (AC5): Tasks 1–3 forward only the selection.
- Other filters unchanged: Task 3 edits only the `projectId` / `resourceId` lines.
- No backend change: none is planned.
