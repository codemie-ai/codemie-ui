# Technical Research

**Task**: mcp management mcp server connection test authentication
**Generated**: 2026-10-02T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

[MCP Management] Test Capability. Goal: Validate MCP connectivity and functionality before use. Description: Provide a mechanism to execute a test against an MCP server to verify that it is reachable, authenticated correctly, and able to return expected responses. Acceptance Criteria: User can trigger 'Test Connection' or 'Test Capability'. System validates connectivity and authentication. Test results are displayed with success/failure status. Error details are shown when validation fails. Test history or last test timestamp is retained.

---

## 2. Codebase Findings

### Existing Implementations

A connectivity test mechanism already exists for **ad-hoc assistant-level MCP servers** (not yet for the saved catalog `MCPConfig` entries):

- `src/codemie/service/mcp/mcp_tester.py` — `MCPServerTester` class. `test()` calls `MCPToolkitService.get_mcp_server_tools(..., mcp_server_single_usage=True)`, returns `(bool success, str message)`. Catches `MCPToolLoadException` and builds a category-specific hint via `_build_hint_for_category()` (handles `CONNECTION_CLOSED`, `TIMEOUT`, `STARTUP_FAILURE`, `AUTH_REQUIRED`, `UNKNOWN`). Re-raises `BrokerAuthRequiredException` and `MCPAuthenticationRequiredException` unchanged so the caller can trigger an auth flow instead of showing a generic failure.
- `src/codemie/rest_api/routers/assistant.py:1944` — `POST /assistants/mcp/test` (`check_mcp_server`). Accepts `MCPServerCheckRequest`, calls `MCPServerTester(request, user).test()`, returns `{"success": bool, "message": str}` via `JSONResponse`. Re-raises auth exceptions; wraps other exceptions in `ExtendedHTTPException`.
- `src/codemie/rest_api/models/assistant.py:174` — `MCPServerDetails` (name, description, enabled, `mcp_config_id` catalog reference, `command`/`config`, etc.); `MCPServerCheckRequest` (`:458`) wraps a single `MCPServerDetails`.
- `src/codemie/service/mcp/models.py` — `MCPErrorCategory` enum, `MCPToolLoadException`, `MCPBridgeError` (bridge status-code-aware classification feeding the hint builder).
- Separate from connectivity: `src/codemie/enterprise/mcp_auth/router.py` — `GET /status` (`mcp_auth_status_enabled`) returns `MCPAuthStatusResponse` with `status: "authenticated" | "authentication_required" | "session_expired" | "config_error"` for a given `mcp_config_id`, via `evaluate_auth_status` / `build_discovered_auth_status_response`. This is the existing authentication-state check, distinct from the tools-call connectivity test.

### Architecture and Layers Affected

- **API/router layer**: `src/codemie/rest_api/routers/assistant.py` (ad-hoc test endpoint), `src/codemie/rest_api/routers/mcp_config.py` (catalog CRUD, no test endpoint today), `src/codemie/rest_api/routers/mcp_managed.py` (read-only managed-server listing), `src/codemie/enterprise/mcp_auth/router.py` (auth status/initiate/callback, enterprise-gated).
- **Service layer**: `src/codemie/service/mcp/mcp_tester.py`, `src/codemie/service/mcp/toolkit_service.py` (`MCPToolkitService.get_mcp_server_tools`), `src/codemie/service/mcp_config_service.py` (`MCPConfigService` — catalog CRUD, no test/last-tested tracking).
- **Data layer**: `src/codemie/rest_api/models/mcp_config.py` — `MCPConfig` SQLModel table `mcp_configs` (catalog entries). No field currently records last test result or timestamp.
- **Integration layer**: MCP bridge/connect service reached via `MCPToolkitService`, governed by `MCP_SERVER_INIT_TIMEOUT` / `MCP_CLIENT_TIMEOUT` (CodeMie) and `MCP_CONNECT_INIT_TIMEOUT` (bridge).

### Integration Points

- `MCPServerTester` → `MCPToolkitService.get_mcp_server_tools` → MCP bridge service (stdio/SSE/streamable-http transports) — the actual network/process call that proves reachability.
- Auth: `BrokerAuthRequiredException` (`src/codemie/service/security/token_providers/base_provider.py`) and `MCPAuthenticationRequiredException` (`src/codemie/core/exceptions.py`) are propagated rather than swallowed, so the frontend can distinguish "needs auth" from "failed test".
- `mcp_config_id` on `MCPServerDetails` links an ad-hoc test request back to a catalog `MCPConfig` row, but `MCPConfigService` does not currently read or write any test-outcome state.

### Patterns and Conventions

- Service classes constructed with a request + `User`, exposing a single `test()`/`create()`/etc. method (`MCPServerTester`, service classes under `src/codemie/service/mcp_config_service.py`).
- Routers depend on `authenticate` (and `admin_access_only` for mutating catalog endpoints); the ad-hoc test endpoint only requires `authenticate` (no admin gate), consistent with being a self-service check during assistant configuration.
- Error classification is centralized in `MCPErrorCategory`/`MCPToolLoadException` rather than ad hoc string matching per caller.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/integration/mcp-integration.md` — states MCP config/auth logic must stay behind existing service and router modules; documents the timeout chain (`MCP_SERVER_INIT_TIMEOUT`, `MCP_CONNECT_INIT_TIMEOUT`, `MCP_CLIENT_TIMEOUT`) relevant to why a connectivity test can fail or hang on first use (npx/uvx package download).

### Architectural Decisions

- `docs/superpowers/specs/2026-08-04-mcp-npx-diagnostics-design.md` and `docs/superpowers/plans/2026-08-05-mcp-npx-diagnostics.md` (ticket EPMCDME-13900) record the design that produced the current category-specific hint logic in `_build_hint_for_category` — the most recent prior work directly on this test path.

### Derived Conventions

- No ADR records persisting test history; the existing `/assistants/mcp/test` endpoint is explicitly stateless (test-and-forget), which is the gap against this task's "test history or last test timestamp" acceptance criterion.

---

## 4. Testing Landscape

### Existing Coverage

- `tests/codemie/service/mcp/test_mcp_tester.py` — thorough unit coverage of `MCPServerTester.test()`: empty-tools failure, success, generic exception, auth-exception re-raise (`BrokerAuthRequiredException`, `MCPAuthenticationRequiredException`), `single_usage=True` call contract, `_get_server_command` fallback, `_build_hint_for_category` per category, and an npx regression suite (status-code-first classification).
- `tests/enterprise/mcp_auth/test_mcp_auth_status_bridge.py` — covers the `/status` auth-state endpoint.
- `tests/codemie/service/test_mcp_config_service_auth_*.py` — catalog CRUD/auth-config validation, no test-execution coverage.

### Testing Framework and Patterns

- `pytest`, heavy use of `unittest.mock.patch` targeting the exact import path of the dependency being mocked (e.g. `_PATCH_TARGET = "codemie.service.mcp.toolkit_service.MCPToolkitService.get_mcp_server_tools"`), `Mock(spec=...)` fixtures for `User`.

### Coverage Gaps

- No router-level/integration test exercises `POST /assistants/mcp/test` end-to-end (only the service class is unit-tested) — `rg` of `tests/` for `/assistants/mcp/test` and `check_mcp_server` returned no matches outside `mcp_tester` unit tests.
- No persistence of test results exists, so there is also no test coverage for "last tested" retrieval — this capability does not exist in the codebase yet.
- No test endpoint exists for catalog `MCPConfig` entries (`mcp-configs` router) — testing is currently only reachable via the ad-hoc assistant-draft flow with inline `MCPServerDetails`.

---

## 5. Configuration and Environment

### Environment Variables

- `MCP_SERVER_INIT_TIMEOUT` (CodeMie, default 300s) — guards `create_toolkit`/connectivity test duration.
- `MCP_CLIENT_TIMEOUT` (CodeMie, default 300s) — per-`tools/call` timeout.
- `MCP_CONNECT_INIT_TIMEOUT` (MCP-Connect bridge, default 30000ms) — effective init budget is `min(MCP_SERVER_INIT_TIMEOUT, MCP_CONNECT_INIT_TIMEOUT/1000)`.

### Configuration Files

- `src/codemie/configs/managed_mcp_config.py`, `src/codemie/configs/mcp_commands_config.py` — static managed-server catalog and allowed command list (`_ALLOWED_MCP_COMMANDS` in `mcp_config.py`), not test-related but constrain what a test can even launch.

### Feature Flags and Deployment Concerns

- MCP OAuth2/SAML auth (`src/codemie/enterprise/mcp_auth/`) is enterprise-gated (`test_feature_gating.py` exists); any test-capability work touching authenticated servers should check this gate rather than assume auth is always available.

---

## 6. Risk Indicators

- Speculative: if this task requires persisting "last test timestamp"/history, it will need a schema change (new column(s) or table) on `MCPConfig` or a new table, plus an Alembic migration — no such field exists today (`src/codemie/rest_api/models/mcp_config.py`), and this repo's `src/external/alembic/versions/` shows MCP schema changes are an established but non-trivial pattern (6+ prior MCP-related migrations).
- Speculative: the existing `/assistants/mcp/test` endpoint operates on inline `MCPServerDetails` (assistant-draft context) with no `config_id` persistence path back to `MCPConfig`; wiring catalog-level "Test Capability" (per the ticket's "[MCP Management]" framing) may require a new endpoint under `mcp_config.py` rather than reusing the assistant router, since that router is scoped to assistant configuration, not the catalog.
- The connectivity test currently conflates "no tools returned" with failure (`mcp_tester.py:89-94`) — a server with zero tools by design would be misreported; worth confirming this is intended before extending the capability.
- No router/integration test exists for the current test endpoint, only service-level unit tests — any new work in this area inherits a thin regression net at the API boundary.
- Auth-state checking (`/status` in `mcp_auth` router) and connectivity testing (`MCPServerTester`) are two separate code paths today; a unified "Test Capability" feature touching both will need to reconcile their differing status vocabularies (`success/message` vs. `authenticated/authentication_required/session_expired/config_error`).

---

## 7. Summary for Complexity Assessment

A connectivity-test mechanism already exists end-to-end for ad-hoc, assistant-draft MCP servers: `MCPServerTester` (service layer) backs `POST /assistants/mcp/test` (router layer), with category-specific error hints and auth-exception propagation already implemented and unit-tested. A separate, enterprise-gated authentication-status endpoint (`GET /status` in `mcp_auth`) independently reports authenticated/authentication_required/session_expired/config_error. The task's novelty is concentrated in two places the current code does not cover: (1) a test-capability entry point scoped to the saved MCP catalog (`MCPConfig` via `mcp_config.py` router), as opposed to only the inline assistant-draft flow, and (2) persistence of test results/timestamps, which has zero existing schema or service support.

Layers touched would likely span router (new or extended endpoint), service (reuse/extend `MCPServerTester` or `MCPConfigService`), and possibly data (new column/table + migration) if history retention is required — this last part is unconfirmed by the ticket's exact scope and is flagged as speculative, not discovered. Test coverage posture is good at the service-unit level for the existing tester but has no router-level integration test and no coverage at all for history retention, since that capability doesn't exist. Key risks are reconciling two divergent status vocabularies (tester's success/message vs. auth router's four-state enum), confirming whether "no tools returned" should still count as a connectivity failure, and the schema/migration cost if history must be persisted.

---

## 8. External References

None named by the task.
