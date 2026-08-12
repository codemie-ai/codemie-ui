# Technical Research

**Task**: budgets members metric billing spend
**Generated**: 2026-08-10T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Remove members metric from Budgets section. Users reported that the numbers related to members in the Budgets section are unclear. The value showing members count and/or members per total spend is not understandable, and users do not know where the sum comes from or what it means. To avoid confusion, the members metric should be removed from the Budgets section.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx` — renders each budget category card; contains the Members row at lines 238-243 inside the `AssignedCard` inner component. This is the **single change point**:
  ```tsx
  <div className="col-span-2">
    <span className="text-text-quaternary">Members</span>
    <span className="ml-2 text-text-primary">
      {budget.member_count} / {formatCurrency(budget.allocated_member_budget_total)}
    </span>
  </div>
  ```
- `src/types/entity/projectBudget.ts` — `ProjectBudget` interface; holds `member_count` (line 41) and `allocated_member_budget_total` (line 42). These API fields **must be preserved** — they are also used by `MemberAllocationOverrideModal`.
- `src/pages/settings/administration/projectsManagement/components/MemberAllocationOverrideModal.tsx` — uses the same `ProjectBudget` type; `member_count` / `allocated_member_budget_total` referenced via the type fixture in tests, not displayed there.
- `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx` — parent that renders `ProjectBudgetCard`; no members metric displayed here.
- `src/pages/settings/administration/BudgetsManagementPage.tsx` — global budgets list page; no members metric.
- `src/pages/settings/administration/components/BudgetSpendCell.tsx` — spend-only summary cell used in table views; no members metric.
- `src/store/budgets.ts` / `src/store/projectBudgets.ts` — state stores; no display logic.
- `src/pages/settings/administration/projectsManagement/components/budgetSpending.ts` — utility functions for spend color; no members metric.

### Architecture and Layers Affected
- **Presentation layer**: `ProjectBudgetCard.tsx` — the only component rendering the members metric. The `AssignedCard` inner component owns the grid.
- **Type definitions**: `projectBudget.ts` — defines the `ProjectBudget` interface. No change needed here.
- **Store/API layer**: No changes needed.

### Integration Points
- `ProjectBudgetCard` is rendered by `ProjectBudgetsSection`, which is rendered by project management pages.
- `ProjectBudget` type is shared with `MemberAllocationOverrideModal` — the type fields must not be removed.

### Patterns and Conventions
- Card-based per-category display using a discriminated-union prop type (`variant: 'empty' | 'assigned'`).
- `AssignedCard` inner component owns the grid layout that renders the metric rows.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/components/component-patterns.md` — component modification conventions (if present).
- `.ai-run/guides/development/refactoring-patterns.md` — safe removal patterns (if present).

### Architectural Decisions
No ADRs found for the budget metric display.

### Derived Conventions
Grid-row pattern for budget metrics: each metric is a `<div className="col-span-2">` block with a label span and a value span.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/projectsManagement/components/__tests__/MemberAllocationOverrideModal.test.tsx` — covers allocation modal; uses `member_count: 0` and `allocated_member_budget_total: 0` in a mock fixture. Does **not** assert on the Members row in `ProjectBudgetCard`.
- No existing test file found that asserts the presence of the Members row in `ProjectBudgetCard`.

### Testing Framework and Patterns
- Vitest + React Testing Library.
- Mock fixtures use the full `ProjectBudget` interface shape.

### Coverage Gaps
- No test currently asserts the Members row exists, so deletion won't break any existing test.
- A new/updated test to confirm absence of "Members" text in `ProjectBudgetCard` would be good to add.

---

## 5. Configuration and Environment

### Environment Variables
None — the members metric is hardcoded UI with no feature flags or env vars.

### Configuration Files
No config files govern this metric.

### Feature Flags and Deployment Concerns
No feature flags. Change is purely frontend.

---

## 6. Risk Indicators

- **Type field reuse**: `member_count` and `allocated_member_budget_total` on `ProjectBudget` are also consumed by `MemberAllocationOverrideModal` test fixtures. Removing them from the type would break tests; only the rendered row should be removed.
- **Single change point**: The Members row is rendered exclusively at `ProjectBudgetCard.tsx` lines 238–243. High confidence this is the only place.
- **No layout regression**: After removing the 6-line block, the surrounding grid must be verified to have no empty gap. The grid uses `col-span-2` rows, so removal should be clean.
- **API field still returned**: The API still returns `member_count` and `allocated_member_budget_total`; the UI will simply stop rendering them — per the acceptance criteria this is explicitly acceptable.

---

## 7. Summary for Complexity Assessment

This is a narrow presentation-layer removal. The only file requiring a code change is `ProjectBudgetCard.tsx` where 6 lines (the Members grid row at lines 238–243) must be deleted from the `AssignedCard` inner component. No store, API, type definition, or routing changes are required.

The `ProjectBudget` type fields (`member_count`, `allocated_member_budget_total`) are shared with `MemberAllocationOverrideModal` and its test fixtures, so they must be preserved in the type. The removal is purely visual — the API will continue to return those fields but the UI will silently ignore them, which aligns with the acceptance criteria.

Test coverage is minimal in this area: no existing test asserts the Members row's presence, so the deletion is non-breaking. Risk is low. The main verification needed is a visual check that the budget card grid renders cleanly without a gap after the row is removed.
