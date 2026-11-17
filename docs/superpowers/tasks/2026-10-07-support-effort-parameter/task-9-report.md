DONE

Commit: e6ca13ee
Files changed: src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx, src/pages/assistants/components/AssistantDetails/components/__tests__/AssistantDetailsSidebarSections.test.tsx
Test command: npx vitest run --project unit src/pages/assistants/components/AssistantDetails/components/__tests__/AssistantDetailsSidebarSections.test.tsx
Test result: EXIT=0, Test Files 1 passed (1), Tests 4 passed (4)
Notes: RED confirmed before implementation (new "renders the effort label and value" case failed with EXIT=1, 3 passed including the "no effort" case which incidentally passed as predicted); GREEN after implementation showed all 4 tests passing. `npx tsc --noEmit -p tsconfig.json` also passed with EXIT=0. Pre-commit hook ran prettier, eslint --fix, license headers, secrets check, and tsc — all passed; `git show --stat HEAD` confirms exactly the two intended files were committed.
