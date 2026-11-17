DONE

Commit: bf9242ade
Files changed: src/pages/workflows/editor/configPanels/AssistantTab.tsx, src/pages/workflows/editor/configPanels/__tests__/AssistantTab.test.tsx
Test command: npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/AssistantTab.test.tsx
Test result: EXIT=0 — 1 test file passed, 1 test passed ("save() copies effort from the virtual assistant form into the persisted assistant config")
Notes: Followed TDD. RED was confirmed twice: first a mounting error (WorkflowContext not exported from the useWorkflowContext mock — fixed by switching to the importOriginal pattern used in AdvancedConfigTab.test.tsx), then the true RED — onConfigChange's payload had no `effort` key in `actors.assistants[0]`. Fix was the single line `effort: virtualAssistantValues.effort,` added right after `temperature: virtualAssistantValues.temperature,` in AssistantTab.tsx's saveData/finalAssistantConfig literal — nothing else in that file changed. Also ran `npx vitest run --project unit src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` (19 passed, unaffected since it mocks AssistantTab) and `npx tsc --noEmit -p tsconfig.json` (clean, exit 0) as regression checks. Pre-commit hook ran prettier/eslint/license-headers/secrets/sonar-local and passed; no manual lint/format was run. `git show --stat HEAD` confirms exactly the two intended files were committed.
