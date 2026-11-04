# EPMCDME-14855 FE — Terminal-chunk outcome + guaranteed finalization: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify the terminal stream chunk by the backend `last × success × execution_error` matrix and surface its error (FE2), and route `_sendRequest`'s out-of-try dispatch branch through the existing failure path so `inProgress` is always reset (FE3).

**Architecture:** Both changes are in the Valtio store `src/store/chatGeneration.ts`. FE2 adds one private classifier called from the existing terminal branch of `_handleChunk`; termination stays keyed on `chunk.last` alone. FE3 wraps only the dispatch branch in its own narrow try/catch funnelling non-abort errors into `_handleRequestError` → `finalizeFailedRequest`. No presentation-layer change.

**Tech Stack:** TypeScript 5, Valtio, Vitest 1.6.1 (`unit` project).

**Spec:** `docs/superpowers/tasks/2026-09-21-epmcdme-14855-thought-remains-in-progress-fe/spec.md` (approved). Research: `technical-analysis.md`, same directory.

## Global Constraints

- Scope is exactly `src/store/chatGeneration.ts`, `src/types/entity/conversation.ts`, and new store unit tests. Do not touch the backend repo, `src/types/chatGeneration.ts`, `src/utils/stream.ts`, `src/utils/api.ts`, or any component.
- Store unit tests only, cloned from `src/store/__tests__/chatGeneration.streamDrain.test.ts:16-103` (module-level `vi.mock('@/utils/api')` + store/toaster mocks, `createHistoryItem` factory, fake `{ read, cancel }` reader, per-test `await import('@/store/chatGeneration')`). No component tests.
- Dual declaration: a new store method goes in both `ChatGenerationStoreType` (`:83-213`) and the proxy literal; self-calls via `chatGenerationStore.`, never `this`.
- No `include_tool_errors`, no new `ChatRequest`/`ChatRequestInput` field, no new query param. No `execution_error` code→text map. Never render `error_details`/traceback.
- **One finding per commit, id preserved** — FE2 and FE3 are separate commits. Use the repo convention in `.ai-run/guides/standards/git-workflow.md`: subject `EPMCDME-14855: <Capital sentence>` (CI-validated prefix, no trailing period), and name the finding id (`FE2` / `FE3`) in the message so each commit stays identifiable. Never bypass the husky hooks; prettier/eslint run via the `PostToolUse` hook (AGENTS.md).

---

### Task 1: FE2 — classify the terminal chunk and surface an error outcome

**Files:**
- Modify: `src/types/entity/conversation.ts:327-334` (snake_case `StreamChunk`)
- Modify: `src/store/chatGeneration.ts` — interface near `:179-182`, module helper near `:235-238`, store method near `:1477`, terminal branch `:1498-1507`
- Test: `src/store/__tests__/chatGeneration.terminalChunk.test.ts` (create)

**Interfaces:**
- Consumes: `DEFAULT_ERROR_MESSAGE` (already imported from `@/utils/api`), `toaster` (`@/utils/toaster`), `Thought.error?: boolean | string` (`conversation.ts:116`).
- Produces: `_classifyTerminalChunk: (chunk: StreamChunk) => { isError: boolean; errorText: string | null }`.

**Test-first: yes** — new test file asserting a terminal chunk with `success: false` or non-empty `execution_error` produces `toaster.error(<text>)` and a thought `error`, while `success == null` without `execution_error` does not. Fails today: `_handleChunk` (`:1498-1507`) reads none of these fields and never toasts.

- [ ] **Step 1: Write the failing tests**

Copy the harness block `chatGeneration.streamDrain.test.ts:16-103` verbatim, then one `it` per case, each calling `chatGenerationStore._handleChunk(historyItem, JSON.stringify(chunk))`:

1. happy path `{ generated_chunk: 'x', generated: 'Hello', last: true, success: true }` → no `mockToasterError`, `inProgress === false`.
2. `_send_error_to_thread` `{ last: true, success: false, execution_error: 'agent_token_limit', generated: 'Token limit reached' }` → `mockToasterError` with `'Token limit reached'`.
3. timeout `{ last: true, success: false, generated: '' }` (no `execution_error`) → `mockToasterError` with `'Oops! Something went wrong'` (mocked `DEFAULT_ERROR_MESSAGE`), `inProgress === false`.
4. hedged/A2A `{ last: true, generated: 'Answer' }`, `success` unset → no toast, `inProgress === false`.
5. `AIToolsAgent` `{ last: true, execution_error: 'tool_failure', generated: 'failed' }`, `success` unset → `mockToasterError` called.
6. empty `generated` `{ last: true, generated: '' }` → non-null `finalChunk`, `inProgress === false`, no toast.
7. text priority `{ last: true, success: false, agent_error: { message: 'Agent failed' }, generated: 'raw', error_details: { traceback: 'secret' } }` → toast arg is exactly `'Agent failed'`, containing neither `'raw'` nor `'secret'`.
8. thought error: `createHistoryItem({ thoughts: [{ id: 't1', in_progress: true, message: '' } as any] })` + case 2's chunk → `thoughts[0].error` truthy (it survives `finishThoughts` `:245-252`, which only clears `in_progress`).
9. thought-less error chunk: case 3 with no `thoughts` → toast only, no throw.
10. shape guard: case 1's `finalChunk` still carries `last: true`, `capturedStreamText` handling unchanged.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/store/__tests__/chatGeneration.terminalChunk.test.ts`
Expected: FAIL — no `toaster.error`, no thought `error`.

- [ ] **Step 3: Extend the snake_case `StreamChunk`**

Add to `src/types/entity/conversation.ts:327-334` only (never the camelCase twin at `src/types/chatGeneration.ts:26-37`):

```ts
  success?: boolean | null
  execution_error?: string | null
  agent_error?: { message?: string } | null
  tool_errors?: unknown[] | null
  error_details?: unknown | null
```

- [ ] **Step 4: Add the classifier and the thought-error helper**

Declare `_classifyTerminalChunk` in `ChatGenerationStoreType` next to `_handleChunk` (`:179-182`); implement it in the proxy literal next to `_handleChunk` (`:1477`):

```ts
  _classifyTerminalChunk(chunk) {
    const executionError = chunk.execution_error ?? ''
    if (chunk.success !== false && executionError === '') {
      return { isError: false, errorText: null }
    }
    return {
      isError: true,
      errorText: chunk.agent_error?.message || DEFAULT_ERROR_MESSAGE,
    }
  },
```

Module-level helper beside `markThoughtDone` (`:235-238`):

```ts
const flagThoughtError = (historyItem: ChatMessage, errorText: string): void => {
  const thoughts = historyItem.thoughts
  if (!thoughts?.length) return
  const target = [...thoughts].reverse().find((t) => t.in_progress) ?? thoughts[thoughts.length - 1]
  target.error = errorText
}
```

- [ ] **Step 5: Call it from the terminal branch**

In `_handleChunk`'s `if (chunk.last)` block (`:1498-1507`), after `stream.finish()` / `inProgress = false` and before the `return`: narrow the chunk locally to `StreamChunk`, call `chatGenerationStore._classifyTerminalChunk(...)`, and on `isError` call `toaster.error(errorText)` plus `flagThoughtError(historyItem, errorText)`. Leave the returned `finalChunk`/`capturedStreamText` shape and the `last`-only termination rule unchanged; do not retype `streamChunkToObject`.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npm test -- src/store/__tests__/chatGeneration.terminalChunk.test.ts` → PASS (all 10).

- [ ] **Step 7: Commit FE2 on its own**

One commit with only the type extension, the store change and this test file, using the convention in Global Constraints and naming finding id **FE2**.

---

### Task 2: FE3 — every non-abort throw from stream dispatch reaches the failure path

**Files:**
- Modify: `src/store/chatGeneration.ts:1222-1226` (dispatch branch, after the `:1170-1220` try/catch)
- Test: `src/store/__tests__/chatGeneration.dispatchFailure.test.ts` (create)

**Interfaces:**
- Consumes: `ABORT_ERROR` (already imported from `@/utils/api`), `chatGenerationStore._handleRequestError` (`:1278-1296`) → `finalizeFailedRequest` (`:254-261`).
- Produces: no new symbol; `_sendRequest`'s signature (`:163-168`) is unchanged.

**Test-first: yes** — a test driving `_sendRequest` with `mockStream` resolving a reader whose first `read()` rejects with `new Error('network error')`; today `_sendRequest` rejects and `historyItem.inProgress` stays `true`, so `inProgress === false` fails.

- [ ] **Step 1: Write the failing tests**

Same harness clone. Build `const chat = { id: 'chat-1', history: [[historyItem]], isWorkflow: false } as unknown as Conversation`, set `mockChatsStore.currentChat = chat`, call `chatGenerationStore._sendRequest(chat, 0, 0, {} as any)`. Cases:

1. stream branch: `mockStream.mockResolvedValue({ read: vi.fn().mockRejectedValue(new Error('network error')), cancel: vi.fn() })` → the call **resolves**, and afterwards `historyItem.inProgress === false`, `historyItem.stream === null`, `historyItem.response` contains `'Oops! Something went wrong'`, `historyItem.processingTime` is a number.
2. non-stream branch: `mockStream` resolves a `Response` whose `json()` path throws → same finalization assertions (`inProgress === false`).
3. abort unchanged: dispatch throws `Object.assign(new Error('aborted'), { name: 'AbortError' })` → behavior as today, `_handleRequestError` writes no error text into `historyItem.response`.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/store/__tests__/chatGeneration.dispatchFailure.test.ts`
Expected: FAIL — rejection `network error`, `inProgress` still `true`.

- [ ] **Step 3: Wrap only the dispatch branch**

Put `:1222-1226` inside its own `try`. In `catch (error: any)`: rethrow when `error?.name === ABORT_ERROR` (abort semantics stay exactly as today — `_handleGenerationAbort` `:1590-1609` already finalized state), otherwise `chatGenerationStore._handleRequestError(historyItem, error, startTime)` and return. Comment why the `:1170-1220` try is **not** extended over the dispatch: it would run the MCP/OAuth/GitLab/Jira/Confluence parsers on dispatch errors and change their semantics. Do not touch `_handleGenerationStream`'s rethrow at `:1425`.

- [ ] **Step 4: Run the new tests plus the pinned drain test**

Run: `npm test -- src/store/__tests__/chatGeneration.dispatchFailure.test.ts`
Then: `npm test -- src/store/__tests__/chatGeneration.streamDrain.test.ts`
Expected: both PASS, including `streamDrain.test.ts:185-199`.

- [ ] **Step 5: Commit FE3 on its own**

One commit with only the `_sendRequest` change and this test file, using the convention in Global Constraints and naming finding id **FE3**.

---

## Negative-constraint check (spec Non-goals)

- Backend repo untouched; no `include_tool_errors` / request field / query param — no task edits `_prepareRequestData` (`:1229-1276`) or `ChatRequest`.
- No `ChatMessage.error` field, no `ChatAiMessage.tsx` branch, no component tests — Task 1 Step 5 surfaces via existing `toaster.error` + `Thought.error` only.
- camelCase `StreamChunk` untouched (Task 1 Step 3 says so explicitly); `streamChunkToObject` / `utils/stream.ts` not retyped (Step 5 narrows locally).
- FE3 stays out of `_handleGenerationStream`; its `:1425` rethrow is re-asserted in Task 2 Step 4.
- No code→text map — the classifier reads `agent_error.message` → `DEFAULT_ERROR_MESSAGE`, never branching on the code value; `error_details` is typed but never read.
- `_handleGenerationStreamError`'s `undefined: undefined` (`:1575-1584`) not fixed; no history rehydration; FE1 and backend AC#4 absent — no task touches them.
