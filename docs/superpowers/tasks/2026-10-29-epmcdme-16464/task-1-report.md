DONE
commit: 392cd8c03
paths: src/types/entity/conversation.ts, src/types/chatGeneration.ts, src/utils/thoughtTree.ts, src/utils/__tests__/thoughtTree.test.ts
test_command: npx vitest run --project unit src/utils/__tests__/thoughtTree.test.ts  (6 passed; RED seen first: module missing). tsc --noEmit clean.
types added (conversation.ts): ThoughtDecision, ToolCallLocation {thought_id?, parent_id?, path?}; Thought.decision; ThoughtBackend.decision + parent_id; ChatBackend.pending_tool_call?: {location?}|null; StreamChunk.tool_call_pending?: {location?}|null
chatGeneration.ts StreamChunk: toolCallPending?: {location?: ToolCallLocation}|null
thoughtTree.ts exports: ThoughtDecision (re-export), isPendingStep, isDecidedStep, isAbandonedStep, findThought(thoughts, id), findPath(thoughts, id: string|undefined), findPendingStep, hasPendingStep, isPauseLive(message: ChatMessage), canDecide(message, step)
message type: ChatMessage (conversation.ts)
concerns: none
