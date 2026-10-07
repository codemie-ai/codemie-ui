# EPMCDME-15112 — Post-analysis fixes

Source: whole-story analysis of EPMCDME-15109 and its sub-tasks (2026-09-25), checked against the
Jira acceptance criteria. Each entry: finding → requirement → fix → proof.

## F1 (P1) Add-with-default partial failure hid a real membership

- **Finding.** "Set as default" in the Add Project dialog runs add + set-default inside one
  optimistic operation. If set-default failed after the add succeeded, the whole optimistic view
  rolled back and nothing refetched: the table showed the user as not added while the backend had
  added them, with contradictory toasts.
- **Requirement.** AC2 "mark that project as the user's default as part of the same action".
- **Fix.** The add operation tracks whether the membership was created; on a later failure it
  explains the partial result and calls `onProjectsChange()` to resync from the server.
- **Proof.** `resyncs the table when the project is added but setting it as default fails`,
  `does not resync when adding the project itself fails`.

## F2 (P1) Personal project toggle always failed

- Fixed on the backend (EPMCDME-15110 F1): the personal project is now a valid default, so the
  toggle works for every listed project as AC1 requires. No UI change needed.

## F3 (P2) Users-list marker had no accessible name

- **Requirement.** AC3 "clear without opening the user"; accessibility guide (icon-only content
  needs a label).
- **Fix.** The star is wrapped in `role="img"` with `aria-label` and `title` "Default project".
- **Proof.** Integration test asserts exactly one `img` named "Default project".

## F4 (smells)

- Removed dead `userStore.clearDefaultProject` and its tests — no AC asks to clear a default without
  replacing it; removing the membership is the sanctioned path.
- `UserAssignedProject.is_default` is now required (the backend always sends it).
- Shared `markDefault()` replaces the duplicated "flip every row" logic in set-default and
  add-with-default.
- Projects table column widths summed to 115%; now 30/10/40/20.

## Verification

- `npx vitest run --project unit src/pages/settings/administration/usersManagement src/store/__tests__/user.test.ts`
  — Test Files 7 passed (7), Tests 60 passed (60).
- `npx vitest run --project integration …/UsersManagementDefaultProject.integration.test.tsx` —
  1 passed.
- `npx tsc --noEmit`, `npx eslint src/pages/settings/administration src/store src/types` — clean.

## Third-pass review (2026-09-26)

- **R05 — confirmed default lost after a failed refresh (accepted).** `useOptimistic` drops the
  pending update on success and relies on the parent refetch; if that refetch (or the coupled
  budgets fetch) failed, the dialog showed the old default although the write succeeded. Review
  fix: the table hands the confirmed update to the parent, which commits it before refetching;
  details and budgets settle independently (`Promise.allSettled`); a request id drops stale
  responses; the duplicate success toast is gone. Added
  `UserDetailsPopup.refreshFailure.test.tsx` (failed details refetch keeps the new default;
  failed budgets fetch keeps details).
- **Q04 — default hidden beyond the badge cap (downgraded by the review, fixed here).** Only
  `MAX_DISPLAYED_PROJECTS` (3) badges render at rest; a default in position 4+ sat in the
  hover-only overflow, which is not "clear without opening the user". The default badge is now
  ordered first; integration test added (4 projects, default last → marker visible, `+1`
  overflow).

Why my passes missed them: I tested failures of the mutation itself (CR-003/004), not of the
refresh after a success, and no fixture user had more than three projects.
