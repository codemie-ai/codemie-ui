# Spec — EPMCDME-14867: MCP discovery failure silently dropped in Chat UI

Research: `technical-analysis.md`. Size M.

## Goal

When the backend returns an MCP auth discovery failure 401 payload (`error: 'authentication_required'`,
`servers` with `status: 'discovery_failed'`), the Chat UI surfaces it as a visible prompt instead of
dropping it and rendering the generic "An error occurred" fallback.

## Root cause

`normalizeMCPAuthGateServer` (`src/utils/mcpAuth.ts:89`) requires `mcp_config_id` to be non-empty.
Inline MCP configs sent by the backend carry `mcp_config_id: null`, so they return `null` and are
filtered out — `parseMCPAuthRequiredErrorPayload` sees zero rows, the streaming error handler falls
through to the generic error path, and `AssistantAuthGateRow`'s `discovery_failed` rendering
(amber warning badge, "Server unavailable") is never reached.

## Behavior

**Normalization — allow null `mcp_config_id`.** `normalizeMCPAuthGateServer` accepts rows where
`mcp_config_id` is `null` or empty, treating the `configName` field as the fallback identity.
`parseMCPAuthRequiredErrorPayload` passes them through instead of filtering them out.

**Synthetic React keys for inline configs.** `ChatAiMcpAuthPrompt.tsx` renders each row with
`key={${row.mcp_config_id}-${row.status}}` (line 70). When `mcp_config_id` is null, that becomes
`"null-discovery_failed"` — colliding across multiple inline configs. The component uses
`syntheticKey` as the key instead, and the caller (`ChatAiMessage`) assigns `syntheticKey: 'inline-N'`
to inline config rows before passing them to `ChatAiMcpAuthPrompt`.

Where to assign the synthetic keys:
- Option: `parseMCPAuthRequiredErrorPayload` itself, since it already maps over servers. Simpler: add
  a counter in the parse function that assigns `syntheticKey: 'inline-0'`, `'inline-1'`, etc. to rows
  where `mcp_config_id` is null.
- `ChatAiMcpAuthPrompt` uses `row.syntheticKey ?? row.mcp_config_id` as the key.
- `AssistantAuthGateRow` already receives the full row object and does not key by `mcp_config_id` —
  no change needed there.

**Heading for discovery-only prompts.** `getPromptHeading` in `ChatAiMcpAuthPrompt.tsx` gains a third
branch: when ALL rows have `status === 'discovery_failed'`, the heading is "MCP server unavailable".
When some rows are `discovery_failed` and others are `authentication_required` or `session_expired`,
the existing heading logic applies to the non-discovery rows.

**"undefined: undefined" copy.** The `AssistantAuthGateRow` renders an `InfoWarning` with
`error_context` when `error_context` is present (line ~63-66). For `discovery_failed` rows, the
backend may send `error_context: null` or an empty string, and the row's config name/servername may
be `"undefined"`. The fix: when `status === 'discovery_failed'` and `configName` or `serverName` is
falsy or `"undefined"`, the row shows "An MCP server discovery failed — check the URL in your chat
message or project configuration" instead.

**Badge text (ticket AC4).** The `discovery_failed` status badge in `AssistantAuthGateRow` reads
"Server unavailable" (it previously read "Unavailable"). It stays amber (`StatusEnum.Warning`).

**Discovery failures in `warnings` (ticket AC7).** When a payload mixes sign-in failures with
discovery failures, the backend puts the sign-in rows in `servers` and the discovery rows in
`warnings`. `parseMCPAuthRequiredErrorPayload` reads both and appends the `warnings` rows after the
`servers` rows. It takes only `warnings` entries with `status: 'discovery_failed'`, so `warnings`
can never add a row the user is asked to sign in to. Inline rows from `warnings` get synthetic
keys from the same index sequence (`inline-N`, where N is the position in `servers` + `warnings`).
`MCPAuthRequiredErrorResponse` gains an optional `warnings` field.

**No "undefined: undefined" (ticket related observation).** `_handleGenerationStreamError` in
`src/store/chatGeneration.ts` builds the message only from the fields that exist. It handles
`{ error: { message, details, help } }`, a flat `{ message, details, help }`, an `Error`, and
`{ error: '<code>' }`. A missing field is left out instead of printing as `undefined`. A
payload with no text at all shows just "Oops! Something went wrong".

**Subtitle text for discovery-only prompts.** The subtitle text "Complete sign-in for the affected
MCP server, then resend the failed turn." (line 63-65) is correct for auth-required rows but
misleading for discovery-only prompts. When ALL rows are `discovery_failed`, the subtitle reads
"One or more MCP server URLs could not be reached. Verify the server address and retry."

## Acceptance criteria

1. A 401 payload where every server row has `status: 'discovery_failed'` triggers the
   `ChatAiMcpAuthPrompt` mount, with heading "MCP server unavailable", an amber "Server
   unavailable" badge, and the discovery-specific subtitle.
2. Inline MCP configs (`mcp_config_id: null`, `status: 'discovery_failed'`) survive normalization
   and render as `AssistantAuthGateRow` instances with synthetic React keys (e.g. `inline-0`).
3. When a `discovery_failed` row has `configName` / `serverName` that are `"undefined"` or empty, the
   row shows a fallback message ("An MCP server discovery failed — check the URL in your chat
   message or project configuration") instead of "undefined: undefined".
4. A mixed payload (some rows `discovery_failed`, others `authentication_required` or
   `session_expired`) renders both row types; the heading follows the highest-severity auth-entitled
   status (e.g. "Re-authentication required" if any `session_expired`, else "Authentication
   required" if any `authentication_required`).
5. A payload with only `authentication_required` or `session_expired` rows renders identically to
   today — no regression.
6. A mixed payload whose discovery failures arrive in `warnings` shows those servers as
   `discovery_failed` rows next to the sign-in rows (ticket AC7).
7. No chat error message contains the text "undefined", whatever shape the error payload has
   (ticket related observation).
8. Regression tests cover the figma scenario end to end: parser, store, prompt and row (ticket AC8).

## Non-goals

- No changes to the backend `toolkit_service` or the 401 payload shape.
- No changes to the shape of existing `MCPAuthGateServer` fields. `syntheticKey` is added as an optional field.
- No changes to the sign-in flow (`initiatePromptAuth`, `continuePromptAuth`, `cancelPromptAuth`) —
  `AssistantAuthGateRow` already hides the "Authenticate" button for `discovery_failed` rows.

## Files to change

| File | Change |
|---|---|
| `src/utils/mcpAuth.ts` | Allow null `mcp_config_id` in `normalizeMCPAuthGateServer`; assign `syntheticKey` in `parseMCPAuthRequiredErrorPayload`; also read `discovery_failed` rows from `warnings` |
| `src/types/entity/mcpAuth.ts` | Add optional `syntheticKey?: string` to `MCPAuthGateServer`; add optional `warnings` to `MCPAuthRequiredErrorResponse` |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMcpAuthPrompt.tsx` | `getPromptHeading` add `discovery_failed` branch; use `syntheticKey ?? mcp_config_id` as React key; condition subtitle on row statuses |
| `src/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow.tsx` | Badge text "Server unavailable"; fallback copy for `discovery_failed` rows with missing config names |
| `src/store/chatGeneration.ts` | `_handleGenerationStreamError` joins only the fields that exist (no "undefined") |

## Testing

Extend `AssistantAuthGateRow` unit tests and add integration tests for `ChatAiMcpAuthPrompt`:
- `discovery_failed` rows render amber badge and server-unavailable copy.
- Synthetic keys assigned to inline config rows; no duplicate-key React warning.
- All-discovery heading reads "MCP server unavailable"; mixed heading uses auth-entitled status.
- Subtitle swaps for all-discovery vs mixed vs all-auth prompts.
- Existing auth-required and session-expired rendering is unchanged.

Ticket regression coverage (AC8, AC7, related observation):

| Test file | Covers |
|---|---|
| `src/utils/__tests__/mcpAuth.test.ts` | Figma payload parses to one inline row with `syntheticKey: 'inline-0'`; per-row keys; id-less sign-in rows still rejected; `warnings` discovery rows appended; non-discovery `warnings` ignored |
| `src/store/__tests__/chatGeneration.test.ts` | Figma 401 from the stream becomes `mcpAuthPromptRows` with no generic error text; `_handleGenerationStreamError` never prints "undefined" |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMcpAuthPrompt.test.tsx` | Two inline figma-style rows: heading "MCP server unavailable", two "Server unavailable" badges, no buttons, no duplicate-key warning |
| `src/pages/chat/components/AssistantAuthGate/__tests__/AssistantAuthGateRow.test.tsx` | `discovery_failed` row: "Server unavailable" badge, `error_context` shown, no sign-in button |