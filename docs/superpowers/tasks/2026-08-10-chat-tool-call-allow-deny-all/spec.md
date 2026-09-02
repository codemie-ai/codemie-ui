# Spec: Tool Call Allow All / Deny All

## Context

Tool call confirmations land in the chat as per-call Allow/Deny buttons (on `thought.interrupted`).
This feature adds two things:
1. A cleaner label on the assistant-edit toggle so both states are explicit.
2. A conversation-level "Allow All / Deny All" control in the chat prompt — stubbed (no auto-resume logic yet).

Backend field unchanged: `assistant.tool_permissions.require_confirmation: boolean`.

---

## 1. Assistant Edit Page — Relabel the Switch

**File**: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx`

Change `renderRequireConfirmation` so the `Switch` label reflects the active state:

| `require_confirmation` | Current label | New label |
|---|---|---|
| `false` | "Require user confirmation" | "Allow All" |
| `true`  | "Require user confirmation" | "Deny All" |

Implementation: pass `label={field.value ? 'Deny All' : 'Allow All'}` to `Switch`.
No change to the underlying boolean field, form schema, or API payload.

---

## 2. Chat Prompt — Conversation-Level Policy Control

### New component

`src/pages/chat/components/ChatPrompt/ChatPromptToolCallPolicy.tsx`

Renders:
```
Tool calls:  [Allow All]  [Deny All]
```
Two small toggle buttons. Active state is highlighted. Initially neither is selected (policy = null).
Clicking the already-active button deselects (returns to null).

**Props**:
```ts
interface Props {
  disabled?: boolean
}
```

**Local state**: `const [policy, setPolicy] = useState<'allow' | 'deny' | null>(null)`

Backend: no calls. Stub only — auto-resume wiring is out of scope.

### Placement in ChatPrompt.tsx

Add the control in the bottom-left toolbar row, **after** `DynamicToolsSettings`, visible when:
```ts
assistantFeatures.tools && !currentChat?.isWorkflow && !isSharedPage
```

Pass `disabled={isPromptDisabled || isToolCallPolicyLocked}`.

### Locked state

`isToolCallPolicyLocked` is `true` when any assistant attached to the conversation has
`tool_permissions.require_confirmation = true`.

Derivation in `ChatPrompt.tsx`:
- Get assistant IDs from `currentChat.assistantIds`
- Look up each in `assistantsStore.assistants`
- Return `true` if any has `tool_permissions?.require_confirmation === true`

When locked: buttons are disabled, tooltip on the control reads
_"Disabled — assistant requires per-call confirmation"_.

---

## Acceptance Criteria

1. **Assistant edit page**: Switch inside the Tools Configuration accordion shows "Allow All" when off and "Deny All" when on. Toggling saves the same `require_confirmation` boolean as before.
2. **Chat prompt**: "Tool calls: Allow All / Deny All" control appears for non-workflow, non-shared chats with a tool-capable assistant.
3. **Selection**: Clicking a button activates it (highlighted); clicking it again deactivates. The other button deactivates when the first is activated.
4. **Locked**: When the assistant has `require_confirmation = true`, both buttons are disabled and show a tooltip.
5. **No backend calls**: Selecting a policy produces no API request (stub).
6. **Per-call buttons unchanged**: Existing inline Allow/Deny buttons on `thought.interrupted` are not affected.
