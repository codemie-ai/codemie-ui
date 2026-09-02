# Code review — 2026-09-02-hide-fields-distribution-only-users (2026-09-02)

**request-changes** · confidence: low · 2 blocking · 0 deferred · 3 filtered as noise
Coverage: blind — n/a (compact profile) · edge-case ✓ · verification-gap — n/a (compact profile) · acceptance — n/a (no spec)  (1/1 lenses ran)

No spec present; confidence capped at low.

## Look here first

- `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx:330` — [infra] distributionOnly submit falls through to create on absent group; creates blank-named group — CR-002

## Also flagged

- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — [other] isProjectAdmin+budget-flag-off combination not tested; new canViewBudgets branch unverified — CR-001

## Checked and clean

3 dismissed: guarded personal-project access path (canViewBudgets gates it), unreachable distributionOnly+forceCreate=true path, cosmetic disabled-textarea opacity
