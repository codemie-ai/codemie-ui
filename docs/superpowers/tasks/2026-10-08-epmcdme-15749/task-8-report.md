DONE

## Commit
22d92f5ed EPMCDME-15749: Surface backend rejection message in Share popup

## Changed files (exactly these two)
- src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx
- src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx

## Change summary
- Added `shareError` state, reset to `null` at the start of `handleShare`.
- `handleShare`'s catch branch no longer calls `toaster.error`; it reads
  `error.parsedError?.message` with fallback `'Failed to add some users. Please try again.'`
  and stores it in `shareError`.
- Rendered `{shareError && <p className="text-xs text-red-500">{shareError}</p>}` as the last
  child inside the `Popup`'s `<div className="flex flex-col gap-4">` wrapper, after the
  load-error/Retry block and the "People With Access" list.
- `handleRemove` and its toast were left untouched.

## Tests added
- `shows the backend rejection message inline when handleShare fails, without a toast, and keeps the selection`
  — rejects `shareWith` with a plain object `{ parsedError: { message: 'Assistant uses a personal integration...' } }`,
  selects a user via the search/MultiSelect flow, clicks Save, asserts the exact message renders,
  `onHide` was not called, `toaster.error` was not called, and the selected chip is still present.
- `falls back to the generic message when handleShare fails without a parsedError`
  — rejects with `new Error('network error')`, asserts the fallback string
  `'Failed to add some users. Please try again.'` renders and `onHide` was not called.
- Added a small local helper `selectSearchUserB` (opens combobox, types "car", waits for
  `getSharableUsers`, clicks the resulting option) reused by both new tests, mirroring the
  existing `'renders fresh search results in the dropdown after typing a query'` test's flow.

Note: the "keeps the selection" assertion uses `screen.getAllByText(searchUserB.name).length`
rather than `getByText`, because with the MultiSelect panel still open after Save fails there
are two "Carol" text nodes (the dropdown option and the selected chip) — asserting uniqueness
isn't the point here, presence is.

## RED confirmation
Command:
`npx vitest run --project unit src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx`
Before the production change: EXIT=1, `2 failed | 14 passed (16)` — both new tests failed
waiting for their expected inline text (only a toast existed at that point), for the right
reason, not a syntax/import error. Log: /tmp/epmcdme-15749-task8-red.local.log

## GREEN confirmation (post-implementation, pre-commit)
Command:
`npx vitest run --project unit src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx`
EXIT=0, `16 passed (16)`. Log: /tmp/epmcdme-15749-task8-test.local.log

## GREEN confirmation (post-commit, after pre-commit hooks' prettier/eslint --fix)
Same command run again against the committed tree.
EXIT=0, `16 passed (16)`. Log: /tmp/epmcdme-15749-task8-final.local.log

## Test command for the caller
`npx vitest run --project unit src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx`

## Scope check
`git show --stat HEAD` touches only the two files listed above
(ShareAssistantPopup.tsx: 11 lines changed; test file: 43 lines added).

## Concerns / notes
None. Pre-commit hook (prettier, eslint --fix, license-header check, tsc --noEmit, secrets
scan) ran automatically on commit and passed; no manual lint/prettier/tsc re-run was needed per
AGENTS.md's "Formatting Is Automatic" rule.
