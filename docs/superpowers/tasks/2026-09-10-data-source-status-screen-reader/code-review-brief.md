# Code review — 2026-09-10-data-source-status-screen-reader (2026-09-10)

**request-changes** · confidence: high · 7 blocking · 0 deferred · 0 filtered
Coverage: edge-case ✓ · acceptance ✓ (2/2 lenses ran)

## Look here first

- `src/pages/dataSources/hooks/useDataSourceStatusAnnouncer.ts:34` — [other] NaN or Infinity in percentage; complete_state=0 breaks announcement — CR-001
- `src/pages/dataSources/hooks/useDataSourceStatusAnnouncer.ts:34` — [other] Percentage not clamped; exceeds 100% when current > complete — CR-002
- `src/pages/dataSources/hooks/useDataSourceStatusAnnouncer.ts:30` — [other] No announcement when rows removed; silent deletion — CR-003
- `src/pages/dataSources/hooks/useDataSourceStatusAnnouncer.ts:36` — [other] Null repo_name renders malformed text — CR-004
- `src/pages/dataSources/hooks/useDataSourceStatusAnnouncer.ts:39` — [other] Whitespace announcements bypass queue guard — CR-005

## Also flagged

- `src/pages/dataSources/hooks/useDataSourceStatusAnnouncer.ts:30` — [other] Burst updates (>5 changes) exceed queue; middle messages lost — CR-006
- `src/pages/dataSources/hooks/useDataSourceStatusAnnouncer.ts:34` — [other] Missing zero-guard before division — CR-007

## Checked and clean

edge-case ✓ · acceptance ✓
