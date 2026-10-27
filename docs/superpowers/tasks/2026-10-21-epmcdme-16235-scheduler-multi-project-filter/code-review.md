---
schema: sdlc-factory/code-review@1
decision: approve
reviewed_head: 8281beead342188ecac0aa32d9b895112ed230ca
---

# Code review — 2026-10-21-epmcdme-16235-scheduler-multi-project-filter

**Decision:** approve (final round, confidence high)  
**Reviewed head:** `8281bee` · **Rounds:** final

Compact profile: edge-case and acceptance lenses ran with parseable output; edge-case reported nothing and acceptance passed all seven story ACs (AC3's repeated projectId/resourceId emission confirmed against api.ts default 'separate' array handling). Standards audit not part of the compact profile; lint, type-check, tests and browser checks are pending Stage 7; 0 deferred, 0 dismissed.

## Open — 0

## Coverage

| Acceptance criterion | Status | Notes |
|---|---|---|
| AC1: check two or more projects, all stay checked | pass | handleApply passes projectId array; URL append/getAll round-trip; unit test covers multi-select. |
| AC2: unchecking one project leaves others checked | pass | Unit test asserts remaining projectId and aria-selected. |
| AC3: request carries every selected project as repeated projectId | pass | Store passes array; api.ts default 'separate' appends one param per value (verified). |
| AC4: AC1-AC3 hold for Resource filter (resourceId) | pass | Same array path for resourceId in filters, page and store; unit tests cover it. |
| AC5: frontend sends only the user's selection, no client-side widening | pass | Arrays passed through unchanged. |
| AC6: clearing all selections sends no projectId/resourceId | pass | Empty arrays guarded by ?.length in store; store test covers omission. |
| AC7: multi-selection survives reload or shared link | pass | URL append/getAll; integration test restores repeated params. |
| SchedulerFilters tests: arrays plus multi-select and uncheck-one for projects and resources | pass | Present in SchedulerFilters.test.tsx. |
| Store test for array params and none for empty arrays | pass | schedulers.fetchSchedulers.test.ts asserts params shape (api mocked). |
| Page URL round-trip integration assertion | pass | Added in SchedulersPage.integration.test.tsx. |
| Lint, type-check, test run and browser verification | pending-stage-7 | Not provable from diff. |
| Non-goal: no changes to api.ts, ProjectSelector, Filters, useSearchParams, SchedulerRunFilters | pass | Diff touches only SchedulerFilters, SchedulersPage, store/schedulers and tests. |

Standards: commit-format na · code-quality na · security na
