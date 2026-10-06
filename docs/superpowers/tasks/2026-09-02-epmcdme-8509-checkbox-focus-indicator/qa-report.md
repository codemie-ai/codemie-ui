# QA Gate Report — epmcdme-8509-checkbox-focus-indicator

**Branch**: EPMCDME-8509_checkbox-focus-indicator
**Runner**: npm
**Re-run**: 2026-09-04 (supersedes the 2026-09-02 run)
**Status**: PASSED — all gates green, no waivers

## Gates

| Gate         | Status | Duration | Command | Notes |
|--------------|--------|----------|---------|-------|
| lint         | PASS   | ~5s      | `LC_ALL=en_US.UTF-8 npm run lint` | exit 0 |
| typecheck    | PASS   | ~8s      | `LC_ALL=en_US.UTF-8 npm run typecheck` | exit 0, silent |
| unit         | PASS   | 149s     | `LC_ALL=en_US.UTF-8 npm run test:unit` | 500 files, 5231 passed, 1 skipped, 0 failed |
| integration  | PASS   | 70s      | `LC_ALL=en_US.UTF-8 npm run test:integration` | 40 files, 500 passed, 1 skipped, 0 failed |
| test-harness | PASS   | 1408s (23m28s) | `LC_ALL=en_US.UTF-8 uvx codemie-test-harness run sanity-ui -n 2` | 82 passed, 0 failed, 2 rerun |
| SonarQube    | PASS   | —        | MR pipeline on `c0bfc840a` | Quality Gate passed, 0 new issues, 0 security hotspots |

New tests in scope both pass: `Checkbox.test.tsx`, `RadioButton.test.tsx`. Both fail on unmodified
`origin/main` (verified in a clean worktree), so they discriminate.

## Two corrections to the 2026-09-02 report

**1. There were never any "pre-existing" unit/integration failures.** That report listed 6 unit
failures across 4 files (`analyticsFormatters`, `ReleaseNotesPage`, `SkillInstructions`,
`WorkflowExecutionInfoPopup`) plus a `NewAssistantPage` integration timeout, and called them
pre-existing. They were an artefact of the shell locale: those files assert `45,000`, which under
`LANG=uk_UA.UTF-8` renders as `45 000`. Re-run with `LC_ALL=en_US.UTF-8`, every one passes. Any
command that touches tests in this repo must carry that prefix.

**2. The harness failures were environment skew, not the code.** The 2026-09-02 run (71/5/6 errors)
and the 2026-09-03 post-rebase run (74 passed / 8 failed) both measured a broken local stand, not
this branch. The rebase pulled in `731c0218d` (EPMCDME-11546), whose UI calls
`/v1/user/profile-settings/{userId}` on startup; the local backend was running a branch 28 commits
behind `main` that lacks the route, so `useInitialDataFetch` threw on every page load. After
bringing the backend up to `main` (10 pending migrations, head `b1c2d3e4f5a6`) the suite is green.

## Known flake, not caused by this branch

`tests/ui/assistants/test_assistant_marketplace_sorting.py::test_marketplace_sort_with_search_preserves_results`
is parallelism dependent: it fails at the default `-n 4` even after two reruns, and passes at
`-n 2`. Marketplace fixture data is shared across xdist workers. Reported as finding 8 on the MR.

## Drift signal

No — the implementation is a pure CSS-class change (Tailwind token swap + one addition). No type
signatures or method names changed.
