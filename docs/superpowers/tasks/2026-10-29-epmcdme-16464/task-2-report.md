DONE
commit: 6588ce436
paths: src/utils/chatHelpers.ts, src/utils/__tests__/chatHelpers.test.ts
test_command: npx vitest run --project unit src/utils/__tests__/chatHelpers.test.ts (EXIT=0, 83 passed; tsc clean)
symbols: normaliseThought(t: ThoughtBackend, isAssistantInProgress: boolean): Thought (module-private, recursive on children; adds parent_id, decision ?? null)
reused: existing Thought/ThoughtBackend types from T1 (parent_id already present, no type change)
concerns: normaliseThought takes a 2nd arg (isAssistantInProgress) since in_progress/aborted depend on it; nested children now get same defaults as top level (previously passed raw). isInterrupted untouched. Pre-commit tsc caught a test type error on first attempts; fixed.
