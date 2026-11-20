status: DONE

Commit: 2f4053543681c6bee7f950b5690ff16138969360 (short: 2f4053543)

Files changed (git show --stat HEAD):
- src/pages/settings/administration/projectsManagement/components/ProjectActivityHistoryModal.tsx (created, 243 lines)
- src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx (created, 81 lines)

Test command used to prove GREEN:
```
npx vitest run src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx > docs/superpowers/tasks/2026-09-22-epmcdme-14326/test.local.log 2>&1; echo "EXIT=$?"; tail -40 docs/superpowers/tasks/2026-09-22-epmcdme-14326/test.local.log
```
Result: `EXIT=0`, `Test Files 1 passed (1)`, `Tests 3 passed (3)`.

## TDD sequence followed
1. RED: wrote test file first, ran it, observed failure `Failed to resolve import "../ProjectActivityHistoryModal"` (module not found) — expected failure reason confirmed.
2. GREEN: wrote the component, re-ran — hit a real (non-trivial) failure: all three tests failed with "No data available" / no error text, because `src/setupTests.unit.ts` mocks `valtio`'s `useSnapshot` as `(store) => store` (a pass-through, non-reactive) for the "unit" vitest project that this test file runs under (plain `*.test.tsx`, not `*.integration.test.tsx`). Store mutations made inside the async `listEvents`/`loadMetadata` calls therefore never triggered a React re-render on their own. Fixed by adding a local `useReducer` "tick" counter in the component, bumped via `.finally(forceRerender)` after each store call, so the component re-renders and re-reads the (live, mocked-as-passthrough) store values in both the unit and integration harnesses.
3. GREEN confirmed: reran the same test command, all 3 tests passed, `EXIT=0`.
4. Ran `npx eslint` and `npm run typecheck` scoped to the two files — both clean (only a pre-existing "React version not specified" eslint warning, unrelated).
5. Committed exactly the two files (staged by exact path, not `-A`/`.`). The repo's `lint-staged` pre-commit hook ran prettier/eslint --fix/tsc/license-headers/secrets scan automatically on commit; only the two named files were affected (some import reordering from prettier/eslint --fix), no other files were touched.

## Discrepancies from the prompt worth noting
- The prompt's Table `pagination` type only listed `{ page, totalPages, perPage, totalCount? }` — used as given; no discrepancy found against `src/components/Table/Table.tsx`.
- `Popup`/`Table` prop names matched the prompt's description exactly against the actual source files; no adaptation was needed there.
- The one real surprise was the `valtio` unit-test mock behavior described above (not mentioned in the task prompt) — required the `useReducer` "tick" workaround in the component to make the store-driven async loading observable to tests in the "unit" vitest project.
- Housekeeping: while debugging the valtio-mock issue I created several throwaway `zzdebug*.test.tsx` files under the same `__tests__` directory for isolated repros; all were deleted before the final commit (confirmed via `git show --stat HEAD` above and `git status --porcelain` showing only the docs task folder as untracked afterward).

## Out-of-scope note (not caused by this task)
`git status` currently shows an uncommitted modification to `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` (adds a `userEvent` import, a `vi.mock('@/utils/api')`, and a small edit inside a `describe` block). This was not made as part of this task and `ProjectDetailsPage.tsx`/`.test.tsx` were not touched here, per this task's explicit boundary (those files belong to Tasks 5/6). It looks like in-progress work from another, presumably concurrently-running, agent on the same checkout. It was left untouched, unstaged, and uncommitted by this task.
