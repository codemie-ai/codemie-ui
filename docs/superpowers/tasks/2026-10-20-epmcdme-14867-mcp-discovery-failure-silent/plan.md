# Plan — EPMCDME-14867: MCP discovery failure silently dropped in Chat UI

Branch: `EPMCDME-14867_mcp-discovery-failure-silent` · Size: M · Tasks 1–4 (initial), 5–8 (ticket gaps found in review)

## Task 1 — Type: add `syntheticKey` to `MCPAuthGateServer`

**File:** `src/types/entity/mcpAuth.ts`
**Change:** Add optional field `syntheticKey?: string` to the `MCPAuthGateServer` interface.
**Rationale:** Rows with `mcp_config_id: null` (inline configs) need a stable React key. The field is optional — stored DB configs skip it.

---

## Task 2 — Parser: accept null `mcp_config_id`, assign synthetic keys

**File:** `src/utils/mcpAuth.ts`
**Changes (in order):**

1. `normalizeMCPAuthGateServer` (L83–103):
   - Remove the `if (!mcpConfigId) return null` guard for null/empty `mcp_config_id`.
   - Keep the `configName` guard (must be non-empty).
   - `mcp_config_id` in the returned object is the raw value (string or empty string) — the type changes downstream to `string` in `MCPAuthGateServer`, so cast `getNonEmptyString(value.mcp_config_id) ?? ''`.

2. `parseMCPAuthRequiredErrorPayload` (L105–119):
   - Add a counter (`let inlineIndex = 0`) before the `.map()`.
   - Inside the map, after `normalizeMCPAuthGateServer` returns a row, if `row.mcp_config_id` is empty/null, set `row.syntheticKey = \`inline-${inlineIndex++}\``.
   - No longer return `null` on zero rows — `normalizeMCPAuthGateServer` no longer drops null-ID rows, so the `rows.length ? rows : null` guard is sufficient but unchanged.

---

## Task 3 — Prompt heading: "MCP server unavailable" for discovery-only

**File:** `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMcpAuthPrompt.tsx`
**Changes:**

1. `getPromptHeading` (L28–33):
   - Add a first branch: if `rows.every(r => r.status === 'discovery_failed')`, return `'MCP server unavailable'`.
   - Existing `rows.some(r => r.status === 'session_expired')` → `'Re-authentication required'` branch unchanged.
   - Existing `'Authentication required'` fallback branch unchanged.
   - Move the `allDiscovery` check before the auth branches so it takes priority.

2. Subtitle text (where it reads "Complete sign-in for the affected MCP server, then resend the failed turn."):
   - Add condition: if `rows.every(r => r.status === 'discovery_failed')`, render "One or more MCP server URLs could not be reached. Verify the server address and retry."
   - Otherwise keep the existing sign-in subtitle.

3. React key (L70 — `key={\`${row.mcp_config_id}-${row.status}\`}`):
   - Change to `key={(row.syntheticKey ?? row.mcp_config_id) + '-' + row.status}`.

---

## Task 4 — Row: fallback copy for discovery_failed with missing names

**File:** `src/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow.tsx`
**Changes:**

1. In the `discovery_failed` branch of the `InfoWarning` rendering (where `error_context` is shown):
   - Add a guard: when `status === 'discovery_failed'` and (`configName` is falsy or `"undefined"` or `serverName` is falsy or `"undefined"`), render the fallback message:
     `"An MCP server discovery failed — check the URL in your chat message or project configuration"`
   - Otherwise keep the existing `error_context ?? 'Authentication discovery is unavailable right now.'` as the message.

---

## Task 5 — Badge text "Server unavailable" (ticket AC4)

**File:** `src/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow.tsx`
**Change:** `STATUS_BADGES.discovery_failed.text`: `'Unavailable'` → `'Server unavailable'`. Keep `StatusEnum.Warning` (amber).

---

## Task 6 — Read discovery rows from `warnings` (ticket AC7)

**Files:** `src/utils/mcpAuth.ts`, `src/types/entity/mcpAuth.ts`
**Changes:**

1. `parseMCPAuthRequiredErrorPayload`: build the row list from `[...servers, ...warnings]`, taking only `warnings` entries that are objects with `status === 'discovery_failed'`. Synthetic keys use the index in the combined list.
2. `MCPAuthRequiredErrorResponse`: add `warnings?: MCPAuthGateServer[]`.

---

## Task 7 — No "undefined: undefined" in chat errors (ticket related observation)

**File:** `src/store/chatGeneration.ts`
**Change:** Rewrite `_handleGenerationStreamError` to read `message`, `details` and `help` from `error.error` (when it is an object) or from the error itself. When `error.error` is a string code, use it as the message. Join only the non-empty parts:
`Oops! Something went wrong \n <message>: <details> \n <help>`. Missing parts are left out. Add the module helpers `isPlainObject` and `toErrorText`.

---

## Task 8 — Regression tests for the figma scenario (ticket AC8)

| File | Tests added |
|---|---|
| `src/utils/__tests__/mcpAuth.test.ts` | `parseMCPAuthRequiredErrorPayload`: figma inline row kept with `inline-0`; per-row synthetic keys; id-less sign-in row rejected; `warnings` discovery rows appended; non-discovery `warnings` ignored; non-gate payloads return null |
| `src/store/__tests__/chatGeneration.test.ts` | Figma 401 → `mcpAuthPromptRows`, no generic response; `_handleGenerationStreamError` for nested, bare-code, message-only, `Error` and empty payloads |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMcpAuthPrompt.test.tsx` | Two inline discovery rows: heading, two badges, no buttons, no duplicate-key warning |
| `src/pages/chat/components/AssistantAuthGate/__tests__/AssistantAuthGateRow.test.tsx` | `discovery_failed` row: badge, `error_context`, no buttons |

---

## Verification plan

1. Run existing unit tests to confirm no regression:
   ```
   npx vitest run --project unit
   ```
2. Run the touched test files specifically:
   ```
   npx vitest run --project unit src/utils/__tests__/mcpAuth.test.ts src/store/__tests__/chatGeneration.test.ts src/pages/chat/components/AssistantAuthGate/__tests__/AssistantAuthGateRow.test.tsx src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMcpAuthPrompt.test.tsx
   ```
3. Type-check:
   ```
   npx tsc --noEmit
   ```
4. Lint:
   ```
   npm run lint
   ```