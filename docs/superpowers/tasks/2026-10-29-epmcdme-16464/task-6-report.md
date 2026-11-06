DONE
commit: de9f751d4
paths: src/store/chatGeneration.ts, src/store/__tests__/chatGeneration.resumeErrors.test.ts
test_command: npx vitest run --project unit src/store/__tests__/chatGeneration.resumeErrors.test.ts (21 pass; RED seen first: 20/21 failed on missing behaviour). `--project unit src/store`: only .claude/worktrees failures (42, same before/after). tsc clean, eslint clean.
signature: _settleResume(chat: Conversation, historyItem: ChatMessage, controller: AbortController, thoughtId: string, outcome: ResumeOutcome): Promise<void>
  (thoughtId added as 4th arg, outcome last; ResumeOutcome = {kind:'error';error}|{kind:'after200'}|{kind:'abort'}|{kind:'gate'})
outcome behaviour (via resolveResumeOutcome):
  - gate: no toast, restore
  - abort: no toast, refetch (T7 must still await the /abort promise before refetch)
  - after200: toast RESUME_FALLBACK_ERROR_MESSAGE, refetch
  - error with name AbortError (Stop before headers): no toast, refetch (treated as abort row)
  - error: toast backend error.error.message (fallback when no status / SyntaxError / no message), action = matchResumeErrorAction
restore = restoreResumeStep: findThought(...).decision = null, inProgress=false, response untouched (interrupted stays true).
refetch = _refetchAfterResume(chat, historyItem, controller, thoughtId): inProgress=false, clearAuthPrompts, delete chatAbortControllers[chat.id] only if === controller, getChat only if currentChat?.id === chat.id; on getChat failure toast RESUME_REFETCH_FAILED_MESSAGE + restore.
helpers/exports added: RESUME_ERROR_ACTIONS, RESUME_FALLBACK_ERROR_MESSAGE, RESUME_REFETCH_FAILED_MESSAGE, ResumeErrorAction, ResumeOutcome, matchResumeErrorAction, (module-private) getResumeErrorStatus, getResumeErrorToast, restoreResumeStep, resolveResumeOutcome, resumeStreamArgs, toResumeErrorContext, ResumeErrorContext type.
wiring: _sendRequest reads `const { resume } = data` once; api.stream gets 5th arg {errorToast:false} only for resume (non-resume calls keep 4 args); gate parsers run first; then `await _handleRequestError(historyItem, error, startTime, resumeCtx)`. _handleRequestError is now async with optional 4th `resume` param; its resume branch sits right above the a2uiAction branch.
decisions not settled by spec:
  - Fallback texts: "The tool call decision could not be applied. Please reload the conversation." and refetch-failure "Failed to reload the conversation. Please choose Allow or Deny again."
  - A 404 whose message isn't NO_PENDING_TOOL_CALL, or an unknown 409 message, falls to "other 4xx" -> restore.
  - A non-JSON body (SyntaxError, which api.stream tags with a status) is treated as "no status" -> fallback toast + refetch, regardless of its HTTP status.
  - Backend messages are duplicated as literals in chatGeneration.ts (tests read them from the fixtures file, so drift is caught).
concerns:
  - Restore does not release chatAbortControllers[chat.id] (plan only asks it on refetch); a lingering controller makes reconnectChatStream skip this chat, same as existing non-resume error paths.
  - When refetch is skipped (chat not current), the step keeps its local decision with inProgress=false until the chat is reopened (getChat then reloads it).
