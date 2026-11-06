DONE
commit: 38ed49adc
paths: src/store/chatGeneration.ts, src/store/__tests__/chatGeneration.resumeErrors.test.ts
test_command: npx vitest run --project unit src/store/__tests__/chatGeneration.resumeErrors.test.ts (31 pass; RED first: 8 new tests failed on missing behaviour). --project unit src/store src/pages/chat: 0 src/ failures (all FAIL/unhandled errors under .claude/worktrees). tsc clean, eslint clean, pre-commit passed.
sites:
  - gate: _sendRequest saves historyItem.response before the gate chain (now module helper applyAuthGate(historyItem, error, startTime): boolean). On resume, after a gate applier: restore response, _settleResume({kind:'gate'}) -> gate UI kept, decision cleared, no toast.
  - resume with a 200: _sendRequest routes to new store method _handleResumeResponse(reader, historyItem, startTime, resumeCtx, savedResponse); module helper getResumeStreamOutcome decides: Response -> after200; _handleStreamResponse throws -> after200; response.aborted -> abort; no last/generated -> after200; terminal chunk -> null (today's normal finish, inProgress/stream cleared by _handleStreamResponse).
  - any non-null outcome: response = savedResponse, stream = null, then _settleResume.
  - abort row: _settleResume awaits chatGenerationStore.abortRequests[chat.id] (rejection ignored) before refetch, for kind 'abort' and for a pre-header AbortError (helper isAbortOutcome).
  - stopChatGeneration: stores ref(api.post('/abort')) in abortRequests[chatId]; existing console.error catch kept; entry deleted on settle only if still the same promise. No abort on navigation added.
  - _handleStreamResponse (all chats): stream = null on aborted response and on drain throw (rethrown as today). Cut stream w/o terminal chunk unchanged for non-resume (accepted risk c; test pins it).
new state/helpers: abortRequests: Record<string, Promise<unknown>>; _handleResumeResponse (store); applyAuthGate, getResumeStreamOutcome, isAbortOutcome (module-private).
decisions not settled by spec:
  - savedResponse is restored on every non-success resume outcome (throw, no terminal chunk, non-stream 200), not only on abort - consistent with AC8.
  - A non-stream 200 body on resume is not parsed; refetch reloads it.
  - A resume stream with only capturedStreamText (no last/generated) counts as after200.
  - Stop before the headers also waits for /abort before refetching.
concerns:
  - On abort/after200 _handleStreamResponse still writes processingTime/debug before the settle; refetch replaces them, but if the refetch is skipped (chat not current) they linger until reopen.
  - Stop's interruptChatHistory sets chat.isInterrupted = true (existing behaviour); relies on the refetch to reset it.
