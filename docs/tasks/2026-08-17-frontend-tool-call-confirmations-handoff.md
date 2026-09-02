# Frontend Handoff: Tool Call Confirmations

**Ticket:** EPMCDME-13903  
**Branch:** `EPMCDME-13903_chat-tool-call-confirmations`

## What was built

The frontend now supports per-assistant tool call policy, a user-overridable in-chat dropdown, and a confirmation/denial flow when the assistant requires approval before executing a tool.

---

## Policy model

`ToolCallPolicy` is a string enum defined in `src/components/ToolCallPolicyDropdown/ToolCallPolicyDropdown.tsx`:

```ts
export enum ToolCallPolicy {
  ASK_FOR_APPROVAL = 'ask_for_approval',
  AUTO_APPROVE     = 'auto_approve',
  APPROVE_FOR_ME   = 'approve_for_me',   // not yet exposed in UI
}
```

---

## Assistant form (`AssistantForm`)

Two new fields under **Tool Permissions**:

| Field | Type | Default | Notes |
|---|---|---|---|
| `tool_call_policy` | `ToolCallPolicy` | `auto_approve` | Dropdown via `ToolCallPolicyDropdown` (default variant) |
| `allow_override` | `boolean` | `false` | Switch — when `true`, the chat user can change the policy at runtime |

Saved to `tool_permissions: { tool_call_policy, allow_override }` on the assistant PUT payload.

---

## Chat prompt toolbar

`ChatPromptToolCallPolicy` renders in the prompt toolbar when:
- the conversation has at least one tool-enabled assistant
- **all** assistants in the conversation have `allow_override: true`
- `toolPermissions.loaded` is `true` (fresh data has been fetched)

The effective policy is the **most-restrictive merge** across all assistants: if any assistant sets `ask_for_approval`, that becomes the default.

### State object (`toolPermissions`)

```ts
{
  policy: ToolCallPolicy       // effective policy — user may change this via dropdown
  allowOverride: boolean       // whether the toolbar dropdown is shown
  loaded: boolean              // false while assistant data is being fetched
}
```

Each time the conversation's `assistantIds` changes, fresh assistant data is fetched (`getAssistant`) and the state is reset from API results — no stale cache.

### Pending wiring (needs backend)

The comment below is the only placeholder in ChatPrompt:

```ts
// Conversation-level policy (when backend adds it) would override assistantPolicy here
```

Once `GET /api/v1/conversations/{id}` returns `tool_call_policy`, read it from `currentChat` and initialise `toolPermissions.policy` from it rather than from the assistant default. Also `PATCH` the conversation when the user changes the dropdown. See `docs/tasks/2026-08-17-conversation-tools-config-handoff.md`.

---

## Tool call interruption flow

When the backend interrupts generation and requires confirmation (`thought.interrupted = true` on a history entry), the chat enters a **tool call pending** state.

`ChatControls` renders Approve / Deny buttons.  
On click, `ChatGenerationOptions.toolCallAction: 'allow' | 'deny'` is sent in the next generation call.

Relevant types: `src/types/chatGeneration.ts` — `ChatGenerationOptions.toolCallAction`.

---

## Tenant enforcement floor (`customer-config.yaml`)

The backend can enforce a minimum approval level for all users on a tenant via `customer-config.yaml`. The frontend sends its `tool_call_policy` as normal — the backend silently upgrades it if the tenant floor is stricter.

```yaml
tool_permissions:
  enabled: true
  tool_call_policy: "ask_for_approval"  # ask_for_approval | approve_for_me | auto_approve
```

**Strictness order (most → least restrictive):** `ask_for_approval` > `approve_for_me` > `auto_approve`

The floor applies only when `enabled: true` AND `tool_call_policy` is set. If either is absent, the caller's value wins.

| Tenant config | FE sends | Effective |
|---|---|---|
| key absent | any | caller wins |
| `enabled: false` | any | caller wins |
| `enabled: true`, no policy | any | caller wins |
| `enabled: true`, `ask_for_approval` | `auto_approve` | `ask_for_approval` |
| `enabled: true`, `approve_for_me` | `ask_for_approval` | `ask_for_approval` (already stricter) |
| `enabled: true`, `approve_for_me` | `auto_approve` | `approve_for_me` |

### Frontend implications

The effective policy is determined server-side after enforcement. The frontend has no visibility into whether its sent value was upgraded. If a future UX requirement needs to show the user "your policy was enforced by your organisation", the backend would need to return the effective policy in the generation response or a dedicated config endpoint.

---

## Key files

| File | Role |
|---|---|
| `src/components/ToolCallPolicyDropdown/ToolCallPolicyDropdown.tsx` | Shared dropdown + `ToolCallPolicy` enum |
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | `toolPermissions` state, fetch, merge, pass-through to generation |
| `src/pages/chat/components/ChatPrompt/ChatPromptToolCallPolicy.tsx` | Toolbar wrapper (label + dropdown) |
| `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` | `tool_call_policy` + `allow_override` form fields |
| `src/types/chatGeneration.ts` | `tool_call_policy` on `ChatRequest`; `toolCallPolicy` + `toolCallAction` on `ChatGenerationOptions` |
| `src/store/chatGeneration.ts` | Serialises `toolCallPolicy` → `tool_call_policy` in the API payload |
