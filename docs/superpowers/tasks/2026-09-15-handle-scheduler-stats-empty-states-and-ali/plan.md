# Plan: Handle scheduler stats empty states and align metric card size

## Requirements

Fix scheduler run statistics rendering so empty/unavailable metric values display neutrally, and align scheduler statistic card sizing with analytics metric cards.

### Acceptance Criteria
1. When total runs is `0`, Success Rate displays `—` with neutral styling (not red `0.0%`).
2. When total runs is `0`, Average Duration displays `—` (not `0s`).
3. If runs exist but all are still in progress, Average Duration displays `—`.
4. If completed runs exist and all failed, Success Rate remains `0.0%` with failed/red styling.
5. Completed, Failed, Running, and Cancelled counters continue to display numeric values, including `0`.
6. Scheduler statistic cards match the compact analytics metric card sizing/density.
7. Reuse existing analytics metric components where possible.
8. Existing scheduler run statistics loading and filtering must not regress.

---

## Tasks

### Task 1 — Fix success-rate empty-state logic in `metricItems`

File: `src/pages/schedulers/SchedulerRunHistoryPage.tsx`

When `s.total === 0`, set success-rate `value` to `'—'` and omit color class override.
When `s.total > 0` (some completed or failed), keep `${s.successRate.toFixed(1)}%` and apply color.

Test-first: yes — render `SchedulerRunHistoryPage` with `stats.total = 0` and assert success-rate card shows `—` with no `text-failed-secondary` class.

### Task 2 — Fix average-duration empty-state logic in `metricItems`

File: `src/pages/schedulers/SchedulerRunHistoryPage.tsx`

When `s.total === 0`, set average-duration `value` to `'—'`.
When `s.total > 0` but `s.completed === 0` (all running/failed), set average-duration `value` to `'—'` (no completed runs to average).
Otherwise keep `formatDuration(s.averageDurationMs)`.

Test-first: yes — assert `—` when total=0; assert `—` when total>0 and completed=0; assert formatted value when completed>0.

### Task 3 — Align MetricCard compact sizing

File: `src/pages/schedulers/SchedulerRunHistoryPage.tsx`

Pass `compact` prop (or rely on existing MetricCard sizing) — MetricCard already renders at `p-3` which is analytics-aligned. Verify no wrapper overrides inflate the card. No changes needed unless visual inspection shows discrepancy. If needed, add `compact` variant to MetricCard.

Test-first: no — visual sizing alignment; covered by existing MetricCard rendering.
