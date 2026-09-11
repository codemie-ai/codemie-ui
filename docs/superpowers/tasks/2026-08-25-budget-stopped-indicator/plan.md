# Budget Stopped Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a "Budget Stopped" indicator in red text on project budget cards when the budget's `is_active` field is `false`.

**Architecture:** Add optional `is_active` field to `ProjectBudget` type (backward compatible), then conditionally render inline status text in the card header when the budget is inactive.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS

## Global Constraints

- TypeScript strict mode enabled — all types must be explicitly defined
- Follow existing Tailwind token patterns — use `text-failed-secondary` for error/warning inline text
- Maintain backward compatibility — `is_active` must be optional since older API responses may not include it
- Follow Apache 2.0 license header pattern in all modified files

---

## File Structure

**Modified files:**
- `src/types/entity/projectBudget.ts` — add `is_active?: boolean` to `ProjectBudget` interface
- `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx` — add conditional "Budget Stopped" indicator in `AssignedCard` component

**Test file:**
- `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx` — new test file covering both active and inactive budget rendering

---

### Task 1: Add is_active field to ProjectBudget type

**Files:**
- Modify: `src/types/entity/projectBudget.ts:30-46`
- Test-first: yes — TypeScript compilation validates the type exists

**Interfaces:**
- Consumes: existing `ProjectBudget` interface
- Produces: `ProjectBudget` with `is_active?: boolean` field that downstream components can read

- [ ] **Step 1: Add is_active field to ProjectBudget interface**

Open `src/types/entity/projectBudget.ts` and add the field after line 40 (`provider_sync_status`):

```typescript
export interface ProjectBudget {
  budget_id: string
  name: string
  description?: string | null
  project_name: string
  budget_category: BudgetCategory
  soft_budget: number
  max_budget: number
  budget_duration: string
  budget_reset_at?: string | null
  provider_sync_status: BudgetSyncStatus | null
  is_active?: boolean
  member_count: number
  allocated_member_budget_total: number
  member_allocations: ProjectBudgetMemberAllocation[]
  created_at?: string | null
  updated_at?: string | null
}
```

**Rationale:** Field is optional (`?`) for backward compatibility with API responses that predate this field. Placed after `provider_sync_status` to keep sync-related fields together. Not added to `ProjectBudgetCreatePayload` or `ProjectBudgetUpdatePayload` since `is_active` is server-controlled, not user-settable.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run type-check`

Expected: No errors (adding an optional field is non-breaking)

- [ ] **Step 3: Commit type change**

```bash
git add src/types/entity/projectBudget.ts
git commit -m "EPMCMDE-13960: Add is_active field to ProjectBudget type"
```

---

### Task 2: Display "Budget Stopped" indicator in budget card

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx:165-216`
- Test: `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx`

**Interfaces:**
- Consumes: `ProjectBudget` with `is_active?: boolean` (from Task 1)
- Produces: UI component that renders "Budget Stopped" text when `budget.is_active === false`

- [ ] **Step 1: Write failing test for inactive budget indicator**

Create `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectBudget } from '@/types/entity/projectBudget'

import ProjectBudgetCard from '../ProjectBudgetCard'

const mockBudgetBase: ProjectBudget = {
  budget_id: 'test-budget-1',
  name: 'Test Budget',
  project_name: 'test-project',
  budget_category: 'platform',
  soft_budget: 300,
  max_budget: 500,
  budget_duration: '30d',
  provider_sync_status: 'ok',
  member_count: 5,
  allocated_member_budget_total: 400,
  member_allocations: [],
}

describe('ProjectBudgetCard', () => {
  it('shows "Budget Stopped" indicator when is_active is false', () => {
    const inactiveBudget: ProjectBudget = {
      ...mockBudgetBase,
      is_active: false,
    }

    render(
      <ProjectBudgetCard variant="assigned" mode="view" budget={inactiveBudget} />
    )

    expect(screen.getByText('Budget Stopped')).toBeInTheDocument()
  })

  it('does not show "Budget Stopped" when is_active is true', () => {
    const activeBudget: ProjectBudget = {
      ...mockBudgetBase,
      is_active: true,
    }

    render(
      <ProjectBudgetCard variant="assigned" mode="view" budget={activeBudget} />
    )

    expect(screen.queryByText('Budget Stopped')).not.toBeInTheDocument()
  })

  it('does not show "Budget Stopped" when is_active is undefined', () => {
    const budgetWithoutField: ProjectBudget = {
      ...mockBudgetBase,
      // is_active omitted — backward compatibility case
    }

    render(
      <ProjectBudgetCard variant="assigned" mode="view" budget={budgetWithoutField} />
    )

    expect(screen.queryByText('Budget Stopped')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProjectBudgetCard.test.tsx`

Expected: FAIL — "Unable to find an element with the text: Budget Stopped"

- [ ] **Step 3: Add "Budget Stopped" indicator to AssignedCard component**

Open `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx` and modify the header section of `AssignedCard` (lines 165-216). Add the indicator after the category label and before the spend display:

```typescript
<div className="flex items-center justify-between gap-2">
  <div className="flex items-center gap-2 min-w-0">
    <div
      id={`budget-card-category-${budget.budget_id}`}
      className="text-sm font-medium text-text-primary shrink-0"
    >
      {getBudgetCategoryLabel(budget.budget_category)}
    </div>
    {budget.is_active === false && (
      <span className="text-xs text-failed-secondary">Budget Stopped</span>
    )}
    {spendingRow != null &&
      (() => {
        const hardLimitPercentage = calculateHardLimitPercentage(
          spendingRow.current_spending,
          budget.max_budget
        )
        const color = getHardLimitSpendColor(
          spendingRow.current_spending,
          budget.max_budget
        )
        return (
          <span className="text-sm">
            <span className="text-text-quaternary">Spend</span>
            <span className="ml-1" style={color ? { color } : undefined}>
              {formatCurrency(spendingRow.current_spending)}
              <span className="ml-1 opacity-75">({hardLimitPercentage.toFixed(1)}%)</span>
            </span>
          </span>
        )
      })()}
  </div>
  {/* ... rest of header (sync badge, actions menu) unchanged ... */}
</div>
```

**Placement rationale:** Inline after category label keeps the warning visible and scannable without disrupting the existing layout. The `text-xs text-failed-secondary` pattern matches the existing soft-limit warning style in `BudgetCategoryTable.tsx`. The guard `budget.is_active === false` (strict equality) ensures the indicator only shows when explicitly `false` — not when `undefined` (backward compatibility) or `true`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ProjectBudgetCard.test.tsx`

Expected: PASS — all 3 test cases pass

- [ ] **Step 5: Run type-check to verify no TypeScript errors**

Run: `npm run type-check`

Expected: No errors

- [ ] **Step 6: Commit implementation**

```bash
git add src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx
git commit -m "EPMCMDE-13960: Display Budget Stopped indicator on inactive budgets"
```

---

## Verification

After completing both tasks:

1. **Type safety:** `npm run type-check` passes
2. **Tests:** `npm test -- ProjectBudgetCard.test.tsx` passes (3/3 tests)
3. **Visual check (if dev server available):**
   - Navigate to a project details page with budgets
   - Mock API response to include `"is_active": false` on one budget
   - Verify "Budget Stopped" appears in red text inline with the category label
   - Verify it does NOT appear on budgets with `is_active: true` or `is_active` omitted

## Implementation Notes

- **Minimal changeset:** Only 2 source files touched (type + component) plus 1 test file
- **Backward compatible:** `is_active` is optional — old API responses without the field work unchanged
- **Follows existing patterns:** Red warning text uses `text-failed-secondary` (already used in budget UI for soft-limit warnings)
- **No store changes needed:** Data flows directly from API response to component props
- **Placement:** Inline in header keeps the indicator visible without layout disruption
