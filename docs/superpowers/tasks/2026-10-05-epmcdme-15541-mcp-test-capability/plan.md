# EPMCDME-15541 MCP Management Test Capability Implementation Plan

**Goal:** Admin can test a saved MCP catalog config; last test status/timestamp persist and show in the UI.

**Repos:** BE = `/Users/vladimir_sesum1/codemie-dev/codemie` (branch EPMCDME-15541-mcp-management-test-capability; never touch `customer_config.py` or `tests/conftest.py`). UI = `/Users/vladimir_sesum1/codemie-dev/codemie-ui`. Spec: `spec.md` in this directory.

Commit per task using the repository's existing convention. Backend tasks (B1-B4) precede UI tasks (U1-U5). Backend tests are in scope per spec (follow BE `.ai-run/guides/testing/`); UI tests per spec (follow UI `.ai-run/guides/testing/testing-patterns.md`). Each task includes its own tests; there is no separate test or verification task.

---

### B1 (BE): Model, response fields, migration

**Files:** `codemie/src/codemie/rest_api/models/mcp_config.py` (MCPConfig ~:192, MCPConfigResponse :299); `codemie/src/codemie/service/mcp_config_service.py:672` (`_to_response`); new file in `codemie/src/external/alembic/versions/`; test in `codemie/tests/codemie/service/` (new `test_mcp_config_service_test_capability.py`).

- [ ] Add `MCPTestDetail(BaseModel)` with `message: str`, `error_category: str | None`, `tools_count: int | None`. Add to `MCPConfig`: `last_test_at` (timestamptz, nullable), `last_test_status` (nullable str enum `success|failure|warning`), `last_test_detail` (nullable JSONB via `PydanticType(MCPTestDetail)`, same pattern as `config` column).
- [ ] Add five flattened nullable fields to `MCPConfigResponse` (`last_test_at`, `last_test_status`, `last_test_message`, `last_test_error_category`, `last_test_tools_count`); fill them in `_to_response`. Do not expose `last_test_detail`.
- [ ] Migration: run `alembic heads`, chain onto current head, add three nullable columns, `downgrade` drops them, no backfill.

Test-first: yes — `_to_response` on a config with stored detail returns flattened fields, and on a never-tested config returns all five as None.

### B2 (BE): Structured tester result

**Files:** `codemie/src/codemie/service/mcp/mcp_tester.py` (`MCPServerTester.test` :83); `codemie/tests/codemie/service/mcp/test_mcp_tester.py`.

- [ ] Add `MCPTestResult` (status, message, error_category, tools_count) and `MCPServerTester.run_test() -> MCPTestResult`. Empty tools -> `warning` / `no_tools`; success carries tools count, category None; failures carry `MCPToolLoadException.category` value or `unknown`. Reuse existing hint building. Auth exceptions (`BrokerAuthRequiredException`, `MCPAuthenticationRequiredException`) still re-raise.
- [ ] Rewrite `test()` as a thin wrapper over `run_test()`: success -> `(True, msg)`, warning and failure -> `(False, <same messages as today>)`. `POST /assistants/mcp/test` must behave identically.

Test-first: yes — `run_test` returns warning/no_tools for empty tools, success with count, failure per category, re-raises auth exceptions; existing `test()` tuple assertions still pass unchanged.

### B3 (BE): `MCPConfigService.test`

**Files:** `codemie/src/codemie/service/mcp_config_service.py` (add classmethod near `update` :351); tests in the B1 test file.

- [ ] `test(config_id, user)`: load config (same 404 `ExtendedHTTPException` as `get_by_id`); map to `MCPServerDetails` (name, `mcp_config_id`, stored `config`, enabled) wrapped in `MCPServerCheckRequest`; call `MCPServerTester(...).run_test()`; set `last_test_at` (UTC now), `last_test_status`, `last_test_detail`; save; return `_to_response`. Auth exceptions propagate before any write. Do not touch `update_date`, `usage_count` or other fields. Last write wins.

Test-first: yes — persists on success, warning and failure; auth exception leaves the row unmodified and propagates; unknown id raises 404; `update_date` unchanged.

### B4 (BE): Router route

**Files:** `codemie/src/codemie/rest_api/routers/mcp_config.py` (mirror the admin routes, e.g. `@router.put` :162); new `codemie/tests/codemie/rest_api/routers/test_mcp_config_test_endpoint.py` (follow existing router test style in that dir).

- [ ] Add `POST /mcp-configs/{config_id}/test` with `authenticate` + `admin_access_only`, `response_model=MCPConfigResponse`, no body, calling `MCPConfigService.test`.

Test-first: yes — 200 returns updated response with last_test fields; non-admin gets 403; unknown id gets 404.

---

### U1 (UI): Types and store

**Files:** `codemie-ui/src/types/entity/mcp.ts`; `codemie-ui/src/store/mcp.ts` (`updateConfig` :241, `catalogCache` :60); `codemie-ui/src/store/__tests__/mcp.test.ts`.

- [ ] Add the five nullable last-test fields to `MCPConfig` (status typed `'success' | 'failure' | 'warning' | null`).
- [ ] Add `mcpStore.testConfig(id)`: POST `v1/mcp-configs/${id}/test` via `src/utils/api.ts`, merge the returned config into `configs[]` and `catalogCache` as `updateConfig` does; track per-id in-flight state (observable set/map); ignore a second call for an id in flight. Auth-required errors are rethrown unchanged for the caller; other errors leave stored data untouched.

Test-first: yes — `testConfig` merges response into `configs` and cache; second concurrent call for the same id issues one request; failure leaves stored fields unchanged.

### U2 (UI): Row dropdown and shared test hook

**Files:** new `codemie-ui/src/pages/settings/administration/components/useMCPConfigTest.ts`; `codemie-ui/src/pages/settings/administration/components/MCPServerActions.tsx` (`menuActions`); reference `.../Toolkits/MCPToolkit/MCPToolkitTest.tsx` for auth pattern; test next to `__tests__/MCPServerActions.accessibility.test.tsx`.

- [ ] Hook `useMCPConfigTest(id)` returns `{ run, isTesting }`: calls `mcpStore.testConfig`, then `toaster.success` / `toaster.error(message)` / `toaster.info("connected but no tools returned")` by status; on auth-required uses `useMCPAuthPrompt` and the `MCPToolkitTest.tsx` popup pattern, then re-runs automatically after sign-in (no failure toast); other errors give an error toast only.
- [ ] Add "Test Connection" entry to `menuActions`, disabled with busy state while `isTesting`. No client-side role gate.

Test-first: yes — clicking "Test Connection" calls `testConfig` with the row id and the item is disabled while in flight; warning status shows the info toast.

### U3 (UI): Edit dialog Test button and last-test panel

**Files:** new `.../administration/components/MCPLastTestInfo.tsx` (shared badge+timestamp+message/category+tools count; "Never tested" when null; used by U3-U5); `.../MCPServerModal/index.tsx` (under "Configuration JSON" textarea); tests alongside.

- [ ] Add "Test" button using `useMCPConfigTest`. Hidden in create mode (no id); disabled while the form is dirty with tooltip "Save your changes to test the latest configuration"; busy state while running. Render `MCPLastTestInfo` below it from the store's current config.

Test-first: yes — button absent without id; disabled with the tooltip when form dirty; enabled on clean edit and panel shows "Never tested" for an all-null config.

### U4 (UI): Table "Last test" column

**Files:** `codemie-ui/src/pages/settings/administration/MCPManagementPage.tsx` (table columns); test in its `__tests__`.

- [ ] Add "Last test" column with badge (success / failure / warning / "Not tested") and relative time; full timestamp in hover title. Reuse the badge from `MCPLastTestInfo`.

Test-first: yes — rows render each badge state and "Not tested" for null status, with full timestamp as hover title.

### U5 (UI): View Details sidebar

**Files:** `.../administration/components/MCPServerDetails.tsx`; test alongside.

- [ ] Render `MCPLastTestInfo` section with the same last-test info.

Test-first: yes — sidebar shows status, timestamp and message for a tested config and "Never tested" otherwise.

---

## Self-review

- Spec coverage: endpoint/admin (B4), persistence + migration (B1, B3), tester warning (B2), AC2-AC5 and auth re-test (U1-U2), dirty/create rules (U3), table/sidebar (U4-U5).
- negative-constraints: (1) `POST /assistants/mcp/test` unchanged -> B2 wrapper keeps tuple contract, tested. (2) No history table -> B1 adds single-row columns only. (3) No test of unsaved form / save-then-test -> U3 disables when dirty. (4) No new toaster variant -> U2 uses success/error/info. (5) No `/status` unification -> untouched. (6) No client-side role gate -> U2 adds none. (7) No bulk/scheduled/per-user/locking -> none planned. (8) Do not touch `customer_config.py`, `tests/conftest.py` -> no task edits them. (9) Auth exceptions not persisted -> B3.
