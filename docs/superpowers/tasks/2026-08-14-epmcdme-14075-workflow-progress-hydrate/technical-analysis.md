# Technical Research

**Task**: workflow chat hydrate polling executionStatus
**Generated**: 2026-08-14
**Research path**: filesystem

---

## 1. Original Context

Review all docs under docs/fix and implement the fix.

Ticket EPMCDME-14075: Workflow execution progress becomes empty after page reload.

When a user runs a workflow chat, sends a message, and reloads the browser while a workflow step is IN PROGRESS, the UI loses workflow execution progress. After reload the answer / progress UI is empty (or shows Interrupted), instead of restoring the current step and continuing to follow the run.

Desired behavior after refresh:
- Show the step currently in progress (step card with IN PROGRESS, Thinking… as before refresh).
- When that step completes, show its result.
- Continue showing later steps until a terminal status.
- Intra-step character-by-character token streaming after reload is NOT required.

Scope: frontend only in codemie-ui. Fix chat hydration / progress rendering / continued observation after reload.

Out of scope:
- Backend persistence/materializer/DualQueue changes in codemie — consume them; do not re-implement server logic in the UI repo.
- Unrelated non-workflow assistant chat issues, except: KEEP the existing in_progress → interrupted remap for cut non-workflow streams.
- SSE stream-rejoin protocol.

Validated findings to re-verify (do not treat as gospel):
1. transformHistoryGroup forces in_progress: false / inProgress: false and maps BE in_progress → interrupted (chatHelpers.ts). Harmful for still-running workflow executions.
2. ChatPage only calls getChat. Live thoughts exist only while _handleGenerationStream is open.
3. Details already polls. useExecutionStates polls every 4s for non-final executions. Chat does not.
4. FE would still fail after a BE-only fix because transform would turn restored in-progress thoughts into Interrupted.
5. setOpenChat blocks getChat updates when any message has inProgress: true. Post-reload polling must patch the open message (e.g. extend refreshWorkflowExecutionIds), not call getChat.

Backend contract (already shipped on sibling branch; consume GET conversation payload; poll GET; do not wait for SSE rejoin):

GET /conversations/{conversation_id}

Assistant message camelCase fields:
- workflowExecutionRef: boolean
- executionId: string
- executionStatus: string | null — "In Progress" | "Succeeded" | "Aborted" | "Failed" | "Interrupted" | "Not Started" | "AUTHENTICATION_REQUIRED"
- message: string — empty while run in progress
- thoughts: Thought[]

Nested thoughts are snake_case (NOT camelCase):
- id, author_name, author_type ("WorkflowState"), message, input_text, in_progress, interrupted, aborted, children

After reload UI should:
1. If workflowExecutionRef and executionId are set, treat as live/restored workflow execution (not a blank assistant answer).
2. Show each thought with author_type === "WorkflowState" as a step card: in_progress true → current step; otherwise show message as step result.
3. Keep polling GET while executionStatus === "In Progress".
4. Between steps there may be NO in_progress:true thought. Use executionStatus === "In Progress" (and empty message) to keep showing run still alive. Do not treat as finished blank turn.
5. Stop treating as live when executionStatus is terminal.

Acceptance:
- After reloading during or after workflow execution, UI restores and displays correct workflow execution progress/status.
- Answer/progress UI is not empty when execution state, progress, partial output, final result, or error information exists.
- If execution state cannot be restored, show a clear user-facing message instead of a blank answer node.
- For the repro, user can see the in-progress step and then subsequent results/steps as the run continues.
- Non-workflow cut streams still hydrate as interrupted.
- No regression for normal workflow execution without page reload.
- Cover with unit tests.

Companion files in this repo (starting points, not a license to skip research):
- docs/fix/02-frontend-sdlc-light.md
- docs/fix/frontend-fix.md
- docs/fix/frontend-handoff.md

---

## 2. Codebase Findings

### Existing Implementations

Source was re-read on 2026-08-14. All five companion findings still hold. There is **no** type named `GeneratedMessage` in this repo; assistant turns are `ChatMessage` (FE) / `HistoryItemBackend` (BE).

**Hydrate / transform**

- `src/utils/chatHelpers.ts`
  - `transformChatBEtoFE` (lines 25–57): sets `isWorkflow` from `is_workflow_conversation ?? is_workflow ?? false`. Computes conversation `isInterrupted` from BE `thought.interrupted` only (not from remapped `in_progress`).
  - `groupAndTransformHistory` (92–108) → `transformHistoryGroup` (110–165).
  - `transformHistoryGroup` **always**:
    - thought `in_progress: false` (line 138)
    - `interrupted: (thought.interrupted ?? false) || (thought.in_progress ?? false)` (lines 140–141) with comment “backend in_progress:true means the stream was cut (e.g. nginx timeout)”
    - message `inProgress: false` (line 157)
    - copies `executionId` / `stateId` (159–160)
    - does **not** map `executionStatus` or `workflowExecutionRef`
  - `isWorkflow` is computed at conversation level but **never passed** into `transformHistoryGroup`.
  - `transformWorkflowExecutionHistoryBEtoFE` (69–90) also goes through `groupAndTransformHistory` / the same strip.

**Chat load / store**

- `src/pages/chat/ChatPage.tsx` lines 70–76: on `chatId` change, only `chatsStore.getChat(chatId, { saveAsRecent: true })`. No poll, no stream reattach.
- `src/store/chats.ts`
  - `getChat` (211–225): `api.get(\`v1/conversations/${id}\`)` → `transformChatBEtoFE` → `setOpenChat`.
  - `refreshWorkflowExecutionIds` (231–251): same GET + transform; patches `openedChatsHistory` in place (`isInterrupted`, per-message `executionId`, `thoughts` if length). Does **not** call `setOpenChat`. Does **not** patch `response`, `inProgress`, or status. Called only after a **live** workflow stream ends (`chatGeneration.ts` 1128–1132).
  - `getConversationName` (258–262): same GET, name only; comment documents avoiding `setOpenChat` side effects for polling a chat that may no longer be open.
  - `setOpenChat` (271–288): if existing opened chat has any `message.inProgress`, **keeps existing chat and ignores the new payload**.
- `src/store/chatGeneration.ts`
  - Live thoughts only via `_handleThought` while `_handleGenerationStream` drains NDJSON.
  - After stream: `historyItem.inProgress = false`, `_finishThoughts`, then `refreshWorkflowExecutionIds` for workflows.
  - Non-NDJSON JSON path (1101): `if (chat.isWorkflow) chatsStore.getChat(chat.id)` — this **does** go through `setOpenChat`.
  - Rename poll is explicitly skipped for workflow chats (1139–1143).
  - Workflow resume uses PUT `v1/workflows/.../executions/.../resume?stream=true` (not SSE rejoin).

**Types (conversation vs Details)**

- `src/types/entity/conversation.ts`
  - `Thought` / `ThoughtBackend`: snake_case `in_progress`, `author_name`, `author_type`, `input_text`, `interrupted`, `aborted`, `children`.
  - `ChatMessage.executionId: string | null` (162); `HistoryItemBackend.executionId` (273).
  - **No** `executionStatus` or `workflowExecutionRef` on `ChatMessage`, `HistoryItemBackend`, or `ChatBackend`.
  - Optional `ChatMessage.workflowExecution?: ChatWorkflowExecution` with `status?: string` — a nested details-link shape, **not** the new assistant `executionStatus` field.
  - `ThoughtAuthorType` enum is only `Tool` | `Assistant` (`'Agent'`). `author_type` is `ThoughtAuthorType | string`, so `"WorkflowState"` already works at runtime (`ThoughtMessage.tsx` constant `WORKFLOW_STATE_AUTHOR_TYPE = 'WorkflowState'`).
- `src/types/entity/workflow.ts` `WorkflowExecutionStatus` (57–64): `'Not Started' | 'In Progress' | 'Succeeded' | 'Failed' | 'Aborted' | 'Interrupted' | 'AUTHENTICATION_REQUIRED'`. Execution entity uses snake_case `overall_status`.

**Rendering (empty answer / step cards)**

- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`
  - `isInProgress = message.inProgress` (163); `ThinkingLoader` only when true (208).
  - Thought cards when `!hideToolOutputs && message.thoughts.length` (211–216) — all thoughts, not filtered by `author_type`. `Thought` already treats `author_type === 'WorkflowState'` as a step card via `ThoughtMessage`.
  - Markdown `content={message.stream?.getStream() ?? message.response}` (245–248).
- `src/components/markdown/Markdown.tsx` 37–50: `if (!content) return []` → empty bubble when `response` is empty/undefined and not in progress and no thoughts.
- `src/components/Thought/Thought.tsx` 45–57: expands when `thought.in_progress`.
- `src/components/Thought/ThoughtHeader.tsx` 28–34: `in_progress` → “In Progress”; else `interrupted` → “Interrupted”.

**Details polling (pattern to reuse, not to call from chat)**

- `src/pages/workflows/details/hooks/useExecutionStates.ts` 108–122: `usePolling({ interval: 4000 })` while `!WORKFLOW_FINAL_STATUSES.includes(execution.overall_status)`; fetches `getExecutionStates`.
- `src/pages/workflows/details/hooks/useWorkflowData.ts`: same 4000 ms cadence for `getExecution`.
- `src/hooks/usePolling.tsx`: shared hook; default interval **5000**; clears interval on `enabled === false` and on unmount (69–89).
- `src/constants/workflows.ts` 18–33:
  - `WORKFLOW_STATUSES.RUNNING = 'In Progress'`
  - `WORKFLOW_FINAL_STATUSES` = Succeeded, Aborted, Failed, Interrupted, AUTHENTICATION_REQUIRED
  - `'In Progress'` and `'Not Started'` are **not** final.
- Chat pages import **neither** `usePolling` nor `WORKFLOW_FINAL_STATUSES`.

**Conversation GET client**

- Wrapper: `src/utils/api.ts` `get` (133–135), `BASE_URL` from `window._env_.VITE_API_URL || import.meta.env.VITE_API_URL`.
- Callers of `GET v1/conversations/${id}`: `getChat`, `refreshWorkflowExecutionIds`, `getConversationName`. List is `GET v1/conversations`. Shared: `GET v1/share/conversations/${token}`.

**SSE rejoin**

- No `EventSource`, `Last-Event-Id`, `text/event-stream`, or rejoin client/endpoint under `src/`. Streaming is NDJSON via `api.stream` (`application/x-ndjson`). Confirmed: do not implement SSE rejoin.

### Architecture and Layers Affected

| Layer | Components | Role in this task |
|---|---|---|
| Presentation | `ChatPage`, `ChatAiMessage`, `Thought` / `ThoughtHeader` / `ThoughtMessage`, `Markdown` | Hydrate trigger; Thinking… / step cards / empty-state copy |
| State | `chatsStore`, `chatGenerationStore` | GET conversation, `setOpenChat` guard, in-place patch, live stream (must not be the post-reload path) |
| Utils / transform | `chatHelpers.transformChatBEtoFE` / `transformHistoryGroup` | **Primary bug**: strips in-progress workflow thoughts |
| Types | `conversation.ts` (`ChatMessage`, `HistoryItemBackend`) | Add `executionStatus`, `workflowExecutionRef` |
| Constants | `workflows.ts` `WORKFLOW_STATUSES` / `WORKFLOW_FINAL_STATUSES` | Stop/start poll; prefer poll while status === `'In Progress'` |
| Hooks | New chat observation hook **or** ChatPage `usePolling`; reuse `usePolling` | 4s conversation GET; cleanup on unmount/navigate |
| Integration | `api.get('v1/conversations/${id}')` | Consume BE GET; no new endpoint |
| Adjacent (do not rewrite) | `useExecutionStates`, `workflowExecutionsStore` | Cadence/constants only; optional execution GET fallback |

Canonical data flow (architecture guide): Component → Store → API. Polls must live in `chatsStore` (or a hook that **only** calls store methods). Pages must not call `api.*`.

### Integration Points

- **Reload path:** `ChatPage` → `getChat` → `GET v1/conversations/{id}` → `transformChatBEtoFE` → `setOpenChat` → `currentChat` → `ChatHistory` → `ChatAiMessage`.
- **Live path (no reload):** prompt → `chatGenerationStore` → `api.stream` (POST executions / PUT resume) → `_handleThought` / stream text → on workflow end `refreshWorkflowExecutionIds`.
- **Post-reload observation (missing):** must GET the same conversation URL on a timer and patch the open message; must **not** use `getChat`/`setOpenChat` once `inProgress` is true.
- **Details parallel:** `useExecutionStates` / `useWorkflowData` poll workflow execution APIs every 4s. Chat must **not** reuse those hooks as-is (wrong resource: states/execution, not conversation thoughts). Reuse `usePolling` + status constants.
- **Cross-cut:** `transformWorkflowExecutionHistoryBEtoFE` shares `transformHistoryGroup` — a workflow-preserving change affects Details history transform too; keep non-active turns on the cut-stream remap.

### Patterns and Conventions

- Valtio proxy stores; mutate open message objects in place (`refreshWorkflowExecutionIds` is the local pattern for “GET conversation without `setOpenChat`”).
- Thought fields stay **snake_case** on FE; message-level flags are **camelCase** (`inProgress`, `executionId`).
- Non-workflow cut streams intentionally remap `in_progress → interrupted` (tested in `chatHelpers.test.ts` 46–67). Preserve that.
- Details polling: `usePolling({ interval: 4000, enabled })` + `WORKFLOW_FINAL_STATUSES`. Interval is a literal `4000` (not a shared constant); `usePolling` default is 5000.
- Architecture: API only from stores; parse with `.json()`; hooks must not call `api.*`. `useExecutionStates` already imports a store — that is the existing poll-hook pattern.
- `getConversationName` comment is the documented reason not to poll via `getChat` when the user may have navigated away.

**Recommended implementation surface (verified, slightly tighter than companion):**

1. `src/types/entity/conversation.ts` — add camelCase `workflowExecutionRef?: boolean` and `executionStatus?: WorkflowExecutionStatus | null` on `HistoryItemBackend` and `ChatMessage`.
2. `src/utils/chatHelpers.ts` — pass `isWorkflow` into `transformHistoryGroup`. If the assistant item is an **active** workflow turn (`executionStatus === 'In Progress'` or `workflowExecutionRef` + `executionId` + status In Progress): preserve thought `in_progress` / `interrupted` / `aborted`; set message `inProgress: true`; map `executionStatus` / `workflowExecutionRef`. Otherwise keep today’s remap. **Do not** use `isWorkflow && any thought.in_progress` as the only live signal — between steps there may be **no** `in_progress` thought (handoff §4).
3. `src/store/chats.ts` — extend `refreshWorkflowExecutionIds` (or a sibling `refreshWorkflowExecutionProgress`) to also patch `response`, `inProgress`, `executionStatus`, `workflowExecutionRef`, and thoughts (including replacing with empty/updated arrays). Keep in-place patch; never `setOpenChat`.
4. `src/pages/chat/ChatPage.tsx` + new hook under `src/pages/chat/hooks/` (or `src/hooks/`) using `usePolling({ interval: 4000 })` that calls the store patch while `executionStatus === 'In Progress'`. `usePolling` already clears on unmount/`enabled` false — prefer this over a store `setInterval` to avoid leak on navigate. Gate `enabled` on current `chatId`.
5. `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — empty-state copy when not editing, no MCP auth, no thoughts, empty response, not in progress, and no recoverable live execution.
6. Tests listed in §4.

**Correction vs companion `frontend-fix.md`:** poll **while `executionStatus === 'In Progress'`** (AC / handoff), not merely `!WORKFLOW_FINAL_STATUSES.includes(status)`. `'Not Started'` is not final but is not a live run. Reuse `WORKFLOW_STATUSES.RUNNING` / `WORKFLOW_FINAL_STATUSES` for the terminal stop, but start/continue poll only on `'In Progress'`.

**Do not reuse `useExecutionStates` in chat** — it polls `getExecutionStates`, not conversation GET, and would not update chat thought cards.

---

## 3. Documentation Findings

### Guides and Architecture Docs

| Guide | Relevance |
|---|---|
| `.ai-run/guides/architecture/architecture.md` | Component → Store → API; transforms in utils; no `api.*` in pages/hooks |
| `.ai-run/guides/patterns/state-management.md` | Store actions; `useSnapshot`; cleanup on unmount |
| `.ai-run/guides/development/api-integration.md` | `api.get` + `.json()`; streaming is `api.stream` NDJSON, not EventSource |
| `.ai-run/guides/patterns/custom-hooks.md` | Extract poll into a hook; hooks must not call `api.*` |
| `.ai-run/guides/testing/testing-patterns.md` | Background polling / timer cleanup pitfalls |
| `.ai-run/guides/development/constants-usage.md` | Prefers named poll constants; example `WORKFLOW_POLL_INTERVAL = 2000` is **not** in `src/constants/` — Details uses literal `4000` |
| `.ai-run/guides/quality-gates.md` | `npm run lint`, `npm run typecheck`, `npm run test:unit` |

Guides do **not** document conversation hydrate, the nginx-timeout remap, or chat-side execution polling. Domain behavior is in source + `docs/fix/`.

Companion write-ups (`docs/fix/02-frontend-sdlc-light.md`, `frontend-fix.md`, `frontend-handoff.md`) match current source. Claimed files-to-change and two-bug model (transform strip + no reattach) are confirmed. Referenced `.ai-run/prompts/EPMCDME-14075/` paths are **not** in this workspace.

### Architectural Decisions

- No ADR files. CHANGELOG has no EPMCDME-14075 / hydrate entries.
- Recorded in source:
  - `chatHelpers.ts:140` — BE `in_progress` on hydrate means cut stream → Interrupted (must stay for non-workflow).
  - `chats.ts:227–230` — `refreshWorkflowExecutionIds` exists to attach execution page links after streaming, not to observe a mid-run reload.
  - `chats.ts:253–256` — do not poll via `getChat`/`setOpenChat` for a chat that may not be open.
  - `chats.ts:271–280` — `setOpenChat` ignores GET payloads while any message is `inProgress` (protects live local stream).
  - Handoff: poll conversation GET; do not wait for SSE rejoin.

### Derived Conventions

- Live progress is a **session** concern (`inProgress` + `_handleThought`), not a hydrate concern — that is why reload blanks the UI.
- Between-steps gap cannot be inferred from thoughts alone; message-level `executionStatus === 'In Progress'` + empty `message` must keep `inProgress` true and Thinking… visible even with zero `in_progress` thoughts.
- Step UI already works if thoughts hydrate with correct `in_progress` / `author_type`; no new Thought component is required.
- Optional Details fallback (`GET v1/workflows/{id}/executions/{executionId}`) exists in `workflowExecutionsStore.getExecution` if conversation GET lacks status; AC prefers conversation GET. Do not block the FE run on that fallback.

---

## 4. Testing Landscape

### Existing Coverage

| File | What it covers | Gap vs this task |
|---|---|---|
| `src/utils/__tests__/chatHelpers.test.ts` 46–67 | Non-workflow `in_progress:true` → `interrupted:true`, `in_progress:false` | Must **keep**. No workflow-preserve / `executionStatus` cases |
| same file 69–112 | `in_progress:false` stays not interrupted; explicit `interrupted:true` preserved | Keep |
| `src/store/__tests__/chats.getChats.test.ts` (and export/cleanup/updateChatListItem) | List/export/storage | **No** `getChat` / `setOpenChat` / `refreshWorkflowExecutionIds` tests |
| `src/store/__tests__/chatGeneration.test.ts` | Live `_handleThought` merge; mocks `refreshWorkflowExecutionIds` | Not hydrate |
| `src/store/__tests__/chatGeneration.renamePoll.test.ts` | Rename poll; skips workflows; stubs refresh | Not execution poll |
| `src/pages/chat/__tests__/ChatPage.test.tsx` | Asserts `getChat(id, { saveAsRecent: true })` | No hydrate payload / poll |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx` | Thoughts visibility / metadata; `ThinkingLoader` mocked | No empty-response empty-state; no `inProgress` → ThinkingLoader |
| `src/components/Thought/__tests__/ThoughtHeader.test.tsx` | In Progress vs Interrupted badges | UI already covered if flags are correct |
| `src/hooks/__tests__/usePolling.test.tsx` | Generic hook | Reuse; chat poll still untested |
| `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx` | Details In Progress polling | Different page |

`useExecutionStates` itself has **no** unit tests. `transformHistoryGroup` is not exported; tests go through `transformChatBEtoFE`.

### Testing Framework and Patterns

- Vitest + Testing Library + jsdom; co-located `__tests__/`.
- Unit: `vi.mock` of `@/utils/api` and stores; AAA `describe`/`it`.
- Integration: `mockAPI` + `renderPage` (`src/test-utils/integration.tsx`).
- `docs/fix/frontend-fix.md` 107–123 lists the intended TDD cases; they are **not implemented yet**.

### Coverage Gaps

1. Workflow hydrate: `executionStatus: 'In Progress'` + thought `in_progress: true` → FE preserves progress (not Interrupted).
2. Between-steps: `executionStatus: 'In Progress'`, empty `message`, no `in_progress` thought → message `inProgress: true`, not a blank finished turn.
3. Finished workflow / non-workflow cut stream: existing remap unchanged.
4. `executionId` / `workflowExecutionRef` / `executionStatus` copied through transform.
5. `refreshWorkflowExecutionIds` (or successor) patches thoughts/`response`/`inProgress` without `setOpenChat`.
6. Poll starts on hydrate when status is In Progress; stops on terminal; interval cleared on unmount/chatId change.
7. `setOpenChat` still ignores GET while local `inProgress` (live-stream regression).
8. `ChatAiMessage` restore-failed / empty-answer copy.

Quality gates for this work: `npm run lint`, `npm run typecheck`, `npm run test:unit` (narrow files under `chatHelpers`, `chats`, `ChatPage`/`ChatAiMessage` as added).

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` (`.env`, `config.js`, Helm ConfigMap) prefixes all conversation and workflow URLs. No poll-interval or hydrate env vars.
- Unrelated: `VITE_ENV`, `VITE_SUFFIX`, assistant slugs, Keycloak Entra vars.

### Configuration Files

- `src/utils/api.ts` — `BASE_URL`; `get` / `stream`.
- `src/constants/workflows.ts` — status strings and `WORKFLOW_FINAL_STATUSES`.
- `src/constants/featureFlags.ts` — `FEATURE_FLAGS.WORKFLOW_AI` is editor-only; **no** flag for chat hydrate/polling.
- `vite.config.ts` — `/api` proxy to backend; not feature-specific.
- No `.env.example`. No SSE-rejoin config.

### Feature Flags and Deployment Concerns

- No feature flag should gate this restore; it is correctness for workflow chat reload.
- UI nginx is static; cut-stream remap comment refers to **API/proxy** timeouts on the generation stream, not this SPA’s nginx.
- Helm only injects `VITE_API_URL`. Wrong URL would break GET conversation for everyone, not uniquely this bug.
- Poll interval: match Details **4000 ms**. Prefer a named constant if adding one; do not invent a different cadence.

---

## 6. Risk Indicators

- **Confirmed: transform always strips progress** — `src/utils/chatHelpers.ts` 138–157. A BE-only fix that returns live thoughts still hydrates as Interrupted / blank. Every poll that still runs through this transform will keep showing Interrupted until the mapper is conditional.
- **Confirmed: ChatPage is one-shot `getChat`** — `ChatPage.tsx` 70–76. Live thoughts exist only in `_handleGenerationStream`. No chat-side execution poll.
- **Confirmed: `setOpenChat` clobber/no-op** — `chats.ts` 271–280. After hydrate marks `inProgress: true`, further `getChat` (including `chatGeneration.ts:1101` JSON path) is ignored. Post-reload observation **must** patch in place (`refreshWorkflowExecutionIds` shape), not call `getChat`.
- **Non-workflow interrupted remap regression** — current behavior is intentional and tested (`chatHelpers.test.ts` 46–67). Gate preserve-logic on active workflow execution (`executionStatus === 'In Progress'` / `workflowExecutionRef` + `executionId`), never on “any thought in_progress”.
- **Between-steps blank turn** — handoff: no `in_progress:true` thought while `executionStatus === 'In Progress'` and `message` empty. Fallback `isWorkflow && thought.in_progress` (suggested in `frontend-fix.md`) is **insufficient** for that gap. Message-level `inProgress` must follow `executionStatus`, not only thought flags.
- **Partial patch in `refreshWorkflowExecutionIds`** — today only `executionId` + thoughts (if `thoughts?.length`) + `isInterrupted`. Omitting `response` leaves empty Markdown after a terminal poll; `if (message.thoughts?.length)` will **not** clear/replace thoughts when the array is empty. Must always assign thoughts/`response`/`inProgress`/status.
- **Poll leak on unmount/navigate** — store-level `setInterval` (rename poll pattern) must be cleared on `chatId` change. Prefer `usePolling` which already clears on cleanup/`enabled` false. `refreshWorkflowExecutionIds` no-ops if chat left `openedChatsHistory` (235–236) but the timer must still stop.
- **Index-alignment assumption** — refresh patches by `historyIndex` / `messageIndex`. If GET returns a different grouping than the open chat, patches miss or write the wrong turn. Same risk exists today after live streams.
- **Shared transform** — `transformWorkflowExecutionHistoryBEtoFE` uses the same mapper. Conditional logic must not mark Details historical turns as in-progress unless their assistant item is actually live.
- **Types lag the BE contract** — `executionStatus` / `workflowExecutionRef` absent on chat types. TypeScript will drop unknown JSON fields unless added and mapped. `ThoughtAuthorType` enum lacks `WorkflowState` (already a runtime string; optional enum add, not required for cards).
- **Empty answer vs Interrupted badge** — after current transform, thoughts become Interrupted so cards may appear as Interrupted rather than a fully blank node; empty `response` still blanks Markdown. Conversation `isInterrupted` uses BE `thought.interrupted` only (`chatHelpers.ts` 33), so Continue CTA may **not** show even when badges say Interrupted. Restore path should not rely on that CTA.
- **`hideToolOutputs`** — user setting hides thought cards; Thinking… still depends on `message.inProgress`. If we set `inProgress` from status, Thinking… remains visible even when cards are hidden.
- **BE sibling dependency** — without `executionStatus` / live thoughts on GET, FE can add types + empty-state copy but cannot restore a step card. Documented as consume-contract, not a FE blocker to start, but a runtime blocker for the repro if BE is absent.
- **No SSE rejoin** — confirmed absent. Do not add it.
- **Test debt** — no tests for `getChat`/`setOpenChat`/`refreshWorkflowExecutionIds`/chat poll/`ChatAiMessage` empty restore. Polling tests must clear timers (`testing-patterns.md`).
- **Magic poll interval** — Details uses literal `4000`; chat should match. Guide prefers a named constant; extracting one is optional, not required for correctness.
- **codegraph unavailable** — research used filesystem exploration only; repo has no codegraph MCP in this environment.
- **Thin extra risk: `ChatPage` `getChat` after poll started** — if user re-triggers load (same `chatId` effect only runs on id change) this is fine; if something else calls `getChat` while hydrated run is `inProgress`, payload is dropped (existing guard). Observation loop must not depend on `getChat`.

---

## 7. Summary for Complexity Assessment

This is a **frontend-only hydration + observation** change in the existing chat stack: utils transform, conversation types, `chatsStore` in-place GET patch, a ChatPage (or chat-hook) 4s poll using existing `usePolling`, and an empty-state in `ChatAiMessage`. It does **not** add SSE rejoin, does not rewrite Details polling, and does not change the non-workflow cut-stream remap.

**Layers:** Presentation (`ChatPage`, `ChatAiMessage`), State (`chatsStore`; `chatGenerationStore` only as a non-regression boundary), Utils (`chatHelpers`), Types (`conversation.ts`), Constants (`WORKFLOW_STATUSES` / `WORKFLOW_FINAL_STATUSES`), Hooks (`usePolling` reuse). Likely **6–8 implementation files** plus **2–4 test files**. No new HTTP client or endpoint; same `GET v1/conversations/{id}`.

**Novelty:** Low–medium. Patterns already exist (`refreshWorkflowExecutionIds` in-place patch; Details `usePolling` at 4000 ms; thought cards already key off `in_progress`). The novel bit is making hydrate **conditional** and driving `inProgress` from `executionStatus` so between-step gaps (no `in_progress` thought, empty `message`) still look live. Technical risk is concentrated in getting the transform gate wrong (breaking non-workflow Interrupted) and in polling via `getChat`/`setOpenChat` (silent no-op once `inProgress` is true).

**Tests:** Mixed. The harmful remap is well-tested and must stay for non-workflow; workflow preserve, poll lifecycle, in-place patch, `setOpenChat` guard, and empty-answer copy are **untested**. TDD should extend `chatHelpers.test.ts` first, then add store/hook tests for poll start/stop/unmount.

**All five validated findings still hold.** No better root cause was found. Recommended poll predicate is slightly stricter than `frontend-fix.md`: observe while `executionStatus === 'In Progress'`, not “any non-final status”. No blockers inside this UI repo other than the BE contract fields being present at runtime for the repro.
