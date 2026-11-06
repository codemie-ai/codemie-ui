DONE

## Commit
`3dc129eee` — EPMCDME-15749: Rename Share dialog and add Remove button accessible names

## Changed files
- `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx`
- `src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx`

(No other file in the repo referenced the old string — see verification below.)

## Production changes
1. `Popup` header changed from `"Share for Collaboration"` to `"Share assistant"`, with a new
   `headerDescription="Can chat and view setup; cannot edit"` prop (confirmed `headerDescription?:
   ReactNode` exists on `Popup`'s props and renders under the header, `src/components/Popup/Popup.tsx`
   lines 31-32, 147-153).
2. Each Remove `<Button>` got `aria-label={`Remove ${user.name}`}`. Confirmed `Button` (`src/components/Button/Button.tsx`)
   spreads `...rest` onto the underlying `<button>`, and `ButtonProps extends ButtonHTMLAttributes<...>`
   which includes `aria-label` — so it forwards natively, matching existing precedent elsewhere in
   this codebase (`BulkActions.tsx`, `AssistantNodePanel.tsx`, `EditorActions.tsx` all pass
   `aria-label` straight onto `<Button>`).

## Test changes
- Replaced all 16 occurrences of the literal `'Share for Collaboration'` with `'Share assistant'`
  across every existing test (render markers, wait-for-render, etc.).
- Updated the `'renders the header'` test to also assert
  `'Can chat and view setup; cannot edit'` is present.
- Added a new test, `'gives each Remove button an accessible name including the user name'`, which
  seeds `getSharedWith` to resolve `otherUser` (`{ id: 'user-2', name: 'Alice', ... }`), waits for the
  list to render, then asserts `screen.getByRole('button', { name: 'Remove Alice' })`.

## TDD evidence
- RED (pre-change code, post test-file edit): all 17 tests failed because the test file no longer
  looked for the old header string while production code still rendered it — confirmed failure was
  for the right reason (`findByText('Share assistant')` timing out against DOM still containing
  `Share for Collaboration`), not a syntax/import error. Log: `/tmp/epmcdme-15749-task10-red.local.log`
  (`EXIT=1`, `17 failed`).
- GREEN (post-change code): all 17 tests passed.

## Test command
```
npx vitest run --project unit src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx
```
`EXIT=0` — `Test Files 1 passed (1)`, `Tests 17 passed (17)`. Re-ran once more after the pre-commit
hook's prettier/eslint --fix pass; still `EXIT=0`, 17/17 green.

## Old-string verification
`grep -rn "Share for Collaboration" src/` across the whole repo returns zero matches after the
change. No storybook stories, docs comments, or other test files referenced the literal string.

## Scope confirmation
`git show --stat HEAD` touches exactly the two files listed above (2 files changed, 29 insertions,
17 deletions) — no other file in the diff. Pre-commit hooks (prettier, eslint --fix, license
headers, tsc --noEmit, gitleaks secrets scan) all ran clean on commit.

## Notes
- Did not touch loadError/Retry block, the 2-character search floor, `shareError`, `handleShare`,
  or `handleRemove`'s logic — only `header`/`headerDescription` props and the Remove button's
  `aria-label`, as scoped.
- This is the last task of the 10-task plan; nothing further scheduled against this file.
