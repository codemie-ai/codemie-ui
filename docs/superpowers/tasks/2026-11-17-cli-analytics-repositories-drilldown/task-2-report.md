DONE

Commit: 3641038fb
Changed paths:
- src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsSessions.ts
- src/pages/analytics/components/cli-analytics/views/SessionsView.tsx
Verification: npx prettier --check on both files (passed); git show --stat HEAD shows only these two files.
Concerns: none. Branch is dropped via the buildCliAnalyticsParams argument, so both the request and filterKey omit it when isBranchUnattributed is set. No tests run (repo rule).
