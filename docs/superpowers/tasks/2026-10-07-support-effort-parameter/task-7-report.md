DONE

Commit: 5f6980b00
Files changed: src/pages/workflows/editor/utils/__tests__/visualEditorFieldRegistry.test.ts
Test command: npx vitest run --project unit src/pages/workflows/editor/utils/__tests__/visualEditorFieldRegistry.test.ts
Test result: EXIT=0, Test Files 1 passed (1), Tests 41 passed (41)
Notes: Added `import { NodeTypes } from '@/types/workflowEditor/base'` and, inside the existing
'handles workflow editor field registration pattern' test in the 'integration scenarios' describe
block, added `registerFields(['effort'], NodeTypes.ASSISTANT)` plus two assertions:
`expect(isFieldSupported('effort', NodeTypes.ASSISTANT)).toBe(true)` and
`expect(isFieldSupported('effort', 'tool')).toBe(false)`. Verified RED first (test failed with
"expected false to be true" at the new effort assertion, 1 failed/40 passed) before adding the
registration line, then GREEN (41 passed). `git show --stat HEAD` confirms exactly one file
changed. Pre-commit hooks (prettier, eslint --fix, license headers, secrets scan, sonar-local)
all ran clean during commit.
