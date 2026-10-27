# Project Members Pagination Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the per-page "Show: N items" selector visible on the project Members tab when all members fit on one page.

**Architecture:** Add an opt-in prop `alwaysShowPerPage` to the shared Pagination. Only ProjectMembersManager sets it. Other consumers keep today's behavior, because most of them also pass `perPage` and a `perPage`-keyed fix would regress them.

**Tech Stack:** React 18, TypeScript.

**Spec:** none (spec-less flow; requirements in `requirements.local.md`, research in `technical-analysis.md`).

Commit per task using the repository's existing convention.

## Acceptance criteria

- On the Members tab, choosing a page size >= total members leaves the "Show: N items" selector visible and usable.
- Choosing a smaller page size afterwards paginates again and the page numbers reappear.
- With the selector visible and everything on one page, no page-number navigation is shown.
- Pagination consumers that do not opt in still render nothing when there is one page or fewer, exactly as today.

## Task 1: Opt-in prop in Pagination

**Files:**
- Modify: `src/components/Pagination/Pagination.tsx:28-46` (props and destructuring) and `:103-105` (early return)

- Test-first: no — the ticket puts new tests out of scope.
- [ ] Add `alwaysShowPerPage?: boolean` to `PaginationProps`, defaulting to `false`. Change the guard to return null only when `totalPages <= 1` and not (`alwaysShowPerPage` and `perPage` truthy). Keep the guard below all hooks. The page `<nav>` stays gated by `pageNumbers.length > 1` (line 120), so it stays hidden for a single page. Existing tests must still pass.

## Task 2: Enable it on the Members tab

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:961-968`

- Test-first: no — the ticket puts new tests out of scope.
- [ ] Add the `alwaysShowPerPage` prop to the existing `<Pagination>` element. Leave the `users.length > 0` gate and all other props unchanged.

## Negative-constraint pass

- No new tests: Tasks 1 and 2 are both `Test-first: no` and add none.
- No change to default page sizes or options: neither task touches them.
- Other consumers not modified or audited: only the opt-in default `false` keeps them unchanged. No task edits another consumer.
- Single-page bar hidden as today without a selector: the guard is unchanged unless `alwaysShowPerPage` is true.
