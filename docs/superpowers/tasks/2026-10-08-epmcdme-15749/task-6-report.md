DONE

Commit: daa44c539 "EPMCDME-15749: Add 2-character floor to Share popup user search"

Changed files (exactly these two, matched by `git show --stat HEAD`):
- src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx (1 line changed)
- src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx (42 lines added)

## Production change
Guard in `handleFilter` changed from:
```tsx
if (!query || !assistant) {
```
to:
```tsx
if (!query || query.length < 2 || !assistant) {
```
Nothing else in the function touched — debounce, request-id staleness guard, try/catch all unchanged.

## Reasoning confirmed
The guard runs synchronously on every `handleFilter` call (every keystroke via `onFilter`), and
`clearTimeout(debounceRef.current)` at the top of the function already cancels any pending timer
before the new guard is evaluated. So a one-line change on the synchronous guard is sufficient for
both "never type past 1 char" and "type 2+ then delete back to 1 before the debounce fires" — no
other code needed to change. Confirmed by test, not just by inspection.

## Tests added (3, all in the existing real-timer + waitFor style — no fake timers introduced)
1. `does not search below the 2-character floor` — types `'a'`, waits 400ms past the 300ms debounce,
   asserts `getSharableUsers` never called and `'Type to search users'` empty-state is shown.
2. `still searches at the 2-character floor` — types `'ab'`, asserts via `waitFor` that
   `getSharableUsers` is eventually called (sanity-checked this already passed against the
   pre-change code, confirming the floor-case failures were real and isolated).
3. `clears a pending search when deleted back below the floor before the debounce fires` — fires
   `change` to `'ab'` then immediately (no await) to `'a'`, waits 400ms, asserts `getSharableUsers`
   never called.

## RED proof (before the production change)
Ran the full file against the current code: 2 failed (the two floor-dependent tests), 12 passed
(including "still searches at the 2-character floor", confirming the sanity-check). Failure reason
was exactly as predicted — `getSharableUsers` called with `("asst-1", "a")` — not a broken test.

## GREEN proof (after the production change)
Command:
```
npx vitest run --project unit src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx
```
EXIT=0, `Test Files 1 passed (1)`, `Tests 14 passed (14)` (11 pre-existing + 3 new).

## Lint note
The first commit attempt was rejected by the pre-commit hook's `eslint --fix`
(`no-promise-executor-return` on `new Promise((r) => setTimeout(r, 400))` — the arrow body returns
the timer id). Fixed by using a block-bodied executor (`(r) => { setTimeout(r, 400) }`) in both new
tests that use the bounded real wait. Re-ran the full test file (still 14/14 green) and
`eslint --fix` directly on both files (no issues) before committing again. This was required to get
a commit through the repo's own pre-commit hook — not a scope change, no logic altered.

## Scope confirmation
`git show --stat HEAD` touches only the two named files. No other task's territory (error/Retry UI,
header text, Remove button) touched.
