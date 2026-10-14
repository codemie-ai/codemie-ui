# EPMCDME-15642 Top Repositories stale rows Implementation Plan

**Goal:** Overview "Top Repositories" never renders rows left in the shared `repositories` store slot by the Repositories view.

**Approach:** Clear the slot when `useCliAnalyticsRepositories` mounts or its request variant (`includeBranches`/`fetchAll`) changes, not on every fetch (avoids flicker on filter/search/page changes). Root cause is inferred from code, not reproduced in the UI. Grep confirmed the only writer is `src/store/cliAnalytics.ts:251` and the only reader is the hook (`snap.repositories`, hook l.111/115), so no other consumer is affected.

Commit per task using the repository's existing convention.

## Negative constraints
- "Not on every fetch / no flicker on filter, search or page change": Task 2 keys the clearing effect on variant only, never on filters, page or search.
- "Never carry stale rows from the other view": covered by Tasks 1 and 2.

### Task 1 — Store: add clearRepositories action

- Modify `src/store/cliAnalytics.ts` near `fetchRepositories` (l.243-252): add a `clearRepositories()` method that sets `this.repositories = null`. Follow the style of the neighbouring methods. It must not touch `loading`, `error` or the abort controllers.
- Test-first: yes — a store test (new `src/store/__tests__/cliAnalytics.test.ts`, or the existing store test file if one is found) that sets `cliAnalyticsStore.repositories` to a populated value, calls `clearRepositories()`, and expects `repositories` to be `null`. It fails until the method exists.

### Task 2 — Hook: clear the slot on mount or variant change

- Modify `src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsRepositories.ts`: insert a `useEffect` that calls `cliAnalyticsStore.clearRepositories()`. Its deps are `[includeBranches, fetchAll]` only. Place it immediately before the fetch effect (l.74) so React's in-order effect execution clears first and fetches second.
- Test-first: yes — in `hooks/__tests__/useCliAnalyticsRepositories.test.ts`, three cases:
  - Seed `cliAnalyticsStore.repositories` with stale rows, spy `fetchRepositories` as a no-op, render the hook with `(false, 10)`, and expect `rows` to be `[]`. This is the Repositories -> Overview remount regression.
  - Change `page` or `search` and expect `clearRepositories` not to be called again.
  - Rerender with a different `includeBranches` and expect one more call.

### Task 3 — View-level regression for the remount

- Modify `src/pages/analytics/components/cli-analytics/__tests__/OverviewView.test.tsx` (follow its existing mock setup). Seed the store `repositories` slot with extra stale rows, with `fetchRepositories` stubbed to not resolve, then render `OverviewView` and expect none of the stale repository names to be in the document.
- Test-first: yes — the test fails before Task 2 because the stale rows render, and passes after it.
