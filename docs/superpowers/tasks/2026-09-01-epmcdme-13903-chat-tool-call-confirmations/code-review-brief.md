# Code review — 2026-09-01-epmcdme-13903-chat-tool-call-confirmations (2026-09-01)

**request-changes** · confidence: medium · 11 blocking · 0 deferred · 15 filtered as noise
Coverage: blind ✓ · edge-case ✓ · acceptance ✓ · verification-gap ✓  (4/4 lenses ran)

## Look here first

- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:236` — [security] Allow/Deny buttons render on shared/read-only pages too (`isSharedPage` never checked) — CR-004
- `src/pages/chat/hooks/useToolPermissions.ts:42` — [security] all-assistants-fetch-failed falls open to `AUTO_APPROVE`, the least restrictive policy — CR-005
- `src/store/chats.ts:46` — [breaking-change] `toolCallPolicy` sent camelCase; backend expects `tool_call_policy`, so the persisted policy silently never saves — CR-011
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:233` — [other] regression: `hideToolOutputs` guard removed, so the "hide tool outputs" setting no longer does anything — CR-003
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:352` — [other] `tool_permissions` (plus duplicate top-level fields) submitted for every assistant save, even when the feature is off or the assistant isn't CodeMie — CR-002

## Also flagged

- `src/pages/chat/hooks/useToolPermissions.ts:80` — [other] no stale-fetch guard: rapidly switching chats can apply a previous chat's resolved policy to the current one — CR-006
- `src/pages/chat/hooks/useToolPermissions.ts:105` — [other] unvalidated cast of `toolCallPolicy`; an unrecognised value renders the policy dropdown blank — CR-007
- `src/store/chatGeneration.ts:846` — [other] `resumeToolCall` never defensively clears `thought.interrupted` (unlike the analogous `resumeWorkflowExecution`); relies entirely on the backend re-sending the flag — CR-008
- `src/store/chatGeneration.ts:850` — [other] `resumeToolCall` indexes `chat.history` with no guard for an empty/stale history — CR-009
- `src/store/chatGeneration.ts:854` — [other] `resumeToolCall` always targets the single last-interrupted thought with no check that one actually exists or is unambiguous — CR-010
- `.codemie/codemie-cli.config.json` — [other] personal CLI profile + 3 local analytics logs (developer email, local FS path) committed as part of feature commits, unrelated to the ticket — CR-001

## Checked and clean

commit-format ~ partial (personal-tooling files mixed into feature commits) · code-quality — n/a (no guide) · security ~ partial (PII disclosure in committed analytics logs) · 0 deferred
