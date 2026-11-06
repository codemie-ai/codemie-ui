DONE

Commit: 8f9e07810 "EPMCDME-15749: Gate sidebar shared-with fetch on ownership"

Changed files (exactly these two, confirmed via `git show --stat HEAD`):
- src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx
- src/pages/assistants/components/AssistantDetails/components/__tests__/AssistantDetailsSidebarSections.test.tsx

## Production change

Added `import { isOwner } from '@/utils/entity'` (placed alphabetically among the
`@/utils/*` imports, right before `isNumberValue` from `@/utils/helpers`).

Changed the `/shared-with` fetch effect (was lines ~93-103) to skip the fetch and
reset `sharedWith` to `[]` for non-owners:

```tsx
useEffect(() => {
  if (!isOwner(assistant, userStore.user?.userId)) {
    setSharedWith([])
    return
  }

  let cancelled = false
  // Re-fetch whenever the assistant object is reloaded (e.g. after the share
  // popup closes via `loadAssistant`), not just when its id changes.
  assistantsStore.getSharedWith(assistant.id).then((users) => {
    if (!cancelled) setSharedWith(users)
  })

  // eslint-disable-next-line consistent-return
  return () => {
    cancelled = true
  }
}, [assistant])
```

Note: the repo's `consistent-return` ESLint rule is configured with
`treatUndefinedAsUnspecified: true`, so a bare early `return` in one branch and a
`return () => {...}` cleanup in another branch triggered the rule (flagging the
cleanup return as "expected no return value"). Tried `return undefined` in the
guard branch first — same rule still fired (now on the other branch), confirming
the rule treats "undefined" and "no return statement" differently depending on
which branch it inspects first. Resolved with a scoped
`// eslint-disable-next-line consistent-return` directly above the cleanup
`return`, matching the existing repo precedent for this exact rule (see
`src/components/Onboarding/OnboardingSpotlight.tsx`, which disables the same
rule for an analogous conditional-cleanup effect, albeit file-wide; mine is
line-scoped and narrower). This is an early-return-before-conditional-cleanup
pattern, which is idiomatic React but structurally in tension with this specific
lint rule's config — did not touch `.eslintrc.cjs` since the rule change wasn't
in scope for this task.

Left the ad hoc ownership check at line ~186 (`Shared status` label visibility)
completely untouched, as instructed — did not refactor it to use `isOwner`.

## Test change

In the `AssistantDetailsSidebarSections — shared with section` describe block:
- Added a local `ownedAssistant` fixture (`{ ...assistant, created_by: { id: 'owner-id', ... } }`)
  reusing the `'owner-id'` already established by the global `@/store/user` mock.
- Updated the two existing tests in that block to render `ownedAssistant` instead
  of the bare ownerless `assistant` fixture, so they continue to exercise the
  owner path (fetch fires) exactly as before the production change.
- Added a new test, `does not fetch shared-with users for a non-owner viewing the
  assistant`, using a `created_by: { id: 'someone-else', ... }` fixture, asserting
  `mockGetSharedWith` is never called and the SHARED WITH section never renders.

Did not touch the global `@/store/user` mock or any other describe block.

## TDD evidence

RED (before the production fix, non-owner test fails for the right reason —
fetch still fires):
```
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
Received: 1st vi.fn() call: Array [ "a1" ]
Test Files  1 failed (1)
     Tests  1 failed | 7 passed (8)
```
The other 7 tests (including the two fixture-fixed owner-path tests and all
other describe blocks) passed unmodified in that same RED run, confirming the
fixture fix alone was correct and only the new non-owner assertion was false
before the guard existed.

GREEN (after the production fix + eslint fix):
Command:
```
npx vitest run --project unit src/pages/assistants/components/AssistantDetails/components/__tests__/AssistantDetailsSidebarSections.test.tsx > /tmp/epmcdme-15749-task3-test.local.log 2>&1; echo "EXIT=$?"; tail -40 /tmp/epmcdme-15749-task3-test.local.log
```
Result: `EXIT=0`, `Test Files 1 passed (1)`, `Tests 8 passed (8)` — every describe
block (project name display, shared status property, shared with section) green.

`npx eslint src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx` → `EXIT=0`, no issues.

Pre-commit hook (prettier, eslint --fix, license headers, secrets scan, tsc
--noEmit, sonar-local) ran clean on commit.

## Scope confirmation

`git show --stat HEAD` touched only the two files listed above (8 insertions in
production file, 23 insertions / 3 deletions in test file). Line ~186's ownership
check for the "Shared status" label is unchanged.

No concerns. No files outside the assigned two were touched.
