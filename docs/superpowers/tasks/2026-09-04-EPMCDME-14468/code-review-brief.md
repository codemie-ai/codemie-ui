# Code review — 2026-09-04-EPMCDME-14468 (2026-09-04)

**request-changes** · confidence: medium · 4 resolved · 2 unresolved (of 6)
Coverage: targeted verifier ✓ (6/6 findings graded)

## Still unresolved

- `src/router.tsx` — [infra] no integration test for settings-page redirect — CR-005
- `unknown` — [other] commit subject begins lowercase 'add'; Tekton gate will block merge — CR-006

## Resolved this round

- CR-001 · `src/pages/analytics/AnalyticsPage.tsx:53` — dashboardsLoaded flag gates isCustomDashboard and adoption redirect
- CR-002 · `src/pages/analytics/AnalyticsPage.tsx:74` — adoption-redirect collision guard added
- CR-003 · `src/pages/analytics/AnalyticsPage.tsx:124` — role="alert" added to retirement notice div
- CR-004 · `src/pages/analytics/components/widgets/__tests__/DynamicWidget.test.tsx:23` — vi.mock path corrected to ../../AnalyticsWidget

## Carried forward

commit-format ✗ (CR-006 unresolved) · security ✓ · code-quality na
