DONE

## Commit
`e55f9cbae` — EPMCDME-15749: Surface access-list load errors with Retry

## Changed files
- `src/store/assistants.ts` — removed the try/catch in `getSharedWith`; rejections now propagate.
- `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx` — added `loadError`
  state, extracted `loadSharedWith` (used by the effect and the Retry button), added the error
  message + Retry block, gated the "People With Access" block on `!loadError`.
- `src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx` —
  added two tests: error UI + Retry button render on rejection (combobox stays present), and
  clicking Retry reloads and clears the error UI.
- `src/store/__tests__/assistants.test.ts` — updated the `getSharedWith` failure test from
  asserting the old swallow-to-`[]` behavior to asserting the rejection now propagates
  (`rejects.toThrow`).

## Notes on spec deviations
- Used `text-red-500` instead of `text-danger-500` for the error text color, per the task's own
  instruction to grep first: `text-danger-*` is not a real utility in this project (no `danger`
  color in `tailwind.config`), while `text-red-500` is already used for an inline error message
  elsewhere (`MCPConfigSection.tsx`). Matched that existing convention.
- `loadSharedWith` is a plain function, not referenced inside another hook — eslint's
  `react-hooks/exhaustive-deps` only flags functions used inside a `useEffect`/`useCallback`
  body when they're unstable across renders in a way the linter can detect via other hook calls;
  it did not fire here (confirmed via `eslint --fix` running clean in the pre-commit hook), so no
  disable comment was needed, consistent with `handleRemove`/`handleShare` already closing over
  `assistant` the same way with no lint complaint.

## Tests
Command:
```
npx vitest run --project unit src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx src/store/__tests__/assistants.test.ts
```
EXIT=0 — Test Files 2 passed (2), Tests 41 passed (41).

RED phase (before the Part A/B production changes) was captured separately: 2 failed / 9 passed
on the component test file, both failures for the expected reason (no error UI / Retry button
existed yet against the then-current store that swallowed errors).

Pre-commit hook also ran prettier, eslint --fix, `tsc --noEmit`, license headers, and gitleaks —
all passed clean (see commit output).

## Scope check
`git show --stat HEAD` touches exactly the four files listed above — no header text, Remove
button, or search-floor logic touched.
