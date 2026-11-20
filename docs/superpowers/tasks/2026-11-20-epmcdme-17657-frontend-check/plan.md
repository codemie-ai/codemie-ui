# AI Attribution Auditor Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the AI Attribution tab to Auditors, matching the backend change that grants Auditors access to all CLI analytics endpoints.

**Architecture:** The tab gate is one expression in `AnalyticsPage.tsx`. It feeds `AnalyticsDashboard` (tab list) and the fallback redirect effect, so no other file changes. The `features:cliAnalytics` flag requirement stays. `CliAnalyticsTab` sections and `cliAnalytics.ts` error handling are untouched.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

Commit per task using the repository's existing convention.

## Acceptance criteria

- An Auditor (not admin, not project admin) with `features:cliAnalytics` on sees the AI Attribution tab (`isCliAnalyticsEnabled` true).
- An Auditor with the flag off does not see it.
- A regular user still does not see it and is still redirected to a permitted tab.
- Admin and project admin behavior is unchanged.
- All eight `CliAnalyticsTab` sections stay visible.

## Task 1: Let Auditors through the AI Attribution gate

**Files:**
- Modify: `src/pages/analytics/AnalyticsPage.tsx:53`
- Test: `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` (next to the `isCliAnalyticsEnabled` tests, ~233-334)

Test-first: yes — an auditor with `isAdmin: false`, no project admin rights and the flag on must get `data-cli-analytics-enabled="true"`. It fails today because `isAuditor` is not in the gate.

- [ ] **Step 1: Add the failing tests.** Follow the existing tests at lines 265-334. They set `userStore.user` and mock `useFeatureFlag` with `features:cliAnalytics` on. Add:
  - `passes isCliAnalyticsEnabled=true for an auditor who is not admin or project admin`: `isAdmin: false, isAuditor: true`, flag on, expect `'true'`.
  - `passes isCliAnalyticsEnabled=false for an auditor when the flag is disabled`: same user, flag `[false, true]`, expect `'false'`.
  - The existing "not admin even with flag enabled" test already covers a regular user. Do not change it.
- [ ] **Step 2: Run** `npx vitest run src/pages/analytics/__tests__/AnalyticsPage.test.tsx`. Expected: the auditor-enabled test fails.
- [ ] **Step 3: Change the gate** at `AnalyticsPage.tsx:53` to `(isAdmin || isProjectAdmin || isAuditor) && isCliAnalyticsConfigEnabled`. `isAuditor` is already defined at line 48.
- [ ] **Step 4: Re-run the same file.** Expected: all tests pass.

## Self-review

- negative-constraints: "Regular users must still not see the tab and still be redirected" is honored by Task 1: the regular-user test stays unchanged and the redirect effect is not edited. "Do not hide any CliAnalyticsTab sections", "no store/error-handling changes" and "no backend work" are honored because Task 1 touches only the gate and its tests. The feature flag requirement is kept in the expression.
- Note for the caller: the technical analysis cites the test path as `src/pages/analytics/__tests__/AnalyticsPage.test.tsx`. The requirements text omits `__tests__/`. The `__tests__` path is the one confirmed by a grep.
