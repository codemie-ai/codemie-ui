status: DONE

## Task 2: Isolated project activity-events store (factory)

Commit sha: 68b1da212d4ff59fbd5df4ea9395029047fabf98

## Changed files (`git show --stat HEAD`)

```
commit 68b1da212d4ff59fbd5df4ea9395029047fabf98
Author: Ilnur Nigmatzyanov <Ilnur_Nigmatzyanov@epam.com>
Date:   Thu Sep 24 11:29:56 2026 +0200

    EPMCDME-14326: Add isolated project activity-events store factory

 src/store/__tests__/projectActivityEvents.test.ts | 63 +++++++++++++++
 src/store/projectActivityEvents.ts                | 95 +++++++++++++++++++++++
 2 files changed, 158 insertions(+)
```

Only the two files named in the task were touched. Task 1's files
(`src/types/entity/projectActivityEvent.ts` and its test) were not modified.

## TDD process

1. Wrote the failing test first at
   `src/store/__tests__/projectActivityEvents.test.ts` (isolation test + success/error
   `listEvents` tests), importing `createProjectActivityEventsStore` from a module that did
   not yet exist.
2. Ran:
   `npx vitest run src/store/__tests__/projectActivityEvents.test.ts` — EXIT=1, failure reason:
   `Failed to resolve import "../projectActivityEvents"` (RED confirmed for the stated reason).
3. Implemented `src/store/projectActivityEvents.ts` per the plan: `createProjectActivityEventsStore()`
   returns a fresh `proxy()` on each call with `events`, `pagination`, `loading`, `error`,
   `metadata`, `metadataLoading`, `listEvents(projectName, params?)`, `loadMetadata(projectName)`.
   Reused `api.get(path, { params, skipErrorHandling: true })` shape and pagination mapping
   (`mapActivityEventPagination`) from Task 1, and error-capturing pattern (store `error`
   string, no toaster/throw) analogous to `activityEventsStore` in `src/store/activityEvents.ts`
   but without the `toaster.error` + rethrow (per the store's required interface — errors are
   captured on `this.error`, not thrown).
4. Ran the same command again — EXIT=0, `Test Files 1 passed (1)`, `Tests 3 passed (3)` (GREEN).
5. Fixed a `tsc --noEmit` pre-commit failure caused by relying on `vitest/globals` for
   `describe`/`it`/`expect`/`vi` — other test files in this repo import these explicitly from
   `vitest`, so I added `import { describe, it, expect, vi } from 'vitest'` to match the
   existing convention.
6. Committed with message `EPMCDME-14326: Add isolated project activity-events store factory`.
   Pre-commit hooks (prettier, license headers, eslint --fix, tsc --noEmit, secrets scan) all
   passed; eslint --fix reordered the import block (moved the relative import below the
   absolute `@/utils/api` import) — this is an automatic formatting change, not a manual edit.

## Final verification

Exact command run:
`npx vitest run src/store/__tests__/projectActivityEvents.test.ts > docs/superpowers/tasks/2026-09-22-epmcdme-14326/test.local.log 2>&1; echo "EXIT=$?"; tail -25 docs/superpowers/tasks/2026-09-22-epmcdme-14326/test.local.log`

Result: `EXIT=0`

```
 RUN  v1.6.1 /Users/Ilnur_Nigmatzyanov/codemie-dev/codemie-ui
      Running tests with seed "1790242223107"

 ✓ |unit| src/store/__tests__/projectActivityEvents.test.ts  (3 tests) 1ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  11:30:23
   Duration  607ms (transform 139ms, setup 106ms, collect 146ms, tests 1ms, environment 198ms, prepare 34ms)
```

## Concerns

None. The store implementation matches the plan's `ProjectActivityEventsStore` interface
exactly, consumes Task 1's types without redefinition, and the factory produces independent
`proxy()` instances (verified by the isolation test). Working tree is clean aside from this
report directory (untracked, not part of the commit).
