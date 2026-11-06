DONE
commit: see `git log -1 --format=%h -- src/pages/chat/components/ChatHistory/ChatAiMessage/thoughtView.tsx`
paths:
- src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx
- src/pages/chat/components/ChatHistory/ChatAiMessage/thoughtView.tsx (new)
- src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx (Thought mock now honours getView hidden/footer)
- src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.toolConfirmation.test.tsx (new, real Thought, 11 tests)
test_command: npx vitest run --project unit src/pages/chat src/components/Thought (src failures: none; remaining failures are .claude/worktrees copies). tsc clean.
helpers added: createThoughtView({message, hideToolOutputs, canShowDecision}) in thoughtView.tsx, plus internal DecisionButtons footer.
decisions:
- getView is rebuilt every render, not memoised: the message may be mutated in place (stream, decision), so a memo keyed on the message could go stale.
- Top-level Fragment/Allow-Deny block removed; buttons only via footer on findPendingStep (a decided top-level interrupted step no longer gets buttons).
- Waiting = ancestors of ANY interrupted step, or empty message and no decision, only while isPauseLive. 
- Hidden: top-level visible if on path or interrupted; nested hidden if off path.
concerns:
- An empty-message top-level step (e.g. "Codemie Thoughts") also shows Waiting during a live pause, per the literal rule.
- Decided nested step sits in a collapsed parent (forceExpanded is path-only), so its "Allowed" is not visible until expanded; the queued sibling's Waiting is likewise only visible when its parent is expanded (tested at the visible-header level).
- With hideToolOutputs, after a click the path is empty, so non-interrupted top-level ancestors of the decided step hide.
