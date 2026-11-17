# EPMCDME-11766 (codemie-ui): send typed "new" env vars with Test and the Step-2 tools fetch

Size M (15). Frontend only. Blocked by backend MR !4590 (draft); verify end to end after it merges.

## Problem and intent

In the MCP toolkit wizard, "new" env-var mode keeps typed values only in UI state (`manualEnvVarValues`, `MCPToolkitForm/useEnvVarMode.ts`). They are persisted on submit only (`submitHelpers.ts` -> `handleNewEnvVarMode` -> `createOrUpdateMcpSetting`, `formHelpers.ts`). Test (`MCPToolkitTest`, via `MCPServerConfigStep.tsx`) and the Step-2 tools fetch (`MCPToolsSelectionStep` -> `getMcpTools`) send `settings: envVarHook.settings`, which is `undefined` in "new" mode. The server therefore starts without credentials. After MR !4590 the backend accepts an id-less `settings` with `credential_values` and uses it for that one call. The UI must send it.

## Behavior

1. A pure builder in `formHelpers.ts` turns `manualEnvVarValues` and the wizard's `project` prop into a transient settings object: `credential_type: "MCP"`, `project_name`, `credential_values: [{key, value}]`, with no `id` and no other fields. Entries whose value is empty after trim are dropped. Kept values are sent as typed, not trimmed. It returns `undefined` when no entries remain.
2. `MCPToolkitForm/index.tsx` computes one memoized `requestSettings` and uses it as `settings` in both the `serverConfig` prop of `MCPServerConfigStep` and the `mcpServer` prop of `MCPToolsSelectionStep` (currently `index.tsx:169-173` and `183-187`):
   - Inline mode applies only when the UI shows the "new" inputs. That means `envVarHook.shouldCreateNewEnvVarSetting()` is true (mode `new`, server has required env vars, `isFromMarketplace`), which matches `MCPEnvVarsSection.tsx:69`, and the built config has `use_custom_config` false. Raw `envVarMode === 'new'` is not enough, because it defaults to `'new'` for servers whose env comes from `IntegrationSelector`.
   - In inline mode the result is the builder output, or `undefined` if nothing was typed. A stale `envVarHook.settings` (possibly carrying an `id`) must never win here.
   - In every other case the result is `envVarHook.settings`, unchanged. This covers existing-integration mode, non-marketplace servers, and custom-config servers.
3. `mcp_config_id` is still sent as today. No catalog logic is added to the UI.
4. Nothing is persisted on Test or on the tools fetch. The save path (`onSubmit` / `handleFormSubmit`) keeps reading `envVarHook.settings` and `manualEnvVarValues`, so the transient object never reaches it.
5. The memoized value depends on `[mode gate inputs, manualEnvVarValues, project, use_custom_config, envVarHook.settings]`. Test's `runTest` and the tools step's `fetchTools` therefore do not change identity on unrelated renders. The tools fetch is mount-only, so values edited after entering Step 2 apply only after going Back and forward again (existing behavior, accepted).
6. Typed values are plaintext in the request body. Do not add client-side logging of the request, the settings object or the values.

## Typing (minimal ripple)

`Setting` requires server fields (`id`, `user_id`, `date`, ...). Do not cast a fake id and do not widen `MCPServerDetails.settings`, which stored-server consumers (`submitHelpers`, `updateMcpServer`, `MCPServerCard`, `MCPServerDetail`) rely on being a full `Setting`.

- Add an exported `InlineMcpSettings` type in `src/types/entity/setting.ts` (the three fields above).
- Add a request-only type in `src/types/entity/mcp.ts`: `MCPServerRequest = Omit<MCPServerDetails, 'settings'> & { settings?: Setting | InlineMcpSettings }`.
- Use it for: `testMCP` and `getMcpTools` parameters (`src/store/assistants.ts` interface and implementations; the request bodies are unchanged), the `mcpServer` prop of `MCPToolkitTest` and `MCPToolsSelectionStep`, and the `serverConfig` prop of `MCPServerConfigStep`. A full `MCPServerDetails` stays assignable, so `MCPServerCard.tsx` and `MCPServerDetail.tsx` need no change.

## Acceptance criteria

- AC1: New mode, catalog server, values typed, Test sends `settings = {credential_type: "MCP", project_name: <wizard project>, credential_values: [...]}` with no `id`.
- AC2: The same state loads the tools list in Step 2, and `/assistants/mcp_tools` carries the same settings shape.
- AC3: Test and the tools fetch fire no `userSettingsStore` create, update or find call. Submit still creates or updates the `<name>_env_vars` setting exactly as before.
- AC4: Empty or whitespace-only entries are omitted. With nothing typed the request has no `settings` key (or `undefined`).
- AC5: Existing-integration mode sends the stored setting with its `id`, as before.
- AC6: Custom-config servers (`use_custom_config` true) and non-marketplace servers send `envVarHook.settings`, as before.
- AC7: `project_name` is the wizard's `project` prop.
- AC8: Unit tests: builder cases (values, blanks dropped, none typed -> `undefined`, no `id`, project used); wizard-level wiring test, modelled on `__tests__/MCPAuthPromptWiring.test.tsx`, asserting the `testMCP` and `getMcpTools` payloads in new, existing and custom modes, and that `userSettingsStore` methods are not called on Test or the tools fetch. `tsc` and lint pass.

## Non-goals

- No backend, SDK or API-model change; no new API field; no store logic change beyond parameter types.
- No change to the save flow or to `createOrUpdateMcpSetting` (it still does not filter blanks).
- No restricted-mode (`mcpCustomServersDisabled`) handling.
- No error-wording change.
- No UI duplication of catalog logic (no filtering by `required_env_vars` on the client).
- No change to `MCPToolkitTest` / `MCPServerCard` / `MCPServerDetail` behavior for stored servers.
- No `mock-server` routes unless needed for local verification.

## Risks

- Cannot be verified end to end until MR !4590 merges.
- The tools fetch is a mount-only snapshot, and auth-prompt retries resend the same plaintext values.
