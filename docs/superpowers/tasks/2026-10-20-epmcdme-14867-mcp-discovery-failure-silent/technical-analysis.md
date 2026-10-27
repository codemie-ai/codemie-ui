# Technical Research

**Task**: mcp auth discovery_failed toolkit_service 401 authentication_required chat streaming chatGeneration AssistantAuthGateRow inline mcp_config_id
**Generated**: 2026-10-20
**Research path**: codegraph (backend `codemie`) + filesystem (frontend `codemie-ui`, no `.codegraph/` index)

---

## 1. Original Context

EPMCDME-14867 (Bug) — Error message silently ignores MCP authentication discovery failure

Summary: The CodeMie chat UI receives an HTTP 401 response with an MCP authentication discovery failure payload, but does not display any error or warning to the user. The chat silently fails.

Description: When an MCP server is configured with HTTP transport and no auth configuration, the backend can return a 401 response containing MCP server rows with status="discovery_failed". The UI component AssistantAuthGateRow already has rendering logic for this state (amber warning, "Server unavailable" badge). In the streaming chat flow, this error state is not surfaced.

Investigated root cause:
- Backend: toolkit_service.py around line 272. When there are only discovery_warnings and no auth_failures, the warnings are placed in the `servers` field of the payload.
- In the streaming chat path, chatGeneration.ts catches and parses the 401 response, but the discovery_failed rows may be dropped or the auth gate may not be triggered.
- mcp_config_id is null because the MCP config is inline and not saved in the DB. The UI may skip rendering the auth gate when no config ID is present.

Preconditions: inline MCP config {"type":"http","url":"https://mcp.figma.com/mcp"}, no auth_config, api.figma.com not in MCP_AUTH_TRUSTED_AS_DOMAINS.

Example 401 payload:
{"error":"authentication_required","servers":[{"status":"discovery_failed","mcp_config_id":null,"mcp_config_name":"figma","mcp_server_name":"figma","error_context":"Discovery failed: no_trusted_authorization_server. Add the AS domain to the trust allowlist or configure auth_config manually for this server."}]}

Expected: visible warning in the chat UI; server shown as unavailable; AssistantAuthGateRow discovery_failed rendering triggered; inline configs with mcp_config_id=null still surface the failure; chat does not fail silently.

Acceptance Criteria:
1. On a chat streaming 401 with discovery_failed rows, the UI displays a visible warning.
2. AssistantAuthGateRow is triggered for discovery_failed rows in `servers`.
3. The warning says the MCP server is unavailable because auth discovery failed.
4. The "Server unavailable" badge is displayed for the affected server.
5. Inline configs with mcp_config_id=null do not prevent rendering.
6. The streaming flow does not silently drop discovery_failed rows from the parsed 401.
7. The chat UI never fails silently for MCP auth discovery failures.
8. Regression coverage for the figma scenario.
9. Existing auth gate behavior for other MCP auth states remains unaffected.

Related observation: the chat sometimes shows "Oops! Something went wrong / undefined: undefined", i.e. an empty error message.

Repository context: the backend is C:\Sources\epm-cdme\codemie (current repo, CodeGraph indexed). The frontend is a sibling repo at C:\Sources\epm-cdme\codemie-ui (it holds chatGeneration.ts and AssistantAuthGateRow; check whether it has a .codegraph index, otherwise research it from the filesystem). Research both and state clearly which repo(s) need changes.

---

## 2. Codebase Findings

### Existing Implementations

**Backend (`codemie`). It emits the payload correctly.**
- `src/codemie/service/mcp/toolkit_service.py`
  - `MCPToolkitService.get_mcp_server_tools` (L185–278). It buckets the servers through `_collect_server_results` (L281). If discovery candidates exist, it calls `_run_discovery_probe_and_collect_failures` (L391). It then raises `MCPAuthenticationRequiredException` with this payload (L269–276):
    `{"error": "authentication_required", "servers": auth_failures if auth_failures else discovery_warnings}`. When both kinds exist, `payload["warnings"] = discovery_warnings` is added as well.
  - `_build_discovery_warning_payloads` (L646–669) builds each warning row as `{status:"discovery_failed", mcp_config_id: candidate.get("mcp_config_id"), mcp_config_name, mcp_server_name, error_context}`. For an inline config, `mcp_config_id` is `None`, which matches the ticket payload.
  - `_build_discovery_bridge_unavailable_results` (L683) produces `discovery_failed` results when the probe runtime config or the bridge fails.
  - `_build_auth_required_server_payload` (L726–752) builds rows for `authentication_required`. `mcp_config_id` can also be null here for inline servers.
- `src/codemie/service/mcp/auth_warnings.py`: a ContextVar store (`record_mcp_auth_warnings` / `get_mcp_auth_warnings`). It is only read on the success path, by `ToolkitService._forward_mcp_auth_warnings_to_request` (`src/codemie/service/tools/toolkit_service.py` L1076). That function copies the warnings into `request.metadata[MCP_AUTH_WARNINGS_METADATA_KEY]`, and it is never reached when the exception is raised.
- `src/codemie/rest_api/main.py` L1254 `mcp_auth_required_handler` returns `JSONResponse(401, content=exc.payload)` with the payload unchanged.
- `src/codemie/enterprise/mcp_auth/_trust_policy.py`: `read_mcp_auth_trusted_as_domains_config_sync` reads the dynamic config key `MCP_AUTH_TRUSTED_AS_DOMAINS` (the trigger in the precondition).

**Frontend (`codemie-ui`, at `C:\Sources\epm-cdme\codemie-ui`). This is where the defect is.**
- `src/utils/mcpAuth.ts`
  - `normalizeMCPAuthGateServer` (L83–103) contains `const mcpConfigId = getNonEmptyString(value.mcp_config_id); if (!mcpConfigId || !configName) return null`. **Any row with `mcp_config_id: null` is dropped.** That includes the figma `discovery_failed` row.
  - `parseMCPAuthRequiredErrorPayload` (L105–119) returns `null` when every row is dropped (`rows.length ? rows : null`). It reads only `servers` and never `warnings`.
  - `isMCPAuthRequiredErrorPayload` (L121) is therefore also `false` for the figma payload.
- `src/utils/api.ts` `API.stream` (L206–255): on `!response.ok` it parses the JSON body. Because `isAuthGatePayload(parsed)` is false (it delegates to the parser above), it shows the generic toast `'Failed to generate answer'` and then throws the raw payload. `makeRequest` (L369–386) uses the same predicate to decide between a 401 auth gate and a session-expired redirect.
- `src/store/chatGeneration.ts` `_sendRequest` (L1401–1486): in the catch block, `parseMCPAuthRequiredErrorPayload(error)` returns null, so the code falls through the OAuth, GitLab, Jira and Confluence parsers to `_handleRequestError` (L1537). That calls `_handleGenerationStreamError` (L1844–1853): `const { message, details, help } = errorObj.error ?? errorObj`. Here `errorObj.error` is the *string* `'authentication_required'`, so destructuring yields `undefined` for all three, and the message renders as `"Oops! Something went wrong \n undefined: undefined \n undefined"`. **This is the "undefined: undefined" from the related observation, and it is the same bug.**
  - `applyPromptRows` (L358) sets `historyItem.mcpAuthPromptRows`, which is what renders the gate.
  - Row actions are keyed by `mcp_config_id`: `initiatePromptAuth` (L1281, `find(item => item.mcp_config_id === mcpConfigId)`), `openPromptSignIn` (L529–575), and `continuePromptAuth` / `cancelPromptAuth`.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMcpAuthPrompt.tsx`: renders rows through `AssistantAuthGateRow` with `key={`${row.mcp_config_id}-${row.status}`}`. The heading is always "Authentication required" (or "Re-authentication required"), followed by "Complete sign-in for the affected MCP server…", even when every row is `discovery_failed`.
- `src/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow.tsx`: the `discovery_failed` branch already exists. It uses the amber `ROW_STYLES`, `STATUS_BADGES.discovery_failed = {Warning, 'Unavailable'}`, and an `InfoWarning` with header `'Server unavailable'` and message `row.error_context ?? 'Authentication discovery is unavailable right now.'`. It shows no action button for that status.
- `src/types/entity/mcpAuth.ts`: `MCPAuthGateServer.mcp_config_id: string` is non-nullable. `MCPAuthRequiredErrorResponse` has no `warnings` field.
- `src/hooks/useMCPAuthPrompt.ts` (L102–118): a second consumer of `parseMCPAuthRequiredErrorPayload`, used on the assistant form/test path. It also keys `updateRow` by `mcp_config_id`.

### Architecture and Layers Affected
- Frontend utility/parsing layer: `src/utils/mcpAuth.ts` (the primary defect).
- Frontend HTTP layer: `src/utils/api.ts` (auth-gate detection, toast suppression, session-expiry branch).
- Frontend store: `src/store/chatGeneration.ts` (error routing, `_handleGenerationStreamError` formatting).
- Frontend presentation: `ChatAiMcpAuthPrompt.tsx`, `AssistantAuthGateRow.tsx` (rendering is already in place; key and heading).
- Frontend types: `src/types/entity/mcpAuth.ts`.
- Backend service and handler layers (`MCPToolkitService`, `mcp_auth_required_handler`): they produce the payload, and no defect was found there.

### Integration Points
- Backend → frontend contract: a 401 JSON body `{error:'authentication_required', servers:[...], warnings?:[...]}` sent from `/v1/assistants/{id}/model` before any NDJSON stream starts. It is consumed by `api.stream`, then `_sendRequest`.
- `isMCPAuthRequiredErrorPayload` is shared by `api.stream` and `api.makeRequest` (local-auth 401: gate vs. session-expired redirect).
- `parseMCPAuthRequiredErrorPayload` is shared by `chatGeneration.ts` and `useMCPAuthPrompt.ts`.

### Patterns and Conventions
- The frontend normalizes untrusted payloads through `normalize*` / `parse*` guards that return `null` and filter out nulls.
- Auth prompts on a message are mutually exclusive. `clearAuthPrompts` runs before the next one is set, and the render priority is mcp → gitlab → jira → confluence.
- Backend payload helpers are `@classmethod` builders that return plain dicts, and the exception carries the payload unchanged to a FastAPI exception handler.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- Backend: `.ai-run/guides/integration/mcp-integration.md` (MCP config and tools), `.ai-run/guides/development/error-handling.md` (typed exceptions and handlers). The contract for the discovery payload is not documented there.
- Frontend: `codemie-ui/AGENTS.md` routes to `.ai-run/guides/development/error-handling-patterns.md`, `api-integration.md` and `testing/testing-patterns.md` (Vitest + RTL; run `npm ci` before trusting gates).

### Architectural Decisions
- Inline comment in `chatGeneration.ts` L1441: "MCP auth throws { error: 'authentication_required', servers: [...] }. Bypass _handleGenerationStreamError(), which expects message/details/help fields." This confirms the generic formatter is not meant to receive this payload.
- `api.ts` L32–37: auth-gate payloads deliberately suppress the "Failed to generate answer" toast and the session-expired redirect.

### Derived Conventions
- Rows are identified by `mcp_config_id` throughout the UI (keys, row updaters, initiate). `discovery_failed` rows carry no action, so they need no identifier for initiate. They still need a stable React key and must survive the `updatePromptRowsAtIndexes` mappers.

---

## 4. Testing Landscape

### Existing Coverage
- Backend: `tests/codemie/service/mcp/test_toolkit_service_*.py` include `test_get_mcp_server_tools_records_warning_only_discovery_failed_payload`, `..._mixed_auth_required_and_discovery_warning_payloads`, `..._records_discovery_failed_warning_for_missing_probe_result` and `..._records_per_candidate_warnings_when_probe_bridge_raises`. `tests/codemie/rest_api/test_mcp_auth_required_handler.py` covers the 401 handler, and `tests/enterprise/mcp_auth/test_discovery_probe_bridge.py` covers the bridge.
- Frontend: `src/utils/__tests__/mcpAuth.test.ts` covers only `isAuthenticatingGateRow` and `getLiveAuthConfigIds`. `src/store/__tests__/chatGeneration.promptAuth.test.ts` (620 lines) covers the prompt-row lifecycle with `createPromptRow` (mcp_config_id `'mcp-1'`). `AssistantAuthGateRow.test.tsx` (176 lines), `ChatAiMcpAuthPrompt.test.tsx`, `useMCPAuthPrompt.test.tsx` and `mcpAuthStatus.test.ts` also exist.

### Testing Framework and Patterns
- Backend: pytest, with `patch` on `_process_server` and `_probe` in the toolkit tests.
- Frontend: Vitest + React Testing Library. `vi.mock('@/utils/api')` exposes a `mockStream`, the stores are mocked, and row factories use `overrides`.

### Coverage Gaps
- No unit tests for `normalizeMCPAuthGateServer` or `parseMCPAuthRequiredErrorPayload`, so none cover a null `mcp_config_id` or `discovery_failed`.
- No `chatGeneration` test for a 401 payload that contains only `discovery_failed`.
- No test for `_handleGenerationStreamError` with an `error` string field (the "undefined: undefined" case).
- No backend test asserting `mcp_config_id: None` for an inline-config discovery warning (the figma scenario).

---

## 5. Configuration and Environment

### Environment Variables
- `MCP_CONNECT_ENABLED` (backend config) gates MCP tool loading in `ToolkitService._get_tools`.

### Configuration Files
- Dynamic config (DB) key `MCP_AUTH_TRUSTED_AS_DOMAINS` (`_trust_policy.py`) is the AS-domain allowlist. If the domain is missing, the probe returns `no_trusted_authorization_server`, which becomes `discovery_failed`.
- Dynamic config `MCP_AUTH_DISCOVERY_PRIVATE_NETWORK_ALLOWLIST`.
- Frontend: `window._env_` / `VITE_API_URL` (base URL only).

### Feature Flags and Deployment Concerns
- None specific to this path. The two repos ship independently.

---

## 6. Risk Indicators

- **Shared predicate blast radius**: changing `normalizeMCPAuthGateServer` / `isMCPAuthRequiredErrorPayload` in `src/utils/mcpAuth.ts` also changes `api.makeRequest` (local-auth 401: gate vs. session-expired redirect) and `useMCPAuthPrompt.ts`. This bears on AC9.
- **Identity by `mcp_config_id`**: React keys (`ChatAiMcpAuthPrompt.tsx`), `updatePromptRowsAtIndexes` mappers, `initiatePromptAuth` and `useMCPAuthPrompt.updateRow` all match on `mcp_config_id`. Rows with null or duplicate ids (several inline servers) could collide. Speculative: a fallback identifier such as the server name may be needed. That is for the spec to decide.
- **Type contract**: `MCPAuthGateServer.mcp_config_id: string` is non-nullable, so any change touches its consumers.
- **Copy mismatches with the ACs**: the badge text is `'Unavailable'`, while AC4 says "Server unavailable" (the InfoWarning *header* already says "Server unavailable"). The prompt heading says "Authentication required / Complete sign-in…", which does not fit rows that are all `discovery_failed` (AC3).
- **`warnings` field is ignored**: in the mixed case the backend sends `servers` = auth failures plus `warnings` = discovery rows, and the UI never reads `warnings`. That is outside the figma scenario, but AC6/AC7 ("never fails silently") may reach it.
- **Generic formatter**: `_handleGenerationStreamError` produces "undefined: undefined" for any payload whose `error` is a string or that lacks message, details and help. It is reachable by other unrecognized payloads too.
- **Double notification**: `api.stream` already shows a "Failed to generate answer" toast for unrecognized payloads, so the current behaviour is "toast plus garbled message" rather than fully silent.
- Speculative: no backend change is required for the ACs, because the payload already matches the ticket example. The backend could optionally add tests for the inline (`mcp_config_id=None`) figma case, or a synthetic identifier.

---

## 7. Summary for Complexity Assessment

**The defect is entirely in the frontend repo (`C:\Sources\epm-cdme\codemie-ui`).** The backend (`codemie`) emits the 401 payload the ticket describes: `MCPToolkitService.get_mcp_server_tools` puts the `discovery_warnings` rows in `servers`, with `mcp_config_id=None` for inline configs, and `mcp_auth_required_handler` passes the payload through unchanged. In the UI, `normalizeMCPAuthGateServer` (`src/utils/mcpAuth.ts` L86–89) rejects rows without a non-empty `mcp_config_id`. As a result `parseMCPAuthRequiredErrorPayload` returns null, and `isAuthGatePayload` is false, so `api.stream` shows a generic toast. `chatGeneration._sendRequest` then skips `applyPromptRows`, and `_handleRequestError` → `_handleGenerationStreamError` destructures `{message, details, help}` from the string `'authentication_required'`, rendering "Oops! Something went wrong / undefined: undefined". The related observation is therefore the same root cause.

Expected change surface: about 2–4 frontend source files (`mcpAuth.ts` and the `mcpAuth.ts` types are core; possibly `ChatAiMcpAuthPrompt.tsx` for the key and heading, `chatGeneration.ts` for a hardened error formatter, and `AssistantAuthGateRow.tsx` for the badge copy), plus tests (`mcpAuth.test.ts`, `chatGeneration.promptAuth.test.ts`, the row and prompt component tests). The rendering for `discovery_failed` already exists, so no new UI pattern is needed. Backend changes are optional, limited to regression tests.

Test posture: the backend is well covered for discovery warnings. The frontend has rich prompt-lifecycle and row tests, but **no test for the parser/normalizer** and none for a null-id or discovery-only 401. The main risks are the shared parser's blast radius (`api.makeRequest` session-expiry branch, `useMCPAuthPrompt`), the row identity and React key based on `mcp_config_id`, and gaps in the AC copy ("Server unavailable" badge, the heading text).

---

## 8. External References

- `C:\Sources\epm-cdme\codemie-ui` resolved (no `.codegraph/`, read from the filesystem). Facts:
  - `src/utils/mcpAuth.ts` L86–89: `const mcpConfigId = getNonEmptyString(value.mcp_config_id)` … `if (!mcpConfigId || !configName) return null`. L118: `return rows.length ? rows : null`.
  - `src/store/chatGeneration.ts` L1439–1446: `const promptRows = parseMCPAuthRequiredErrorPayload(error); if (promptRows?.length) { applyPromptRows(...); return }`. L1848–1849: `const { message, details, help } = errorObj.error ?? errorObj; return \`${DEFAULT_ERROR_MESSAGE} \n ${message}: ${details} \n ${help}\``.
  - `src/utils/api.ts` L242–246: `if (!isAuthGatePayload(parsedResponse)) { toaster.error('Failed to generate answer') } throw parsedResponse`.
  - `AssistantAuthGateRow.tsx` L48: `discovery_failed: { status: StatusEnum.Warning, text: 'Unavailable' }`. L67–72: InfoWarning `header: 'Server unavailable'`, `message: row.error_context ?? 'Authentication discovery is unavailable right now.'`, `type: InfoWarningType.WARNING`.
  - `ChatAiMcpAuthPrompt.tsx` L70: `key={\`${row.mcp_config_id}-${row.status}\`}`. L30–33 heading: 'Authentication required'.
  - `src/types/entity/mcpAuth.ts` L36–37: `interface MCPAuthGateServer { mcp_config_id: string ...`.
