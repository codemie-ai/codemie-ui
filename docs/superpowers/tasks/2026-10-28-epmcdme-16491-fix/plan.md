# EPMCDME-16491 Users Management per-page selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the page-size selector visible on Users Management when all filtered users fit on one page.

**Architecture:** Table gets an opt-in `alwaysShowPerPage` prop forwarded into `paginationProps`; Pagination already supports it (EPMCDME-16410). UsersManagementPage opts in. Default stays off for all other Table consumers.

**Tech Stack:** React 18, TypeScript, Vitest + RTL.

**Spec:** none; requirements inline, research in `technical-analysis.md` (same dir).

Commit per task using the repository's existing convention (ticket key EPMCDME-16491 required).

## Acceptance criteria

- [ ] When all filtered users fit on one page, the items-per-page selector remains visible and usable.
- [ ] Selecting a smaller page size restores multiple pages and page navigation when needed.
- [ ] Changing the project filter updates the list and pagination controls without making the page-size selector inaccessible.
- [ ] Single-page views do not show unnecessary page-number navigation.

## Global Constraints

- Default behavior of Table unchanged; opt-in only.
- Empty result (0 users): selector stays visible (consistent with 16410).

## Review Focus

- Empty result: selector still shown, no page-number nav.
- Memo: toggling `alwaysShowPerPage` must re-render Table (`propsAreEqual` whitelist).
- Project filter change keeps `perPage`, selector stays.

---

### Task 1: Table `alwaysShowPerPage` passthrough

**Files:**
- Modify: `src/components/Table/Table.tsx:~63, ~94, 153-159` (prop type, destructure, add to `paginationProps`)
- Modify: `src/components/Table/utils.ts:49-63` (add `'alwaysShowPerPage'` to `referenceKeys`; the exhaustiveness guard at line ~111 fails compilation otherwise)
- Test: `src/components/Table/__tests__/Table.test.tsx`

**Interfaces:**
- Produces: `TableProps.alwaysShowPerPage?: boolean` (type `PaginationProps['alwaysShowPerPage']`), forwarded to `Pagination`.

- [ ] **Step 1: Failing test** in Table.test.tsx: render Table with `pagination={{page:0, perPage:10, totalPages:1, totalCount:3}}` and `alwaysShowPerPage`; assert the per-page selector is present; a second case without the prop asserts it is absent. Follow the file's existing render helpers.
  Test-first: yes — Table with single-page pagination and `alwaysShowPerPage` shows the per-page selector (fails today: prop not forwarded).
- [ ] **Step 2:** Run `npx vitest run --project unit src/components/Table/__tests__/Table.test.tsx`; expect FAIL.
- [ ] **Step 3:** Implement the prop, forwarding and `referenceKeys` entry as listed above.
- [ ] **Step 4:** Re-run; expect PASS. Run `npx tsc --noEmit` for the exhaustiveness guard.

### Task 2: Opt in on UsersManagementPage

**Files:**
- Modify: `src/pages/settings/administration/UsersManagementPage.tsx:~423-434` (add `alwaysShowPerPage` to the `<Table>` element)

**Interfaces:**
- Consumes: `TableProps.alwaysShowPerPage` from Task 1.

- [ ] **Step 1:** Add the prop to the Table usage. No other change; filter reload at ~241 already keeps `pagination.perPage`.
  Test-first: no — one-line opt-in covered by Task 1's passthrough test; existing Users page tests cover no pagination and mocking the store for one prop adds no signal.

## Self-review notes

- negative-constraints: "Keep default off for other Table consumers" honored by Task 1 (optional prop, undefined default) and Task 2 (only caller opting in). "single-page views show no page-number nav" honored: Pagination's `<nav>` is still gated by `pageNumbers.length > 1`; no task alters it.
- Pagination single-page unit test already belongs to 16410 scope; not duplicated here.
