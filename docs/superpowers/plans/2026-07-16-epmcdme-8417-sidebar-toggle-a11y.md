# EPMCDME-8417 Sidebar Toggle Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `SidebarToggle` button so screen readers announce its name and state changes correctly.

**Architecture:** Replace `subscribe`+`useState` in `SidebarToggle.tsx` with `useSnapshot` (the idiomatic valtio pattern used by `NavigationExpandButton`) so React re-renders reliably when store state changes, then add the missing `aria-expanded` attribute. Add a test file modelled on `NavigationExpandButton.test.tsx`.

**Tech Stack:** React, TypeScript, Valtio (`useSnapshot`), Vitest, @testing-library/react

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/components/Sidebar/SidebarToggle.tsx` | Modify | Swap subscribe+useState → useSnapshot; add aria-expanded; fix useEffect deps |
| `src/components/Sidebar/__tests__/SidebarToggle.test.tsx` | Create | Unit tests for aria-label, aria-expanded, click, icon rotation |

---

### Task 1: Write failing tests for SidebarToggle

**Test-first: yes** — tests for `aria-expanded` will fail (attribute absent), verifying we caught the gap before fixing it.

**Files:**
- Create: `src/components/Sidebar/__tests__/SidebarToggle.test.tsx`

- [ ] **Step 1: Create the test file**

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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SidebarToggle from '../SidebarToggle'

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      sidebarExpanded: true,
      toggleSidebar: vi.fn(),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/hooks/useSidebarOffsetClass', () => ({
  useSidebarOffsetClass: vi.fn(() => 'left-navbar'),
}))

vi.mock('@/assets/icons/chevron-left.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-icon" {...props} />,
}))

describe('SidebarToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.sidebarExpanded = true
    mockAppInfoStore.toggleSidebar = vi.fn()
  })

  it('renders without crashing', () => {
    const { container } = render(<SidebarToggle />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders as a button element with type="button"', () => {
    render(<SidebarToggle />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('type', 'button')
  })

  it('renders the chevron icon', () => {
    render(<SidebarToggle />)
    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
  })

  it('has aria-label "Hide Sidebar" when expanded', () => {
    mockAppInfoStore.sidebarExpanded = true
    render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Hide Sidebar')
  })

  it('has aria-label "Open Sidebar" when collapsed', () => {
    mockAppInfoStore.sidebarExpanded = false
    render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Open Sidebar')
  })

  it('has aria-expanded true when expanded', () => {
    mockAppInfoStore.sidebarExpanded = true
    render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('has aria-expanded false when collapsed', () => {
    mockAppInfoStore.sidebarExpanded = false
    render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not rotate icon when sidebar is expanded', () => {
    mockAppInfoStore.sidebarExpanded = true
    render(<SidebarToggle />)
    expect(screen.getByTestId('chevron-icon')).not.toHaveClass('rotate-180')
  })

  it('rotates icon when sidebar is collapsed', () => {
    mockAppInfoStore.sidebarExpanded = false
    render(<SidebarToggle />)
    expect(screen.getByTestId('chevron-icon')).toHaveClass('rotate-180')
  })

  it('calls toggleSidebar when button is clicked', () => {
    render(<SidebarToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockAppInfoStore.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('updates aria-label from "Hide Sidebar" to "Open Sidebar" on state change', () => {
    mockAppInfoStore.sidebarExpanded = true
    const { rerender } = render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Hide Sidebar')

    mockAppInfoStore.sidebarExpanded = false
    rerender(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Open Sidebar')
  })

  it('updates aria-label from "Open Sidebar" to "Hide Sidebar" on state change', () => {
    mockAppInfoStore.sidebarExpanded = false
    const { rerender } = render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Open Sidebar')

    mockAppInfoStore.sidebarExpanded = true
    rerender(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Hide Sidebar')
  })

  it('updates aria-expanded on state change', () => {
    mockAppInfoStore.sidebarExpanded = true
    const { rerender } = render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')

    mockAppInfoStore.sidebarExpanded = false
    rerender(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/components/Sidebar/__tests__/SidebarToggle.test.tsx
```

Expected: tests for `aria-expanded` fail (`Expected the element to have attribute: aria-expanded`). `aria-label` tests pass (attribute already exists). This confirms the gap is caught before the fix.

---

### Task 2: Fix SidebarToggle.tsx

**Test-first: yes** — tests already written in Task 1; now implement the minimal changes to make them all pass.

**Files:**
- Modify: `src/components/Sidebar/SidebarToggle.tsx`

- [ ] **Step 1: Replace subscribe+useState with useSnapshot and add aria-expanded**

Replace the entire file content with:

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

import { classNames } from 'primereact/utils'
import { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import ChevronLeftSvg from '@/assets/icons/chevron-left.svg?react'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { appInfoStore } from '@/store/appInfo'

const SidebarToggle = () => {
  const { sidebarExpanded: isOpen } = useSnapshot(appInfoStore)
  const SHORTCUT_TRIGGER = 'KeyB'

  useEffect(() => {
    const handleKeydown = (event) => {
      const isCtrlPressed = event.ctrlKey || event.metaKey
      const isBKey = event.code === SHORTCUT_TRIGGER

      if (isCtrlPressed && isBKey) {
        event.preventDefault()
        appInfoStore.toggleSidebar()
      }
    }

    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [])

  const sidebarOffsetClass = useSidebarOffsetClass()

  const toggle = () => {
    appInfoStore.toggleSidebar()
  }

  return (
    sidebarOffsetClass && (
      <button
        type="button"
        aria-label={isOpen ? 'Hide Sidebar' : 'Open Sidebar'}
        aria-expanded={isOpen}
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Toggle Sidebar (Ctrl + B)"
        data-tooltip-place="right"
        className={classNames(
          'bg-curve absolute left-0 top-[calc(50%-100px)] flex',
          'items-center justify-center cursor-pointer bg-surface-base-primary-border',
          'w-[24px] h-[128px] select-none bg-surface-specific-sidebar-toggle hover:bg-text-primary/15',
          'transition-all duration-150 z-10',
          sidebarOffsetClass
        )}
        onClick={toggle}
      >
        <ChevronLeftSvg
          aria-hidden="true"
          className={classNames('scale-[140%] mr-[3.5px]', {
            'rotate-180': !isOpen,
          })}
        />
      </button>
    )
  )
}

export default SidebarToggle
```

Key changes from original:
- `import { useState, useEffect }` → `import { useEffect }` (useState no longer needed)
- `import { subscribe }` removed
- `import { useSnapshot }` added
- `const [isOpen, setIsOpen] = useState<boolean>(appInfoStore.sidebarExpanded)` → `const { sidebarExpanded: isOpen } = useSnapshot(appInfoStore)`
- `subscribe(appInfoStore, () => { setIsOpen(appInfoStore.sidebarExpanded) })` — removed entirely
- `useEffect` dependency array: `[appInfoStore.sidebarExpanded]` → `[]`
- `<button>`: added `aria-expanded={isOpen}`

- [ ] **Step 2: Run the tests to verify all pass**

```bash
npm test -- src/components/Sidebar/__tests__/SidebarToggle.test.tsx
```

Expected: all 13 tests pass.

- [ ] **Step 3: Run the full test suite to verify no regressions**

```bash
npm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar/SidebarToggle.tsx src/components/Sidebar/__tests__/SidebarToggle.test.tsx
git commit -m "EPMCDME-8417: Fix sidebar toggle button accessibility"
```
