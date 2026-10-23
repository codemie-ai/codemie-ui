# EPMCDME-15541 - MCP Management: Test Capability (backend + UI spec)

Scope: two repos.
- Backend: `/Users/vladimir_sesum1/codemie-dev/codemie` (FastAPI), branch EPMCDME-15541-mcp-management-test-capability.
- UI: `/Users/vladimir_sesum1/codemie-dev/codemie-ui` (React).

Size M. The backend route does not exist today: `routers/mcp_config.py` has only create/get/list/update/delete, and
`models/mcp_config.py` has no last-test fields.

Do not touch the backend's unrelated dirty files `customer_config.py` and `tests/conftest.py`.

## Goal

An admin can test a saved MCP catalog configuration from the MCP Management page and see success, failure or warning,
with error details on failure. The last test status and timestamp persist on the config and stay visible after leaving
the screen.

## Contract (defined)

`POST /v1/mcp-configs/{config_id}/test`
- No body. Guarded by `authenticate` + `admin_access_only`.
- `200` returns the updated `MCPConfigResponse`, with last-test fields populated.
- `404` if the config is not found (same `ExtendedHTTPException` as `get_by_id`).
- `BrokerAuthRequiredException` and `MCPAuthenticationRequiredException` propagate unchanged. They are not
  persisted and nothing is written.
- A failed, warned or successful test is always `200`. The outcome is in `last_test_status`.

`MCPConfigResponse` (POST, GET and list) gains flattened, nullable fields. All null means "never tested".

| Field | Type |
|---|---|
| `last_test_at` | ISO datetime or null |
| `last_test_status` | `success`, `failure`, `warning` or null |
| `last_test_message` | string or null |
| `last_test_error_category` | string or null (`MCPErrorCategory` value, `no_tools` for warning, null on success) |
| `last_test_tools_count` | int or null |

## Backend

1. **Model** (`models/mcp_config.py`)
   - `MCPConfig` gains `last_test_at` (timestamptz, nullable), `last_test_status` (nullable str/enum) and
     `last_test_detail`. The detail is a Pydantic model `MCPTestDetail(message, error_category, tools_count)`
     stored as JSONB through the existing `PydanticType` pattern.
   - `MCPConfigResponse` gets the five flattened fields above. `MCPConfigService._to_response`
     (`mcp_config_service.py:672`) fills them from the stored columns.
   - `last_test_detail` itself is not exposed.
2. **Alembic migration** in `src/external/alembic/versions/`: add the three nullable columns, with a `downgrade` that drops
   them. Chain onto the current head (implementer runs `alembic heads`). No backfill: existing rows stay null.
3. **Tester contract** (`service/mcp/mcp_tester.py`)
   - Add a structured result (status, message, error_category, tools_count) and a method returning it.
   - Empty tools becomes `warning` (category `no_tools`). Success carries the tools count. Failures carry the
     `MCPToolLoadException.category`, or `unknown` for other exceptions.
   - The existing `test()` tuple stays behavior-compatible for `POST /assistants/mcp/test`: warning still maps to
     `(False, <same message>)`, so the assistant flow is unchanged.
   - Auth exceptions still re-raise.
4. **Service** (`MCPConfigService.test(config_id)`)
   - It loads the config (404 if missing) and maps the catalog entry to `MCPServerDetails` (name, `mcp_config_id`,
     stored `config`, enabled).
   - It runs `MCPServerTester` with the calling user and persists `last_test_at` (now, UTC), `last_test_status` and
     `last_test_detail`.
   - It returns `_to_response`.
   - The service orchestrates and the tester executes. Concurrent tests: last write wins.
   - It does not touch `update_date`, `usage_count` or any config field.
5. **Router**: add the `POST /mcp-configs/{config_id}/test` route with the dependencies and `response_model` as the other
   admin routes.
6. **Backend tests** (unit + router) are in scope:
   - Tester: success, warning, failure per category, auth re-raise, old `test()` compatibility.
   - Service: persist on each of the three outcomes, no persist on auth exception, 404, flattening in `_to_response`.
   - Router: 200 shape, admin-only (403 for non-admin), 404.
   - Follow `.ai-run/guides/testing/`.

## UI

1. **Types/store**: add the five last-test fields to `MCPConfig` in `types/entity/mcp.ts`. Add `mcpStore.testConfig(id)`
   in `store/mcp.ts` that posts to the endpoint, merges the returned `MCPConfigResponse` into `configs[]` and
   `catalogCache` (as `updateConfig` does), and tracks per-id in-flight state. A second run of the same config is ignored
   while one is in flight.
2. **Row dropdown** (`MCPServerActions.tsx` `menuActions`): new "Test Connection" entry, disabled with a busy state while
   that config's test runs.
3. **Edit dialog** (`MCPServerModal/index.tsx`): a "Test" button under the "Configuration JSON" textarea.
   - It is hidden in create mode (no id).
   - It is disabled while the form is dirty, with the tooltip "Save your changes to test the latest configuration".
   - It tests the saved config.
   - Below the button sits a last-test panel (status badge, timestamp, message/category, tools count). A never-tested
     config reads "Never tested".
4. **Table**: new "Last test" column with a badge (success / failure / warning / "Not tested") and relative time, with the
   full timestamp on hover.
5. **View Details sidebar** (`MCPServerDetails`): same last-test info.
6. **Feedback**: a brief toast after a test. Success uses `toaster.success`, failure uses `toaster.error` with the message,
   and warning uses `toaster.info` ("connected but no tools returned"). The inline panel and badge are the durable
   display. No new toaster variant.
7. **Auth required**: reuse `useMCPAuthPrompt` and the popup pattern from `MCPToolkitTest.tsx`, and re-run the test
   automatically after sign-in. It is not shown as a failure.
8. **Other request errors** (network, 403, 5xx): error toast. Stored last-test data is unchanged.
9. The UI adds no client-side role gate. The backend enforces admin-only.

## Acceptance criteria

- AC1: `POST /v1/mcp-configs/{id}/test` exists and is admin-only. Test is available in the row dropdown and in the edit
  dialog (edit mode only).
- AC2: A reachable, authenticated server with tools gives `success`, with a badge and timestamp.
- AC3: A failed test gives `failure` with message and category, shown in the UI.
- AC4: `last_test_*` persist on `MCPConfig`. They appear in the table, sidebar and dialog panel, and survive navigation
  and reload (read from GET and list).
- AC5: Connected with zero tools gives `warning` (category `no_tools`), distinct from failure in the API and UI.
- Never-tested is all-null and renders as "Not tested", not a failure.
- Auth exceptions propagate, persist nothing, and trigger the sign-in prompt and an automatic re-test.
- The dialog Test is disabled while the form is dirty and hidden when creating.
- A test in progress shows a busy state and blocks a duplicate run in the UI.
- `POST /assistants/mcp/test` behavior is unchanged.
- Backend unit and router tests exist and pass. The migration applies and reverts cleanly.

## Non-goals

- No test history table or history UI (only the last test).
- No change to the ad-hoc assistant MCP test flow or its response shape.
- No testing of unsaved form contents, and no save-then-test.
- No new toaster variant, and no unification with the `/status` auth vocabulary.
- No client-side role gating beyond existing feature flags.
- No bulk or scheduled testing.
- No change to the backend's dirty files `customer_config.py` and `tests/conftest.py`.
- No per-user test results, and no rate limiting or locking of concurrent tests.
