DONE

Commit: dbaaa9639
Changed: src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsProjectRepositories.ts, src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsBranches.ts

Return shape of both hooks: { rows, loading, error: string|null, page (0-based), setPage(page), totalPages, perPage }.
- useCliAnalyticsProjectRepositories(filters, scope): rows are RepositoryRow[]
- useCliAnalyticsBranches(filters, repository, scope): rows are RepositoryBranchRow[]; also sends repository.
rows is [] while loading. Scope replaces filters.projects (projects=<name> or is_project_unattributed=true). per_page 10.

Concerns: no tsc errors in the new files (filtered output); prettier clean. No tests written per instructions. The 'is_project_unattributed' param is sent as true or undefined.
