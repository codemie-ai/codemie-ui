# Turn Katas Off by Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Hide every kata surface unless config item `features:katas` is enabled; a missing item reads off.
**Architecture:** Schedulers precedent: `FEATURE_FLAGS.KATAS` + `useKatasEnabled` hook + nav condition + `FeatureGuard` route wrapper. Floating window gated at restore and render in `App.tsx`. Analytics leaderboard filtered in leaf components through one pure module.
**Tech Stack:** React 18, TypeScript, Valtio, react-router 7, Vitest + RTL.
**Spec:** `docs/superpowers/tasks/2026-11-04-turn-katas-off-by-default/spec.md`

Commit per task using the repository's existing convention (ticket key EPMCDME-16851; see `.ai-run/guides/standards/git-workflow.md`).

## Global Constraints

- Config id exactly `features:katas`; leaderboard keys exactly `kata_completed` (summary metric) and `learning` (component key), exact match, no substring.
- Display only: server totals and scores are never recomputed.
- No backend, admin-settings, `pageTitles`, `helpLinks`, release-notes, tour-step or `MobileTopBar` changes.
- Top-performer bars and radar are untouched (known limitation; mention in MR).

## Review Focus

- Config arrives after user, katas on: window must still restore (Task 4 test).
- Config refetch with katas on must not reset floating state or chat view settings (Task 4 test).
- `learning` is the only component of a card: no empty chip row, no dead "How is this calculated?" button (Task 6 test).
- Dimension detail percentages with `learning` plus two other parts: other parts keep their unfiltered share (Task 6 test).
- No `features:katas` config entry: nothing throws (Tasks 1, 4).

---

### Task 1: Flag constant and hook

**Files:** Modify `src/constants/featureFlags.ts:19`, `src/hooks/useFeatureFlags.ts` (next to `useSchedulersViewEnabled` :132); Test `src/constants/__tests__/featureFlags.test.ts`, existing hooks test file for `useFeatureFlags` (or create `src/hooks/__tests__/useKatasEnabled.test.ts`).

**Interfaces:** Produces `FEATURE_FLAGS.KATAS = 'features:katas'`; `useKatasEnabled(): boolean` and the fetched state needed by Task 4 (return `[enabled, isConfigFetched]` tuple, same shape as `useFeatureFlag`).

Test-first: yes — hook returns `[false, true]` when `configs` has no `features:katas` item and does not throw; returns true for enabled item; false when `availableForExternal === false` for an external user; `FEATURE_FLAGS.KATAS` equals `'features:katas'`.

- [ ] Write the failing tests above (model on the Schedulers hook tests / `featureFlags.test.ts` value assertions).
- [ ] Add the constant; implement `useKatasEnabled` reading through `isConfigItemEnabled` (`src/utils/settings.ts:187`) from `appInfoStore.configs`, as `FeatureGuard` does (`FeatureGuard.tsx:46`).
- [ ] Run `npx vitest run --project unit src/constants src/hooks` — expect pass.

### Task 2: Navigation item

**Files:** Modify `src/components/Navigation/Navigation.tsx:146-150` (add 'AI Katas' only when enabled; add flag to the `useMemo` deps); Test `src/components/Navigation/__tests__/Navigation.test.tsx:131,257-259`.

**Interfaces:** Consumes `useKatasEnabled` (Task 1).

Test-first: yes — with the hook mocked off, 'AI Katas' is absent; with it mocked on, present (update existing :131,:257-259 expectations to mock on).

- [ ] Update existing tests to mock the flag on; add the off test; confirm it fails.
- [ ] Add the condition (same style as `isSchedulersViewEnabled` :152). Mobile menu shares the component; `MobileTopBar` unchanged.
- [ ] Run the Navigation test file — expect pass.

### Task 3: Route guard

**Files:** Modify `src/router.tsx:395-431` — wrap the 7 `katasRoutes` in a pathless route with `<FeatureGuard featureFlags={FEATURE_FLAGS.KATAS}><Outlet/></FeatureGuard>`, mirroring `schedulerRoutes` (:348-392); keep the spread at :887; Test: new unit test next to `src/components/__tests__/FeatureGuard.test.tsx` (integration tests bypass the guard, `setupTests.integration.ts:24`).

Test-first: yes — with katas config absent/disabled, rendering `/katas` and `/katas/leaderboard` through the route table yields the guard's 404 error; with enabled, the kata page element renders.

- [ ] Write failing test, wrap the routes, run it — expect pass. Confirm `router.resolve({name:'katas'})` (Navigation.tsx:149) still resolves (route names unchanged).

### Task 4: Floating kata window

**Files:** Modify `src/App.tsx:62-68` and `:99`; Test `src/__tests__/App.test.tsx` (mocks `floatingKataStore` with only `loadFromLocalStorage`, `FloatingKataWindow` mocked at :89).

**Interfaces:** Consumes `useKatasEnabled` -> `[katasEnabled, isConfigFetched]` (Task 1; `isConfigFetched` also available from `appInfoStore`).

Test-first: yes — (a) flag off: `floatingKataStore.loadFromLocalStorage` not called and `FloatingKataWindow` not rendered; (b) flag on: called once and rendered; (c) user set first, config arrives later with katas on: called after config arrives; with katas off: never called; (d) config refetch with katas on (rerender, same values): `loadFromLocalStorage` and `chatViewSettingsStore.loadFromLocalStorage` call counts unchanged; (e) no katas entry: nothing throws.

- [ ] Write failing tests.
- [ ] Split the effect: keep `setChatViewSettingsUserId` + `chatViewSettingsStore.loadFromLocalStorage()` in their own `[user]` effect (ungated); add a separate effect calling `floatingKataStore.loadFromLocalStorage()` only when `user && isConfigFetched && katasEnabled`, deps `[user, isConfigFetched, katasEnabled]`, guarded so a refetch (deps unchanged) does not re-run. Render `FloatingKataWindow` only when `katasEnabled`. Do not clear stored state.
- [ ] Grep callers of `refetchCustomerConfig` to confirm a refetch does not flip `isConfigFetched` to false (if it does, record in the digest and handle in the effect).
- [ ] Run `src/__tests__/App.test.tsx` — expect pass.

### Task 5: Leaderboard filter module

**Files:** Create `src/pages/analytics/components/leaderboard/katasFilter.ts`; Test `src/pages/analytics/components/leaderboard/__tests__/katasFilter.test.ts`.

**Interfaces:** Produces (all pure, take `katasEnabled: boolean` first; return input unchanged when true):
- `KATA_METRIC_KEY = 'kata_completed'`, `KATA_COMPONENT_KEY = 'learning'`
- `filterSummaryMetrics<T>(enabled, metrics: Record<string, T>): Record<string, T>`
- `filterComponentsArray<T extends {key: string}>(enabled, components: T[]): T[]`
- `filterComponentsObject<T>(enabled, components: Record<string, T>): Record<string, T>`

Test-first: yes — fixtures are literal payload shapes copied from the existing analytics test fixtures/mocks (not built from the constants), including a `learning` component and a `kata_completed` key; off removes exactly those, on returns input unchanged, input never mutated, other keys preserved, and a literal `'learning'` / `'kata_completed'` assertion pins the keys. Note in the test that the key comes from backend `_score_d6` and no real response fixture exists in the repo.

- [ ] Write failing test, implement, run — expect pass.

### Task 6: Wire filter into four leaf components

**Files:** Modify in `src/pages/analytics/components/leaderboard/`: `LeaderboardSummaryMetrics.tsx:75` (summary map), `LeaderboardDimensionCard.tsx:75-77` (array; second read at :126), `FrameworkDimensionCard.tsx:28` (object), `DimensionDetailModal.tsx:32-65` (object); Tests: existing `__tests__/LeaderboardSummaryMetrics.test.tsx` plus new tests for the other three.

**Interfaces:** Consumes Task 5 functions and `useKatasEnabled` (read the boolean only).

Test-first: yes — with flag off: Katas Completed metric absent, `learning` chip/row absent in each of the three component views, other metrics/parts present; flag on: all present; `LeaderboardDimensionCard` where `learning` is the only component renders no empty list and no "How is this calculated?" button; `DimensionDetailModal` with `learning` plus two other parts shows the other parts' "Weight inside" percentages computed against the unfiltered total (unchanged from flag on) and one fewer row.

- [ ] Write failing tests (existing mocks of hooks via `vi.mock`; default existing tests to flag on).
- [ ] In each component filter once and use the filtered result for every read (list, count, button visibility); in `DimensionDetailModal` keep the weight total computed from the unfiltered components.
- [ ] While there, check generic `LEADERBOARD_*` tables and `LeaderboardUserDetailModal` (:82-95) for their own kata reads; the modal only passes data down, so no change is expected. Record the result in the digest.
- [ ] Run `npx vitest run --project unit src/pages/analytics` — expect pass.
