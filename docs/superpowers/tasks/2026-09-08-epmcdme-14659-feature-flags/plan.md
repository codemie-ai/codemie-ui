# EPMCDME-14659 — Gate Data Sources Behind Retrieval Feature Flags — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** When none of `features:knowledgeBases`, `features:datasources`, `features:codeIndexing`
is enabled, the "Data Sources" nav entry and all four `dataSourceRoutes` are absent from the app;
when at least one is enabled, behavior is unchanged from today.

**Architecture:** Add three ids to the existing `FEATURE_FLAGS` constant map. Compute "any of the
three enabled" inline at the two existing gating call sites — `src/router.tsx` (non-reactive
`isFeatureEnabled`, array-omission of the whole `dataSourceRoutes` family, mirroring the
`analyticsRoutes`/`aiAdoptionConfigRoutes` unconditional-spread site) and
`src/components/Navigation/Navigation.tsx` (reactive `useFeatureFlag`, conditional item push,
mirroring the existing `isSkillsEnabled` push). No new detection logic, no new shared "any flags"
utility, no change inside `DataSourcesPage.tsx` or its children.

**Tech Stack:** React 18, TypeScript, react-router 7 (`createBrowserRouter`), Valtio, Vitest +
React Testing Library.

## Global Constraints

- Gating reads exclusively from the existing `appInfoStore`-backed mechanism
  (`useFeatureFlag`/`isFeatureEnabled` keyed by `FEATURE_FLAGS`) — no new frontend detection logic.
- The whole Data Sources surface (nav entry + all 4 routes) is gated as one unit — no internal
  `index_type` filtering inside `DataSourcesPage.tsx`.
- AWS Bedrock "Knowledge Bases" page/routes/nav (`src/pages/settings/aws/dataSources/*`) and
  generic credential-type picker filtering (`src/utils/settings.ts`) are untouched.
- When at least one of the three flags is enabled, behavior must be pixel-for-pixel identical to
  today — no new conditionals fire.
- Commit per task using the repository's existing convention (see recent `git log` messages);
  no separate commit-formatting instructions are given per task below.

---

### Task 1: Add the three FEATURE_FLAGS entries

**Files:**
- Modify: `src/constants/featureFlags.ts:19-37`

**Interfaces:**
- Produces: `FEATURE_FLAGS.KNOWLEDGE_BASES = 'features:knowledgeBases'`,
  `FEATURE_FLAGS.DATASOURCES = 'features:datasources'`,
  `FEATURE_FLAGS.CODE_INDEXING = 'features:codeIndexing'` — consumed by Tasks 2 and 3.

Test-first: no — pure constant addition, no branching logic to exercise; covered indirectly by
Tasks 2 and 3's tests, which fail to compile without these ids.

- [ ] **Step 1:** Add three entries inside the `FEATURE_FLAGS` object (before the closing
  `} as const`):

```ts
KNOWLEDGE_BASES: 'features:knowledgeBases',
DATASOURCES: 'features:datasources',
CODE_INDEXING: 'features:codeIndexing',
```

- [ ] **Step 2:** Commit.

---

### Task 2: Gate `dataSourceRoutes` in the router

**Files:**
- Modify: `src/router.tsx:21` (import), `src/router.tsx:688` (route composition)
- Test: Create `src/__tests__/router.test.tsx`

**Interfaces:**
- Consumes: `FEATURE_FLAGS.KNOWLEDGE_BASES/DATASOURCES/CODE_INDEXING` (Task 1),
  `isFeatureEnabled(featureName: string): boolean` from `@/utils/featureFlags`.
- Produces: none consumed by later tasks (Task 3 is independent).

Test-first: yes — failing test asserting `routes` (exported from `@/router`) omits all four
`dataSourceRoutes` ids from the root route's `children` when all three flags are disabled, and
includes them when at least one is enabled.

- [ ] **Step 1: Write the failing test** in `src/__tests__/router.test.tsx`, mocking
  `@/store/appInfo` the same way `src/components/__tests__/FeatureGuard.test.tsx` does
  (`vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))` with a
  `vi.hoisted` `{ configs: any[], isConfigFetched: boolean }`), then importing `routes` from
  `@/router` and flattening `routes.find(r => r.id === 'root')!.children!.map(r => r.id)`:

```ts
it('omits dataSourceRoutes when no retrieval flag is enabled', async () => {
  mockAppInfoStore.configs = []
  mockAppInfoStore.isConfigFetched = true
  const { routes } = await import('@/router')
  const ids = routes.find((r) => r.id === 'root')!.children!.map((r) => r.id)
  expect(ids).not.toEqual(expect.arrayContaining(['data-sources', 'data-source-details']))
})

it('includes dataSourceRoutes when one retrieval flag is enabled', async () => {
  mockAppInfoStore.configs = [{ id: 'features:datasources', settings: { enabled: true } }]
  mockAppInfoStore.isConfigFetched = true
  const { routes } = await import('@/router')
  const ids = routes.find((r) => r.id === 'root')!.children!.map((r) => r.id)
  expect(ids).toEqual(expect.arrayContaining(['data-sources', 'create-data-source']))
})
```

  Use `vi.resetModules()` in a `beforeEach` and dynamic `import('@/router')` per test, since the
  gating predicate is evaluated once at module scope (`createBrowserRouter` call), same reason
  `App.test.tsx` calls `vi.resetModules()`.

- [ ] **Step 2: Run it** — `npx vitest run src/__tests__/router.test.tsx` — expect FAIL (route ids
  present regardless of flag state; module doesn't yet import `isFeatureEnabled`).

- [ ] **Step 3: Implement.** In `src/router.tsx`, add
  `import { isFeatureEnabled } from '@/utils/featureFlags'` near the existing `FEATURE_FLAGS`
  import (line 21). Immediately above the `routes` export (~line 676), add:

```ts
const isDataSourcesSurfaceEnabled =
  isFeatureEnabled(FEATURE_FLAGS.KNOWLEDGE_BASES) ||
  isFeatureEnabled(FEATURE_FLAGS.DATASOURCES) ||
  isFeatureEnabled(FEATURE_FLAGS.CODE_INDEXING)
```

  Replace `...dataSourceRoutes,` at `src/router.tsx:688` with
  `...(isDataSourcesSurfaceEnabled ? dataSourceRoutes : []),`.

- [ ] **Step 4: Run it again** — same command — expect PASS.

- [ ] **Step 5:** Commit.

---

### Task 3: Gate the "Data Sources" nav entry

**Files:**
- Modify: `src/components/Navigation/Navigation.tsx:118-122`
- Test: Modify `src/components/Navigation/__tests__/Navigation.test.tsx`

**Interfaces:**
- Consumes: `FEATURE_FLAGS.KNOWLEDGE_BASES/DATASOURCES/CODE_INDEXING` (Task 1),
  `useFeatureFlag(featureName: string): [boolean, boolean]` from `@/hooks/useFeatureFlags`
  (already imported in this file).

Test-first: yes — failing test asserting the "Data Sources" link is absent from the rendered nav
when all three flags are disabled in `mockAppInfoStore.configs`, and present when one is enabled.

- [ ] **Step 1: Write the failing test**, appended to the existing `describe('Navigation', ...)`
  block, reusing the file's existing `mockAppInfoStore`/`renderWithRouter` scaffolding:

```ts
it('hides Data Sources nav link when no retrieval flag is enabled', () => {
  mockAppInfoStore.configs = []
  renderWithRouter(<Navigation />)
  expect(screen.queryByRole('link', { name: 'Data Sources' })).not.toBeInTheDocument()
})

it('shows Data Sources nav link when one retrieval flag is enabled', () => {
  mockAppInfoStore.configs = [{ id: 'features:codeIndexing', settings: { enabled: true } }]
  renderWithRouter(<Navigation />)
  expect(screen.getByRole('link', { name: 'Data Sources' })).toBeInTheDocument()
})
```

  Add `mockAppInfoStore.configs = []` to the existing `beforeEach` reset if not already reset
  between tests (check current `beforeEach` at line 112 first — it resets `navigationExpanded`
  and `applications` but not `configs`).

- [ ] **Step 2: Run it** — `npx vitest run src/components/Navigation/__tests__/Navigation.test.tsx`
  — expect FAIL (link renders unconditionally in both cases).

- [ ] **Step 3: Implement.** In `Navigation.tsx`, near the existing `isSkillsEnabled`/
  `isFavoritesEnabled` hook reads (~line 66-69), add:

```ts
const [isKnowledgeBasesEnabled] = useFeatureFlag(FEATURE_FLAGS.KNOWLEDGE_BASES)
const [isDatasourcesEnabled] = useFeatureFlag(FEATURE_FLAGS.DATASOURCES)
const [isCodeIndexingEnabled] = useFeatureFlag(FEATURE_FLAGS.CODE_INDEXING)
const isDataSourcesSurfaceEnabled =
  isKnowledgeBasesEnabled || isDatasourcesEnabled || isCodeIndexingEnabled
```

  (Add `import { FEATURE_FLAGS } from '@/constants/featureFlags'` if not already imported in this
  file — verify first.) In the `upperSecondaryItems` `useMemo` (lines 111-141), remove the
  unconditional "Data Sources" object literal from the initial `items` array (lines 118-122) and
  instead push it conditionally, following the `isSkillsEnabled` pattern at lines 85-92:

```ts
if (isDataSourcesSurfaceEnabled) {
  items.push({
    label: 'Data Sources',
    icon: IconType.DATASOURCE,
    route: router.resolve({ name: 'data-sources' }).fullPath,
  })
}
```

  Add `isDataSourcesSurfaceEnabled` to the `useMemo`'s dependency array (currently `[router]` at
  line 141).

- [ ] **Step 4: Run it again** — same command — expect PASS, and confirm the file's pre-existing
  tests still pass (they render with `configs: []` by default from the mock's initial state, which
  now also correctly hides the link — no unrelated assertion in the file checks for "Data Sources"
  by name, per the `describe` block read during planning).

- [ ] **Step 5:** Commit.

---

## Self-Review

**Spec coverage:** Nav-entry gating → Task 3. Route (incl. deep-link) gating for all 4 routes →
Task 2 (array-omission removes them from the router entirely, so deep links 404 via the router's
existing not-found handling — no per-route change needed). Flags added → Task 1. "Behave exactly
as today when enabled" → both Task 2 and 3 gate the *existing* unconditional code paths without
altering them when the predicate is true.

**Negative constraints:**
- No `index_type` filtering inside `DataSourcesPage.tsx` — no task touches that file.
- AWS Bedrock Knowledge Bases page/routes/nav — no task touches `src/pages/settings/aws/dataSources/*`.
- `src/utils/settings.ts` / credential pickers — no task touches this file.
- No new detection logic — Tasks 2 and 3 read only `isFeatureEnabled`/`useFeatureFlag` keyed by
  the three new `FEATURE_FLAGS` ids; no heuristic derivation added.
- Enabled-state behavior unchanged — both tasks gate around the pre-existing unconditional code,
  they don't rewrite it.

negative-constraints: all addressed above (none omitted).
