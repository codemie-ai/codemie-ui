# Spec — EPMCDME-14855 frontend: terminal-chunk outcome and guaranteed finalization

Size: M. Frontend only. Two findings, one commit each, ids preserved: **FE2**, **FE3**.
Touched files: `src/store/chatGeneration.ts`, `src/types/entity/conversation.ts`, plus store unit tests.

## Context

The backend fix for this ticket is frozen and merged into its feature branch; its wire contract is
authoritative in `_TaskMY/EPMCDME-14855/analysis-EPMCDME-14855.md` §1 and is not re-litigated here.
Two frontend gaps remain (locations verified on disk 2026-09-21, see `technical-analysis.md` §2):

- `_handleChunk`'s terminal branch (`chatGeneration.ts:1498-1507`) ends the turn on `chunk.last`
  alone and reads none of the outcome fields, so an agent failure is indistinguishable from an
  answer.
- `_sendRequest`'s dispatch branch (`:1222-1226`) sits after the closing brace of the catch that
  wraps `api.stream` (`:1170-1220`), so a non-abort throw from stream consumption escapes past
  `createChatGeneration` (`:508`) and `historyItem.inProgress` is never reset — the ticket's
  original symptom on a dropped stream.

## FE2 — classify the terminal chunk by outcome

Termination stays keyed on `last` alone. Added on top of it: classify the terminal chunk per the
§1 matrix — **error** when `success === false` **or** `execution_error` is non-empty; **success**
when `success === true`, or `success == null` with no `execution_error`. Four backend shapes must
coexist: happy path (`success: true`), `_send_error_to_thread` (`success: false` + code), timeout
paths (`success: false`, *no* `execution_error`), and fast-path/A2A/security/workflow/`AIToolsAgent`
(`success` unset). An empty `generated` is legitimate and is not an error by itself.

Error text: `agent_error.message` when that field is present, else the existing
`DEFAULT_ERROR_MESSAGE`. No code-to-text mapping anywhere — `agent_token_limit` is deliberately
overloaded (F4/CR-008). Raw `error_details` / traceback is never rendered.

Classification is a new private helper in the store, declared in both `ChatGenerationStoreType`
and the proxy literal per the store's dual-declaration convention, and called from `_handleChunk`.

**Surfacing (decided, option A + C).** On an error outcome the store calls `toaster.error(text)`,
reusing the precedent at `:1284-1288`, and sets `Thought.error` (`conversation.ts:116`) on the
turn's thought so `ThoughtHeader`'s existing precedence (`ThoughtHeader.tsx:28-34`) renders
`StatusBadge "Failed"`. The error must be set such that it survives thought finalization rather
than being masked by the in-progress state. The text continues to land in `historyItem.response`
via `_handleStreamResponse` exactly as today. **No presentation-layer change.** Where the turn has
no thought (timeout chunks) the toast alone is accepted.

**Typing.** `success` and `execution_error` (plus `agent_error`, `tool_errors`, `error_details`
for contract fidelity — always `null` for the UI) are added to the snake_case `StreamChunk`
(`conversation.ts:327-334`). That type is inert on the runtime path: `_handleChunk` iterates
`chunkObjects: any[]` from `streamChunkToObject`, typed by the local `StreamChunkResult`
(`utils/stream.ts:67-70`). The chunk is therefore narrowed to `StreamChunk` locally at the point of
use inside `_handleChunk`; `streamChunkToObject` and `utils/stream.ts` are not retyped.

## FE3 — every non-abort throw reaches the failure path

The dispatch branch at `:1222-1226` is wrapped in its own narrow try/catch that routes non-abort
errors to `_handleRequestError` (`:1278`) → `finalizeFailedRequest` (`:254-261`), which resets
`inProgress`, clears `stream`, finishes thoughts and computes `processingTime`. Aborts keep their
current behavior. The existing `:1170-1220` try is **not** extended over the dispatch, because that
would run the MCP/OAuth/GitLab/Jira/Confluence auth-gate parsers on dispatch errors and change
their semantics. The fix does not move into `_handleGenerationStream`: its rethrow at `:1425` is
pinned by `chatGeneration.streamDrain.test.ts:185-199`. Drain-to-done and CR-001 semantics are
untouched.

## Acceptance criteria

1. `inProgress` is reset on any stream-read failure, including a network/HTTP drop before the
   terminal chunk.
2. Terminal chunk classified by `last` × `success` × `execution_error` as specified above.
3. Timeout chunks (`last` + `success === false`, no `execution_error`) classify as error and
   finalize the UI.
4. `last` + `success == null` (hedged fast-path win, A2A) finalizes as success — not error, not
   still-running.
5. `AIToolsAgent` shape (`success == null`, `execution_error` set) classifies as error, not silent
   success.
6. A terminal chunk with empty `generated` closes terminal state on `last` alone and is not a
   stream error.
7. Error text priority `agent_error.message` → `DEFAULT_ERROR_MESSAGE` (`generated` is never error text — review of !1951, 2026-10-21); no
   code-to-text map; no raw `error_details`/traceback rendered.
8. An error outcome produces `toaster.error`. `StatusBadge "Failed"` is shown for a thought the backend flagged (`error: true` on the thought chunk, also persisted for reloads) and for a thought still in progress when the run failed. The UI never guesses a finished thought (amended 2026-10-22: the backend now names the truncated LLM call's thought).
9. `success` / `execution_error` added to the snake_case `StreamChunk` only.
10. The chat request is unchanged — no `include_tool_errors`, no new request field, no new query
    param.
11. Abort behavior unchanged on every path; `streamDrain.test.ts:185-199` still passes.

## Non-goals

- Any change to the backend repository `/Users/viktarpapou/EPAM/EPM-SDAI/codemie`.
- Sending `include_tool_errors`; consuming `tool_errors` / `error_details` as data.
- New query params or new fields on `ChatRequest` / `ChatRequestInput`.
- A `ChatMessage.error` field or any error render branch in `ChatAiMessage.tsx` — explicitly
  rejected; no presentation-layer changes, and therefore no component tests.
- Editing the camelCase `StreamChunk` (`src/types/chatGeneration.ts:26-37`).
- Retyping `streamChunkToObject` or `utils/stream.ts`.
- Moving the FE3 fix into `_handleGenerationStream` or altering its rethrow.
- Hardcoded `execution_error` code-to-message mapping.
- Fixing `_handleGenerationStreamError`'s `undefined: undefined` interpolation (`:1575-1584`).
- Rehydrating error state from backend chat history.
- FE1, and any backend-side AC#4 tool-error consolidation.

## Testing

Test-first, store unit tests only, modelled on `src/store/__tests__/chatGeneration.streamDrain.test.ts`:
module-level `vi.mock('@/utils/api')`, the `createHistoryItem` factory, a fake `{ read, cancel }`
reader, per-test dynamic `await import('@/store/chatGeneration')`. Cover each terminal shape in
criteria 2-7 (including empty `generated` and a thought-less error chunk), the toast + thought-error
assertions, and FE3's `inProgress === false` after a throwing dispatch. Both findings start from
zero coverage.

## Risks and accepted limitations

- The §1 matrix cannot be re-verified from this repo; correctness rests on the frozen briefing.
- **Accepted:** the error signal is session-only. Backend chat history carries no error field, so
  after a reload the text renders as an ordinary answer.
- **Accepted:** a timeout terminal chunk with no thought shows only the toast.
- With `HIDE_AGENT_STREAMING_EXCEPTIONS=False` (default), `generated` may itself carry technical
  exception text; "actionable message" is bounded by what the backend sends.
- Process: ticket-prefixed commits (CI-validated), one commit per finding, husky's four blocking
  hooks, and an MR description carrying the regression-command request plus a full
  `npm run test-harness` log.
