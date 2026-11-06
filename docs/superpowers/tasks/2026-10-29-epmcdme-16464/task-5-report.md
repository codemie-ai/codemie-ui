DONE
commit: 9aa838690
paths: src/types/chatGeneration.ts, src/store/chatGeneration.ts, src/store/__tests__/chatGeneration.resumeToolCall.test.ts, src/store/__tests__/chatGeneration.prepareRequestData.test.ts
test_command: npx vitest run --project unit src/store/__tests__/chatGeneration.resumeToolCall.test.ts src/store/__tests__/chatGeneration.prepareRequestData.test.ts
resumeToolCall signature (unchanged): resumeToolCall(thoughtId: string, action: ToolCallAction): Promise<void>
renames: ChatRequest.toolCallAction -> ChatRequest.resume?: { action; thoughtId }; readers updated: chatGeneration.ts (resumeToolCall, _prepareRequestData) and the two tests. ChatAiMessage.tsx untouched (already passes thought.id).
auth prompts cleared (via existing clearAuthPrompts): mcpAuthPromptRows, gitlabAuthPrompt, jiraAuthPrompt, confluenceAuthPrompt
request now: {conversation_id, action, thought_id, stream:true}
concerns: placeholder ChatRequest fields were left as-is (they are required by the type; removing would need making them optional). Full src/store + src/pages/chat run: only failures are stale copies under .claude/worktrees (vitest substring filter picks them up); none in src/. tsc clean.
