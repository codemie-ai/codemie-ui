# Headroom analytics visualization (EPMCDME-15645)

## Goal

The backend (codemie MR 4461) added Headroom analytics endpoints and savings fields on conversation
metrics. This change visualizes them: a Headroom block on the Analytics Insights tab and a savings row in
the chat "Usage details" overlay.

## Backend contract (MR 4461)

All analytics endpoints take the standard filter params (`time_period`, `start_date`, `end_date`,
`users`, `projects`; the grouped ones also `page`, `per_page`) and return **404** unless the
`features:headroom` flag is on. They do not use `features:routingAnalytics`.

| Endpoint | Response | Content |
|---|---|---|
| `GET v1/analytics/headroom/summary` | `SummariesResponse` | `tokens_original`, `tokens_compacted`, `tokens_saved`, `saved_percent` (percentage), `request_count`, `session_count`, and a string metric `mode` (`sdk`, `sidecar` or `mixed`; omitted when there are no events) |
| `GET v1/analytics/headroom/by-strategy` | `TabularResponse` | rows `strategy` (`lossless`, `balanced`, `aggressive`, `mixed`), `request_count`, `tokens_original`, `tokens_compacted`, `tokens_saved`, `saved_percent` (percentage) |
| `GET v1/analytics/headroom/timeseries` | `TabularResponse` | rows `time` (3h buckets), `request_count`, `tokens_original`, `tokens_compacted`, `tokens_saved` |

`GET conversation metrics` gains `headroom_tokens_saved` and `headroom_tokens_original`, both omitted
unless tokens were actually saved. Messages also carry a `headroom` object; that is out of scope here.

## Design

### 1. Types — `src/types/analytics.ts`

- `OverviewMetricType.HEADROOM_SUMMARY = 'headroom/summary'`
- `TabularMetricType.HEADROOM_BY_STRATEGY = 'headroom/by-strategy'`
- `TabularMetricType.HEADROOM_TIMESERIES = 'headroom/timeseries'`

The analytics store already requests `v1/analytics/${type}`; no store change.

### 2. `HeadroomAnalyticsSection` — `src/pages/analytics/components/HeadroomAnalyticsSection.tsx`

Modelled on `RoutingAnalyticsSection`. Props: `filters: AnalyticsQueryParams`.

- `MetricsWidget` (`HEADROOM_SUMMARY`), `expandable={false}`: the six token/count metrics. The `mode`
  metric the backend also returns is filtered out with `selectedMetrics` and not shown.
- `StackedBarChartWidget` (`HEADROOM_TIMESERIES`): `labelField="time"`, `valueFormat="number"`, series
  `tokens_compacted` ("Compacted") and `tokens_saved` ("Saved"). The stack height equals the original
  tokens, so each bar shows how much was cut.
- `TableWidget` (`HEADROOM_BY_STRATEGY`): one row per strategy with requests, original, compacted and
  saved tokens, and the saved share (`saved_percent`). `mixed` appears as its own row.

The backend dropped `by-mode` (MR 4461, 047af5f89); the mode is reported once in the summary instead.

### 3. Placement — `InsightsTab.tsx`

Rendered after the "LLM Usage" section as its own block with an `h2` "Context Compression" heading,
gated by `useFeatureFlag(FEATURE_FLAGS.HEADROOM)`. With the flag off the component is not mounted, so
no request is made and there is no 404.

### 4. Chat usage details

- `ChatMetrics` (`src/types/entity/conversation.ts`) gets optional `headroom_tokens_saved` and
  `headroom_tokens_original`.
- `ChatHeader.tsx` adds a "Tokens saved (Headroom)" row in the `DataOverlayButton` render, shown only
  when `headroom_tokens_saved > 0`. Value: the saved count with the share of original when known, for
  example `12,345 (38%)`. No feature-flag check: the backend omits the fields when nothing was saved.

## Out of scope

- Per-message `headroom` indicator in chat history.
- Headroom card on the project overview.
- Custom-dashboard widget form entries (the form has no routing entries either).
- Tests: per `AGENTS.md`, written only on request.

## Error and empty states

The widgets own loading, error and empty rendering. Savings of 0 on every row show an empty chart; the
summary shows zeros.
