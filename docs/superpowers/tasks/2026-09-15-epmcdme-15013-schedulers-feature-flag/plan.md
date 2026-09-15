# Plan — EPMCDME-15013: Schedulers Feature Flag

## Requirements
Add a `features:schedulersView` feature flag that controls Schedulers navigation visibility.
- Default: hidden (flag absent or `settings.enabled: false`)
- When flag `settings.enabled: true`: show Schedulers nav for all users
- No role-based logic — backend flag only

## Tasks

### T1 — Add SCHEDULERS_VIEW to FEATURE_FLAGS constant
File: `src/constants/featureFlags.ts`
Add: `SCHEDULERS_VIEW: 'features:schedulersView'`
Test-first: yes — test that `FEATURE_FLAGS.SCHEDULERS_VIEW === 'features:schedulersView'`

### T2 — Add useSchedulersViewEnabled hook
File: `src/hooks/useFeatureFlags.ts`
Add: `export const useSchedulersViewEnabled = (): FeatureFlagResult => useFeatureFlag(FEATURE_FLAGS.SCHEDULERS_VIEW)`
Test-first: no — trivial wrapper, covered by T1's constant test

### T3 — Gate Schedulers nav item with feature flag
File: `src/components/Navigation/Navigation.tsx`
- Import `useSchedulersViewEnabled`
- Call `const [isSchedulersViewEnabled] = useSchedulersViewEnabled()` at hook level
- Add `isSchedulersViewEnabled` to `useMemo` dependency array
- Include Schedulers item in `upperSecondaryItems` only when `isSchedulersViewEnabled` is true
Test-first: yes — unit test that Schedulers nav item is absent when flag is false, present when true
