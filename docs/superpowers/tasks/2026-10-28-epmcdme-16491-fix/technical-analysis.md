# Technical Research

**Task**: users management pagination per-page
**Generated**: 2026-10-28
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-16491 — Users Management (Settings → Administration → Users management): the page-size (items-per-page) selector disappears when the selected page size fits all filtered users on one page, so admin can't pick a smaller size. Expected: selector stays visible and usable; page-number navigation may be hidden when only one page. Acceptance criteria: (1) when all filtered users fit on one page the items-per-page selector remains visible/usable; (2) selecting a smaller size restores multiple pages and navigation; (3) changing the project filter updates list and pagination without making the selector inaccessible; (4) single-page views don't show unnecessary page-number navigation. Related: EPMCDME-16410 fixed the same symptom for Project Members (commit 9d6605b55: changed src/components/Pagination/Pagination.tsx and src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx; see docs/superpowers/tasks/2026-10-26-epmcdme-16410/technical-analysis.md for how). Determine whether the Users Management list uses the shared Pagination component and what remains broken after the 16410 fix.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/UsersManagementPage.tsx` renders `<Table ... pagination={pagination} onPaginationChange={handlePageChange} perPageOptions={DECIMAL_PAGINATION_OPTIONS} />` (~line 423-434). It does NOT render `Pagination` directly. State `pagination` (`page, perPage, totalPages, totalCount`) is set in `loadUsers` (~188-198) from `response.pagination`, `totalPages = Math.ceil(total/per_page)`. `handlePageChange(page, newPerPage)` (~250) reloads with the new per-page. Filter change resets to page 0 keeping `pagination.perPage` (~241).
- `src/components/Table/Table.tsx`: builds `paginationProps` (lines ~153-159): `perPage: !innerPagination && pagination?.perPage ? pagination.perPage : undefined`, and renders `<Pagination {...paginationProps} className="fixed bottom-0 ...">` (~331) when `pagination && !embedded`. Table has no prop to forward `alwaysShowPerPage`; `paginationProps` does not include it.
- `src/components/Pagination/Pagination.tsx`: after 16410 (9d6605b55) has opt-in prop `alwaysShowPerPage` (default false); guard is `if (totalPages <= 1 && !(alwaysShowPerPage && perPage)) return null`. Page nav `<nav>` independently gated by `pageNumbers.length > 1`; selector renders when `perPage` truthy.
- 16410 diff: Pagination.tsx (+prop, guard) and ProjectMembersManager.tsx (+`alwaysShowPerPage` at line 967). `alwaysShowPerPage` is used nowhere else in src.

### Architecture and Layers Affected
Page (UsersManagementPage) -> shared Table component -> shared Pagination component.

### Integration Points
- Table is a generic shared component used by many pages; any default change in Table propagates to all of them. `onPaginationChange` type is `PaginationProps['setPage']`.
- Users data via `userStore.getUsers({page, perPage, filters})`.

### Patterns and Conventions
Opt-in boolean prop passthrough (precedent: `alwaysShowPerPage`); hooks stay above the early return in Pagination; `cn()` for classes.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (AGENTS.md routes to components/state/testing guides); not needed in depth. Prior art: `docs/superpowers/tasks/2026-10-26-epmcdme-16410/technical-analysis.md` (notes most consumers pass perPage, so a default change would affect them; hence opt-in).

### Architectural Decisions
16410 chose opt-in `alwaysShowPerPage` over keying on `perPage`.

### Derived Conventions
Bar returns null when single page unless opted in.

---

## 4. Testing Landscape

### Existing Coverage
- `src/components/Pagination/__tests__/Pagination.test.tsx` (Vitest + RTL, unit project).
- `src/components/Table/__tests__/TableCardList.test.tsx:248` uses pagination props only.
- Users page tests in `src/pages/settings/administration/__tests__/`: UsersManagementDefaultProject.integration, UsersManagementSpending.integration, UsersManagementPage.createUserButton. None cover pagination.

### Testing Framework and Patterns
Vitest + React Testing Library, unit and integration projects. Per AGENTS.md write tests only when asked.

### Coverage Gaps
No test for the single-page selector case (Pagination, Table passthrough, or Users page).

---

## 5. Configuration and Environment

No env vars, flags or deployment concerns. `DECIMAL_PAGINATION_OPTIONS` from `@/constants` used for options.

---

## 6. Risk Indicators

- Root cause remains: Users page goes through Table, which never passes `alwaysShowPerPage`, so Pagination still returns null when `totalPages <= 1`. The 16410 fix does not reach it.
- Speculative: minimal fix is an opt-in prop on Table (e.g. `alwaysShowPerPage?: boolean`, forwarded in `paginationProps`) set by UsersManagementPage. Defaulting it on in Table would change many other Table consumers.
- Table's `propsAreEqual` (memo) may need to be checked so a new prop is compared; not inspected in detail.
- `totalPages` is 0 when no users match; with opt-in the selector would show on an empty result too (Pagination does not check totalPages > 0); the ticket does not specify empty-state behavior.
- Fixed bottom bar styling with only the selector (ml-auto) is untested visually.
- AC3 (project filter change): filter reload keeps `pagination.perPage`, so the selector stays once passed through; not verified at runtime.
- No tests cover the path.

---

## 7. Summary for Complexity Assessment

The Users Management list does not use Pagination directly; it uses the shared `Table`, which renders `Pagination` in a fixed footer. The 16410 fix added an opt-in `alwaysShowPerPage` to Pagination and set it only in ProjectMembersManager, so Users Management is still broken: Table does not forward the flag and Pagination returns null for `totalPages <= 1`.

The change surface is small: likely Table.tsx (prop plus forward into `paginationProps`) and one line in UsersManagementPage.tsx, with the Pagination logic already in place. Layers: page, shared Table, shared Pagination. Novelty is low as it follows the 16410 precedent.

Tests: Pagination has unit tests, but no coverage for single-page behavior, Table passthrough or Users page pagination. Main risks are leaking a default change to other Table consumers, memo prop comparison, and empty-result footer behavior.

---

## 8. External References

None named by the task (the 16410 analysis path was read as related prior art; see Section 3).
