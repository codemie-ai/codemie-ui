# Technical Analysis — EPMCDME-15013

## Codebase Findings

### Feature Flag Pattern
- Constants: `src/constants/featureFlags.ts` — `FEATURE_FLAGS` object, all entries follow `'features:<camelCase>'` naming.
- Hooks: `src/hooks/useFeatureFlags.ts` — `useFeatureFlag(id)` base hook; named hooks like `useFavoritesEnabled` wrap it.
- Usage in Navigation: `src/components/Navigation/Navigation.tsx` line 66 — `const [isSkillsEnabled] = useFeatureFlag('skills')` gates the Skills nav item by conditionally including it in `upperSecondaryItems`.

### Schedulers Navigation
- `src/components/Navigation/Navigation.tsx` lines 123–127 — Schedulers item is always included in `upperSecondaryItems` (no flag guard).
- Icon: `IconType.SCHEDULER`
- Route: resolves `{ name: SCHEDULERS }` → `'schedulers'`

### How Other Items Are Gated
- `isFavoritesEnabled` / `isFavoritesPageEnabled` — boolean from `useFeatureFlag`, item excluded from array when false.
- `isEnterpriseEdition()` — utility call, pushes Analytics conditionally.
- Pattern for conditional items: compute boolean from `useFeatureFlag`, add item to array only when true (inside `useMemo`).

## Risk Indicators
- `upperSecondaryItems` is a `useMemo` with `[router]` dep — adding a new boolean dep requires updating the dependency array.
- Navigation tests (if any) may need updating.
