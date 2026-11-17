# EPMCDME-11766 Inline "new" env vars for MCP Test and tools fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the MCP toolkit wizard's "new" env-var mode, send typed values as a transient id-less `settings` object with Test and the Step-2 tools fetch, persisting nothing.

**Architecture:** A pure builder in `formHelpers.ts` makes the transient settings; `MCPToolkitForm/index.tsx` memoizes one `requestSettings` (builder output in inline mode, otherwise `envVarHook.settings`) and passes it to both child props. A request-only type avoids widening `MCPServerDetails.settings`.

**Tech Stack:** React 18, TypeScript 5, Valtio, Vitest + React Testing Library (`unit` project).

**Spec:** `docs/superpowers/tasks/2026-10-21-epmcdme-11766-ui-inline-env-test/spec.md` (analysis: `technical-analysis.md` alongside).

## Global Constraints

- Base dir `MCP` = `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit`.
- Commit per task using the repository's existing convention; subject prefix `EPMCDME-11766`. Do not hand-run prettier/eslint (hook does it). New files need the Apache licence header.
- No fake `id`, no cast; do not widen `MCPServerDetails.settings`.
- No client-side logging of the request, settings object or values.
- Do not change `createOrUpdateMcpSetting`, `submitHelpers.ts`, the save flow, store logic (types only), `mock-server`, restricted mode, or add catalog filtering (`required_env_vars`) in the UI.

## Review Focus

- Value with surrounding spaces ("  abc ") is kept as typed (not trimmed); whitespace-only is dropped. (Task 2)
- Stale `envVarHook.settings` carrying an `id` in inline mode must not win. (Task 3)
- Raw `envVarMode === 'new'` with a non-marketplace or custom-config server must keep `envVarHook.settings`. (Task 3)
- Changing `project` changes `project_name` in the sent settings. (Task 3)
- `mcp_config_id` still present in both payloads. (Task 3)

---

### Task 1: Request-only types

**Files:**
- Modify: `src/types/entity/setting.ts` (after `Setting`, ~line 46), `src/types/entity/mcp.ts` (near `MCPServerDetails`, line 109-119)
- Modify: `src/store/assistants.ts:127,190,530,929` (interface + implementations of `getMcpTools`, `testMCP`)
- Modify: `MCP/MCPToolkitTest.tsx`, `MCP/MCPToolkitForm/MCPToolsSelectionStep.tsx` (`mcpServer` prop), `MCP/MCPToolkitForm/MCPServerConfigStep.tsx:47` (`serverConfig` prop)

**Interfaces:**
- Produces: `InlineMcpSettings`, `MCPServerRequest` (below).

Test-first: no — type-only change; verified by `npx tsc --noEmit` showing no new errors (existing callers `MCPServerCard.tsx`, `MCPServerDetail.tsx` still compile because `MCPServerDetails` stays assignable).

- [ ] **Step 1:** Add the types and swap them into the listed parameter/prop types. Request bodies and store behaviour stay unchanged; `MCPServerConfigStep`'s `serverConfig` becomes `MCPServerRequest`.

```ts
// setting.ts
export type InlineMcpSettings = Pick<
  BaseSetting,
  'credential_type' | 'project_name' | 'credential_values'
>
// mcp.ts
export type MCPServerRequest = Omit<MCPServerDetails, 'settings'> & {
  settings?: Setting | InlineMcpSettings
}
```

`BaseSetting` is not exported; export it or define the three fields explicitly (`credential_type: string`, `project_name: string`, `credential_values: SettingCredentialValue[]`).

- [ ] **Step 2:** Run `npx tsc --noEmit`; expect no errors introduced.

### Task 2: Transient settings builder

**Files:**
- Modify: `MCP/MCPToolkitForm/formHelpers.ts` (add export next to `createOrUpdateMcpSetting`)
- Test: `MCP/__tests__/formHelpers.test.ts`

**Interfaces:**
- Consumes: `InlineMcpSettings` (Task 1).
- Produces: `buildInlineMcpSettings(manualEnvVarValues: Record<string, string>, project: string): InlineMcpSettings | undefined`.

Test-first: yes — `buildInlineMcpSettings` is not exported, so the new `describe` fails on import/undefined function.

- [ ] **Step 1: Write failing tests** (add `describe('buildInlineMcpSettings')`):
  - `{A:'1', B:'2'}`, `'proj'` -> `{credential_type:'MCP', project_name:'proj', credential_values:[{key:'A',value:'1'},{key:'B',value:'2'}]}` and `result` has no `id` key (`toEqual` exact keys).
  - `{A:'  ', B:'', C:'x'}` -> only `C` kept.
  - `{A:'  abc '}` -> value stays `'  abc '` (untrimmed).
  - `{}` and all-blank -> `undefined`.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/formHelpers.test.ts`; expect FAIL.
- [ ] **Step 3:** Implement the exported pure function: filter on `value.trim() !== ''`, map to `{key, value}`, return `undefined` if empty. No logging, no store access.
- [ ] **Step 4:** Re-run the same command; expect PASS.

### Task 3: Wire `requestSettings` into the wizard

**Files:**
- Modify: `MCP/MCPToolkitForm/index.tsx:84-87` (add memo after `serverConfig`), `:169-173` and `:183-187` (use it as `settings`)
- Test (create): `MCP/__tests__/MCPToolkitFormInlineEnv.test.tsx`

**Interfaces:**
- Consumes: `buildInlineMcpSettings` (Task 2), `envVarHook.shouldCreateNewEnvVarSetting()`, `serverConfig.use_custom_config`.

Test-first: yes — wizard currently sends `envVarHook.settings` (undefined in new mode), so the "new mode" payload assertions fail.

- [ ] **Step 1: Write failing wiring test**, modelled on `MCP/__tests__/MCPAuthPromptWiring.test.tsx` (mock `@/store` `assistantsStore.testMCP/getMcpTools`, `@/components/Popup`, `@/components/Checker`, `@/hooks/useMCPAuthPrompt`). Mock `../MCPToolkitForm/useEnvVarMode` to return controllable state; mock `../MCPToolkitForm/MCPServerConfigStep` to render the real `MCPToolkitTest` with its `serverConfig` prop plus a Next button calling `onNext`. Mock `@/store/userSettings` with spy `findUserSetting/createUserSetting/updateUserSetting` and `vi.clearAllMocks()` after mount. Cases:
  - new mode (marketplace, required vars, `manualEnvVarValues={A:'v', B:' '}`, project `'proj'`, stale `settings` with `id`): click Test -> `testMCP` called with `mcp_server.settings` equal `{credential_type:'MCP', project_name:'proj', credential_values:[{key:'A',value:'v'}]}` (no `id`) and `mcp_config_id` preserved; click Next -> `getMcpTools` receives the same `settings`.
  - rerender with other `project` -> `project_name` follows.
  - nothing typed -> `settings` is `undefined`.
  - existing mode -> stored setting with its `id` sent.
  - custom config (`use_custom_config` true) and non-marketplace with mode `'new'` -> `envVarHook.settings` sent.
  - in every case none of the `userSettingsStore` spies were called after Test/Next.
  If mounting the real `useMCPForm` proves impractical, mock it with a stub form.
- [ ] **Step 2:** Run `npx vitest run --project unit <path of the new test>`; expect the new-mode cases FAIL.
- [ ] **Step 3:** In `index.tsx` add `const requestSettings = useMemo(...)`: if `envVarHook.shouldCreateNewEnvVarSetting() && !serverConfig.use_custom_config` return `buildInlineMcpSettings(envVarHook.manualEnvVarValues, project)`, else `envVarHook.settings`. Deps: `[envVarHook.envVarMode, envVarHook.manualEnvVarValues, envVarHook.settings, mcpServer, project, serverConfig.use_custom_config]`. Replace `settings: envVarHook.settings` with `settings: requestSettings` in the two prop literals only; leave `onSubmit`/`handleFormSubmit` reading `envVarHook.settings`.
- [ ] **Step 4:** Re-run the new test, `formHelpers.test.ts`, `MCPServerConfigStep.test.tsx` and `MCPAuthPromptWiring.test.tsx`; expect PASS. Run `npx tsc --noEmit`.
