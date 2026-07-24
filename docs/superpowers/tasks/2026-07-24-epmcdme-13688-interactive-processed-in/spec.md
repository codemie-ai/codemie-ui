# Spec — "Processed in" metadata missing for interactive-only responses

## Problem

The chat UI does not render the "Processed in: <duration>s / <timestamp>" line for an
assistant response that carries only an interactive surface (checkbox list + Submit) and
no assistant text. The line appears after a page refresh, so the data exists server-side —
only the live client state lacks it.

## Root cause

`src/store/chatGeneration.ts::_handleStreamResponse` assigns `processingTime` inside the two
branches that also assign the response text:

```ts
if (response?.generated) {
  historyItem.response = response.generated
  historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
  historyItem.debug = response.debug
} else if (response?.capturedStreamText) {
  historyItem.response = response.capturedStreamText
  historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
}
```

The backend emits the terminal chunk as `generated=<result>, generated_chunk="", last=true`.
For an interactive-only turn the agent result is an empty string, so both branches are skipped
and `processingTime` stays `undefined`. `ChatAiMessage` gates the label on that value, so the
label never renders.

The two sibling finalization paths — `_handleNonStreamResponse` and `finalizeFailedRequest` —
already assign the duration unconditionally. The streaming path is the outlier.

After a refresh the value is repopulated from the server through
`src/utils/chatHelpers.ts` (`processingTime: assistantItem.responseTime`), which is why the
label appears on reload.

## Scope

### In scope

1. **Root fix.** Assign `processingTime` in `_handleStreamResponse` for every turn that actually
   finalized, rather than only for the two that produced text. A turn counts as finalized when
   the stream returned a terminal chunk (`last`) or any text (`generated` / `capturedStreamText`).
   The interactive-only case qualifies through `last`. A stream that ended without a terminal
   chunk — a server-side cut, proxy timeout or dropped connection — never finished and stays
   unlabelled, so a truncated bubble remains visually distinguishable from a completed one.
   The value stays client-measured (`endTime - startTime`); the source of the number is not
   changing.

2. **Adjacent hardening — chunk termination.** `_handleChunk` mixes content routing and stream
   termination in one `if / else if / else` chain: `chunk.last` is only inspected inside the
   final `else`. A chunk carrying both `interactive_request` and `last: true` would therefore
   leave `inProgress` true and return no `finalChunk`. The current backend sends those as
   separate chunks, so the defect is latent, not observed. Separate the two concerns: route by
   content type first, then terminate on `last` at the loop level.

3. **Adjacent hardening — render guard.** `ChatAiMessage` derives the label from a truthy check
   on a number, so a duration of exactly `0` hides the label. Use an explicit null check.

### Out of scope

The live value is client-measured while the post-refresh value comes from the server's
`responseTime`, so the displayed number can differ across a reload. The ticket requires
consistent *visibility*, not a consistent number, and changing the source would affect every
response in the chat. Left as-is deliberately.

## Behavior after the fix

- An interactive-only response shows "Processed in: <duration>s / <timestamp>" as soon as it is
  rendered, without a refresh.
- Regular text responses are unaffected — the assignment already ran for them.
- A response that completes in under a millisecond still shows the label.
- A stream that ended without a terminal chunk shows no label, as before.
- Reloading the page does not change whether the label is visible. Confirmed against the
  backend: `response_time` is populated from `turn.time_elapsed` in the same `GeneratedMessage`
  constructor that carries `interactive_request`, so interactive-only turns persist the field
  exactly as text turns do.

## Acceptance criteria

- The "Processed in" metadata is displayed immediately for interactive-only responses after
  user submission.
- Display behavior is consistent between regular assistant responses and interactive-only ones.
- Refreshing the page does not change whether the metadata is visible.
- Verified for checkbox-based interactive responses.
- No regression in chat message rendering, tool call display, or message action buttons.

## Testing

Unit tests in the repository globally stub valtio's `useSnapshot`, so a live re-render cannot be
proven at unit level. Coverage is therefore split across the cause and the effect:

**Store** — extend `src/store/__tests__/chatGeneration.interactive.test.ts`, which already holds
the module mocks, the `createHistoryItem` / `createChat` factories and a `_handleChunk` test:

- `_handleStreamResponse` with a terminal chunk whose `generated` is empty assigns
  `processingTime` (the failing test that drives the fix).
- `_handleStreamResponse` with a normal text response still assigns `processingTime`
  (regression guard for the branch rewrite).
- `_handleChunk` with a chunk carrying both `interactive_request` and `last: true` records the
  interactive request and terminates the stream.

**Render** — new `ChatAiMessage.test.tsx`:

- a message with a `processingTime` renders the "Processed in" label;
- a message with `processingTime === 0` still renders it.

## Files

| File | Change |
|---|---|
| `src/store/chatGeneration.ts` | Unconditional `processingTime`; split content routing from `last` termination in `_handleChunk` |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` | Explicit null check instead of truthy check on the duration |
| `src/store/__tests__/chatGeneration.interactive.test.ts` | Three added tests |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx` | New file, two cases |
