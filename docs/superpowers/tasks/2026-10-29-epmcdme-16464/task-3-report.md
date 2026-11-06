DONE
commit: cdc69879b
paths: src/store/chatGeneration.ts, src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts, src/store/__tests__/fixtures/toolCallResume.fixtures.ts
test_command: npx vitest run --project unit src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts (13 passed); tsc --noEmit clean
fixtures exported: s1DelegationId, s1WaitingId, s1Chunks, s5S1ContainerId, s5FirstPendingId, s5S2ContainerId, s5SecondStepId, s5PausedConversation, s5AllowFirstChunk, s6O2Id, s6SId, s6WaitingId, s6PausedConversation, RESUME_ERROR_MESSAGES (NO_PENDING_TOOL_CALL, OLD_PENDING_TOOL_CALL, STALE_DECISION, NOT_SAVED_DECISION, OTHER_ROOT_ASSISTANT, IN_FLIGHT_RESUME), RESUME_ERROR_STATUS, S8_WRONG_THOUGHT_ID_STATUS, S8_WRONG_THOUGHT_ID_BODY
symbols: _handleThought now uses findThought (utils/thoughtTree) for parent lookup; merges decision with ?? (null chunk keeps local decision). Not-found branch untouched. _findThought left in place.
concerns: S1/S5 tests passed before the change (depth-1 parents were already top-level); RED was seen for depth-2 and decision merge only. Running whole src/store/__tests__ also picks up .claude/worktrees copies, which fail (40, pre-existing, none in real src). Structural-mismatch 409 has help=OLD_PENDING_TOOL_CALL message (noted in fixture comment). 403 messages not included.
