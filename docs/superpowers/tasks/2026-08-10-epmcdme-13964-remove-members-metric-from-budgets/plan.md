# Remove Members Metric from Budgets Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the "Members / $X.XX" row from the ProjectBudgetCard component so it no longer appears in the Budgets section.

**Architecture:** Single presentation-layer deletion. The Members row is rendered exclusively inside the `AssignedCard` inner component of `ProjectBudgetCard.tsx`. The underlying `ProjectBudget` type fields (`member_count`, `allocated_member_budget_total`) are preserved because they are consumed by `MemberAllocationOverrideModal`.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library

## Global Constraints

- Do NOT remove `member_count` or `allocated_member_budget_total` from the `ProjectBudget` type — they are used by `MemberAllocationOverrideModal` and its tests.
- No layout gaps should remain after the row is deleted — the grid must still render cleanly.
- Commit message must follow the pattern: `EPMCDME-13964: <Capital sentence>`

---

### Task 1: Remove the Members metric row from ProjectBudgetCard

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx:238-243`
- Test: `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx` (create new)

**Interfaces:**
- Consumes: `ProjectBudget` from `src/types/entity/projectBudget.ts` — fields `member_count` and `allocated_member_budget_total` remain on the type but will no longer be rendered here.
- Produces: nothing new — this task only removes rendered output.

Test-first: yes — write a test asserting "Members" text is absent from the rendered card.

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProjectBudgetCard } from '../ProjectBudgetCard';
import { ProjectBudget } from '../../../../../../types/entity/projectBudget';

const assignedBudget: ProjectBudget = {
  id: '1',
  name: 'Test Budget',
  budget_limit: 100,
  budget_usage: 40,
  budget_duration: 'Monthly',
  budget_reset_at: null,
  member_count: 3,
  allocated_member_budget_total: 50,
  // add any other required fields with sensible defaults
} as unknown as ProjectBudget;

describe('ProjectBudgetCard', () => {
  it('does not display the Members metric row', () => {
    render(<ProjectBudgetCard budget={assignedBudget} mode="view" />);
    expect(screen.queryByText('Members')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

```bash
npx vitest run src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx
```

Expected: FAIL — "Members" is currently rendered so `queryByText('Members')` returns an element, and `not.toBeInTheDocument()` throws.

- [ ] **Step 3: Delete the Members row from ProjectBudgetCard.tsx**

In `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx`, remove lines 238–243:

```diff
-          <div className="col-span-2">
-            <span className="text-text-quaternary">Members</span>
-            <span className="ml-2 text-text-primary">
-              {budget.member_count} / {formatCurrency(budget.allocated_member_budget_total)}
-            </span>
-          </div>
```

The surrounding `</div>` at line 244 (closing the grid container) stays untouched.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

```bash
npx vitest run src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: Run the broader test suite to check for regressions**

```bash
npx vitest run src/pages/settings/administration/projectsManagement
```

Expected: all tests pass — in particular `MemberAllocationOverrideModal.test.tsx` must still pass because the type fields are preserved.

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx
git add src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx
git commit -m "EPMCDME-13964: Remove members metric from Budgets section"
```
