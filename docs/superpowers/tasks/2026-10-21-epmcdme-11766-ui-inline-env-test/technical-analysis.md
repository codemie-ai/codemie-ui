# Technical Research

**Task**: mcp toolkit env-var settings test tools
**Generated**: 2026-10-21
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-11766 InfoNgen MCP server integration fails on 'new' environment variable setup but succeeds with 'existing' CodeMie Integration selection

# UI hand-off — EPMCDME-11766 (repo: `codemie-ui`)

**Blocked by:** backend MR !4590 (codemie, draft). Land the UI after it merges, or build against `mock-server/` if the contract is agreed first.
**Scope:** `codemie-ui` only. No backend, SDK or API-model change.

## Problem
In the MCP toolkit wizard, "new" env-var mode keeps the typed values only in UI state (`manualEnvVarValues` in `useEnvVarMode.ts`). They become a stored MCP setting only on form submit (`submitHelpers.ts` → `handleNewEnvVarMode` → `createOrUpdateMcpSetting` in `formHelpers.ts`). The two calls that need credentials before that, **Test** (`MCPToolkitTest`, rendered in `MCPServerConfigStep.tsx`) and the **Step-2 tools fetch** (`MCPToolsSelectionStep` → `assistantsStore.getMcpTools` → `POST /assistants/mcp_tools`), send `settings: envVarHook.settings`. In "new" mode that is `undefined`, so the request carries no credentials and the server cannot start.

## Backend contract (what MR !4590 adds)
For `POST /assistants/mcp/test` and `POST /assistants/mcp_tools`, when `mcp_server.settings` has **no `id`** but has `credential_values`:
- Inline values are used as the server env for that one call only. Nothing is stored or logged.
- Applies only to catalog-reference servers (`mcp_config_id` set, `use_custom_config=false`). Names not declared in the catalog entry's `required_env_vars` are silently dropped. Custom configs ignore inline values.
- If `settings.id` is present, the stored setting wins and inline values are ignored.
- `integration_alias`, if set, still wins over `settings`.
- Response shapes are unchanged.

Request shape to send (matches backend `SettingsBase`; `project_name` and `credential_type` are required, `id` must be absent):
{"mcp_server": {"name": "...", "mcp_config_id": "<catalog id>", "use_custom_config": false, "settings": {"credential_type": "MCP", "project_name": "<selected project>", "credential_values": [{"key": "ENV_NAME", "value": "typed value"}]}}}

## Task
1. In "new" env-var mode, build a transient `settings` object from `manualEnvVarValues` + the selected project (shape above, no `id`) and use it as `serverConfig.settings` for BOTH Test and the Step-2 tools fetch (`MCPToolkitForm/index.tsx`, the `serverConfig` / `mcpServer` props passed to `MCPServerConfigStep` and `MCPToolsSelectionStep`).
2. Do NOT persist anything at this point. No `createUserSetting` / `updateUserSetting` on Test or on the tools fetch; saving stays on form submit as today.
3. Keep "existing integration" mode unchanged (still sends the stored setting with its `id`).
4. Send only non-empty entries; leave the request without `settings` when nothing has been typed.
5. Do not duplicate catalog logic in the UI. Keep sending `mcp_config_id`; backend resolves the catalog entry.

## Acceptance criteria
- New env-var mode, catalog server, values typed, click Test: succeeds when values valid.
- Same state, go to Step 2: the tools list loads.
- Network tab for both requests: `settings` has `credential_type: "MCP"`, `project_name`, `credential_values`, and no `id`.
- No user-settings create/update request fires on Test or the tools fetch; submitting the form still creates/updates the setting exactly as before.
- Existing-integration mode and custom-config servers behave as before.
- Unit tests cover the transient `settings` construction and that Test/tools fetch do not touch `userSettingsStore`.

## Watch-outs
- Verify the TS `Setting` type allows `id` to be absent for the transient object; avoid casting a fake id in.
- `project_name` must be the project selected in the wizard, not a default.
- Values are plaintext in the request body; do not log them client-side.
- Restricted mode (`mcpCustomServersDisabled`) is out of scope.

## Out of scope
Error wording, restricted-mode enforcement, SDK changes, changing the save flow, any new API field.

## Pointers
UI files: src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkitForm/ (index.tsx, MCPServerConfigStep.tsx, useEnvVarMode.ts, formHelpers.ts, submitHelpers.ts), src/store/assistants.ts (getMcpTools). Backend spec (reference only): ../codemie/docs/superpowers/tasks/2026-10-21-epmcdme-11766-infongen-mcp-server-integration-fail/spec.md

---

## 2. Codebase Findings

Base dir `MCP` below = `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit`. Stack: React 18 / TS 5 / Valtio / Vitest (package.json).

### Existing Implementations
- `MCP/MCPToolkitForm/index.tsx` (201 lines) — wizard container. Calls `useEnvVarMode(mcpServer, project)`; `serverConfig = useMemo(buildServerConfig(getValues(), mcpServer?.mcp_config_id, isCatalogRef), [watch(), isCatalogRef])`. Lines 169-173 pass `serverConfig={{...serverConfig, settings: envVarHook.settings, ...mcp_config_id}}` to `MCPServerConfigStep`; lines 183-187 pass the same shape as `mcpServer` to `MCPToolsSelectionStep`. These two literals are the exact injection points. Both are inline object literals (new identity every render). `project` prop (string) comes from `MCPToolkit.tsx` (lines 221, 349).
- `MCP/MCPToolkitForm/useEnvVarMode.ts` — state: `envVarMode` ('new' | 'existing', **initial 'new'**), `settings` (`Setting | undefined`), `manualEnvVarValues` (`Record<string,string>`), `envVarErrors`. Exposes `shouldCreateNewEnvVarSetting()` = `envVarMode==='new' && hasRequiredEnvVars && isFromMarketplace`. Effect on `[mcpServer, project]`: sets `settings=mcpServer.settings`; marketplace+required vars -> looks up existing setting named `<name>_env_vars` and flips to 'existing' if found; non-marketplace with a server -> 'existing'.
- `MCP/MCPToolkitForm/formHelpers.ts` — `buildServerConfig` (sets `use_custom_config`, `config`, `mcp_config_id`); `createOrUpdateMcpSetting` (builds `credential_values` via `Object.entries(manualEnvVarValues).map(([key,value])=>({key,value}))`, then `userSettingsStore.findUserSetting/update/create`); `handleNewEnvVarMode` (validates, then persists). Existing `credential_values` mapping is the shape to reuse; it does NOT filter empty values.
- `MCP/MCPToolkitForm/submitHelpers.ts` — `handleFormSubmit`: if `shouldCreateNewEnvVarSetting()` persists via `handleNewEnvVarMode` and uses the stored setting as `finalSettings`; else uses `settings`. Takes `settings: envVarHook.settings` (not the serverConfig), so a transient object put only into the `serverConfig` props does not leak into save. Note `serverConfig` passed to `handleFormSubmit` (index.tsx line 91) is the plain `buildServerConfig` result, without settings.
- `MCP/MCPToolkitForm/MCPServerConfigStep.tsx` — takes prop `serverConfig: MCPServerDetails & { settings: Setting | undefined }` (line 47) and renders `<MCPToolkitTest mcpServer={serverConfig} />` (line 176). The prop type forces `settings` to be `Setting | undefined`.
- `MCP/MCPToolkitTest.tsx` — `testMCP(mcpServer)` from `assistantsStore`; `runTest` is `useCallback` on `[mcpServer, testMCP]`. Also used elsewhere with stored servers (`MCPServerCard.tsx:167`, `MCPServerDetail.tsx:66`) — these must stay unchanged.
- `MCP/MCPToolkitForm/MCPToolsSelectionStep.tsx` — `fetchTools` (useCallback `[mcpServer]`) calls `assistantsStore.getMcpTools(mcpServer)`; initial fetch is in a `useEffect(..., [])` (mount only), so unstable `mcpServer` identity does not cause refetch loops. Auth-prompt retry reuses `fetchTools`.
- `src/store/assistants.ts` — `testMCP` (line 929): `api.post('v1/assistants/mcp/test', { mcp_server: mcpServer })`; `getMcpTools` (line 530): `api.post('v1/assistants/mcp_tools', mcpServer, { skipErrorHandling: true })`. Both pass the object through unchanged; no store change required by the contract. (Note path is `v1/assistants/...`; task text writes `/assistants/...`.)
- `MCP/MCPEnvVarsSection.tsx` — the "new" UI (`MCPServerEnvVars`) only renders when `envVarMode==='new' && required_env_vars.length>0 && isFromMarketplace`; otherwise `IntegrationSelector` is shown regardless of mode.

### Architecture and Layers Affected
- Component/container layer: `MCPToolkitForm/index.tsx` (wiring of `serverConfig` / `mcpServer` props).
- Helper layer: `MCPToolkitForm/formHelpers.ts` (natural home for a pure builder next to `createOrUpdateMcpSetting`), possibly `useEnvVarMode.ts`.
- Types: `src/types/entity/setting.ts`, `src/types/entity/mcp.ts` (`MCPServerDetails.settings?: Setting`), prop type in `MCPServerConfigStep.tsx`.
- Store (`assistants.ts`, `userSettings`): read-only for this task (pass-through).

### Integration Points
- Backend: `POST v1/assistants/mcp/test`, `POST v1/assistants/mcp_tools` (contract from MR !4590; backend task spec is in sibling repo, see Section 8).
- `userSettingsStore` (`@/store/userSettings`) used by `formHelpers.ts` and `useEnvVarMode.ts` (lookup on mount). Test/tools-fetch code paths currently do not touch it.
- `useMCPAuthPrompt` retry loops in both Test and tools step re-send the same `mcpServer` object (will resend inline values).

### Patterns and Conventions
- Valtio stores + hooks; helpers are plain exported functions in `formHelpers.ts` with tests in `MCP/__tests__/formHelpers.test.ts`.
- Spread-conditional pattern for optional fields (`...(x && {k: x})`) is the existing style.
- Apache licence header on every source file (`license-headers:check`).

---

## 3. Documentation Findings

### Guides and Architecture Docs
Guides exist in `.ai-run/guides/` (not individually read in depth): `patterns/state-management.md` (stores, hooks), `development/api-integration.md`, `development/security-patterns.md` (secrets/config), `testing/testing-patterns.md`, `quality-gates.md`. AGENTS.md says write tests only when explicitly requested (the ticket requests unit tests explicitly).

### Architectural Decisions
Recent related history in the form dir: EPMCDME-13500 (config not sent to test endpoint when `use_custom_config=false`; Global/Custom toggle), EPMCDME-15097 (catalogue governance in toolkit config UI), EPMCDME-12744. No ADR found.

### Derived Conventions
Test/tools requests are built from the in-memory `serverConfig`; persistence is isolated to `submitHelpers`/`formHelpers`.

---

## 4. Testing Landscape

### Existing Coverage
- `MCP/__tests__/formHelpers.test.ts` — only `buildServerConfig` (no tests for `createOrUpdateMcpSetting` / `handleNewEnvVarMode`).
- `MCP/__tests__/MCPServerConfigStep.test.tsx` — mocks `MCPToolkitTest`, `MCPConfigSection`, `MCPBasicFields`, `MCPEnvVarsSection`; passes `serverConfig` with `settings: undefined as any`.
- `MCP/__tests__/MCPAuthPromptWiring.test.tsx` — imports `MCPToolkitForm`, mocks `getMcpTools`; closest existing test that exercises the wizard.
- Others: MCPServerEnvVars, MCPConfigSection, MCPToolkit, MCPServerDetail tests.

### Testing Framework and Patterns
Vitest + React Testing Library; unit project (`*.test.tsx`) auto-mocks `useSnapshot` and `@/utils/api` via `setupTests.unit.ts`. Run: `npm run test:unit:slnt`, single file via `npx vitest run --project unit <path>`. Run `npm ci` first (AGENTS.md).

### Coverage Gaps
- No test for `useEnvVarMode`, `submitHelpers`, or `MCPToolkitForm/index.tsx` serverConfig assembly.
- No test asserting Test/tools fetch do not call `userSettingsStore`.

---

## 5. Configuration and Environment

### Environment Variables
None relevant (UI uses `VITE_API_URL` globally; no feature flag for this path).

### Configuration Files
`mock-server/db.json` and `routes.json` exist (json-server); no MCP test/tools routes found in `routes.json` by grep.

### Feature Flags and Deployment Concerns
`mcpCustomServersDisabled` (restricted mode) exists but is out of scope. No deployment change.

---

## 6. Risk Indicators

- Type gap: `Setting = UserSetting | ProjectSetting`; `BaseSetting` requires `user_id, id, date, alias, update_date, default, setting_hash, is_global, setting_type`, so the transient object `{credential_type, project_name, credential_values}` does not satisfy `Setting`. `MCPServerDetails.settings?: Setting` and the `MCPServerConfigStep` prop (`settings: Setting | undefined`) therefore reject it. Speculative: needs a new transient type (e.g. `Pick<BaseSetting,'credential_type'|'project_name'|'credential_values'>`) and widening of `MCPServerDetails.settings` / `testMCP` / `getMcpTools` / `MCPServerConfigStep` prop types, or a request-only type; widening `MCPServerDetails.settings` affects other consumers (`updateMcpServer`, `submitHelpers`, `MCPServerCard`) that expect a full `Setting`. This is the main design decision.
- Mode gating: `envVarMode` initial value is `'new'` even for custom/non-marketplace servers that use `IntegrationSelector` (where `manualEnvVarValues` is empty and `settings` holds the user's selection). Speculative: keying on `envVarMode==='new'` alone could replace a selected setting with nothing; use `shouldCreateNewEnvVarSetting()`-equivalent gating (marketplace + required vars) and fall back to `envVarHook.settings` otherwise.
- Catalog-only: backend ignores inline values for custom configs; UI should still not send for `use_custom_config=true`? (hand-off says backend handles; sending is harmless but values go over the wire needlessly). Decision for spec.
- Mixed state: in new mode with a stale `envVarHook.settings` (e.g. set by effect from `mcpServer.settings` while mode is 'new' because no stored `_env_vars` found) the transient object must win; if it carried an `id` the backend would ignore typed values.
- Empty-value filtering: existing `createOrUpdateMcpSetting` does not filter blanks; the new builder must trim/skip empty entries and return `undefined` when none (requirement 4). Save path must stay unchanged.
- Memoization: new builder output should be memoized on `[manualEnvVarValues, project, mode]` to keep `runTest` / `fetchTools` callbacks stable, although current literals are already unstable and the tools effect is mount-only.
- Step 2 snapshot: the tools fetch fires on mount of Step 2 only, so values edited later require going back and forth; auth-prompt retries resend inline plaintext values (acceptable per contract).
- Secrets: values must not be logged; `MCPToolsSelectionStep` logs `console.error('Error fetching MCP tools:', err)` (err, not the request) - fine, but do not add request logging.
- Cross-repo: blocked by backend MR !4590 (draft); `mock-server` has no MCP routes so contract-first work needs mocking or waiting.
- Test gaps listed in Section 4 raise cost of adding the required unit tests (new test file for wizard wiring needed).

---

## 7. Summary for Complexity Assessment

Single-repo, frontend-only change confined to the MCP toolkit wizard: `MCPToolkitForm/index.tsx` (two prop literals), a new pure helper (likely in `formHelpers.ts`), plausible type adjustments in `src/types/entity/setting.ts` / `mcp.ts` / `MCPServerConfigStep.tsx`. The stores (`assistants.ts` `testMCP`, `getMcpTools`) already pass the server object through unchanged, so no store or API-layer change is evident. Expected file surface: roughly 3-5 source files plus 2-3 test files.

Technical novelty is low (no new dependencies, no new patterns); the one non-trivial point is typing: the existing `Setting` type requires server-generated fields (`id`, `user_id`, ...), so representing a transient, id-less settings object without casting needs a type decision that ripples through `MCPServerDetails.settings` consumers. Gating must also be on the effective "inline env vars are in use" condition rather than the raw `envVarMode` flag, because its default is `'new'` even for servers whose env comes from `IntegrationSelector`.

Test posture: the directory has tests for `buildServerConfig` and the config step (with mocked children) but nothing for `useEnvVarMode`, `submitHelpers`, or the container's serverConfig assembly, so new tests (builder unit tests; wizard-level test asserting request payload and no `userSettingsStore` calls, modelled on `MCPAuthPromptWiring.test.tsx`) are net-new. Dependency: backend MR !4590 must merge (or be mocked) before end-to-end verification.

---

## 8. External References

- `../codemie/docs/superpowers/tasks/2026-10-21-epmcdme-11766-infongen-mcp-server-integration-fail/spec.md` (resolved path `/home/volhamakarava/codemie-dev/codemie/docs/superpowers/tasks/2026-10-21-epmcdme-11766-infongen-mcp-server-integration-fail/spec.md`): directory exists (also contains `ui-handoff.md`, `plan.md`, `technical-analysis.md`); marked reference-only by the task and NOT read in detail here. The contract facts relied on are those quoted in Section 1 from the hand-off.
- MR !4590 (codemie): not accessible from the filesystem; contract taken from task_context only.
