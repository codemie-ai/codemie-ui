# Drill-down modal scroll (EPMCDME-17398 follow-up) Implementation Plan

**Goal:** Verify and lock in the already-applied (uncommitted) layout change so the CLI Analytics drill-down modal body scrolls on short screens, like `CLIInsightsUserDetailsModal`.

Commit per task using the repository's existing convention (ticket key EPMCDME-17398). The working-tree edits in `RepositoriesDrilldownModal.tsx` and `SessionsView.tsx` are done; do not re-implement them. Tests only assert classes and structure (jsdom has no layout); real layout is checked in the browser by the calling flow.

## Acceptance criteria

- The modal body (Popup `bodyClassName`) has `overflow-y-auto overflow-x-hidden`, so the Summary and list scroll together when the viewport is short.
- The content wrapper uses `min-h-full` (not `h-full min-h-0`); the active section no longer carries `min-h-0`.
- The Repositories/Branches list widget keeps a `min-h-[320px]` floor; the sessions widget (`fillAvailableHeight`) keeps a `min-h-[360px]` floor.
- Drilling Projects -> Repositories -> Branches -> Sessions and back still restores each list's scroll position.
- Non-fill `SessionsView` usages are unchanged.
- The modified files pass the repository's lint and format gates.

## Task 1 — Modal scroll-class and scroll-restore tests

Files: `src/pages/analytics/components/cli-analytics/__tests__/RepositoriesDrilldownModal.test.tsx` (Popup mock at line 31, AnalyticsWidget mock at line 74, tests from line 144).

- Test-first: yes — a test fails if `bodyClassName` loses `overflow-y-auto`/`overflow-x-hidden` or the wrapper loses `min-h-full`.
- [ ] Extend the Popup mock to expose `bodyClassName` (for example as a `data-body-class` attribute on its wrapper), and the AnalyticsWidget mock to expose `className`, only if they do not already.
- [ ] Add a test asserting the body class contains `overflow-y-auto` and `overflow-x-hidden`, and not `overflow-hidden` as a standalone token.
- [ ] Add a test asserting the content wrapper has `min-h-full` and not `h-full`, and that the list widget class contains `min-h-[320px]`.
- [ ] Add a scroll-restore test (research risk 1). Drill Repositories -> Branches, set `scrollTop` on the Repositories list element, fire `scroll`, drill on and then go back (use the existing breadcrumb or back control from the drill test at line 208). Assert the restored `scrollTop` equals the saved value. Because the list ref is the scroller in the restore code (`RepositoriesDrilldownModal.tsx:283-287,352-356`), this documents the contract. If the test shows restore is a no-op once the body is the scroller, report that as a finding. Do not silently change the restore logic.
- [ ] Run this test file and confirm the new tests pass.

## Task 2 — SessionsView fill-height test

Files: `src/pages/analytics/components/cli-analytics/__tests__/SessionsView.test.tsx` (AnalyticsWidget mock at line 48, existing cases from line 86).

- Test-first: yes — a test fails if the `fillAvailableHeight` widget loses `min-h-[360px]`, or if the non-fill widget gains it.
- [ ] Make the AnalyticsWidget mock expose `className` if it does not already.
- [ ] Add two tests. With `fillAvailableHeight`, the widget class contains `min-h-[360px]`. Without it, it does not.
- [ ] Nested-scroll risk (research risk 2): assert that the table wrapper keeps `overflow-x-auto` and `min-w-0`, and has no fixed `h-`/`max-h-` class, so the wrapper never imposes its own height. The actual double-scroll behavior is a browser check.

## Task 3 — Format and lint check of the changed files

- Test-first: no — static gate on already-applied code.
- [ ] Run Prettier and ESLint on `RepositoriesDrilldownModal.tsx`, `SessionsView.tsx` and the two test files (commands in `.ai-run/guides/quality-gates.md`; one gate at a time). Fix only formatting or lint findings, such as the one-line section ternary (research risk 3). Report each result.

## Negative-constraint pass

negative-constraints: the request says not to re-implement the existing edits. Tasks 1-3 only add tests and formatting fixes, so none re-implements them. Whole-suite gates, code review and browser verification are not planned here because the calling flow runs them.
