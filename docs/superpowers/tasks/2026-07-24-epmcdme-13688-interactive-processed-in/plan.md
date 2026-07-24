# Implementation plan — "Processed in" for interactive-only responses

Spec: `./spec.md`
Technical analysis: `./technical-analysis.md`

Each task is test-first. Run the narrowest test command that covers the task, confirm RED, then
implement, then confirm GREEN.

---

## Task 1 — `processingTime` is assigned for a text-free streamed response

**Test-first: yes** — in `src/store/__tests__/chatGeneration.interactive.test.ts`, a test that
drives `_handleStreamResponse` with a stream whose terminal chunk is
`{ generated: '', generated_chunk: '', last: true }` and asserts `historyItem.processingTime` is
a number. Fails today because both assignment branches are skipped.

**Implementation** — in `src/store/chatGeneration.ts::_handleStreamResponse`, hoist
`historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000` out of the
`if (response?.generated)` / `else if (response?.capturedStreamText)` branches so it runs once,
unconditionally, right after `endTime` is computed. Remove both in-branch assignments.

**Verify:** `npx vitest run src/store/__tests__/chatGeneration.interactive.test.ts`

---

## Task 2 — regular text responses keep their duration

**Test-first: yes** — same file: drive `_handleStreamResponse` with a terminal chunk carrying
non-empty `generated`, assert both `historyItem.response` and `historyItem.processingTime` are
set. Guards the branch rewrite from Task 1 against a regression.

**Implementation** — none expected; Task 1 must already satisfy this. If it does not, the
hoist was done wrong.

**Verify:** same command as Task 1.

---

## Task 3 — a terminal chunk carrying an interactive request finishes the stream

**Test-first: yes** — same file: call `_handleChunk` with a single chunk containing both
`interactive_request` and `last: true`; assert the returned `finalChunk` is non-null,
`historyItem.inProgress` is `false`, and `historyItem.interactiveRequest.request_id` is
recorded. Fails today: the `interactive_request` branch short-circuits before `chunk.last` is
ever inspected.

**Implementation** — in `_handleChunk`, keep the `if / else if / else` chain for content routing
(interactive request → thought → stream push) but move the `chunk.last` termination block out of
the `else`, to the end of the loop body, so it runs for any chunk shape. Preserve the existing
`capturedStreamText` composition and return value.

**Verify:** same command as Task 1.

---

## Task 4 — the label renders for a zero-duration response

**Test-first: yes** — new file
`src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx`
with two cases: a message with `processingTime: 3.2` renders "Processed in", and a message with
`processingTime: 0` also renders it. The second case fails today.

**Implementation** — in `ChatAiMessage.tsx`, replace the truthy check in the `useMemo` with an
explicit `!= null` check, and gate the JSX on `processingTime !== null` instead of on the
truthiness of the formatted string.

**Verify:** `npx vitest run src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx`

---

## Task 5 — full gate run

No test of its own. Run the repository quality gates (lint, build, affected tests) and fix any
fallout before handoff.
