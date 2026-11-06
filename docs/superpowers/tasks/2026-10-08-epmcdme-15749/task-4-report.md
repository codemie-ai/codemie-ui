DONE_WITH_CONCERNS

## Commit
- short-sha: `44a5d5d60`
- subject: `EPMCDME-15749: Show project-share status to non-owners in StatusLabel`

## Changed files (exactly these two)
- `src/pages/assistants/components/AssistantList/AssistantCard/StatusLabel.tsx`
- `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx`

## Production change
Replaced the 3-line comment + guard:
```tsx
if (statusType !== StatusType.GLOBAL && !isOwned) {
  return null
}
```
with:
```tsx
// Unreachable today (getStatusType only returns OWNED when isOwned is true); kept defensive
// for a future caller that passes isOwned=false with no isShared flag.
if (statusType === StatusType.OWNED && !isOwned) {
  return null
}
```
No other part of the component (`getStatusType`, `getStatusText`, `getStatusIcon`,
`getExactStatusText`, JSX, `StatusLabelProps`) was touched.

## Test changes
- Renamed/rewrote the test at old line ~103 (`does not render Shared with project status when
  shared with the user for collaboration (isShared, not owned)`) to
  `renders Shared with project status for a non-owner the assistant is shared with
  (collaboration)`, now asserting `getByRole('status')` has text `'Shared with project'`.
- Added `renders Not shared with project status for a non-owner, non-shared assistant`
  (`isOwned=false, isShared=false`) asserting `'Not shared with project'` — genuine new behavior
  (previously returned null).
- Rewrote the test at old line ~129 (`does not render a status when neither owned nor global`)
  to `renders Not shared with project status when neither owned nor global`, now asserting
  `'Not shared with project'` instead of `not.toBeInTheDocument()`.
- Added `StatusLabel for a GLOBAL assistant keeps rendering regardless of isOwned`, passing
  `isOwned={false}` explicitly on a global assistant, asserting `'42 uses'` still renders.

## RED confirmation
Ran the updated test file against the unmodified (old-guard) production code:
```
npx vitest run --project unit src/.../AssistantCard/__tests__/StatusLabel.test.tsx
```
Result: 4 failed / 11 passed — three failures were the intended RED (the rewritten
"Shared"/"Not shared"/"neither owned nor global" assertions failing under the old guard, as
expected). The fourth failure (`has the correct gap spacing between icon and text`) is a
**pre-existing, unrelated bug**, confirmed below.

## GREEN confirmation
Test command (fixed shape, retry disabled to avoid vitest's global `retry: 1` masking true
exit status with inter-attempt noise — same command, `--retry=0` added only for a clean log
read, exit code semantics unchanged):
```
npx vitest run --project unit --retry=0 src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx > /tmp/epmcdme-15749-task4-test.local.log 2>&1; echo "EXIT=$?"; tail -40 /tmp/epmcdme-15749-task4-test.local.log
```
EXIT=1 — **14 of 15 tests pass**, including all 4 new/rewritten tests from this task and every
pre-existing test this task did not touch (global status, singular wording, large-count
formatting, gap-1 for global, nowrap, "prioritizes global status", owner-shared, owner-private).

The one remaining failure, `has the correct gap spacing between icon and text`, is **pre-existing
and out of this task's scope**:
- That test calls `createMockAssistant(true)` (a GLOBAL assistant) and asserts
  `toHaveClass('gap-3')`. But the component applies `gap-1` for `isGlobal` and `gap-3`
  otherwise (confirmed in `StatusLabel.tsx` JSX, untouched by this task) — this is the same
  rule exercised correctly by the earlier test `'has a 4px gap between icon and value for the
  GLOBAL status'`, which expects `gap-1`/`not gap-3` for the same input.
- Confirmed via `git stash` that this exact test fails identically (same error, same received
  classes) on the untouched baseline commit `8f9e07810`, before any of my edits.
- Confirmed it fails even run in total isolation (`-t "has the correct gap spacing"`,
  `--retry=0`), so it is not an inter-test leak triggered by my new tests — it is simply
  asserting the wrong expected class for a global assistant.
- This is unrelated to the ownership guard this task changes, and the task instructions
  explicitly scope me to the guard logic and the two named test cases/additions — not to this
  test. I left it as-is rather than fix a test outside my assigned scope.

Flagging `DONE_WITH_CONCERNS` solely because of this pre-existing failing test in the same file,
which the controller or a later task may want to address separately (likely swap `gap-3` for
`gap-1` to match the other GLOBAL gap test, or vice versa if the real intent differs).

## Verification
- `git show --stat HEAD` — touches only the two files listed above (confirmed before commit).
- Pre-commit hooks (lint-staged: prettier, eslint --fix, license headers, tsc --noEmit, gitleaks
  secrets scan, sonar-local) all ran clean on commit.

## Summary
Changed the `StatusLabel` early-return guard so project share status ("Shared with
project"/"Not shared with project") is now visible to non-owners (collaborators), not just the
owner. The new guard (`statusType === StatusType.OWNED && !isOwned`) is unreachable in current
code paths since `getStatusType()` only yields `OWNED` when `isOwned` is already true — kept as
a defensive no-op per the task's explicit instruction. Updated/added 4 tests to match. One
unrelated pre-existing test failure in the same file (gap-spacing assertion for GLOBAL status)
was identified, confirmed pre-existing via git stash to baseline, and left untouched as out of
this task's scope.
