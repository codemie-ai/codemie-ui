status: DONE

## Summary

Implemented Task 3 of the EPMCDME-14326 plan: a shared, pure presentation/formatting module for
project activity events. No changes were made to Tasks 1/2's files
(`src/types/entity/projectActivityEvent.ts`, `src/store/projectActivityEvents.ts`).

## Commit

sha: `3b73efe34`

```
commit 3b73efe34e0b6b5501fcce9816778617f313454e
    EPMCDME-14326: Add shared activity-event presentation helpers

 .../__tests__/activityEventPresentation.test.tsx   | 75 +++++++++++++++++++++
 src/utils/activityEventPresentation.tsx            | 76 ++++++++++++++++++++++
 2 files changed, 151 insertions(+)
```

Only the two files named in the task plan were touched.

## Process (TDD)

1. Wrote the failing test file `src/utils/__tests__/activityEventPresentation.test.tsx` (5 tests
   from the plan, verbatim, plus an explicit `import { describe, it, expect } from 'vitest'` —
   required by this repo's `tsc --noEmit` pre-commit gate even though vitest globals are also
   configured; matches the convention already used in sibling files like `currency.test.ts`).
2. Ran the test command and confirmed RED for the expected reason:
   `Error: Failed to resolve import "../activityEventPresentation" ... Does the file exist?`
3. Implemented `src/utils/activityEventPresentation.tsx` per the plan's Step 3 code, using the
   verified real signatures:
   - `formatCurrency(value: number): string` from `src/utils/currency.ts:17-18` —
     `formatCurrency(120.5)` produces exactly `'$120.50'` (matches test expectation, no changes
     needed).
   - `formatDate(dateString?: string | null, format = DEFAULT_DATE_FORMAT): string` from
     `src/utils/helpers.ts:51-56`.
4. Re-ran the test command and confirmed GREEN.
5. Committed (one commit, ticket-prefixed message).

## Test command and result

```
npx vitest run src/utils/__tests__/activityEventPresentation.test.tsx > docs/superpowers/tasks/2026-09-22-epmcdme-14326/test.local.log 2>&1; echo "EXIT=$?"; tail -25 docs/superpowers/tasks/2026-09-22-epmcdme-14326/test.local.log
```

```
EXIT=0
 ✓ |unit| src/utils/__tests__/activityEventPresentation.test.tsx  (5 tests) 4ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

## Concerns

- None. The pre-commit hook's `tsc --noEmit` step required the explicit vitest import (a one-line
  addition, not a deviation from the plan's tested behavior); all 5 behavior tests pass unchanged
  from the plan's specified expectations.
- License header, secrets scan, and lint/format all passed automatically via the pre-commit hook
  during commit.
