status: BLOCKED
task_id: task-4
commit: none (pre-commit hook rejected the commit — see notes)
changed_paths:
- src/pages/settings/administration/components/MCPServerActions.tsx
- src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx
test_command: npx vitest run --project unit src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx
notes: |
  Implementation and tests are complete, correct, and verified GREEN (4/4 passing in the
  target test file; the pre-existing "More Options button references the server name
  element via aria-labelledby" test still passes unmodified in behavior, with the three new
  required props added to its render call as instructed).

  TDD was followed: added three new test cases (Clone hidden when canClone=false; Clone
  present+enabled when canClone=true/cloning=false; Clone present+disabled when
  cloning=true) to the existing describe block, ran them and confirmed RED
  (`getByRole('menuitem', { name: 'Clone' })` found no match — expected failure, feature
  missing), then added the three props (`onClone`, `canClone`, `cloning`) to
  MCPServerActionsProps and the component signature, and inserted the `Clone` menuActions
  entry right after `Edit` exactly as specified (reusing the already-imported `CopySvg`).
  Re-ran and confirmed GREEN.

  BLOCKER — could not complete the commit step:
  `src/pages/settings/administration/utils/columnRenderers.tsx` (line 85) is the one
  production call site of `<MCPServerActions ...>` and is NOT updated yet — wiring real
  `onClone`/`canClone`/`cloning` values into it is explicitly Task 5's job per the plan, and
  this task's scope is restricted to MCPServerActions.tsx + its test only.

  `npm run typecheck` therefore fails with:
    src/pages/settings/administration/utils/columnRenderers.tsx(85,6): error TS2739:
    Type '{ server: MCPConfig; onEdit: ...; onDelete: ...; onViewDetails: ... }' is missing
    the following properties from type 'MCPServerActionsProps': onClone, canClone, cloning

  This was anticipated and explicitly accepted by the task spec ("if you discover a
  production call site... it's fine to leave it broken for Task 5 to pick up"). However, the
  repo's `.husky/pre-commit` runs `npx lint-staged`, whose `*.{js,jsx,ts,tsx,cjs,mjs}` rule
  includes `bash -c 'tsc --noEmit'` — this runs a FULL-PROJECT typecheck regardless of which
  files are staged (lint-staged's filename args are discarded by the `bash -c` wrapper), so
  it fails on the still-unwired columnRenderers.tsx and the hook aborts the commit (lint-staged
  reverted the working tree to its pre-stash state via its backup/restore mechanism; no files
  were lost, `git status --short` still shows the same two modified files as before, nothing
  is partially committed).

  I did not work around this by: (a) making the three new props optional (explicitly
  forbidden by the task), (b) editing columnRenderers.tsx (out of this task's scope — owned by
  Task 5), or (c) committing with `--no-verify` (explicitly forbidden). The `SONAR_TOKEN=`
  workaround given in the brief only addresses the `sonar-local` step and does not help here —
  the failure is in the `tsc --noEmit` step inside `lint-staged`, which runs before
  `sonar-local` is ever reached.

  Recommendation for the orchestrator: either (1) run Task 5 immediately so the call site is
  wired before any commit of Task 4 is attempted, then commit Task 4 and Task 5's changes
  together (or Task 5 first, then Task 4), or (2) have a human explicitly authorize a
  `--no-verify` commit for this specific intermediate state, or (3) temporarily stage
  Task 4 and Task 5's files together in one commit so the full-project typecheck passes.
  The working tree currently has only the two files listed above modified (both already
  `git add`-ed); nothing else was touched.
