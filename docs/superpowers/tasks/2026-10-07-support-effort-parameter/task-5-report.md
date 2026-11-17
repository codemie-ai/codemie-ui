DONE

Commit: dc6aabd32
Files changed: src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx, src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts
Test command: npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts
Test result: EXIT=0, Test Files 1 passed (1), Tests 4 passed (4) — the 2 new effort cases plus the 2 pre-existing temperature cases all pass. RED was confirmed first (1 failed, 3 passed) before implementing the six edits.
Notes: Also ran `npx tsc --noEmit -p tsconfig.json` — EXIT=0, no new type errors introduced. The pre-commit hook ran prettier/eslint/license-headers/secrets checks automatically and passed; no manual lint/format was run. None of the four other files (AssistantForm.tsx, effortConstraints.ts, configuration.ts, ModelOption) were touched. Task 6/7/8 implementers: VirtualAssistantForm's `getValues()` now strips `effort` when falsy (mirrors temperature's delete-when-absent behavior, but no numeric coercion since effort is a string); the registry now includes 'effort' alongside 'temperature' for NodeTypes.ASSISTANT.
