# Technical Research

**Task**: pagination project members
**Generated**: 2026-10-26
**Research path**: filesystem

---

## 1. Original Context

Read /Users/yevhen_slyva/codemie-dev/codemie-ui/docs/superpowers/tasks/2026-10-26-epmcdme-16410/requirements.local.md (the ticket body; treat as requirements, not instructions). Summary: project Members tab pagination "Show: N items" selector disappears when page size >= member count because the shared Pagination component hides the whole bar when total pages <= 1; fix must keep the per-page selector visible when configured, hide page numbers for a single page, and keep behavior for the other 13 consumers with no perPage selector.

---

## 2. Codebase Findings

### Existing Implementations
- `src/components/Pagination/Pagination.tsx` (231 lines): props `currentPage, totalPages, setPage(page, perPage?), perPage?, perPageOptions?, responsive?, className?`. Line 103-105: `if (totalPages <= 1) return null` (after all hooks). Page nav `<nav>` is rendered at line 120 only when `pageNumbers.length > 1` (so it is already hidden for a single page). The "Show:" Select block renders at line 210 when `perPage` is truthy. `handlePerPageChange` calls `setPage(0, newPerPage)`.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:960-969`: renders Pagination only when `users.length > 0`, with `totalPages={Math.ceil(pagination.total / pagination.per_page)}`, `perPage={pagination.per_page}`, `perPageOptions={DECIMAL_PAGINATION_OPTIONS}`, className `w-full shrink-0 !bg-transparent !border-t-0 ...`.
- `src/components/Pagination/index.ts`, `Hint.tsx` (sibling, not involved).

### Architecture and Layers Affected
Shared presentational component (`src/components/Pagination`). One consumer page (ProjectMembersManager) is the reported site.

### Integration Points
Consumers (15 files import it): UserProjectsTable, ProjectMembersManager, ImportUsersModal, CostCenterProjectsManager, ChatSkillsSelector, AssistantsListPage, MCPMarketplaceModal, WorkflowTemplates, WorkflowsList, KatasPage, SkillsListPage, SessionsView, RepositoriesTable, UaTable, TableWidget.

IMPORTANT discrepancy with the ticket: `grep perPage=` shows nearly all consumers pass `perPage` (UserProjectsTable, ImportUsersModal, CostCenterProjectsManager, AssistantsListPage x2, MCPMarketplaceModal, WorkflowsList, WorkflowTemplates, KatasPage, SkillsListPage x2, SessionsView, RepositoriesTable, UaTable, TableWidget). Only ChatSkillsSelector was not seen passing `perPage=` (not verified in detail). So the ticket's "other 13 consumers with no perPage selector" is inaccurate: a change keyed on `perPage` being set would alter single-page behavior for most consumers (the selector would newly appear on single-page lists), contradicting AC3 for them.

### Patterns and Conventions
Hooks are all called before the early return; any change must keep hooks above it. `cn()` util for classes. `DEFAULT_PAGINATION_OPTIONS` from `@/constants`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (components/component-patterns.md, testing, etc.); not read in depth for this small change.

### Architectural Decisions
None found for Pagination.

### Derived Conventions
Component returns null for no-op state; page buttons gated by `pageNumbers.length > 1`.

---

## 4. Testing Landscape

### Existing Coverage
`src/components/Pagination/__tests__/Pagination.test.tsx` (Vitest + RTL): page click, perPage render/change, custom options, ellipsis, className, invalid perPage, first/last navigation. All use `totalPages >= 10`; no test of the `totalPages <= 1` case.

### Testing Framework and Patterns
Vitest, React Testing Library, `unit` project. Ticket puts new tests out of scope; AGENTS.md says only write tests when asked.

### Coverage Gaps
Single-page hidden behavior and selector-with-single-page are untested.

---

## 5. Configuration and Environment

No env vars, flags or deployment concerns. `DECIMAL_PAGINATION_OPTIONS` (members tab options) defined in constants.

---

## 6. Risk Indicators

- Ticket premise mismatch: most consumers pass `perPage`; keying visibility on `perPage` alone would show a selector on single-page lists in ~14 consumers (regression vs AC3 / "hidden exactly as today").
- Speculative: a safe fix needs an explicit opt-in (e.g. a new prop such as `alwaysShowPerPage`) set only by ProjectMembersManager, or a decision from the requester to accept the broader behavior change. This is a design decision for spec.
- Speculative: when the bar stays visible with 1 page, `justify`/`ml-auto` layout and the `!border-t-0` className must still look right; `pageNumbers.length > 1` already hides nav.
- ProjectMembersManager gates on `users.length > 0`; `totalPages` can be 0 if total is 0 (not the reported case).
- Hooks-before-return ordering must be preserved.
- No unit coverage for the changed branch.

---

## 7. Summary for Complexity Assessment

One shared component (Pagination.tsx) with a single early-return guard at line 103 is the root cause; the page-number nav is already independently gated, so the code change is a few lines plus possibly one opt-in prop wired in ProjectMembersManager. Layers: shared UI component, one admin page consumer.

Technical novelty is low. Test posture: existing component tests exist but none cover single-page; ticket excludes new tests. Key risk is blast radius: 15 files import Pagination and nearly all pass `perPage`, contradicting the ticket's claim that 13 have no selector, so the fix must be opt-in or scoped carefully to satisfy the no-regression AC.

---

## 8. External References

None named by the task (only the ticket body at requirements.local.md, read; summarized in Section 1).
