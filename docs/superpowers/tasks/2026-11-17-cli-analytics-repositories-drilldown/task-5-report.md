DONE

Commit: c4d4cf2a2 (pre-commit hook ran and passed)

Changed (all under src/pages/analytics/components/cli-analytics/views/):
- ProjectRepositoriesList.tsx (new)
- RepositoryBranchesList.tsx (new)
- RepositoriesTable.tsx (optional title/description props, defaults unchanged)

Exported props:
- ProjectRepositoriesList: { filters: AnalyticsQueryParams; scope: ProjectScope }
- RepositoryBranchesList: { filters: AnalyticsQueryParams; repository: string; scope: ProjectScope }

Behaviour: the project list owns the selected repository; a named repo opens ExtendedSessionsModal with body=RepositoryBranchesList; the null repo opens the default Sessions body with isUnattributed. The branches list opens a Sessions modal with branch or isBranchUnattributed (never both). RepositoriesTable gets page+1 and setPage(p-1); the hook's setPage takes only a page, so per-page changes are ignored (the table's per-page selector is not wired to the 10/page hook).

Concerns:
- tsc and eslint could not run: node_modules has no typescript or eslint installed (prettier 3.10.1 via npx was available and formatted the files). Types were checked by reading only.
- RepositoriesTable still shows its per-page selector in ProjectRepositoriesList; picking another size has no effect.
