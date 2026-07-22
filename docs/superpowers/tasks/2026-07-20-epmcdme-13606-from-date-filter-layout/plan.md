# EPMCDME-13606: Fix Activity Events Filter Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the "From" date field to the second row of the Activity events filter panel so it appears next to the "To" field.

**Architecture:** The filter panel in `ActivityEventsPage.tsx` is a single flat `flex flex-wrap gap-3` container. A zero-height `<div className="w-full" />` inserted between the Entity ID field and the From DatePicker forces a flex line-break, ensuring From and To always render on the same row.

**Tech Stack:** React, Tailwind CSS, Vitest, React Testing Library

---

### Task 1: Fix filter layout — insert flex line-break

**Files:**
- Modify: `src/pages/settings/administration/ActivityEventsPage.tsx:306`
- Test: `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx` (create if absent, or add to existing)

- [ ] **Step 1: Write the failing test**

Check whether an element with `w-full` exists between Entity ID and From in the filter panel. Create (or add to) `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

vi.mock('@/store/activityEvents', () => ({
  activityEventsStore: {
    loadFilterOptions: vi.fn(),
    loadEvents: vi.fn(),
    events: [],
    pagination: { page: 1, per_page: 10, total: 0 },
    loading: false,
    filterOptions: { domains: [], event_types: [], entity_types: [] },
  },
}))

vi.mock('@/store/user', () => ({
  userStore: {
    user: { isMaintainer: true },
  },
}))

vi.mock('valtio', () => ({
  useSnapshot: (store: unknown) => store,
  proxy: (obj: unknown) => obj,
}))

describe('ActivityEventsPage filter layout', () => {
  it('renders a flex line-break element between Entity ID and From date fields', () => {
    const { container } = render(
      <MemoryRouter>
        <ActivityEventsPage />
      </MemoryRouter>
    )

    // The flex wrap container children in order: Domain, EventType, EntityType,
    // ActorID, EntityID, [w-full break], From, To, Sort
    const filterContainer = container.querySelector('.flex.flex-wrap.gap-3')
    expect(filterContainer).not.toBeNull()

    const children = Array.from(filterContainer!.children)
    const breakIndex = children.findIndex(
      (el) => el.classList.contains('w-full') && el.children.length === 0
    )
    expect(breakIndex).toBeGreaterThan(-1)

    // From DatePicker label must come after the break
    const fromLabel = screen.getByText('From')
    const fromWrapper = fromLabel.closest('.flex.flex-wrap.gap-3 > div')
    const fromIndex = children.indexOf(fromWrapper as Element)
    expect(fromIndex).toBeGreaterThan(breakIndex)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx --reporter=verbose
```

Expected: FAIL — `breakIndex` is `-1` because no `w-full` break exists yet.

- [ ] **Step 3: Insert the flex line-break in ActivityEventsPage.tsx**

In `src/pages/settings/administration/ActivityEventsPage.tsx`, find the Entity ID block (ends around line 306) and add the break immediately after it, before the From DatePicker:

```tsx
        <div className="w-52">
          <Input
            label="Entity ID"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="Filter by entity ID"
          />
        </div>
        <div className="w-full" />
        <div className="w-44">
          <DatePicker label="From" value={from} onChange={setFrom} showTime hourFormat="24" />
        </div>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx --reporter=verbose
```

Expected: PASS

- [ ] **Step 5: Run full test suite for regressions**

```bash
npx vitest run --reporter=verbose
```

Expected: all previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/ActivityEventsPage.tsx src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx
git commit -m "EPMCDME-13606: Move From date filter to second row next to To field"
```

---

## Test-first summary

| Task | Test-first | Failing test description |
|---|---|---|
| Task 1 | yes | `breakIndex` is `-1` — no `w-full` break between Entity ID and From |
