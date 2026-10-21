# Assistant-level "Hide Tool Outputs" — Design

Date: 2026-10-05
Ticket: EPMCDME-15555
Status: Draft, awaiting review
Repos affected: `codemie` (backend), `codemie-ui`, `codemie-sdk` (Python, Node, IaC)

## 1. Purpose

Add a boolean assistant configuration property, `hide_tool_outputs`. Today tool-output visibility is controlled only at the conversation level, and only on the client: React state in `useChatConfiguration` plus per-user, per-chat `localStorage`. The server knows nothing about it.

The new property is **server-side enforcement** at the assistant level. When ON, end users see only the final assistant response. Tool calls, intermediate outputs, raw payloads and execution traces are never sent to them, and no conversation setting can turn them back on.

## 2. Requirements (from the story)

- Creator form has a "Tool output visibility" section with a toggle labeled "Hide tool outputs from end users" and explanatory text.
- The property is persisted and exposed through the API.
- ON: all technical details hidden, final response shown, conversation settings overridden, conversation-level control not available.
- OFF: conversation-level behavior unchanged.
- Existing assistants default to OFF.
- Behavior is validated with multi-tool assistants; regression tests cover assistants without the flag.
- The UI explains that, when enabled, end users see only final assistant responses and tool execution details remain hidden.

## 3. Decisions

| Decision | Choice | Reason |
|---|---|---|
| Enforcement point | Server-side, when serving data | The client toggle is advisory and bypassable |
| Timing | **Read-time filtering** | ON hides outputs in old and new conversations; OFF restores them |
| Storage | Backend **always stores** full thoughts and tool outputs | Nothing changes in persistence or execution; only serving is filtered |
| Scope of "hidden" | **All thoughts**, including the assistant's own narration (`codemie_thoughts`) | `Thought` has no reasoning type to separate it; "final response only" |
| Who is affected | Everyone, including the creator | Simple and testable; the creator can switch the flag OFF to debug |
| Chat-level toggle | Not rendered for flagged assistants | Hidden completely, not disabled |
| Mechanism | One shared policy module, called at each serving boundary | One rule, one place; one regression test per channel |
| Multi-assistant history | Each message checked against its own `assistant_id` | A flagged assistant's messages are stripped without affecting others |

At-rest consequence: tool outputs remain in the database while the flag is ON. The requirement is about what end users can see, not about deleting data.

## 4. Non-goal (deliberate): agent-to-agent and workflow calls are not filtered

Sub-assistant, parent-assistant and workflow calls are **not** filtered. Tool output passed between agents is internal orchestration data, and hiding it could break orchestration. We chose this on purpose over filtering at every level.

Filtering happens only where output is served to an end user (section 6). Also out of scope for the same reason: the workflow thoughts path (`WorkflowThoughtsListService`, `get_workflow_execution_thoughts`). Workflow-conversation messages with no assistant are unaffected.

## 5. Data model and policy

- Add `hide_tool_outputs: bool`, non-nullable, `server_default false`, to the `Assistant` SQL model and to `AssistantConfiguration` in `codemie/rest_api/models/assistant.py`, and to the API model alongside `file_attachment_enabled`.
- One Alembic migration in `src/external/alembic/versions/`, modeled on `v3w4x5y6z7a8_add_file_attachment_enabled.py` but with `nullable=False, server_default=false`. Existing rows become OFF with no backfill.
- Flow the flag through `assistant_version_service` (create, apply, rollback), following `file_attachment_enabled`. A version-pinned request hides tool outputs if either the master assistant or the pinned version has the flag on (fail closed).
- New policy module (e.g. `service/assistant/tool_output_visibility.py`):
  - `is_hidden(assistant) -> bool`
  - `strip_thoughts(message)` returns the message without thoughts.
  - Serving code never checks the flag itself.
- The flag is read from the assistant's current state at serve time.

## 6. Serving boundaries

| # | Boundary | Location | Behavior when ON |
|---|---|---|---|
| 1 | Chat reply, stream and non-stream, UI and public API | `assistant_handlers.py` (chat stream chokepoint); routes in `routers/assistant.py` (`ask_assistant_by_id`, `ask_assistant_by_slug`, `resume_tool_call`); `ide.py` callers | Streamed chunks drop `thought`; final chunk and non-stream response omit `thoughts`; persistence still receives full thoughts |
| 2 | Conversation detail | `routers/conversation.py` `get_conversation_by_id` | Thoughts stripped per message `assistant_id` |
| 3 | Live replay | `routers/conversation.py` `get_conversation_stream` | Same |
| 4 | Shared conversation page | `service/share_conversation_service.py` | Thoughts stripped; flag included in `AssistantDetails` |
| 5 | Export | `routers/conversation.py` (`export_conversation_message`, `export_conversation`), `message_exporter.py`, `export_utils.py` | Thoughts section omitted even with `export_full_thought` |

**Kept when ON:** the final response, `a2ui` prompts, `tool_call_pending` (the user must act on it), `agent_error` and `execution_error`.

**Stripped when ON:** `thought`, `thoughts`, and on the final chunk `tool_errors` and `debug`.

The flag reaches the UI through `AssistantDetails` (`models/conversation.py`), which is already delivered as `assistant_data`.

## 7. API, SDKs and IaC

- `hide_tool_outputs: bool` is optional on create and update requests and defaults to `false`. On update, an omitted field leaves the stored value unchanged.
- Present on the assistant detail response, on `AssistantDetails`, and on the shared-conversation response. Not on list items.
- Authorization: whoever can already edit an assistant can set the flag. End users have no override API, and the server ignores the client toggle for flagged assistants.
- Python SDK: `Assistant` and `AssistantRequestBase`. Node SDK: `models/assistant.ts` and the zod schema in `schemas/assistant.ts`. Conversation models get the field via the `assistant_data` item type. Precedent is `is_react` and `shared`.
- IaC `converters.ts` exports the field only when `true`, so existing state files show no diff.

## 8. UI

**Creator form**
- New `ToolOutputVisibilitySection.tsx` in `AssistantForm/components/`, rendered from `AssistantForm.tsx` inside the Tools configuration accordion (not beside `InteractiveFeaturesSection.tsx`), so it also appears in the in-chat editor (`ChatConfigAssistantForm`). Uses the shared `Switch` and `InfoBox`.
- Title: "Tool output visibility" (sentence case, matching the other section titles).
- Toggle label: "Hide tool outputs from end users".
- Helper text, always visible: "When enabled, end users see only the final assistant response. Tool calls, intermediate outputs, raw payloads, and execution traces stay hidden, and conversation settings can't turn them back on."
- `InfoBox`, only when ON: "This applies to everyone chatting with this assistant, including you. Turn it off to inspect tool execution while testing."
- Add the field to the yup `formSchema`, `defaultValues` (`assistant?.hide_tool_outputs ?? false`), `prepareFormData` and the `Assistant` type in `types/entity/assistant.ts`.
- The workflow `VirtualAssistantForm` is not touched.

**Chat**
- `ChatConfiguration.tsx` does not render `ChatConfigHideToolOutputs` when the active assistant is flagged (read from `assistantData`). In a multi-assistant chat, only the active assistant matters.
- The stored client `hideToolOutputs` state is left alone but ignored for flagged assistants.
- Thought rendering needs no change: the server sends no thoughts.
- A chat that is already open picks up a flag change on its next load. There is no live push.

## 9. Testing strategy

Tests are written and run only when explicitly requested (project rule in `AGENTS.md`); this section defines what the plan must cover.

1. Policy unit tests: ON strips all thoughts including `codemie_thoughts`; OFF leaves messages untouched; a missing flag is OFF; kept fields survive; `tool_errors` and `debug` are stripped.
2. One regression test per boundary in section 6, each with the flag ON and OFF (both UI and public API chat routes).
3. Multi-tool assistant: with ON, no tool name, input or output appears at any boundary.
4. Multi-assistant history: only the flagged assistant's messages are stripped.
5. Retroactive toggle: ON hides stored thoughts in an existing conversation; OFF restores them.
6. Persistence: full thoughts are still stored while ON.
7. Regression for assistants without the flag: legacy rows read as OFF; payloads that omit the field behave as before; update with the field omitted leaves the stored value unchanged.
8. Versions: the flag is carried through create, apply and rollback; a version-pinned request hides tool outputs if either the master assistant or the pinned version has the flag on (fail closed).
9. API contract: the field is on detail, `AssistantDetails` and the shared response, and not on list items.
10. Frontend: section renders with the exact copy; `InfoBox` only when ON; the field round-trips through `prepareFormData`; the chat toggle is not rendered for a flagged active assistant; stored client state is ignored.
11. E2E: create a multi-tool assistant with the flag ON; chat as an end user and see only the final response; reload, open the shared link and export, and confirm no tool details; set OFF and confirm the chat toggle returns and outputs show again.

## 10. Security note

This change gates access to tool output and touches serving paths. The MR description must ask a reviewer to post `/sanity` (repository rule in `codemie/AGENTS.md`).

## 11. Open items to verify during planning

- Whether `_filter_thoughts(data.thoughts)` at `assistant_handlers.py:447` is the persist path or the response path. Persistence must keep full thoughts.
- Whether other routes return thoughts (`ide.py`, search and list endpoints).
- The exact `AssistantDataItem` shape in the Python and Node SDKs.
- Whether test fixtures enumerate assistant fields.
- Whether `ChatAiMessage` renders an empty thoughts container when `thoughts` is missing.
- Whether read-only assistant views (marketplace, detail) should show the setting.
- Whether `_apply_conversation_runtime_overrides` (`assistant_service.py:85`) interacts with the flag.
