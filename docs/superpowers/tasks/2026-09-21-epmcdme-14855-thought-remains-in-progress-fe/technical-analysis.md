# Technical Research

**Task**: chat generation streaming terminal-chunk error-handling store
**Generated**: 2026-09-21
**Research path**: codegraph

---

## 1. Original Context

Frontend-only work for ticket EPMCDME-14855 ("CodeMie thought remains in progress") in /Users/viktarpapou/EPAM/EPM-SDAI/codemie-ui. Two findings in scope:

FE2 — In src/store/chatGeneration.ts `_handleChunk`, the terminal stream chunk must be classified via the backend wire matrix `last × success × execution_error`: error when `success === false` OR a non-empty `execution_error`; success when `success === true` or (`success == null` and no `execution_error`). Error text priority: `agent_error.message` (when the field is present) then `generated`. No hardcoded code→text mapping. The type must be extended in the snake_case type in src/types/entity/conversation.ts (~lines 327-334), NOT in the camelCase copy in src/types/chatGeneration.ts.

FE3 — The dispatch branch in `_sendRequest` (~lines 1223-1226) sits outside try/catch, so a non-abort throw never reaches `_handleRequestError`/`finalizeFailedRequest` and `historyItem.inProgress` is never reset (the ticket's original symptom on a dropped stream). Any non-abort throw must reach the failure path.

Out of scope: any change to the backend repository /Users/viktarpapou/EPAM/EPM-SDAI/codemie; sending `include_tool_errors` in requests; new query params or ChatRequest fields.

SPECIAL RESEARCH INSTRUCTION — do not research this codebase from scratch:
An authoritative analysis briefing already exists at
  /Users/viktarpapou/EPAM/EPM-SDAI/_TaskMY/EPMCDME-14855/analysis-EPMCDME-14855.md
Read it FIRST and treat it as your starting set of findings. Its §1 already contains the frozen backend wire contract (the last × success × execution_error matrix, the include_tool_errors gating, timeout chunks) — accept §1 as given and do NOT analyze the backend repository at all. §2 defines the scope (Task A = FE2, Task B = FE3), §3 the acceptance criteria, §4 the process rules.

Your job is to VERIFY that briefing against the current frontend code and FILL THE GAPS:
- Line numbers in the briefing may have drifted (the branch was just fast-forwarded to origin/main cd2327fc7). Re-locate `_handleChunk`, the terminal-chunk handling, the `_sendRequest` dispatch branch, `_handleRequestError`, `finalizeFailedRequest`, and the conversation chunk types, and report their ACTUAL current locations and line ranges.
- Confirm or correct each FE2/FE3 claim against the real code; flag anything in the briefing that no longer holds.
- Map the existing error-display path: how an error set on a history item renders, and what fields the UI reads.
- Find the existing test files and testing conventions that cover chatGeneration (unit test framework, mocking of the stream, existing terminal-chunk tests) so the plan can be test-first.
- Identify every consumer of the changed types and functions (blast radius).
- Note the repo's own standards/process rules relevant to this change (from .ai-run/guides/ and AGENTS.md): ticket-prefixed commits, one commit per finding, MR description requirements.

Write technical-analysis.md into run_dir with the standard sections (including "Codebase Findings" and "Risk Indicators") and return a digest of at most 400 words.

---

## 2. Codebase Findings

### Existing Implementations

All line ranges below were re-read from disk on 2026-09-21 and supersede the briefing's numbers.

`src/store/chatGeneration.ts` (single Valtio proxy store, ~1610 lines):

- `StreamDrainState` interface — **76-81** (`cachedValue`, `response: any`, `receivedFinalChunk`, `notificationTimeoutId`).
- `ChatGenerationStoreType` interface — **83-213**. Relevant signatures: `_sendRequest` 163-168, `_handleGenerationStream` 169-173, `_processStreamChunk` 174-178, `_handleChunk` **179-182** (declared as `Promise<{ finalChunk: any; incompleteChunk: string | null }>`), `_handleGenerationStreamError` 185, `_handleRequestError` 199, `_handleNonStreamResponse` 201-206, `_handleStreamResponse` 207-212.
- Module constants — `STREAMING_NOTIFICATION` / `STREAMING_NOTIFICATION_INTERVAL` 61-62, `ASSISTANT_NOT_FOUND` 63-64, `EMPTY_MESSAGE` 65, rename-poll constants 67-69.
- Private helpers — `markThoughtDone` 235-238, `dropInProgressThoughts` 240-243, `finishThoughts` 245-252, **`finalizeFailedRequest` 254-261** (sets `inProgress = false`, `stream = null`, calls `finishThoughts`, computes `processingTime`).
- Auth-gate appliers that all end in `finalizeFailedRequest`: `applyPromptRows` 273-282, `applyGitlabAuthPrompt` 284-293, `applyJiraAuthPrompt` 295-304, `applyConfluenceAuthPrompt` 306-315, `applyOAuthConnectPrompts` 319-330.
- `createChatGeneration` — **416-509**; final statement `return chatGenerationStore._sendRequest(chat, historyIndex, messageIndex, data)` at **508**. There is **no try/catch anywhere in this method**; a rejected `_sendRequest` propagates to its callers.
- **`_sendRequest` — 1142-1227.** The `try` block spans **1170-1220** and wraps *only* `await api.stream(...)` (1171). Its catch (1172-1220) handles MCP auth (1184-1187), aggregate OAuth (1191-1195), GitLab (1198-1202), Jira (1205-1209), Confluence (1212-1216), then `_handleRequestError` (1218) and returns.
- **FE3 confirmed, numbers drifted by one line:** the dispatch branch is **1222-1226** (briefing said ~1223-1226) and sits *after* the closing brace of the catch, i.e. outside try/catch: `if (reader instanceof Response) await _handleNonStreamResponse(...) else await _handleStreamResponse(...)`.
- `_prepareRequestData` — 1229-1276 (non-workflow assistant branch 1241-1248; briefing's 1241-1247 drifted by one).
- `_handleRequestError` — **1278-1296**: `errorText = _handleGenerationStreamError(error)`; A2UI turns are removed + `toaster.error` (1284-1288); otherwise `historyItem.response = errorText` (1289), `loginUrl` (1290), all four auth prompts nulled (1291-1294), `finalizeFailedRequest` (1295).
- `_handleNonStreamResponse` — 1313-1331 (has its own try/catch around `reader.json()`).
- `_handleStreamResponse` — **1333-1380**. **No try/catch of its own** (briefing correct). `historyItem.response = response.generated` at 1350-1352, `capturedStreamText` fallback 1353-1355, `inProgress = false` 1357.
- `_handleGenerationStream` — **1382-1431**. Drain loop 1396-1427; catch 1410-1426: drain-phase error after final chunk → `break` (1414-1417); `ABORT_ERROR` → `_handleGenerationAbort` (1420-1422); otherwise **`throw error` at 1425** (briefing said ~1430).
- `_processStreamChunk` — 1433-1461.
- **`_handleChunk` — 1477-1511** (briefing exact). Body: `streamChunkToObject(value)` 1481; per-chunk branch `chunk.a2ui` 1484-1488 / `chunk.thought` 1489-1490 / else push `generated_chunk` 1492; **terminal handling `if (chunk.last)` 1498-1507** (briefing said 1495-1506 — 1495-1497 is the explanatory comment). Terminal block captures `stream + streamBuffer` into `capturedStreamText`, calls `stream.finish()`, sets `inProgress = false`, returns the raw chunk as `finalChunk`. **No reading of `success`, `execution_error`, `agent_error`, `tool_errors` or `error_details` anywhere — FE2 confirmed.**
- `_handleThought` 1513-1555, `_findThought` 1557-1573, `_handleGenerationStreamError` **1575-1584**, `_finishThoughts` 1586-1588, `_handleGenerationAbort` 1590-1609.

Types:

- `src/types/entity/conversation.ts` — snake_case **`StreamChunk` 327-334** (exactly as the briefing said: `generated_chunk`, `thought`, `last`, `generated`, `debug`, `a2ui`) and **`StreamChunkParseResult` 336-339**. Also `Thought` 106-122 (`error?: boolean | string` at 116), `ChatMessage` **153-188** (no error field; `inProgress?` 162, `loginUrl?` 170, `stream?` 174), `ThoughtBackend` 274-288, `HistoryItemBackend` 290-307.
- `src/types/chatGeneration.ts` — camelCase `StreamChunk` at **26-37** (briefing said 26-35), referenced only by `StreamEvent` 41-44 in the same file. `ChatRequest` 64-95, `ChatRequestInput` 97-114, `ChatGenerationOptions` 116-132.
- `src/utils/stream.ts` — `Stream` class 22-65 (`stream`, `streamBuffer`, `finish()` 34-38, `getStream()` 55-64); **its own local `StreamChunkResult { chunkObjects: any[]; incompleteChunk: string | null }` at 67-70**, returned by `streamChunkToObject` 77-116 (raw `JSON.parse`, no case conversion — briefing correct).
- `src/utils/api.ts` — `stream()` **207-256**: throws the parsed error body on non-ok (231-248), returns the bare `Response` when `Content-Type !== application/x-ndjson` (250-253), else a `ReadableStreamDefaultReader<string>`.

### Architecture and Layers Affected

- **Store / state layer** — `src/store/chatGeneration.ts` is the only module that reads stream chunks and owns `historyItem.inProgress`. Both findings live here.
- **Type layer** — `src/types/entity/conversation.ts` (snake_case wire shapes) and, as the do-not-touch twin, `src/types/chatGeneration.ts`.
- **Transport layer** — `src/utils/api.ts` `stream()` and `src/utils/stream.ts` `streamChunkToObject` sit under the store; neither is named by the findings.
- **Presentation layer (read-only for this research)** — `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` and `src/components/Thought/*` are what renders whatever the store sets.

### Integration Points

- `_sendRequest` → `api.stream` (`src/utils/api.ts:207`) → `_handleStreamResponse` / `_handleNonStreamResponse`.
- `_handleChunk` → `streamChunkToObject` (`src/utils/stream.ts:77`) and the `Stream` instance on `historyItem.stream`.
- `_handleStreamResponse` → `chatsStore.refreshWorkflowExecutionIds` (1366), `chatsStore.getChat` (1330), `_pollForRenamedChat` (1378) behind `isChatContextualNamingEnabled()` (1375).
- Auth-gate parsers: `@/utils/mcpAuth`, `@/utils/oauthConnectAggregate`, `@/utils/gitlabAuth`, `@/utils/jiraAuth`, `@/utils/confluenceAuth` — all consumed inside the `_sendRequest` catch.
- `toaster` (`@/utils/toaster`) — the store's only notification channel.

### Patterns and Conventions

- Valtio `proxy<ChatGenerationStoreType>({...})` with an explicit interface: **every new or changed method signature must be declared twice** — in the interface (83-213) and in the object literal.
- Store methods call each other through the module-level `chatGenerationStore` reference, never `this` — this is what makes them spy-able and directly callable from unit tests.
- Terminal state is closed in exactly one place today (`_handleChunk` 1498-1507) plus the belt-and-braces resets in `_handleStreamResponse` 1357-1359 and `finalizeFailedRequest` 254-261.
- Failure finalization is funnelled through the single helper `finalizeFailedRequest`, used by 6 call sites (`_handleRequestError` + the 5 auth-gate appliers).
- `_handleChunk` iterates untyped chunks (`chunkObjects: any[]`) and returns `finalChunk: any`.

### Blast Radius (consumers of the symbols in scope)

- **`StreamChunk` (conversation.ts:327)** — codegraph reports **1 referencing symbol, and it is `StreamChunkParseResult` in the same file**; no tests within 3 caller hops. `StreamChunkParseResult` is not imported by `src/utils/stream.ts`, which declares its own `StreamChunkResult`. Extending 327-334 is therefore a zero-consumer edit today.
- **`StreamChunk` (chatGeneration.ts:26)** — 1 referencing symbol (`StreamEvent`, same file). Confirms the briefing's "camelCase copy the code does not use".
- **`finalizeFailedRequest`** — 6 callers, all inside `src/store/chatGeneration.ts`; codegraph found **no tests within 3 caller hops**.
- **`ChatRequest`** — 4 callers in `src/store/chatGeneration.ts`; exercised by `src/store/__tests__/chatGeneration.test.ts`.
- **`Stream` (utils/stream.ts:22)** — 1 caller, `src/store/chatGeneration.ts`.
- **`_handleGenerationStream`'s rethrow at 1425** is asserted by an existing test (`chatGeneration.streamDrain.test.ts:185-199`, "still rethrows a non-abort error that occurs before the final chunk is received").

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists (32 files). Relevant ones read:

- `.ai-run/guides/development/error-handling-patterns.md` — layer responsibility table (API client throws · store catches, sets state, shows toaster · component renders from snapshot · error boundary for render crashes). Rules that bind this change: never leave a loading/progress flag stuck true (use `finally`), never render `error.stack` or raw technical text to the user (log it, show a friendly string), `toaster.*` is called **from stores only**, always `console.error` even for non-critical failures, rethrow only when a caller will react.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest 1.6.1 + React Testing Library, two workspace projects (`unit`, `integration`) via `vitest.workspace.ts`; tests in co-located `__tests__/`; `*.test.ts(x)` = unit, `*.integration.test.tsx` = integration; `vi.mock()` at module level only; `afterEach(cleanup)`; unit setup mocks `useSnapshot` and `@/utils/api`.
- `.ai-run/guides/standards/git-workflow.md` — branch `EPMCDME-XXXX_short-description`; commit `EPMCDME-XXXX: Capital sentence`, CI-enforced regex given verbatim in the guide, no trailing period, uppercase first word; squash merge; husky pre-commit runs lint-staged, `license-headers:check`, `secrets:check`, `sonar-local` and must not be bypassed; MR checklist = Summary + **full `npm run test-harness` console log (always mandatory, unit tests do not substitute)** + before/after screenshots for user-visible change + `Closes EPMCDME-XXXX`.
- `AGENTS.md` — routing table plus critical rules: run `npm ci` before trusting any gate; run gates individually, never chained with `&&`; prettier/eslint run automatically via a `PostToolUse` hook in `.claude/settings.json`; one logical change per commit; do not write summary or validation-report documents.

### Architectural Decisions

- Recorded in code comments rather than ADRs. Load-bearing ones for this change: `_handleChunk` 1495-1497 ("Termination is decided by the chunk's `last` flag alone, independently of what the chunk carries"); `_handleGenerationStream` 1403-1406 (keep draining to `done` so server-side background hooks run) and 1411-1413 (a drain-phase error after the final chunk must not discard a successful generation, tagged CR-001 in tests); `_sendRequest` 1173-1177 (`pendingRename` must be cleared on the failure path); `_handleRequestError` 1280-1283 (A2UI turns are rolled back and toasted instead of getting error text).
- `src/components/Thought/ThoughtHeader.tsx:28-34` encodes the thought-status precedence decision: in-progress → interrupted → aborted → error → success.

### Derived Conventions

- Wire-shaped (snake_case) types belong in `src/types/entity/*`; camelCase view/request types in `src/types/*`. The NDJSON parser does no case conversion, so chunk fields are snake_case at the point of use.
- New store behaviour is tested by calling the private `_`-prefixed method directly with a hand-rolled fake reader, not by driving the UI.

---

## 4. Testing Landscape

### Existing Coverage

11 test files target this store, all under `src/store/__tests__/`: `chatGeneration.test.ts`, `chatGeneration.a2ui.test.ts`, `chatGeneration.prepareRequestData.test.ts`, `chatGeneration.promptAuth.test.ts`, `chatGeneration.renamePoll.test.ts`, `chatGeneration.resumeToolCall.test.ts`, `chatGeneration.resumeWorkflowExecution.test.ts`, `chatGeneration.storageGuards.test.ts`, `chatGeneration.streamDrain.test.ts`, `chatGeneration.toolCallConfirmation.test.ts`.

`src/store/__tests__/chatGeneration.streamDrain.test.ts` (227 lines) is the closest existing harness to both findings and the model to copy. Its five tests all drive `_handleGenerationStream` directly:

1. 105-132 — keeps draining to `done` after the terminal chunk (`{generated_chunk, generated, last: true}`), asserts `read` called 3× and `inProgress === false`.
2. 134-156 — chunks after the terminal chunk are not reprocessed.
3. 158-183 — CR-001: drain-phase error after the terminal chunk returns the completed response.
4. **185-199 — CR-001: a non-abort error *before* the terminal chunk still rejects** (`rejects.toThrow('network error')`).
5. 201-226 — CR-001: abort during drain returns the completed response.

Related presentation coverage: `src/components/Thought/__tests__/Thought.test.tsx`, `ThoughtHeader.test.tsx`, `ThoughtMessage.test.tsx`; `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/*` (ChatA2uiBlock, ChatAiMessage.font, and others).

### Testing Framework and Patterns

Vitest 1.6.1 (`unit` project). Conventions observed verbatim in `chatGeneration.streamDrain.test.ts`:

- Module-level `vi.mock('@/utils/api', () => ({ ABORT_ERROR: 'AbortError', DEFAULT_ERROR_MESSAGE: 'Oops! Something went wrong', default: { stream, post, put, delete } }))` (40-49), plus mocks of `@/store/assistants` (51-56), `@/store/chats` (58-60, a hand-written `mockChatsStore` object 29-38), `@/store/workflowExecutions` (62-67), `@/utils/helpers` (69-71), `@/utils/toaster` (73-78).
- `createHistoryItem(overrides)` factory (80-94) returning a `ChatMessage` with `inProgress: true`.
- Fake stream reader: `{ read: vi.fn().mockResolvedValueOnce({ done: false, value: JSON.stringify(chunk) })…, cancel: vi.fn() } as unknown as ReadableStreamDefaultReader`.
- `beforeEach`: `vi.clearAllMocks()`, `vi.restoreAllMocks()`, reset `mockChatsStore.currentChat`, then `const { chatGenerationStore } = await import('@/store/chatGeneration')` and clear `chatAbortControllers`. The store is re-imported dynamically **inside each test**.
- Commands (from the testing guide): `npm run test:unit:slnt`, `npm test -- <file>`, `npm run test:coverage`; `npm run test-harness` (see `scripts/test-harness-fast.mjs` — docker compose + `uvx codemie-test-harness run sanity-ui`) for the MR log.

### Coverage Gaps

- **No test asserts the failure path end-to-end**: codegraph finds no test within 3 caller hops of `finalizeFailedRequest`, and no test drives `_sendRequest` through a throwing `_handleStreamResponse` to check `historyItem.inProgress`. FE3's exact symptom is unguarded.
- **No test covers terminal-chunk outcome classification** — no existing test file asserts anything about `success`, `execution_error`, `agent_error`, `tool_errors` or `error_details` (those field names do not appear in the store or its tests).
- No test covers `_handleRequestError`'s non-A2UI branch (1289-1295).
- No test covers a terminal chunk with empty `generated` (security/workflow shapes described in the briefing).

---

## 5. Configuration and Environment

### Environment Variables

None govern this feature area on the frontend. `src/utils/api.ts:143` reads `window._env_.VITE_API_URL || import.meta.env.VITE_API_URL` for the base URL; that is the only env input on the streaming path. All timeout/error-text/gating knobs named in the briefing (`AI_AGENT_QUEUE_POLL_TIMEOUT_SECONDS`, `HIDE_AGENT_STREAMING_EXCEPTIONS`, `AGENT_MSG_*`) are backend-side and out of scope.

### Configuration Files

- `vitest.workspace.ts` — the `unit` / `integration` split; `setupTests.tsx`, `setupTests.unit.ts`.
- `package.json` — script names and the pinned Vitest version (read there, not from docs).
- `.husky/pre-commit` — the four blocking hooks.
- `.claude/settings.json` — `PostToolUse` prettier/eslint hook for files under `src/`.
- In-module constants instead of config for this area: `STREAMING_NOTIFICATION_INTERVAL = 5_000` and `EMPTY_MESSAGE` (`chatGeneration.ts:61-65`), `TIMEOUT = 10` (`src/utils/stream.ts:16`).

### Feature Flags and Deployment Concerns

- `isChatContextualNamingEnabled()` (`@/utils/featureFlags`) gates only the post-stream rename poll at `chatGeneration.ts:1375` — adjacent to, not part of, the terminal-chunk path.
- No flag gates stream handling or error display.
- Deployment: the served image copies a prebuilt `dist/`; `npm ci && npm run build:prod` precedes any image rebuild (AGENTS.md). Not exercised by a store-only change.

---

## 6. Risk Indicators

- **Both `StreamChunk` types are inert on the runtime path.** `_handleChunk` (1477-1511) iterates `chunkObjects: any[]` produced by `streamChunkToObject`, whose return type is the *local* `StreamChunkResult` in `src/utils/stream.ts:67-70` — `StreamChunkParseResult` (conversation.ts:336-339) is not imported there. So the briefing's "extend the actually-used snake_case type" is right about *which file* but the type is not actually load-bearing today: editing 327-334 alone gives the compiler no view of the terminal chunk. *Speculative:* if type safety is wanted at the point of use, the chunk variable in `_handleChunk` (and/or `streamChunkToObject`'s return) would also have to be annotated — a second, unnamed edit site the plan should decide about explicitly.
- **An existing test pins the current rethrow.** `chatGeneration.streamDrain.test.ts:185-199` asserts `_handleGenerationStream` rejects on a pre-terminal non-abort error. Any FE3 fix placed *inside* `_handleGenerationStream` (the briefing's parenthetical alternative) contradicts that test; a fix in `_sendRequest`'s dispatch branch (1222-1226) does not.
- **There is no error-display affordance on an assistant turn today.** `ChatMessage` (conversation.ts:153-188) has no error field; `_handleRequestError:1289` writes plain text into `historyItem.response`, and `ChatAiMessage.tsx:180` + 309-314 renders `message.stream?.getStream() ?? message.response` through `<Markdown>` — visually identical to a successful answer. The only existing error visuals are per-thought (`Thought.error` → `getThoughtStatus` at `ThoughtHeader.tsx:28-34` → `StatusEnum.Error` + `StatusBadge` "Failed", rendered at `ThoughtHeader.tsx:42-56,124`) and `toaster.error`, which `_handleRequestError` uses only for A2UI turns (1284-1288). *Speculative:* AC "render agent/token-limit errors as an error rather than as ordinary response text" has no existing message-level mechanism to reuse, so it implies either a new `ChatMessage` field + render branch or reuse of the toast/StatusBadge primitives — an unscored design decision, not a discovered constraint.
- **Zero regression net around the failure path.** No test within 3 caller hops of `finalizeFailedRequest`; nothing asserts `inProgress` reset after a throwing dispatch; no test mentions `success`/`execution_error`. Both findings start from a blank coverage sheet.
- **Four terminal-chunk shapes must coexist** per briefing §1 (happy-path `success:true`; `_send_error_to_thread` `success:false` + code; timeout chunks `success:false` with *no* `execution_error`; fast-path/A2A/security/workflow/`AIToolsAgent` with `success == null`). `_handleChunk`'s current single `if (chunk.last)` branch collapses all of them; the classification is pure logic with no local fixture to validate against — correctness depends entirely on the briefing's matrix, which cannot be re-verified from this repo.
- **Dual declaration burden in the store.** Any signature change must land in both `ChatGenerationStoreType` (83-213) and the proxy literal; a mismatch surfaces only at type-check, which per AGENTS.md is untrustworthy without a preceding `npm ci`.
- **Briefing drift (minor, all corrected in §2):** `_sendRequest` dispatch 1222-1226 (not 1223-1226); terminal block 1498-1507 (not 1495-1506); rethrow 1425 (not ~1430); `_prepareRequestData` non-workflow branch 1241-1248; camelCase `StreamChunk` 26-37 (not 26-35). `_handleChunk` 1477-1511 and `StreamChunk` 327-334 / `StreamChunkParseResult` 336-339 are unchanged. No FE2/FE3 claim was invalidated.
- **Process risk:** the MR cannot merge without a full `npm run test-harness` log in the description (compliance bot), and `scripts/test-harness-fast.mjs` needs docker compose, `uvx`, and `~/.codemie/test-harness.json`. The briefing also requires the UI branch be rebased onto `origin/main` (`cd2327fc7`) and a backend from feature branch `7ef861d78` for any manual verification — neither is verifiable from this repo's working tree.
- `_handleGenerationStreamError` (1575-1584) destructures `{ message, details, help }` and interpolates them unconditionally, so its output can contain `undefined: undefined` fragments — an adjacent quality trap if the error-text path is touched.

---

## 7. Summary for Complexity Assessment

Both findings are confined to one file, `src/store/chatGeneration.ts` (the Valtio chat-generation store), with a second, tiny touch point in the wire-type file `src/types/entity/conversation.ts` (`StreamChunk`, 327-334). FE3 is a control-flow defect with an exact, verified location: `_sendRequest`'s try block (1170-1220) wraps only `await api.stream(...)`, while the dispatch branch that actually consumes the stream sits at 1222-1226, outside it; `_handleGenerationStream` rethrows non-abort pre-terminal errors at 1425, `_handleStreamResponse` (1333-1380) has no catch, and `createChatGeneration` (416-509) has none either, so the rejection escapes and `inProgress` is never reset by `finalizeFailedRequest` (254-261). FE2 is a pure-logic addition inside `_handleChunk` (1477-1511), whose terminal branch (1498-1507) today keys on `chunk.last` alone and reads none of the wire's outcome fields. Type blast radius is effectively nil: codegraph shows the snake_case `StreamChunk` is referenced only by `StreamChunkParseResult` in the same file, and the camelCase copy only by `StreamEvent` in its own file; `finalizeFailedRequest` has 6 callers, all in-file.

Technical novelty is low-to-moderate. The store's patterns are established and imitable (dual declaration in `ChatGenerationStoreType`, `chatGenerationStore.`-qualified self-calls, single failure funnel). The genuinely new element is outcome classification of a terminal chunk across four backend-emitted shapes, which cannot be validated against anything in this repo — it rests on the external briefing's frozen matrix. A second unresolved element is presentation: there is no message-level error affordance at all (`ChatMessage` has no error field; error text lands in `historyItem.response` and renders through `<Markdown>` exactly like a successful answer), so the "show it as an error" acceptance criterion has no existing mechanism to extend and is a design decision rather than a research finding.

Test posture is the main cost driver. Conventions are crisp and directly reusable — `src/store/__tests__/chatGeneration.streamDrain.test.ts` supplies the whole harness (module-level `vi.mock('@/utils/api')`, a `createHistoryItem` factory, a fake `{ read, cancel }` reader, per-test dynamic `await import('@/store/chatGeneration')`) — but coverage for both findings is zero: nothing asserts the failure path resets `inProgress`, nothing references `success`/`execution_error`, and no test exercises `_handleRequestError`'s non-A2UI branch. One existing test (streamDrain 185-199) pins the current rethrow behaviour and constrains where FE3 may be fixed. Process overhead is fixed and non-trivial: ticket-prefixed commits validated by CI, one commit per finding (FE2, FE3), husky's four blocking hooks, and an MR that will not merge without a full `npm run test-harness` log.

---

## 8. External References

**`/Users/viktarpapou/EPAM/EPM-SDAI/_TaskMY/EPMCDME-14855/analysis-EPMCDME-14855.md`** — resolved and read (71 lines, Russian). Facts the spec needs from it:

- **Terminal-chunk matrix (§1, frozen, treat as given):** `last === true` → **error** if `success === false` **OR** `execution_error != null`; **success** if `success === true` **OR** (`success == null` **AND** `execution_error == null`). Rationale per shape: `_send_error_to_thread` sends `last:true, success:false, execution_error:<error_code>`; timeout paths (`_build_timeout_result` — hedged, `_serve_data` queue.Empty, A2A) send `last:true, success:false` **with no `execution_error` field at all**; hedged fast-path win, A2A `task_callback`, security branch, workflow finals and `pure_chat_chain` send `last:true` and **never set `success`** (→ `null`); non-langgraph `AIToolsAgent.send_error_response` sends `last:true, execution_error:<code>` and **no `success`** — which is why "error = `last && success === false`" alone is wrong.
- **Error text priority:** `agent_error.message` **only when the field is present**, otherwise `generated`. No hardcoded code→text mapping — `execution_error === 'agent_token_limit'` is deliberately also used for the consecutive-tool-error cap (`MaxConsecutiveToolErrorsExceededException`), documented trade-off F4/CR-008.
- **Gating decision (final):** `include_tool_errors` is **not** sent in this ticket, so `agent_error` / `tool_errors` / `error_details` are **always `null`** for the UI; guaranteed minimum is `generated` + `execution_error` + `success` + `last`. No new query params, no new `ChatRequest`/`ChatRequestInput` fields. Raw `error_details.traceback` must never be rendered (backend redaction only applies when `HIDE_AGENT_STREAMING_EXCEPTIONS=True`, default `False`).
- **Empty `generated` on a terminal chunk is legitimate** (security branch sends `generated: ""`); terminal state must close on `last` alone without requiring non-empty `generated` or a present `success`.
- **Already fixed backend-side without FE changes:** a `last:true` chunk already calls `stream.finish()`, sets `inProgress = false`, runs `_finishThoughts()`, and `generated` already reaches `historyItem.response` — so there is no eternal in-progress from the token-limit scenario any more. The only remaining hang is FE3 (client-side stream/network drop). Residual FE2 value is presenting agent/limit failures *as errors* and handling `success`/`execution_error` correctly.
- **Process (§4):** re-read code at the cited file:line before editing (done — see §2); commit one finding at a time preserving the FE2/FE3 ids; `codemie-ui/AGENTS.md:180-188` requires the regression-command request + harness log in the MR description and `:204-212` the CI-validated ticket prefix; the `/sanity` rule from codemie-backend does not apply here. Ticket is **not merged to backend `main`**; backend for local runs is branch `EPMCDME-14855_CodeMie-thought-remains-in-progress` at `7ef861d78`; the local UI branch must be rebased onto `origin/main` = `cd2327fc7`.
- **Backend repository `/Users/viktarpapou/EPAM/EPM-SDAI/codemie` was deliberately not analysed**, per the instruction to accept §1 as given.
