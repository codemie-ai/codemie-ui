# Plan: Tool Call Allow All / Deny All

## Task 1 — Relabel the require_confirmation switch on the assistant edit page
Test-first: no — pure label change, tested visually

**File**: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx`

In `renderRequireConfirmation`, change the `Switch` `label` prop from the static string
`"Require user confirmation"` to a dynamic expression:
```tsx
label={field.value ? 'Deny All' : 'Allow All'}
```

No schema, payload, or type changes.

---

## Task 2 — Create ChatPromptToolCallPolicy component
Test-first: no — new stub UI component

**New file**: `src/pages/chat/components/ChatPrompt/ChatPromptToolCallPolicy.tsx`

- Two small buttons: "Allow All" and "Deny All"
- A "Tool calls:" prefix label
- Local `useState<'allow' | 'deny' | null>` — toggling the active button deselects
- `disabled` prop disables both buttons + adds a tooltip wrapper on the container
- Tooltip content when disabled: `"Disabled — assistant requires per-call confirmation"`
- No backend calls (stub)
- Style: match the existing bottom-toolbar controls in ChatPrompt (small size, muted until active)

---

## Task 3 — Derive isToolCallPolicyLocked in ChatPrompt
Test-first: no — derived boolean, no isolated testable unit

**File**: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`

Add derivation after existing `isToolCallPending`:
```ts
const { assistants } = useSnapshot(assistantsStore)
const isToolCallPolicyLocked = (currentChat?.assistantIds ?? []).some(
  (id) => assistants.find((a) => a.id === id)?.tool_permissions?.require_confirmation === true
)
```

Wire `ChatPromptToolCallPolicy` into the bottom-left toolbar row, after `DynamicToolsSettings`:
```tsx
{assistantFeatures.tools && !currentChat?.isWorkflow && !isSharedPage && (
  <ChatPromptToolCallPolicy disabled={isPromptDisabled || isToolCallPolicyLocked} />
)}
```
