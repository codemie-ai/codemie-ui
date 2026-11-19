DONE

Commit: 4e1aeb763
Changed: src/pages/analytics/components/cli-analytics/__tests__/RepositoriesView.test.tsx, src/store/__tests__/cliAnalytics.test.ts
Tests: not runnable (node_modules/.bin/vitest missing). prettier --check passed; pre-commit hook passed.
Concerns: useCliAnalyticsProjects.test.ts had no ProjectRow repositories fixtures, so unchanged. Net-lines tests simplified to project rows only (no repo/branch rows now). No other file references ProjectRow.repositories.
