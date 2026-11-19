DONE

Commit: fece52290
Changed: src/types/cliAnalytics.ts, src/store/cliAnalytics.ts (src/constants/cliAnalytics.ts untouched; nothing needed there)
Verification: npx prettier --check on both files passed; commit pre-commit hook passed. eslint unavailable (no node_modules/.bin/eslint; npx pulls v10 without config). No tests/type-check run (expected RepositoriesView break until Task 6).
Renames: none.
Added: ProjectRow.repositories removed; CliAnalyticsBranchesData, ProjectScope, ExtendedSessionsTarget.isBranchUnattributed; store slots projectRepositories, branches; fetchProjectRepositories, fetchBranches (reset slot to null at start, own keys); slot-ownership comment.
Reused: fetchWithState, CliAnalyticsRepositoriesData['pagination'].
Concerns: the store has no typed sessions params (fetchSessions takes Record<string, unknown>), so is_branch_unattributed needs no store change; Task using useCliAnalyticsSessions must add the param (hook builds it, ~l.117).
