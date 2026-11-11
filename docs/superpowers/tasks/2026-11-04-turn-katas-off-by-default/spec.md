# EPMCDME-16851 Turn Katas Off by Default (Frontend)

## Goal

Hide every kata surface unless the backend config item `features:katas` is enabled. A missing item reads as off, with no error. When on, behavior is unchanged. Follows the Schedulers precedent (flag in `FEATURE_FLAGS`, `useFeatureFlag`, nav condition, `FeatureGuard`). Depends on backend EPMCDME-16850, which ships the item disabled.

## Behavior

- Flag: add `KATAS: 'features:katas'` to `FEATURE_FLAGS` (`src/constants/featureFlags.ts:19`) and a `useKatasEnabled` wrapper in `src/hooks/useFeatureFlags.ts`, next to `useSchedulersViewEnabled` (:132). It is the single read for every kata entry point. It should read through `isConfigItemEnabled`, as `FeatureGuard` does (`src/utils/settings.ts:187`), so the hook and the guard agree on `availableForExternal`.
- Navigation: the 'AI Katas' item (`src/components/Navigation/Navigation.tsx:146-150`) is added only when the flag is on. The mobile menu shares this component, so one condition covers desktop and mobile.
- Mobile top-bar label (`MobileTopBar.tsx:46`): unchanged. It only shows on a kata route, and those routes are guarded.
- Routes: wrap the 7 `katasRoutes` (`src/router.tsx:395-431`) in a pathless `FeatureGuard` route with `FEATURE_FLAGS.KATAS`, as `schedulerRoutes` does (:348-392). A direct URL gives the same 404 as other disabled features. This also covers `/katas/leaderboard`.
- Floating window (`src/App.tsx:62-68`, :99):
  - Restore the kata state only when `user && isConfigFetched && katasEnabled`, with all three in the effect deps, so a user with katas on does not lose the window to an early "off" read, and a user with katas off never gets it back.
  - `setChatViewSettingsUserId` and `chatViewSettingsStore.loadFromLocalStorage()` in the same effect stay ungated, on `user` alone.
  - Render `FloatingKataWindow` only when the flag is on.
  - Stored state is left untouched, so it restores when katas are turned on.
- Onboarding tour: no change. The `ai-katas` step condition (`navigationIntroduction.tsx:248`) already requires the nav link to exist.
- Analytics leaderboard (`src/pages/analytics/components/leaderboard/`): when off, hide the Katas Completed summary metric (key `kata_completed`) and the Kata Completion score part (component key `learning`). Server totals are not recomputed.
  - Seam: one pure module next to `constants.ts` holds the constants (`kata_completed`, `learning`) and one function per data shape (summary map, array components, object components). The leaf components call it, using `useKatasEnabled`, after they receive their data. The store is not touched, because `analyticsStore` is shared by all analytics tabs and has no access to the flag hook.
  - Concrete entry points, one per shape:
    - `LeaderboardSummaryMetrics.tsx:75` (summary map; it is the only consumer of `METRIC_LABELS`, and the user detail modal passes `summary_metrics` to it at :95);
    - `LeaderboardDimensionCard.tsx:75-77` (components as an array; the user detail modal renders it at :89);
    - `FrameworkDimensionCard.tsx:28` (components as an object, fed by the framework fetch in `LeaderboardFrameworkDimensions.tsx:37`);
    - `DimensionDetailModal.tsx:32` (components as an object, opened from the framework view).
  - Not touched, dimension-level only: `LeaderboardTopPerformers.tsx:92-129` and `UserDimensionRadar.tsx` show a dimension id and score with no component data (see Decisions).

## Acceptance criteria

1. Off: no katas nav item (desktop and mobile), no floating window, no tour step.
2. Off and the floating window was open before: it does not restore, including when config arrives after the user.
3. Off and a katas URL is opened directly: no kata content renders, and the user sees the same 404 as for other disabled features.
4. Off: the component-level leaderboard views (dimension cards, framework dimension cards, dimension detail modal, user detail modal) show no Kata Completion part, and the summary metrics show no Katas Completed. Other parts and metrics are unchanged. Top-performer dimension bars and the radar are not component-level and are unchanged (known limitation).
5. On: everything works as today, including a minimized floating window restoring after reload.
6. No `features:katas` entry in the config: katas read as off and nothing throws.

## Non-goals

- Any backend change.
- Changing leaderboard scores or totals (display only).
- An admin-settings switch for katas (parent D6).
- Changes to `pageTitles`, `helpLinks`, release notes or other route-id-keyed references (inert once routes are guarded).
- Hiding kata influence in top-performer dimension bars or the radar axes. They carry only a dimension id and a score, so the kata part cannot be separated there. The D6 bar stays visible as a whole, exactly as the server sends it. Known limitation, accepted by the user.

## Decisions

- Config id `features:katas` over `features:katasView` — user.
- Hide the score part by exact key `learning` over a "kata" substring match — user. The metric is hidden by exact key `kata_completed`.
- Match the score part on key `learning` alone over key plus label "Kata Completion". The component maps are keyed, so the key is always present, while a required label would silently fail to hide where it is absent or renamed, and hiding nothing is the failure this story exists to prevent. The generic key is accepted because the user confirmed from the backend scorer (`_score_d6`) that `learning` is the Kata Completion component.
- Keep server totals unchanged over recomputing them — user. A shown total may exceed the sum of the visible parts.
- Leave top-performer dimension bars and the radar as the server sends them over trying to hide the kata part there — user. They have no component keys.
- "Leaderboard" means the analytics leaderboard over the katas-page leaderboard. The latter is a katas page and is covered by the route guard.
- Route guard on all 7 `katasRoutes` over per-page checks, giving the same 404 as the Schedulers precedent (D2).
- Gate the floating window at restore (waiting for `isConfigFetched`) and at render over clearing stored state.
- Filter in the four leaf leaderboard components with one pure module over filtering in `analyticsStore` or at each response fetch, since the store is shared across tabs and cannot read the flag.
- Leave the tour step and the mobile label unchanged.

## Risks and notes

- The key `learning` comes from the backend payload (scorer.py `_score_d6`), not this repo, and the repo has no fixture. Assumed: `learning` is a component inside the D6 dimension, so hiding it leaves other components in that card. If the backend renames the key, the part shows again (this is not safe, so the key should be pinned by a test on the helper).
- Hiding is UI-only. Server-side refusal of kata API calls belongs to EPMCDME-16850. Other UI callers of the kata API: `src/store/katas.ts` and `FloatingKataWindow`, both gated; no other caller was found.
- Landing order: the UI landing before the backend is safe, because an absent `features:katas` entry reads off.
- A failed config fetch sets `isConfigFetched` with empty configs, so katas read off until reload, the same as Schedulers.
- Not verified: the order of the `/configs` and user fetches (the restore effect must be correct for both); whether generic leaderboard tables carry kata columns (the plan checks).

## Tests

- Update `Navigation.test.tsx:131,257-259` to mock the flag on.
- Add:
  - nav with the flag off;
  - floating-window restore with the flag off, with the flag on, and with config arriving after the user;
  - a config refetch with katas on leaves the window state unchanged;
  - leaderboard hiding with the flag off, per shape (summary map, array, object) and with the flag on;
  - the route guard, as a unit test only (integration tests bypass `FeatureGuard` at `src/setupTests.integration.ts:24`);
  - the missing-entry case.
