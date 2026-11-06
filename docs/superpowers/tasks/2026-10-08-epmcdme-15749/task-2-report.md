DONE

Commit: 29d231308 "EPMCDME-15749: Gate Share action on ownership instead of edit rights"

Changed files (from `git show --stat HEAD`):
- src/pages/assistants/AssistantActions/AssistantActions.tsx
- src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx

Test command:
`npx vitest run --project unit src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx`
EXIT=0 (6 passed: 3 new Share-visibility tests + 3 pre-existing accessibility tests, all unmodified in behavior)

## What changed

`AssistantActions.tsx`:
- Added `isOwner` to the existing `@/utils/entity` import.
- Added imports: `userStore` from `@/store/user`, `isUserManagementEnabled` from `@/utils/featureFlags`.
- `canEditAssistant` line and all its other usages (edit, clone... actually clone uses `canClone`;
  edit, publish, unpublish) left byte-identical.
- `share` action's `isVisible` changed from `canEditAssistant` to
  `isOwner(assistant, userStore.user?.userId) && isUserManagementEnabled()`.

`AssistantActions.accessibility.test.tsx`:
- Replaced the old `Share action visibility` describe block (which asserted the old
  `canEdit`/`user_abilities`-gated behavior) with three cases: owner + flag on → visible;
  owner + flag off → hidden; non-owner (regardless of `user_abilities`) → hidden.
- Added `vi.mock('@/store/user', ...)` and `vi.mock('@/utils/featureFlags', ...)` using
  `vi.hoisted()` to avoid the hoisting-order TDZ error vitest throws on top-level mock state
  referenced inside `vi.mock` factories.
- Added `beforeEach` import from vitest to reset mock state between the three Share-visibility
  tests.

## Process notes

- First RED attempt failed with a vitest hoisting error ("Cannot access 'mockUserStore' before
  initialization") rather than a real test assertion failure — this was a test-authoring bug, not
  true RED, so I fixed it with `vi.hoisted()` and re-ran before trusting the RED signal.
- True RED (EXIT=1): 2 of the 3 new Share tests failed for the right reason (old
  `canEditAssistant` gate still active); the 4 untouched accessibility tests still passed.
- GREEN (EXIT=0) after the production change: all 6 tests pass, confirmed again after the
  pre-commit hook (prettier/eslint/tsc/license/secrets) ran on commit — no drift.
- Did not touch edit/clone/delete/publish/unpublish `isVisible` lines — confirmed via
  `git diff` before committing that only the `share` isVisible line and the import block changed
  (4 insertions, 2 deletions in the production file).
- Only the two files listed above were staged and committed; nothing else in the working tree was
  touched.
