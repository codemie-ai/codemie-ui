# Fix ARIA Roles in Tabs Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add missing ARIA attributes (`role="tablist"` and `aria-selected`) to the shared Tabs component so it meets the WAI-ARIA tabs pattern.

**Architecture:** Two one-line attribute additions in existing component files, covered by a new unit test file. No new props or logic required — `isActive` is already passed to `Tab.tsx`.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react, @testing-library/user-event

## Global Constraints

- Test runner: `npm run test:unit` (vitest, unit project)
- No new props added to any component — use existing `isActive`
- Follow existing test file conventions: `@testing-library/react` + `vitest` imports, `describe`/`it` blocks, no default mocks unless required

---

### Task 1: Add ARIA tests (RED)

**Files:**
- Create: `src/components/Tabs/__tests__/Tabs.test.tsx`

**Interfaces:**
- Consumes: `Tabs` default export from `../Tabs`, `Tab` interface from `../Tabs`
- Produces: four failing tests that will pass after Task 2

**Test-first: yes — four assertions covering tablist role, aria-selected=true on active tab, aria-selected=false on inactive tabs, aria-selected update on click**

- [ ] **Step 1: Write the test file**

```tsx
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
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import Tabs, { Tab } from '../Tabs'

const tabs: Tab[] = [
  { id: 'first', label: 'First', element: <div>First content</div> },
  { id: 'second', label: 'Second', element: <div>Second content</div> },
  { id: 'third', label: 'Third', element: <div>Third content</div> },
]

describe('Tabs ARIA', () => {
  it('renders the tab list container with role="tablist"', () => {
    render(<Tabs tabs={tabs} activeTab="first" />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('marks the active tab with aria-selected="true"', () => {
    render(<Tabs tabs={tabs} activeTab="second" />)
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true')
  })

  it('marks inactive tabs with aria-selected="false"', () => {
    render(<Tabs tabs={tabs} activeTab="second" />)
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Third' })).toHaveAttribute('aria-selected', 'false')
  })

  it('updates aria-selected when switching tabs (uncontrolled)', async () => {
    const user = userEvent.setup()
    render(<Tabs tabs={tabs} />)

    const firstTab = screen.getByRole('tab', { name: 'First' })
    const secondTab = screen.getByRole('tab', { name: 'Second' })

    expect(firstTab).toHaveAttribute('aria-selected', 'true')
    expect(secondTab).toHaveAttribute('aria-selected', 'false')

    await user.click(secondTab)

    expect(firstTab).toHaveAttribute('aria-selected', 'false')
    expect(secondTab).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Step 2: Run tests to confirm RED**

```bash
npm run test:unit -- src/components/Tabs/__tests__/Tabs.test.tsx
```

Expected: 4 failures — `Unable to find role="tablist"` and `aria-selected` attribute not found.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/components/Tabs/__tests__/Tabs.test.tsx
git commit -m "EPMCDME-8526: Add failing ARIA tests for Tabs component"
```

---

### Task 2: Implement the ARIA attributes (GREEN)

**Files:**
- Modify: `src/components/Tabs/Tabs.tsx:71` — add `role="tablist"` to the container `<div>`
- Modify: `src/components/Tabs/Tab.tsx:38` — add `aria-selected={isActive}` to the `<button>`

**Interfaces:**
- Consumes: `isActive: boolean` prop already present on `TabsButton`
- Produces: nothing new — attribute additions only

**Test-first: no — tests written in Task 1**

- [ ] **Step 1: Add `role="tablist"` to the tab-list container in `Tabs.tsx`**

In `src/components/Tabs/Tabs.tsx`, change the inner `<div>` at line 71 from:

```tsx
        <div
          className={cn(
            'flex items-stretch border-b border-border-specific-panel-outline mb-4',
            headerClassName
          )}
        >
```

to:

```tsx
        <div
          role="tablist"
          className={cn(
            'flex items-stretch border-b border-border-specific-panel-outline mb-4',
            headerClassName
          )}
        >
```

- [ ] **Step 2: Add `aria-selected` to the tab button in `Tab.tsx`**

In `src/components/Tabs/Tab.tsx`, change the `<button>` at line 37 from:

```tsx
  <button
    role="tab"
    type="button"
    key={tab.id}
    onClick={() => handleClick(tab.id)}
```

to:

```tsx
  <button
    role="tab"
    type="button"
    aria-selected={isActive}
    key={tab.id}
    onClick={() => handleClick(tab.id)}
```

- [ ] **Step 3: Run tests to confirm GREEN**

```bash
npm run test:unit -- src/components/Tabs/__tests__/Tabs.test.tsx
```

Expected: 4 tests pass, no warnings.

- [ ] **Step 4: Run full unit suite to confirm no regressions**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/components/Tabs/Tabs.tsx src/components/Tabs/Tab.tsx
git commit -m "EPMCDME-8526: Fix ARIA roles in Tabs component"
```
