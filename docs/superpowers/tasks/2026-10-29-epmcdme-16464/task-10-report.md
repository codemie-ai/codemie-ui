DONE
commit: 1aa9d63f0
paths: src/pages/chat/components/ChatPrompt/ChatPrompt.tsx, src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx
test_command: npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx
concerns: Two tests added (nested pending hides Send; nested abandoned does not block). RED seen (nested test failed), GREEN after change. Editor-disabled and ChatControls absence not asserted: Editor and ChatControls are mocked to null in this suite, and ChatControls renders only on isInterrupted (untouched). Full src/pages/chat run: only failures are stale .claude/worktrees copies; tsc clean.
