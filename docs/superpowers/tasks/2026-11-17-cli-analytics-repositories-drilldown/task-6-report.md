DONE

Commit: 11324448f
Changed: src/pages/analytics/components/cli-analytics/views/RepositoriesView.tsx, src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsProjects.ts
NO_PROJECT_LABEL: NOT removed; still used by views/ProjectRepositoriesList.tsx (line 61 description).
Concerns: existing __tests__/RepositoriesView.test.tsx still targets the old nested UI (Task 7). Type-check not run (read-only review); prettier passes.
