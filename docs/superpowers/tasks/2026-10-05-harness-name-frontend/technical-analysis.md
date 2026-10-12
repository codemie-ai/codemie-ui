# Technical Research

**Task**: cli-analytics session detail harness client label
**Generated**: 2026-10-05T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Frontend follow-up to EPMCDME-15326 (backend already merged on branch EPMCDME-15326_harness-name-backend in the sibling codemie repo, which added a `harness_name: str` field to the CLI Analytics Session Details API response — resolved per-session from the actual coding harness, e.g. 'Claude Code', 'Cursor', 'Codex', falling back to 'Unknown'). Task: in this repo (codemie-ui), fix the Session Details header in the CLI Analytics dashboard, which currently hardcodes the client label as 'Claude-Code' regardless of the actual harness. The known hardcode is in src/pages/analytics/components/cli-analytics/views/SessionModal.tsx around line 35:
  const subtitle = [
    'Claude-Code',
    session?.model_name,
    session?.repository,
    session?.branch,
    session?.delivery_framework,
  ]
Need to replace the hardcoded 'Claude-Code' literal with the new harness_name field from the session object. Scope is this one dashboard header; do not touch delivery_framework (a separate, unrelated field) or any other session list views unless the shared type definition strictly requires it.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/analytics/components/cli-analytics/views/SessionModal.tsx` (lines 30-42) — the component in question. Current exact content:
  ```tsx
  const SessionModal: FC<SessionModalProps> = ({ traceId, onHide }) => {
    const { session, loading, error } = useCliAnalyticsSession(traceId)

    const title = truncateInput(session?.prompt, 80, 'Session')
    const subtitle = [
      'Claude-Code',
      session?.model_name,
      session?.repository,
      session?.branch,
      session?.delivery_framework,
    ]
      .filter(Boolean)
      .join(' · ')
  ```
  The line to change is line 35 — the literal `'Claude-Code'` — which must become `session?.harness_name`. The task's quoted snippet matches the file exactly; no drift.
- `src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsSession.ts` — hook that reads `session`, `loading`, `error` from the Valtio store (`cliAnalyticsStore.sessionDetail[traceId]`), typed as `SessionDetail | undefined`. It does no field mapping — it returns the store's object as-is, cast to `SessionDetail`.
- `src/store/cliAnalytics.ts` (`fetchSessionDetail`, ~line 276) — calls `fetchWithState<{ data: SessionDetail }>(..., `v1/analytics/cli-analytics/sessions/${traceId}`, ...)` and assigns `cliAnalyticsStore.sessionDetail[traceId] = data.data` directly. **No transformation layer exists between the raw API JSON and the typed object** — any field present in the backend response (including `harness_name`) reaches `session` automatically once the TypeScript type declares it. No explicit wiring beyond the type is needed.
- `src/types/cliAnalytics.ts` — the shared type module:
  - `SessionRow` (lines 46-65): the list-row shape (used by `SessionsView.tsx`'s `Table<SessionRow>`). Fields: `trace_id`, `developer_name`, `repository: string | null`, `start_time`, `duration_ms`, `model_name` (required `string`), `input_tokens`, `output_tokens`, `cost_usd`, `tool_call_count`, `branch: string | null`, then optional (`?`) fields: `prompt`, `turns`, `cache_read_tokens`, `cache_creation_tokens`, `net_lines`, `bloat_pct`, `delivery_framework?: string`. **No `harness_name` field.**
  - `SessionDetail` (lines 90-99) `extends SessionRow` and adds `events`, plus optional: `active_ms`, `agent_count`, `skill_count`, `cache_read_cost_usd`, `tool_calls_success`, `tools`, `dispatches`. **No `harness_name` field currently.**
- `src/pages/analytics/components/cli-analytics/views/SessionBody.tsx` — consumes `SessionDetail` for the modal body metrics (cost, tokens, activity, timeline). Does not reference `delivery_framework` or any client/harness label itself.
- `src/pages/analytics/components/cli-analytics/views/SessionsView.tsx` — the session **list** view. Imports `SessionRow` (not `SessionDetail`), renders a `Table<SessionRow>` with a `delivery_framework` column (`DeliveryFrameworkCell`), and opens `SessionModal` on row click, passing only `traceId`. The list view has its own `delivery_framework` filter/column — fully independent of harness/client labelling.
- `src/pages/analytics/components/CLIInsightsTab.tsx` (line 143) — an unrelated, older "CLI Insights" tab (`cliInsights/` sibling folder, not `cli-analytics/`) that already uses a `client_name` field via `labelField="client_name"` in a chart widget. This is a separate dashboard, out of this task's scope, and is **not** backed by `SessionRow`/`SessionDetail`.

### Architecture and Layers Affected

- **Component layer**: `SessionModal.tsx` (header subtitle construction only).
- **Type layer**: `src/types/cliAnalytics.ts` — `SessionDetail` interface needs a `harness_name` field added to match the backend's detail-only response shape (not `SessionRow`, since the backend did not add the field to the list endpoint).
- **Hook/store layer**: `useCliAnalyticsSession.ts` and `cliAnalyticsStore.fetchSessionDetail` require no code change — they pass the API response straight through; only the type annotation gates whether `harness_name` is visible to TypeScript.
- The list view (`SessionsView.tsx`, `SessionRow`) is architecturally separate and does not need changes, consistent with the backend only touching the detail model.

### Integration Points

- `GET v1/analytics/cli-analytics/sessions/${traceId}` — the detail endpoint whose response (`{ data: LocalAnalyticsSessionDetail, metadata: ... }`) is the source of `harness_name` per the backend model at `C:\Projects\codemie-dev\codemie\src\codemie\rest_api\models\cli_analytics.py` (sibling repo, see Section 8).
- No other internal module imports `SessionModal` besides `SessionsView.tsx`.

### Patterns and Conventions

- Optional/nullable string fields in `SessionRow`/`SessionDetail` use two styles: `string | null` for fields that can be genuinely absent in data (`repository`, `branch`), and `field?: string` (optional/undefined) for fields that may not be present in a given response version (`delivery_framework`, `bloat_pct`). The backend model marks `harness_name: str = Field(..., description=...)` as **required**, always resolving to `"Unknown"` rather than null/absent — so the matching frontend convention is a required `harness_name: string` (not optional, not nullable), consistent with how `model_name: string` (also always-present) is declared on `SessionRow`.
- Subtitle-building elsewhere in the codebase (e.g. `.filter(Boolean).join(' · ')`) already drops falsy/empty parts automatically, so a `harness_name` of `'Unknown'` (a non-empty, truthy string per the backend) will still render — this mirrors how `'Unknown'` fallbacks are rendered as literal text elsewhere in this repo (see `BarChartWidget.tsx:129`, `DonutChartWidget.tsx:54`, `SkillCard.tsx:54`) rather than hidden.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `AGENTS.md` (this repo) routes to `.ai-run/guides/patterns/state-management.md` (Valtio/hooks) and `.ai-run/guides/development/api-integration.md` (backend calls) — not read in full here since the change is a one-line field swap plus a type addition, not a new data-fetching pattern.
- No guide file specifically documents CLI Analytics session detail fields.

### Architectural Decisions

- None found inline (no `NOTE:`/`HACK:`/`ADR:`/`DECISION:` markers in `SessionModal.tsx`, `SessionBody.tsx`, `SessionsView.tsx`, or `types/cliAnalytics.ts`).

### Derived Conventions

- Field additions to the detail-only response are added directly to `SessionDetail` (which `extends SessionRow`), not to `SessionRow`, as seen with other detail-only fields (`events`, `tools`, `dispatches`, `cache_read_cost_usd`, etc.).

---

## 4. Testing Landscape

### Existing Coverage

- No `SessionModal.test.tsx` exists (confirmed via glob `**/SessionModal*.test.*` — no matches). `SessionModal.tsx` itself currently has **no dedicated test file**.
- `src/pages/analytics/components/cli-analytics/hooks/__tests__/useCliAnalyticsSession.test.ts` covers the hook: mocks `valtio`'s `useSnapshot`, spies on `cliAnalyticsStore.fetchSessionDetail`, and asserts the returned `session` equals a `MOCK_SESSION` object seeded directly into `cliAnalyticsStore.sessionDetail`. This mock object does not include `delivery_framework` or (currently) `harness_name` — adding the field to `SessionDetail` as required will make this mock fail type-checking unless the mock is updated or the field made non-strict in the mock's typing.
- `src/pages/analytics/components/cli-analytics/__tests__/SessionsView.test.tsx` and `ExtendedSessionsModal.test.tsx` show the repo's modal-testing pattern: `vi.mock('@/components/Popup', ...)` to stub the Popup primitive and expose a `data-testid="popup-header"`/content, plus `vi.mock('../../AnalyticsWidget', ...)`. This is the pattern a new `SessionModal.test.tsx` would follow, mocking `useCliAnalyticsSession` directly rather than the store.

### Testing Framework and Patterns

- Vitest + React Testing Library (`@testing-library/react`, `@testing-library/user-event`), two Vitest projects (`unit`, `integration`) per `AGENTS.md`.
- Hook tests mock `valtio`'s `useSnapshot` to pass the store through unchanged, then spy/seed the store directly — no MSW/network mocking observed in this slice.

### Coverage Gaps

- `SessionModal.tsx`'s subtitle-construction logic (the exact code this task touches) has zero existing test coverage — there is no test asserting the current `'Claude-Code'` literal, so no existing test will "break" to signal a regression; a new test is the only way to pin the corrected behavior.
- `useCliAnalyticsSession.test.ts`'s `MOCK_SESSION` fixture will need updating if `SessionDetail.harness_name` becomes a required field (currently absent from the fixture).

---

## 5. Configuration and Environment

### Environment Variables

- None specific to this field or component. CLI Analytics endpoints are called through the shared `api.ts` HTTP layer; no feature-flag or env-var gating was found for session detail fields.

### Configuration Files

- None specific to this change.

### Feature Flags and Deployment Concerns

- None found. This is a pure data-field plumbing change with no deployment surface.

---

## 6. Risk Indicators

- Speculative: `SessionDetail.harness_name` should be declared as a required `string` (matching backend's `Field(..., ...)` which always resolves, defaulting to `"Unknown"`), not optional/nullable — declaring it optional would be inconsistent with the backend contract and would force an extra fallback string in the component that the backend already guarantees.
- Speculative: because `SessionDetail extends SessionRow`, adding `harness_name` only to `SessionDetail` (not `SessionRow`) is the correct scope per the task's explicit instruction not to touch list views — but this must be verified against the exact field name/casing in the real API payload at implementation/test time, not assumed from the backend Pydantic model alone.
- `useCliAnalyticsSession.test.ts`'s `MOCK_SESSION` fixture lacks `harness_name`; if the type is made required, this existing test's fixture will fail TypeScript compilation and needs a one-line update as a side effect of the type change (not optional cleanup).
- `SessionModal.tsx` has no existing dedicated test file, so there is no regression safety net already in place for the subtitle string — a new test is the only verification path for this fix.
- The unrelated `CLIInsightsTab.tsx` already has its own `client_name` field in a different, legacy "CLI Insights" dashboard (`cliInsights/` folder) — a risk of scope confusion if a future reader conflates the two similarly-named analytics surfaces; this task's scope is `cli-analytics/`, not `cliInsights/`.

---

## 7. Summary for Complexity Assessment

This is a narrow, single-component fix touching one presentational layer (`SessionModal.tsx`) plus one shared type definition (`SessionDetail` in `src/types/cliAnalytics.ts`). The data layer (`useCliAnalyticsSession.ts` hook and `cliAnalyticsStore.fetchSessionDetail`) requires no code change since it passes the API response straight through untransformed — the new `harness_name` field will surface automatically once declared on the type. The sibling list view (`SessionsView.tsx` / `SessionRow`) is confirmed architecturally separate and correctly out of scope, matching the backend's choice to add the field only to the detail model.

Technical novelty is low: this follows an established pattern (optional vs. required string fields already exist side-by-side on `SessionRow`/`SessionDetail`), and the backend's `humanize_harness_name` always resolves to a non-empty string (falling back to `"Unknown"`), so no new null-handling logic is needed beyond what `.filter(Boolean).join(' · ')` already does.

The main risk is test coverage: `SessionModal.tsx` has no existing dedicated test file, so this fix has no regression safety net today, and the one existing adjacent test (`useCliAnalyticsSession.test.ts`) has a mock fixture that will need a one-line update to stay type-correct once `harness_name` is added as a required field on `SessionDetail`.

---

## 8. External References

- **Sibling repo, backend branch `EPMCDME-15326_harness-name-backend`** at `C:\Projects\codemie-dev\codemie` (checked out and resolved; currently on that branch). Relevant commits: `4575c711c` (expose humanized `harness_name` on session detail), `1ed99b996`, `2582cb85c`, `68d4dac53`.
  - `src/codemie/rest_api/models/cli_analytics.py` (around line 248): `LocalAnalyticsSessionDetail` adds
    ```python
    harness_name: str = Field(
        ..., description="Resolved display label for the coding harness/client, e.g. 'Claude Code'."
    )
    ```
    — a **required** field (`...`), confirming the field is `extends`-added only to the detail model, not to `LocalAnalyticsSessionRow` (the list-row model `SessionRow` mirrors in codemie-ui).
  - `src/codemie/repository/cli_analytics/vocabulary.py` (around line 183): `humanize_harness_name(raw: str | None) -> str` — returns `"Unknown"` for falsy/empty input, applies an override table (`HARNESS_LABEL_OVERRIDES = {"claude-code": "Claude Code"}`), and otherwise title-cases the raw value with `-`/`_` replaced by spaces (e.g. `"gemini_cli-beta"` → `"Gemini Cli Beta"`). Confirms the label is always a non-empty display string, never null.
  - `src/codemie/service/analytics/handlers/cli_analytics_handler.py` (line ~701): `detail["harness_name"] = humanize_harness_name(meta.get("harness_service_name"))` — confirms the field is populated by the handler on the session-detail path only.
  - Backend's own task artifacts live at `C:\Projects\codemie-dev\codemie\docs\superpowers\tasks\2026-10-02-harness-name-backend\` (not deeply read here; out of this repo's scope, mentioned for traceability only).

