# User Project Spending Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a user's spending broken down per project — as an expandable nested table on the administration users page, and as a new `Spending` column on the project details members table.

**Architecture:** Add optional row-expansion support to the shared `Table` component (three additive props plus a matching update to its memo comparator), then build a lazily-fetched nested sub-table on top of it. Data comes from two new analytics tabular endpoints reusing the existing `TabularResponse` envelope. A shared `formatCurrency` utility replaces six duplicated copies.

**Tech Stack:** React 18 + TypeScript, Vite, Valtio (proxy stores), Vitest + React Testing Library, Tailwind. **Not** RTK Query / Redux / TanStack Table.

**Spec:** `docs/superpowers/specs/2026-08-13-epmcdme-14071-user-project-spending-design.md`

## Global Constraints

- **Ticket prefix**: every commit message starts with `EPMCDME-14071:`.
- **Layering rule** (`.ai-run/guides/patterns/state-management.md`): Component → Store → API. No `api.*` calls inside components. Parse responses with `await response.json()`.
- **Budget categories** are exactly `platform`, `cli`, `premium_models` — the existing `BudgetCategory` union in `src/types/entity/budget.ts:16`. Never hardcode a fourth.
- **No `total` column** anywhere in these tables. Categories only. (Product decision.)
- **Current budget cycle only** — never send `time_period` / `start_date` / `end_date` on these two requests.
- **License header**: every new `.ts`/`.tsx` file must start with the Apache-2.0 header block. Copy it verbatim from any existing file (e.g. `src/components/Table/EmptyList.tsx` lines 1-14). CI enforces this via `npm run license-headers:check`.
- **Tooltips**: use the global instance — `data-tooltip-id='react-tooltip'` + `data-tooltip-content`. Never import `@/components/Tooltip` or use `data-pr-tooltip`.
- **Test projects**: unit tests are `**/__tests__/*.test.tsx` (run: `npx vitest run --project unit`); integration tests are `**/__tests__/*.integration.test.tsx` (run: `npx vitest run --project integration`).
- **Never run the whole test suite from a task.** It takes ~160s over 4147 tests. Each task runs only the specific test files it created or could plausibly affect — always scoped to a path. Whole-suite verification is done once, by the controller, at the end. A task step that appears to ask for a full run should be narrowed to the relevant paths.
- **Verification before commit**: `npm run check:pre-commit` (= `tsc --noEmit` && `eslint`) must pass.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/utils/currency.ts` | **Create.** Single source of truth for money formatting. |
| `src/types/entity/userProjectSpending.ts` | **Create.** Row types for both new endpoints. |
| `src/types/analytics.ts` | **Modify.** Two new `TabularMetricType` members. |
| `src/store/analytics.ts` | **Modify.** Two fetch methods. |
| `src/components/Table/Table.tsx` | **Modify.** Three optional expansion props; emit expansion `<tr>`. |
| `src/components/Table/utils.ts` | **Modify.** Extend `propsAreEqual` — **critical, see Task 3.** |
| `.../usersManagement/components/UserProjectSpendingTable.tsx` | **Create.** The nested sub-table. |
| `.../administration/UsersManagementPage.tsx` | **Modify.** Expansion state + wiring. |
| `.../projectsManagement/ProjectMembersManager.tsx` | **Modify.** Rename column, add `Spending`. |

Task order is dependency-driven: leaf utilities first (Tasks 1-2), then the `Table` primitive (Task 3), then the component built on it (Tasks 4-5), then the two pages (Tasks 6-7), then the cleanup sweep (Task 8).

---

### Task 1: Shared currency formatter

`formatCurrency` is currently duplicated in six files, and `ProjectDetailsPage.tsx:46` is subtly wrong — it uses `toFixed(2)`, so it renders `$1234.50` where every other copy renders `$1,234.50`. This task creates the canonical version; Task 8 sweeps the duplicates.

**Files:**
- Create: `src/utils/currency.ts`
- Test: `src/utils/__tests__/currency.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatCurrency(value: number): string`, `formatSpend(value: number | null | undefined): string`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/currency.test.ts` (start the file with the Apache-2.0 license header block):

```ts
import { describe, it, expect } from 'vitest'

import { formatCurrency, formatSpend } from '../currency'

describe('formatCurrency', () => {
  it('formats with two fraction digits', () => {
    expect(formatCurrency(120.5)).toBe('$120.50')
  })

  it('includes thousands separators', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats zero as $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('rounds to two decimals', () => {
    expect(formatCurrency(10.126)).toBe('$10.13')
  })
})

describe('formatSpend', () => {
  it('returns a dash for null', () => {
    expect(formatSpend(null)).toBe('-')
  })

  it('returns a dash for undefined', () => {
    expect(formatSpend(undefined)).toBe('-')
  })

  it('formats zero rather than treating it as absent', () => {
    expect(formatSpend(0)).toBe('$0.00')
  })

  it('formats a number', () => {
    expect(formatSpend(1234.5)).toBe('$1,234.50')
  })
})
```

The `formatSpend(0)` case is the one that matters most: `0` is real spend, not missing data. A `!value` guard would wrongly render `-`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/utils/__tests__/currency.test.ts`
Expected: FAIL — cannot resolve `../currency`.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/currency.ts` (with the license header):

```ts
/** Formats a number as USD with thousands separators and exactly two decimals. */
export const formatCurrency = (value: number): string =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Formats a possibly-absent spend value.
 * `null`/`undefined` mean "no data" and render as `-`; `0` is real spend and renders as `$0.00`.
 */
export const formatSpend = (value: number | null | undefined): string =>
  value == null ? '-' : formatCurrency(value)
```

Note `value == null` (loose) — it catches both `null` and `undefined` while letting `0` through.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/utils/__tests__/currency.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/currency.ts src/utils/__tests__/currency.test.ts
git commit -m "EPMCDME-14071: Add shared currency formatter"
```

---

### Task 2: Types and store methods

**Files:**
- Create: `src/types/entity/userProjectSpending.ts`
- Modify: `src/types/analytics.ts` (the `TabularMetricType` enum, around line 190)
- Modify: `src/store/analytics.ts` (interface declaration + implementation)
- Test: `src/store/__tests__/analyticsSpending.test.ts`

**Interfaces:**
- Consumes: `TabularResponse` from `@/types/analytics`.
- Produces:
  - `TabularMetricType.USER_PROJECT_SPENDING` / `.PROJECT_MEMBER_SPENDING`
  - `UserProjectSpendingRow`, `ProjectMemberSpendingRow`, `SPENDING_CATEGORY_KEYS`
  - `analyticsStore.fetchUserProjectSpending(userEmail: string): Promise<TabularResponse | null>`
  - `analyticsStore.fetchProjectMemberSpending(projectName: string): Promise<TabularResponse | null>`

- [ ] **Step 1: Add the metric types**

In `src/types/analytics.ts`, inside the `TabularMetricType` enum, add:

```ts
  USER_PROJECT_SPENDING = 'user-project-spending',
  PROJECT_MEMBER_SPENDING = 'project-member-spending',
```

- [ ] **Step 2: Create the row types**

Create `src/types/entity/userProjectSpending.ts` (with the license header):

```ts
import { BudgetCategory } from './budget'

/** Category keys, in display order. Mirrors BUDGET_CATEGORY_ORDER used by BudgetSpendCell. */
export const SPENDING_CATEGORY_KEYS: BudgetCategory[] = ['platform', 'cli', 'premium_models']

/** One row of `user-project-spending`: a user's spend inside one project, per category. */
export interface UserProjectSpendingRow {
  project_name: string
  display_name?: string | null
  platform?: number | null
  cli?: number | null
  premium_models?: number | null
  platform_limit?: number | null
  cli_limit?: number | null
  premium_models_limit?: number | null
}

/** One row of `project-member-spending`: one member's spend in the current project. */
export interface ProjectMemberSpendingRow {
  user_id: string
  platform?: number | null
  cli?: number | null
  premium_models?: number | null
  platform_limit?: number | null
  cli_limit?: number | null
  premium_models_limit?: number | null
}

/** Reads the spend for a category off a row. */
export const getCategorySpend = (
  row: UserProjectSpendingRow | ProjectMemberSpendingRow,
  category: BudgetCategory
): number | null | undefined => row[category]

/** Reads the limit for a category off a row. `null` means no limit configured. */
export const getCategoryLimit = (
  row: UserProjectSpendingRow | ProjectMemberSpendingRow,
  category: BudgetCategory
): number | null | undefined => row[`${category}_limit` as keyof typeof row] as number | null | undefined
```

- [ ] **Step 3: Write the failing store test**

Create `src/store/__tests__/analyticsSpending.test.ts` (with the license header):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { analyticsStore } from '@/store/analytics'
import { TabularMetricType } from '@/types/analytics'

describe('analytics spending fetchers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('requests user project spending for one user and sends no date params', async () => {
    const spy = vi.spyOn(analyticsStore, 'fetchTabularData').mockResolvedValue(null)

    await analyticsStore.fetchUserProjectSpending('jane@epam.com')

    expect(spy).toHaveBeenCalledWith(TabularMetricType.USER_PROJECT_SPENDING, {
      users: ['jane@epam.com'],
    })
  })

  it('requests project member spending for one project', async () => {
    const spy = vi.spyOn(analyticsStore, 'fetchTabularData').mockResolvedValue(null)

    await analyticsStore.fetchProjectMemberSpending('project-6')

    expect(spy).toHaveBeenCalledWith(TabularMetricType.PROJECT_MEMBER_SPENDING, {
      projects: ['project-6'],
    })
  })
})
```

The "no date params" assertion is load-bearing: the spec requires spend to be scoped to the current budget cycle, so sending a time range would silently produce numbers that contradict the existing Budgets column.

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run --project unit src/store/__tests__/analyticsSpending.test.ts`
Expected: FAIL — `analyticsStore.fetchUserProjectSpending is not a function`.

- [ ] **Step 5: Add the methods**

In `src/store/analytics.ts`, add to the store's TypeScript interface (near the existing `fetchTabularData` declaration around line 125):

```ts
  fetchUserProjectSpending: (userEmail: string) => Promise<TabularResponse | null>
  fetchProjectMemberSpending: (projectName: string) => Promise<TabularResponse | null>
```

And in the store object, next to `fetchTabularData`:

```ts
  /**
   * Per-project spending breakdown for one user (users page nested rows).
   * Intentionally sends no time params — the backend scopes to the current budget cycle.
   */
  async fetchUserProjectSpending(userEmail: string) {
    return this.fetchTabularData(TabularMetricType.USER_PROJECT_SPENDING, {
      users: [userEmail],
    })
  },

  /** Per-member spending inside one project (project details Spending column). */
  async fetchProjectMemberSpending(projectName: string) {
    return this.fetchTabularData(TabularMetricType.PROJECT_MEMBER_SPENDING, {
      projects: [projectName],
    })
  },
```

Both delegate to the existing `fetchTabularData`, inheriting its error handling and request cancellation.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run --project unit src/store/__tests__/analyticsSpending.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run check:pre-commit
git add src/types/analytics.ts src/types/entity/userProjectSpending.ts src/store/analytics.ts src/store/__tests__/analyticsSpending.test.ts
git commit -m "EPMCDME-14071: Add spending metric types and store fetchers"
```

---

### Task 3: Row expansion in the shared Table

**This is the highest-risk task in the plan.** `Table` is exported as `memo(Table, propsAreEqual)`, and `propsAreEqual` (`src/components/Table/utils.ts:52`) compares props by an explicit **whitelist** — it returns `true` ("equal, skip re-render") for any prop it does not name. Adding expansion props without extending it produces a feature that silently does nothing: state updates, no re-render, chevron appears dead. No error, no type failure. Step 1's second test is the guard for exactly this, and it must be seen to fail for the right reason before the fix goes in.

**Files:**
- Modify: `src/components/Table/Table.tsx`
- Modify: `src/components/Table/utils.ts:52-77`
- Test: `src/components/Table/__tests__/TableExpansion.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: three optional `TableProps<T>` members —
  - `expandedRowIds?: ReadonlyArray<string>`
  - `onToggleExpand?: (id: string) => void`
  - `renderExpandedRow?: (item: T) => React.ReactNode`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Table/__tests__/TableExpansion.test.tsx` (with the license header):

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'

import Table from '../Table'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

interface Row {
  id: string
  name: string
}

const items: Row[] = [
  { id: 'u-1', name: 'Jane' },
  { id: 'u-2', name: 'John' },
]

const columnDefinitions: ColumnDefinition[] = [
  { key: 'name', label: 'Name', type: DefinitionTypes.String },
]

describe('Table row expansion', () => {
  it('renders a chevron button per row when onToggleExpand is provided', () => {
    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={columnDefinitions}
        expandedRowIds={[]}
        onToggleExpand={vi.fn()}
        renderExpandedRow={() => <div>detail</div>}
      />
    )

    expect(screen.getAllByRole('button', { name: /expand row/i })).toHaveLength(2)
    expect(screen.queryByText('detail')).not.toBeInTheDocument()
  })

  it('calls onToggleExpand with the row id when the chevron is clicked', async () => {
    const user = userEvent.setup()
    const onToggleExpand = vi.fn()

    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={columnDefinitions}
        expandedRowIds={[]}
        onToggleExpand={onToggleExpand}
        renderExpandedRow={() => <div>detail</div>}
      />
    )

    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])

    expect(onToggleExpand).toHaveBeenCalledWith('u-1')
  })

  // REGRESSION GUARD for the memoized propsAreEqual comparator.
  // Only `expandedRowIds` changes between renders here. If propsAreEqual does not
  // compare it, memo blocks the re-render and the detail row never appears —
  // which is exactly how this feature breaks in production.
  it('re-renders when only expandedRowIds changes', async () => {
    const user = userEvent.setup()

    const Harness = () => {
      const [expanded, setExpanded] = useState<string[]>([])
      return (
        <Table
          idPath="id"
          items={items}
          columnDefinitions={columnDefinitions}
          expandedRowIds={expanded}
          onToggleExpand={(id) =>
            setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
          }
          renderExpandedRow={(item: Row) => <div>detail for {item.name}</div>}
        />
      )
    }

    render(<Harness />)
    expect(screen.queryByText('detail for Jane')).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])
    expect(screen.getByText('detail for Jane')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /collapse row/i })[0])
    expect(screen.queryByText('detail for Jane')).not.toBeInTheDocument()
  })

  it('spans the expansion cell across every column', async () => {
    const user = userEvent.setup()
    const wideColumns: ColumnDefinition[] = [
      { key: 'name', label: 'Name', type: DefinitionTypes.String },
      { key: 'id', label: 'Id', type: DefinitionTypes.String },
    ]

    const Harness = () => {
      const [expanded, setExpanded] = useState<string[]>([])
      return (
        <Table
          idPath="id"
          items={items}
          columnDefinitions={wideColumns}
          expandedRowIds={expanded}
          onToggleExpand={(id) => setExpanded([id])}
          renderExpandedRow={() => <div data-testid="detail">detail</div>}
        />
      )
    }

    render(<Harness />)
    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])

    const cell = screen.getByTestId('detail').closest('td')
    expect(cell).toHaveAttribute('colspan', '2')
  })

  it('does not select the row when the chevron is clicked', async () => {
    const user = userEvent.setup()
    const onSelectRow = vi.fn()

    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={columnDefinitions}
        selected={[]}
        onSelectRow={onSelectRow}
        expandedRowIds={[]}
        onToggleExpand={vi.fn()}
        renderExpandedRow={() => <div>detail</div>}
      />
    )

    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])

    expect(onSelectRow).not.toHaveBeenCalled()
  })

  it('renders no chevron when onToggleExpand is omitted', () => {
    render(<Table idPath="id" items={items} columnDefinitions={columnDefinitions} />)

    expect(screen.queryByRole('button', { name: /expand row/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/components/Table/__tests__/TableExpansion.test.tsx`
Expected: FAIL — no chevron buttons found (the props are not yet accepted).

- [ ] **Step 3: Add the props to Table**

In `src/components/Table/Table.tsx`, add to the `TableProps<T>` interface:

```ts
  expandedRowIds?: ReadonlyArray<string>
  onToggleExpand?: (id: string) => void
  renderExpandedRow?: (item: T) => React.ReactNode
```

Destructure them in the component signature alongside the existing props:

```ts
  expandedRowIds,
  onToggleExpand,
  renderExpandedRow,
```

Add the icon import at the top, next to the other imports:

```ts
import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import ChevronUpSvg from '@/assets/icons/chevron-up.svg?react'
```

- [ ] **Step 4: Render the chevron and the expansion row**

Inside the `items.map((value, rowIndex) => {...})` body in `Table.tsx`, after `isSelected` is computed, add:

```tsx
                const isExpandable = !!onToggleExpand && !!renderExpandedRow
                const isExpanded = isExpandable && !!expandedRowIds?.includes(String(idValue))
```

The existing `return (<tr>...</tr>)` must become a fragment holding the row plus its optional
expansion row. Replace the returned JSX with:

```tsx
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={(e) => handleRowClick(value, e)}
                      className={cn(
                        onSelectRow &&
                          !isSelected &&
                          '[&_td]:hover:bg-surface-base-tertiary cursor-pointer',
                        isSelected && '[&_td]:bg-surface-specific-input-prefix cursor-pointer'
                      )}
                    >
                      {columnDefinitions.map((definition, colIndex) => (
                        <TableCell
                          value={value}
                          index={colIndex}
                          key={definition.key}
                          definition={definition}
                          colIndex={colIndex}
                          isLastRow={items.length - 1 === rowIndex && !isExpanded}
                          hasFooter={!!footer}
                          columnsLength={columnDefinitions.length}
                          customRender={customRenderColumns[definition.key]}
                          shrink={definition.shrink}
                          noWrap={noWrap}
                          isSelected={isSelected}
                          onSelect={() => handleRowSelect(value)}
                          expandControl={
                            isExpandable && colIndex === 0 ? (
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} row`}
                                className="mr-2 shrink-0 text-text-quaternary hover:text-text-primary"
                                onClick={() => onToggleExpand?.(String(idValue))}
                              >
                                {isExpanded ? (
                                  <ChevronUpSvg className="w-3 h-3" />
                                ) : (
                                  <ChevronDownSvg className="w-3 h-3" />
                                )}
                              </button>
                            ) : undefined
                          }
                        />
                      ))}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={columnDefinitions.length}
                          className={cn(
                            'bg-surface-base-tertiary border-b border-l border-r border-border-structural px-4 py-3',
                            {
                              'rounded-bl-lg rounded-br-lg':
                                items.length - 1 === rowIndex && !footer,
                            }
                          )}
                        >
                          {renderExpandedRow?.(value)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
```

Two details that are easy to miss:
- `isLastRow` now also requires `!isExpanded`, so the rounded bottom corners move to the expansion row when the last row is open.
- The `key` moves from the `<tr>` to the `React.Fragment`.

- [ ] **Step 5: Accept the chevron slot in TableCell**

In `src/components/Table/TableCell.tsx`, add to `TableCellProps`:

```ts
  expandControl?: React.ReactNode
```

Destructure `expandControl` in the component signature, then wrap the cell body so the chevron sits
inline before the content. Replace the `return (<td ...>{content}</td>)` body with:

```tsx
    <td
      className={cn(
        'text-text-primary px-4 py-2 text-left bg-surface-base-secondary border-b border-border-structural',
        {
          'border-l': colIndex === 0,
          'border-r': colIndex === columnsLength - 1,
          'rounded-bl-lg': isLastRow && !hasFooter && colIndex === 0,
          'rounded-br-lg': isLastRow && !hasFooter && colIndex === columnsLength - 1,
          'font-bold': isSemiBold,
          'min-w-[120px] break-all': shrink,
          'whitespace-nowrap': noWrap,
          'pr-0.5': isSelectionCell,
        }
      )}
    >
      {expandControl ? (
        <div className="flex items-center min-w-0">
          {expandControl}
          <div className="min-w-0">{content}</div>
        </div>
      ) : (
        content
      )}
    </td>
```

- [ ] **Step 6: Extend propsAreEqual — the critical fix**

In `src/components/Table/utils.ts`, inside `propsAreEqual`, add these checks before the final
`return true`:

```ts
  if (!isEqual(prevProps.expandedRowIds, nextProps.expandedRowIds)) return false
  if (prevProps.onToggleExpand !== nextProps.onToggleExpand) return false
  if (prevProps.renderExpandedRow !== nextProps.renderExpandedRow) return false
```

`expandedRowIds` is compared by value with `isEqual` (callers commonly pass a fresh array each
render); the two callbacks are compared by reference, matching how the file already treats
`onSort` and `onPaginationChange`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run --project unit src/components/Table/__tests__/TableExpansion.test.tsx`
Expected: PASS, 6 tests.

If the "re-renders when only expandedRowIds changes" test still fails here, Step 6 was not applied
correctly — that test exists solely to catch a missing comparator entry.

- [ ] **Step 8: Verify no existing table regressed**

Run only the test files that render a `<Table>`. Find them first, then run just those:

```bash
grep -rl "components/Table" src --include=*.test.tsx --include=*.integration.test.tsx
rtk proxy npx vitest run --project unit <the files that grep printed>
```

Expected: PASS. Every existing `<Table>` call site omits the new props, so `isExpandable` is
`false` and rendering is unchanged.

Do **not** run the whole suite — it takes ~160s. Table consumers are the entire regression surface
for this change. Full-suite verification is the controller's job.

- [ ] **Step 9: Typecheck and commit**

```bash
npm run check:pre-commit
git add src/components/Table/Table.tsx src/components/Table/TableCell.tsx src/components/Table/utils.ts src/components/Table/__tests__/TableExpansion.test.tsx
git commit -m "EPMCDME-14071: Add optional row expansion to shared Table"
```

---

### Task 4: Spending amount cell

A small presentational unit shared by the nested sub-table (Task 5) and the project members column
(Task 7): one category's spend, colored against its limit, with the limit in a tooltip.

**Files:**
- Create: `src/pages/settings/administration/components/SpendingAmount.tsx`
- Test: `src/pages/settings/administration/components/__tests__/SpendingAmount.test.tsx`

**Interfaces:**
- Consumes: `formatSpend` (Task 1); `getHardLimitSpendColor` from `@/pages/settings/administration/projectsManagement/components/budgetSpending`.
- Produces: `SpendingAmount` — default export, props `{ spend?: number | null; limit?: number | null }`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/components/__tests__/SpendingAmount.test.tsx` (license header first):

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import SpendingAmount from '../SpendingAmount'

describe('SpendingAmount', () => {
  it('renders the formatted spend', () => {
    render(<SpendingAmount spend={120.5} limit={500} />)
    expect(screen.getByText('$120.50')).toBeInTheDocument()
  })

  it('renders zero spend rather than a dash', () => {
    render(<SpendingAmount spend={0} limit={500} />)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('renders a dash when spend is absent', () => {
    render(<SpendingAmount spend={null} limit={500} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('applies no color when no limit is configured', () => {
    render(<SpendingAmount spend={120.5} limit={null} />)
    expect(screen.getByText('$120.50')).not.toHaveStyle({ color: expect.anything() })
  })

  it('exposes the limit through the global tooltip when present', () => {
    render(<SpendingAmount spend={120.5} limit={500} />)
    expect(screen.getByText('$120.50')).toHaveAttribute('data-tooltip-id', 'react-tooltip')
    expect(screen.getByText('$120.50')).toHaveAttribute('data-tooltip-content', 'Limit: $500.00')
  })

  it('omits the tooltip when no limit is configured', () => {
    render(<SpendingAmount spend={120.5} limit={null} />)
    expect(screen.getByText('$120.50')).not.toHaveAttribute('data-tooltip-id')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/components/__tests__/SpendingAmount.test.tsx`
Expected: FAIL — cannot resolve `../SpendingAmount`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/settings/administration/components/SpendingAmount.tsx` (license header first):

```tsx
import { FC } from 'react'

import { getHardLimitSpendColor } from '@/pages/settings/administration/projectsManagement/components/budgetSpending'
import { formatCurrency, formatSpend } from '@/utils/currency'

interface SpendingAmountProps {
  spend?: number | null
  limit?: number | null
}

/**
 * One category's spend, colored against its limit.
 * No limit configured means no threshold color and no tooltip — never a false "over budget" signal.
 */
const SpendingAmount: FC<SpendingAmountProps> = ({ spend, limit }) => {
  const color = spend != null ? getHardLimitSpendColor(spend, limit) : null
  const tooltip = limit != null ? `Limit: ${formatCurrency(limit)}` : undefined

  return (
    <span
      className="whitespace-nowrap text-text-primary"
      style={color ? { color } : undefined}
      data-tooltip-id={tooltip ? 'react-tooltip' : undefined}
      data-tooltip-content={tooltip}
    >
      {formatSpend(spend)}
    </span>
  )
}

export default SpendingAmount
```

`getHardLimitSpendColor` already returns `null` when the limit is `null` or `<= 0`, so no extra guard is needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/settings/administration/components/__tests__/SpendingAmount.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/components/SpendingAmount.tsx src/pages/settings/administration/components/__tests__/SpendingAmount.test.tsx
git commit -m "EPMCDME-14071: Add SpendingAmount cell component"
```

---

### Task 5: The nested sub-table

**Files:**
- Create: `src/pages/settings/administration/usersManagement/components/UserProjectSpendingTable.tsx`
- Test: `src/pages/settings/administration/usersManagement/components/__tests__/UserProjectSpendingTable.test.tsx`

**Interfaces:**
- Consumes: `analyticsStore.fetchUserProjectSpending` (Task 2); `UserProjectSpendingRow`, `SPENDING_CATEGORY_KEYS`, `getCategorySpend`, `getCategoryLimit` (Task 2); `SpendingAmount` (Task 4).
- Produces: `UserProjectSpendingTable` — default export, props `{ userEmail: string }`.

Renders `<Table embedded>` following the existing precedent in `UserProjectsTable.tsx`.

- [ ] **Step 1: Write the failing test**

Create the test file (license header first):

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { analyticsStore } from '@/store/analytics'

import UserProjectSpendingTable from '../UserProjectSpendingTable'

const response = {
  data: {
    columns: [],
    rows: [
      {
        project_name: 'project-6',
        display_name: 'Project 6',
        platform: 120.5,
        cli: 40,
        premium_models: 0,
        platform_limit: 500,
        cli_limit: null,
        premium_models_limit: null,
      },
    ],
  },
  metadata: { timestamp: '', data_as_of: '' },
  pagination: { page: 0, per_page: 50, total_count: 1, has_more: false },
}

describe('UserProjectSpendingTable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches spending for the given user', async () => {
    const spy = vi
      .spyOn(analyticsStore, 'fetchUserProjectSpending')
      .mockResolvedValue(response as never)

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    await waitFor(() => expect(spy).toHaveBeenCalledWith('jane@epam.com'))
  })

  it('renders a row per project with per-category amounts', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockResolvedValue(response as never)

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    expect(await screen.findByText('Project 6')).toBeInTheDocument()
    expect(screen.getByText('$120.50')).toBeInTheDocument()
    expect(screen.getByText('$40.00')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('shows an empty state when the user has no projects', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockResolvedValue({
      ...response,
      data: { columns: [], rows: [] },
    } as never)

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    expect(await screen.findByText(/no project spending/i)).toBeInTheDocument()
  })

  it('shows an inline warning when the request fails', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockRejectedValue(new Error('boom'))

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    expect(await screen.findByText(/could not load project spending/i)).toBeInTheDocument()
  })

  it('falls back to the project name when no display name is set', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockResolvedValue({
      ...response,
      data: {
        columns: [],
        rows: [{ ...response.data.rows[0], display_name: null }],
      },
    } as never)

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    expect(await screen.findByText('project-6')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/__tests__/UserProjectSpendingTable.test.tsx`
Expected: FAIL — cannot resolve `../UserProjectSpendingTable`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/settings/administration/usersManagement/components/UserProjectSpendingTable.tsx` (license header first):

```tsx
import { FC, useEffect, useMemo, useState } from 'react'

import InfoWarning from '@/components/InfoWarning'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { InfoWarningType } from '@/constants'
import SpendingAmount from '@/pages/settings/administration/components/SpendingAmount'
import { analyticsStore } from '@/store/analytics'
import { getBudgetCategoryLabel } from '@/types/entity/budget'
import {
  getCategoryLimit,
  getCategorySpend,
  SPENDING_CATEGORY_KEYS,
  UserProjectSpendingRow,
} from '@/types/entity/userProjectSpending'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

interface UserProjectSpendingTableProps {
  userEmail: string
}

const columnDefinitions: ColumnDefinition[] = [
  { key: 'project', label: 'Project', type: DefinitionTypes.Custom, headClassNames: 'w-[40%]' },
  ...SPENDING_CATEGORY_KEYS.map((category) => ({
    key: category,
    label: getBudgetCategoryLabel(category),
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[20%]',
  })),
]

const UserProjectSpendingTable: FC<UserProjectSpendingTableProps> = ({ userEmail }) => {
  const [rows, setRows] = useState<UserProjectSpendingRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setHasError(false)
      try {
        const result = await analyticsStore.fetchUserProjectSpending(userEmail)
        if (cancelled) return
        setRows((result?.data?.rows as UserProjectSpendingRow[]) ?? [])
      } catch (error) {
        if (cancelled) return
        console.error('Failed to fetch user project spending:', error)
        setHasError(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userEmail])

  const customRenderColumns = useMemo(
    () => ({
      project: (item: UserProjectSpendingRow) => (
        <div className="text-text-primary break-all min-w-0">
          {item.display_name || item.project_name}
        </div>
      ),
      ...Object.fromEntries(
        SPENDING_CATEGORY_KEYS.map((category) => [
          category,
          (item: UserProjectSpendingRow) => (
            <SpendingAmount
              spend={getCategorySpend(item, category)}
              limit={getCategoryLimit(item, category)}
            />
          ),
        ])
      ),
    }),
    []
  )

  if (isLoading) return <Spinner inline />

  if (hasError) {
    return (
      <InfoWarning
        type={InfoWarningType.ERROR}
        message="Could not load project spending for this user."
      />
    )
  }

  if (!rows.length) {
    return <p className="text-xs text-text-quaternary">No project spending</p>
  }

  return (
    <>
      <Table
        embedded
        idPath="project_name"
        items={rows}
        columnDefinitions={columnDefinitions}
        customRenderColumns={customRenderColumns}
        className="!mt-0 !mb-0 table-fixed"
      />
      {/*
        Confirmed with the product owner: spend that is not attributable to any project exists.
        These rows are therefore a breakdown BY PROJECT, not a decomposition of the user's global
        total in the Budgets column — the two legitimately differ. Without this caption an admin
        comparing them reads the gap as a bug.
      */}
      <p className="mt-2 text-[10px] text-text-quaternary">
        Spending by project. May not match the user&apos;s total, which can include spending not
        attributed to a project.
      </p>
    </>
  )
}

export default UserProjectSpendingTable
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/__tests__/UserProjectSpendingTable.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run check:pre-commit
git add src/pages/settings/administration/usersManagement/components/UserProjectSpendingTable.tsx src/pages/settings/administration/usersManagement/components/__tests__/UserProjectSpendingTable.test.tsx
git commit -m "EPMCDME-14071: Add user project spending nested table"
```

---

### Task 6: Wire expansion into the users page

Expansion is gated behind the same `canManageBudgets` check that already gates the "Budgets"
column, so users without budget permissions see the table exactly as before.

**Files:**
- Modify: `src/pages/settings/administration/UsersManagementPage.tsx`
- Test: `src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx`

**Interfaces:**
- Consumes: `UserProjectSpendingTable` (Task 5); the `Table` expansion props (Task 3).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing integration test**

Create `src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx`.
Read `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` first
and mirror its setup — how it mocks the API layer, wraps the component in the router, and gates
admin permissions. Reuse that harness rather than inventing a new one.

The test must cover:

```tsx
  it('renders one nested row per project when a user row is expanded', async () => {
    // render the users page with one user (jane@epam.com) belonging to project-6
    // click the row's "Expand row" button
    // expect 'Project 6' and '$120.50' to appear
  })

  it('does not fetch spending until a row is expanded', async () => {
    // render, assert fetchUserProjectSpending was NOT called
    // click expand, assert it WAS called exactly once
  })

  it('does not refetch when the same row is re-expanded', async () => {
    // expand, collapse, expand again
    // assert fetchUserProjectSpending was called exactly once (cache holds)
  })

  it('expands two rows independently', async () => {
    // expand row 1 and row 2, assert both detail tables are present
  })
```

Fill in each body using the harness from `AdminTablesPagination.integration.test.tsx`, mocking
`analyticsStore.fetchUserProjectSpending` with `vi.spyOn` as in Task 5.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project integration src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx`
Expected: FAIL — no "Expand row" button exists on the page yet.

- [ ] **Step 3: Add expansion state to the page**

In `src/pages/settings/administration/UsersManagementPage.tsx`, add the imports:

```ts
import UserProjectSpendingTable from './usersManagement/components/UserProjectSpendingTable'
```

Add state next to the other `useState` declarations:

```ts
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([])
```

Add the toggle handler near the other `useCallback` handlers:

```ts
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRowIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])
```

Add the renderer. `UserProjectSpendingTable` keys its fetch off the email and caches internally per
mount; keeping the expanded row mounted while collapsed is unnecessary, so the component unmounts on
collapse and the cache lives in the page via `expandedRowIds` membership:

```tsx
  const renderExpandedRow = useCallback(
    (user: UserListItem) => <UserProjectSpendingTable userEmail={user.email} />,
    []
  )
```

- [ ] **Step 4: Pass the props to Table**

In the `<Table ... />` JSX (around line 362), add the three props, gated on `canManageBudgets`:

```tsx
          expandedRowIds={canManageBudgets ? expandedRowIds : undefined}
          onToggleExpand={canManageBudgets ? handleToggleExpand : undefined}
          renderExpandedRow={canManageBudgets ? renderExpandedRow : undefined}
```

- [ ] **Step 5: Add the per-user cache**

Re-expanding a row must not refetch. In `UserProjectSpendingTable.tsx`, add a module-level cache
above the component:

```ts
/** Per-user cache, keyed by email. Survives collapse/expand within a page session. */
const spendingCache = new Map<string, UserProjectSpendingRow[]>()
```

Then, in the `useEffect`, short-circuit on a cache hit and populate on success:

```ts
    const cached = spendingCache.get(userEmail)
    if (cached) {
      setRows(cached)
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }
```

(place this immediately before `load()` is invoked), and inside the `try` after a successful fetch:

```ts
        spendingCache.set(userEmail, (result?.data?.rows as UserProjectSpendingRow[]) ?? [])
```

Also initialise state from the cache so the first paint is not a spinner:

```ts
  const [rows, setRows] = useState<UserProjectSpendingRow[]>(() => spendingCache.get(userEmail) ?? [])
  const [isLoading, setIsLoading] = useState(() => !spendingCache.has(userEmail))
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run --project integration src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx`
Expected: PASS, 4 tests.

Also re-run the Task 5 unit tests, since the cache changed that component:
Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/__tests__/UserProjectSpendingTable.test.tsx`
Expected: PASS. If the "fetches spending for the given user" test now fails because a previous test
populated the cache, add `spendingCache.clear()` via an exported `__clearSpendingCache()` test hook
called in `beforeEach`.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run check:pre-commit
git add src/pages/settings/administration/UsersManagementPage.tsx src/pages/settings/administration/usersManagement/components/UserProjectSpendingTable.tsx src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx
git commit -m "EPMCDME-14071: Expand users table rows with per-project spending"
```

---

### Task 7: Spending column on the project details page

Renames the existing `Budget Allocations` column to `Allocated` and adds a sibling `Spending`
column. Both are gated by the existing `showBudgets` condition.

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` (`getColumnDefinitions` at `:132-195`, `customRenderColumns` at `:485-576`, `fetchUsers` at `:270-286`)
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx`

**Interfaces:**
- Consumes: `analyticsStore.fetchProjectMemberSpending` (Task 2); `ProjectMemberSpendingRow`, `SPENDING_CATEGORY_KEYS`, `getCategorySpend`, `getCategoryLimit` (Task 2); `SpendingAmount` (Task 4).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create the test file (license header first). Mirror the mocking approach used by
`src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`. Cover:

```tsx
  it('renders the Allocated and Spending column headers', async () => {
    // render ProjectMembersManager with budgets present (showBudgets true)
    // expect column header 'Allocated' to exist
    // expect column header 'Spending' to exist
    // expect 'Budget Allocations' NOT to exist
  })

  it('joins spending rows onto members by user_id', async () => {
    // mock fetchProjectMemberSpending -> [{ user_id: 'u-1', platform: 120.5, platform_limit: 500 }]
    // render with a member whose id is 'u-1'
    // expect '$120.50' to appear in that member's row
  })

  it('renders a dash for a member with no spending row', async () => {
    // mock fetchProjectMemberSpending -> []
    // expect the Spending cell to render '-'
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx`
Expected: FAIL — no `Spending` header; `Budget Allocations` still present.

- [ ] **Step 3: Rename the column and add the new one**

In `getColumnDefinitions` (`:132-195`), change the `budgets` column label from `'Budget Allocations'`
to `'Allocated'`, and add a `spending` column immediately after it, inside the same `showBudgets`
branch:

```ts
    {
      key: 'spending',
      label: 'Spending',
      type: DefinitionTypes.Custom,
      headClassNames: 'w-[24%]',
    },
```

- [ ] **Step 4: Rebalance the hardcoded widths**

The table is `table-fixed` and widths are hardcoded percentages in `if/else if` chains at
`:143-159`. In each branch where `showBudgets` is true, the new `spending` column needs room —
take it from the `budgets` column so each branch still sums to ~100%. For the
`canManage && showBudgets` branch, use: `select 4%`, `user 24%`, `role 18%`, `budgets 24%`,
`spending 24%`, `actions 6%`. For the `!canManage && showBudgets` branch, use: `user 28%`,
`role 20%`, `budgets 26%`, `spending 26%`. Leave the two `!showBudgets` branches untouched.

- [ ] **Step 5: Fetch the spending rows**

Add state near the other `useState` declarations:

```ts
  const [spendingByUserId, setSpendingByUserId] = useState<Record<string, ProjectMemberSpendingRow>>({})
```

Add the import:

```ts
import {
  getCategoryLimit,
  getCategorySpend,
  ProjectMemberSpendingRow,
  SPENDING_CATEGORY_KEYS,
} from '@/types/entity/userProjectSpending'
import SpendingAmount from '@/pages/settings/administration/components/SpendingAmount'
```

Load once per project, alongside the existing members fetch:

```ts
  useEffect(() => {
    if (!showBudgets) return

    let cancelled = false

    const loadSpending = async () => {
      try {
        const result = await analyticsStore.fetchProjectMemberSpending(project.name)
        if (cancelled) return
        const rows = (result?.data?.rows as ProjectMemberSpendingRow[]) ?? []
        setSpendingByUserId(Object.fromEntries(rows.map((row) => [row.user_id, row])))
      } catch (error) {
        console.error('Failed to fetch project member spending:', error)
        if (!cancelled) setSpendingByUserId({})
      }
    }

    loadSpending()
    return () => {
      cancelled = true
    }
  }, [project.name, showBudgets])
```

A failed fetch leaves the map empty, so every `Spending` cell renders `-` and the members table
keeps working.

- [ ] **Step 6: Render the cell**

In the `customRenderColumns` memo (`:485-576`), add a `spending` renderer and include
`spendingByUserId` in the dependency array:

```tsx
      spending: (item: UserListItem) => {
        const row = spendingByUserId[item.id]
        if (!row) return <span className="text-xs text-text-quaternary">-</span>

        return (
          <div className="flex flex-col gap-1">
            {SPENDING_CATEGORY_KEYS.map((category) => (
              <div key={category} className="flex items-center gap-2 text-xs">
                <span className="text-text-quaternary w-28 shrink-0">
                  {getBudgetCategoryLabel(category)}
                </span>
                <SpendingAmount
                  spend={getCategorySpend(row, category)}
                  limit={getCategoryLimit(row, category)}
                />
              </div>
            ))}
          </div>
        )
      },
```

`getBudgetCategoryLabel` is already imported in this file.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 8: Typecheck and commit**

```bash
npm run check:pre-commit
git add src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx
git commit -m "EPMCDME-14071: Add Spending column to project members table"
```

---

### Task 8: Replace duplicated currency formatters

Six files define their own `formatCurrency`. `ProjectDetailsPage.tsx:46` uses `toFixed(2)` and
renders `$1234.50` where the others render `$1,234.50` — a visible inconsistency on a page in scope.

**Files:**
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx:46-47`
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:58-64`
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:83-87`
- Modify: `src/pages/settings/administration/BudgetsManagementPage.tsx:97-98`
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx:85-89`
- Modify: `src/pages/settings/administration/components/BudgetSpendCell.tsx:35-42`

**Interfaces:**
- Consumes: `formatCurrency`, `formatSpend` (Task 1).
- Produces: nothing.

- [ ] **Step 1: Replace each local definition**

In each of the six files, delete the local `const formatCurrency = ...` (and any local
`formatSpend` / `formatBudget` wrapper that is just a null-guard) and import the shared versions:

```ts
import { formatCurrency, formatSpend } from '@/utils/currency'
```

In `BudgetSpendCell.tsx`, the local `formatBudget` is identical in behavior to `formatSpend` —
replace its call sites with `formatSpend` and delete it.

In `ProjectDetailsPage.tsx`, the local version took `number | null | undefined` and returned `-`
for nullish — that is `formatSpend`, not `formatCurrency`. Check each call site and use
`formatSpend` where a nullish value is possible. This is the behavior fix: amounts there gain
thousands separators.

- [ ] **Step 2: Verify nothing regressed**

Run only the tests covering the six files you edited:

```bash
rtk proxy npx vitest run --project unit src/pages/settings/administration src/utils/__tests__/currency.test.ts
```

Expected: PASS.

If a snapshot or assertion fails on `ProjectDetailsPage` because a number gained a comma, that is
the intended fix — update the expected value to the separated form.

Do **not** run the whole suite — it takes ~160s and this change is confined to the administration
pages. Full-suite verification is the controller's job.

- [ ] **Step 3: Confirm no local definitions remain**

Run: `grep -rn "const formatCurrency" src/`
Expected: exactly one hit — `src/utils/currency.ts`.

- [ ] **Step 4: Typecheck and commit**

```bash
npm run check:pre-commit
git add src/pages/settings/administration/
git commit -m "EPMCDME-14071: Replace duplicated currency formatters with shared util"
```

---

### Task 9: Full verification

- [ ] **Step 1: Run the whole suite — CONTROLLER ONLY**

> This step is run by the person or agent coordinating the work, **not** by a task subagent.
> Subagents run only the specific test files they touched.

Run: `rtk proxy npx vitest run --project unit`
Expected: PASS apart from one known pre-existing failure —
`src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx` "displays formatted date", which
fails identically on the pre-work commit `d1f204e91` and is unrelated to this branch.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run check:pre-commit`
Expected: clean (one pre-existing eslint warning about React version is expected and unrelated).

- [ ] **Step 3: Manual smoke check**

Start the app (`npm run dev`). The two backend endpoints do not exist yet, so this check verifies
the UI shell and graceful degradation — not live numbers.

- `/settings/administration/users` — chevrons appear on each row for a budget-managing admin.
- Expanding a row shows a spinner, then the inline warning "Could not load project spending for
  this user." The rest of the page must be completely unaffected — the users table keeps working,
  no global error toast fires.
- Collapsing and re-expanding does not issue a second request (check the Network tab — the cache
  holds even for a failed fetch).
- `/settings/administration/projects/<name>` — headers read `Allocated` and `Spending`; every
  `Spending` cell renders `-`, and the members table is otherwise fully functional.
- A user **without** budget-management permission sees no chevrons and no `Spending` column.

Once the backend ships, re-run this check and confirm real amounts render, `$0.00` appears for
zero spend (not `-`), and categories with no configured limit show no threshold coloring.

- [ ] **Step 4: Final commit if anything was adjusted**

```bash
git add -A
git commit -m "EPMCDME-14071: Fix issues found in verification"
```

---

## Backend dependency

Both endpoints are specified in
`docs/superpowers/specs/2026-08-13-epmcdme-14071-backend-handoff.md` and **do not exist yet**.
Until they ship, every surface in this plan degrades gracefully by design: the nested row shows an
inline warning, the `Spending` column shows `-`. No task in this plan is blocked on the backend.

Five edge cases are still open with the backend team (listed at the end of the handoff). The one
most likely to require a frontend change is whether spend from projects a user has **left** is
included — if it is, per-project rows will not reconcile against the global Budgets column on the
same screen.
