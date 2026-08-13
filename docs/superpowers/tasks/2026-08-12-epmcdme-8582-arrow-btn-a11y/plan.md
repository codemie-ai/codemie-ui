# EPMCDME-8582 Arrow Button Keyboard Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw SVG `onClick` handlers and `<div onClick>` patterns with proper `<button>` elements carrying `aria-label`, `aria-expanded`, and `type="button"` attributes so all arrow/chevron interactive controls are reachable by keyboard.

**Architecture:** Four independent presentational fixes following the same established pattern (see `SidebarToggle.tsx`, `Pagination.tsx`, `ThoughtHeader.tsx`). No state, API, or routing changes. Tests first (RED), then fix (GREEN), then commit.

**Tech Stack:** React, TypeScript, Vitest 1.6.1, @testing-library/react, jsdom

---

## File Structure

| Action | Path |
|---|---|
| Create test | `src/pages/chat/components/ChatHistory/__tests__/ChatHistoryControls.test.tsx` |
| Modify source | `src/pages/chat/components/ChatHistory/ChatHistoryControls.tsx` |
| Create test | `src/pages/workflows/editor/configPanels/components/__tests__/MappingRow.test.tsx` |
| Modify source | `src/pages/workflows/editor/configPanels/components/MappingRow.tsx` |
| Modify test | `src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` (add describe block) |
| Modify source | `src/pages/workflows/editor/ConfigPanel.tsx` |
| Create test | `src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx` |
| Modify source | `src/pages/settings/administration/components/ConfigSection.tsx` |

---

### Task 1: ChatHistoryControls — keyboard-accessible version navigation

**Test-first: yes — `renders Previous version as a button with correct aria-label`**

**Files:**
- Create: `src/pages/chat/components/ChatHistory/__tests__/ChatHistoryControls.test.tsx`
- Modify: `src/pages/chat/components/ChatHistory/ChatHistoryControls.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/pages/chat/components/ChatHistory/__tests__/ChatHistoryControls.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ChatHistoryControls from '../ChatHistoryControls'

vi.mock('@/assets/icons/chevron-left.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-left-icon" {...props} />,
}))
vi.mock('@/assets/icons/chevron-right.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-right-icon" {...props} />,
}))

describe('ChatHistoryControls', () => {
  const defaultProps = {
    messageIndex: 1,
    totalMessages: 3,
    onChangeMessageIndex: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders Previous version as a button with type="button"', () => {
    render(<ChatHistoryControls {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /previous version/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('renders Next version as a button with type="button"', () => {
    render(<ChatHistoryControls {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /next version/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('Previous version button is disabled at first index', () => {
    render(<ChatHistoryControls {...defaultProps} messageIndex={0} />)
    expect(screen.getByRole('button', { name: /previous version/i })).toBeDisabled()
  })

  it('Next version button is disabled at last index', () => {
    render(<ChatHistoryControls {...defaultProps} messageIndex={2} />)
    expect(screen.getByRole('button', { name: /next version/i })).toBeDisabled()
  })

  it('Previous version button is enabled when not at first index', () => {
    render(<ChatHistoryControls {...defaultProps} messageIndex={1} />)
    expect(screen.getByRole('button', { name: /previous version/i })).not.toBeDisabled()
  })

  it('Next version button is enabled when not at last index', () => {
    render(<ChatHistoryControls {...defaultProps} messageIndex={1} />)
    expect(screen.getByRole('button', { name: /next version/i })).not.toBeDisabled()
  })

  it('clicking Previous version calls onChangeMessageIndex with index - 1', () => {
    const onChangeMessageIndex = vi.fn()
    render(<ChatHistoryControls {...defaultProps} messageIndex={1} onChangeMessageIndex={onChangeMessageIndex} />)
    fireEvent.click(screen.getByRole('button', { name: /previous version/i }))
    expect(onChangeMessageIndex).toHaveBeenCalledWith(0)
  })

  it('clicking Next version calls onChangeMessageIndex with index + 1', () => {
    const onChangeMessageIndex = vi.fn()
    render(<ChatHistoryControls {...defaultProps} messageIndex={1} onChangeMessageIndex={onChangeMessageIndex} />)
    fireEvent.click(screen.getByRole('button', { name: /next version/i }))
    expect(onChangeMessageIndex).toHaveBeenCalledWith(2)
  })

  it('chevron icons have aria-hidden="true"', () => {
    render(<ChatHistoryControls {...defaultProps} />)
    expect(screen.getByTestId('chevron-left-icon')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('chevron-right-icon')).toHaveAttribute('aria-hidden', 'true')
  })

  it('returns null when totalMessages <= 1', () => {
    const { container } = render(
      <ChatHistoryControls {...defaultProps} totalMessages={1} messageIndex={0} />
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect RED**

```bash
npx vitest run src/pages/chat/components/ChatHistory/__tests__/ChatHistoryControls.test.tsx
```

Expected failure: `Unable to find an accessible element with the role "button" and name /previous version/i`

- [ ] **Step 3: Fix ChatHistoryControls.tsx — replace raw SVGs with buttons**

Replace the `return` block (lines 50–68) with:

```tsx
  return (
    <div className="flex items-center ml-auto select-none text-xs text-text-quaternary">
      <button
        type="button"
        aria-label="Previous version"
        disabled={isFirstIndex}
        onClick={setPrevIndex}
        className="mr-2"
      >
        <ChevronLeftSvg aria-hidden="true" className="w-3 hover:opacity-100" />
      </button>
      {messageIndex + 1} / {totalMessages}
      <button
        type="button"
        aria-label="Next version"
        disabled={isLastIndex}
        onClick={setNextIndex}
        className="ml-2"
      >
        <ChevronRightSvg aria-hidden="true" className="w-3 hover:opacity-100" />
      </button>
    </div>
  )
```

Also remove the `cn` import if it is no longer used after this change (the `cn` call on the SVG className is gone).

- [ ] **Step 4: Run test — expect GREEN**

```bash
npx vitest run src/pages/chat/components/ChatHistory/__tests__/ChatHistoryControls.test.tsx
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatHistory/ChatHistoryControls.tsx \
        src/pages/chat/components/ChatHistory/__tests__/ChatHistoryControls.test.tsx
git commit -m "EPMCDME-8582: Fix arrow button keyboard accessibility in ChatHistoryControls"
```

---

### Task 2: MappingRow — keyboard-accessible expand/collapse toggle

**Test-first: yes — `renders the toggle as a button with type="button"`**

**Files:**
- Create: `src/pages/workflows/editor/configPanels/components/__tests__/MappingRow.test.tsx`
- Modify: `src/pages/workflows/editor/configPanels/components/MappingRow.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/pages/workflows/editor/configPanels/components/__tests__/MappingRow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'
import { TransformMappingType } from '@/types/workflowEditor/configuration'

import MappingRow from '../MappingRow'

vi.mock('@/assets/icons/chevron-up.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-up-icon" {...props} />,
}))
vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: (props: any) => <svg data-testid="delete-icon" {...props} />,
}))
vi.mock('@/components/form/Input', () => ({ default: () => null }))
vi.mock('@/components/form/Select', () => ({ default: () => null }))
vi.mock('@/components/form/Textarea', () => ({ default: () => null }))

const workflowContext = {
  selectedStateId: null,
  issues: null,
  activeIssue: null,
  setActiveIssue: vi.fn(),
  getIssueField: vi.fn(() => null),
  getToolIssue: vi.fn(),
  getMcpIssue: vi.fn(),
  goToField: vi.fn(),
  isIssueResolved: vi.fn(() => false),
  isIssueDirty: vi.fn(() => false),
  markIssueDirty: vi.fn(),
  clearAllDirtyIssues: vi.fn(),
  clearAllDirtyMcpIssues: vi.fn(),
  resolveAllDirtyIssues: vi.fn(),
  removeArrayIssue: vi.fn(),
  tempIssues: null,
  setIssues: vi.fn(),
  setTempIssues: vi.fn(),
}

const defaultMapping = { output_field: 'result', type: TransformMappingType.EXTRACT }

const renderMappingRow = (propsOverride: any = {}) => {
  const props = {
    mapping: defaultMapping,
    index: 0,
    isExpanded: false,
    onToggle: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    invalid: false,
    ...propsOverride,
  }
  return render(
    <WorkflowContext.Provider value={workflowContext as any}>
      <MappingRow {...props} />
    </WorkflowContext.Provider>
  )
}

describe('MappingRow — toggle button accessibility', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the toggle as a button with type="button"', () => {
    renderMappingRow()
    const btn = screen.getByRole('button', { name: /toggle result/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('toggle button has aria-expanded="false" when collapsed', () => {
    renderMappingRow({ isExpanded: false })
    expect(screen.getByRole('button', { name: /toggle result/i }))
      .toHaveAttribute('aria-expanded', 'false')
  })

  it('toggle button has aria-expanded="true" when expanded', () => {
    renderMappingRow({ isExpanded: true })
    expect(screen.getByRole('button', { name: /toggle result/i }))
      .toHaveAttribute('aria-expanded', 'true')
  })

  it('toggle button aria-label uses index fallback when output_field is empty', () => {
    renderMappingRow({
      mapping: { output_field: '', type: TransformMappingType.EXTRACT },
      index: 2,
    })
    expect(screen.getByRole('button', { name: /toggle mapping #3/i })).toBeInTheDocument()
  })

  it('clicking the toggle button calls onToggle', () => {
    const onToggle = vi.fn()
    renderMappingRow({ onToggle })
    fireEvent.click(screen.getByRole('button', { name: /toggle result/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('clicking the delete button calls onDelete and does NOT call onToggle', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    renderMappingRow({ onToggle, onDelete })
    fireEvent.click(screen.getByRole('button', { name: /delete mapping/i }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('chevron icon has aria-hidden="true"', () => {
    renderMappingRow()
    expect(screen.getByTestId('chevron-up-icon')).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 2: Run test — expect RED**

```bash
npx vitest run src/pages/workflows/editor/configPanels/components/__tests__/MappingRow.test.tsx
```

Expected failure: `Unable to find an accessible element with the role "button" and name /toggle result/i`

- [ ] **Step 3: Fix MappingRow.tsx — replace `<div onClick>` header with a `<button>`**

Replace the `{/* Header */}` block (the `<div // nosonar ...>` element and its contents, stopping before `{/* Expanded content */}`) with:

```tsx
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-surface-base-chat hover:bg-surface-elevated">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={`Toggle ${mapping.output_field || `Mapping #${index + 1}`}`}
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 cursor-pointer text-left bg-transparent p-0 border-0 min-w-0"
        >
          <ChevronUpSvg
            aria-hidden="true"
            className={cn('w-4 h-4 text-text-quaternary transition-transform shrink-0', {
              'transform rotate-180': !isExpanded,
            })}
          />
          <span className="text-sm font-medium text-text-primary flex-1 min-w-0">
            {mapping.output_field || `Mapping #${index + 1}`}
            <span className="ml-2 text-xs text-text-quaternary">
              ({MAPPING_TYPE_OPTIONS.find((o) => o.value === mapping.type)?.label ?? mapping.type})
            </span>
          </span>
        </button>
        <Button
          type={ButtonType.DELETE}
          size={ButtonSize.SMALL}
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          aria-label="Delete mapping"
        >
          <DeleteSvg className="w-4 h-4" />
        </Button>
      </div>
```

Note: the outer `<div>` loses `cursor-pointer` and `onClick`. The `// nosonar` comment is removed.

- [ ] **Step 4: Run test — expect GREEN**

```bash
npx vitest run src/pages/workflows/editor/configPanels/components/__tests__/MappingRow.test.tsx
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows/editor/configPanels/components/MappingRow.tsx \
        src/pages/workflows/editor/configPanels/components/__tests__/MappingRow.test.tsx
git commit -m "EPMCDME-8582: Fix arrow button keyboard accessibility in MappingRow"
```

---

### Task 3: ConfigPanel — wire collapse button onClick and aria-expanded

**Test-first: yes — `collapse button has aria-expanded="true" when panel is not collapsed`**

**Files:**
- Modify: `src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` (add describe block at end)
- Modify: `src/pages/workflows/editor/ConfigPanel.tsx`

- [ ] **Step 1: Add `screen` and `fireEvent` to the imports in ConfigPanel.test.tsx**

Change line 16:
```tsx
import { render, act } from '@testing-library/react'
```
to:
```tsx
import { render, act, screen, fireEvent } from '@testing-library/react'
```

- [ ] **Step 2: Add a new describe block at the end of ConfigPanel.test.tsx (after line 480)**

```tsx
describe('ConfigPanel — collapse/expand button accessibility', () => {
  beforeEach(() => vi.clearAllMocks())

  it('collapse button has aria-expanded="true" when panel is not collapsed', () => {
    const ref = createRef<ConfigPanelRef>()
    renderConfigPanel(ref, { isCollapsed: false })
    expect(screen.getByRole('button', { name: /collapse panel/i }))
      .toHaveAttribute('aria-expanded', 'true')
  })

  it('collapse button has aria-expanded="false" when panel is collapsed', () => {
    const ref = createRef<ConfigPanelRef>()
    renderConfigPanel(ref, { isCollapsed: true })
    expect(screen.getByRole('button', { name: /expand panel/i }))
      .toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking the collapse button calls onCollapsedChange with true', () => {
    const onCollapsedChange = vi.fn()
    const ref = createRef<ConfigPanelRef>()
    renderConfigPanel(ref, { isCollapsed: false, onCollapsedChange })
    fireEvent.click(screen.getByRole('button', { name: /collapse panel/i }))
    expect(onCollapsedChange).toHaveBeenCalledWith(true)
  })

  it('clicking the expand button calls onCollapsedChange with false', () => {
    const onCollapsedChange = vi.fn()
    const ref = createRef<ConfigPanelRef>()
    renderConfigPanel(ref, { isCollapsed: true, onCollapsedChange })
    fireEvent.click(screen.getByRole('button', { name: /expand panel/i }))
    expect(onCollapsedChange).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 3: Run the new tests — expect RED**

```bash
npx vitest run src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx
```

Expected failure (new tests only): `Unable to find an accessible element with the role "button" and name /collapse panel/i` OR the button exists but `aria-expanded` attribute is missing.

- [ ] **Step 4: Fix ConfigPanel.tsx — add `onClick` and `aria-expanded` to the collapse Button**

Find the `<Button>` with `aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}` (around line 567) and update it:

```tsx
            <Button
              type={ButtonType.TERTIARY}
              aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-expanded={!isCollapsed}
              onClick={toggleCollapsed}
              className="opacity-75"
            >
              <ChevronRightIconSvg
                aria-hidden="true"
                className={cn('w-4 h-4 transition-transform', {
                  'rotate-90': !isCollapsed,
                })}
              />
            </Button>
```

Two additions: `aria-expanded={!isCollapsed}`, `onClick={toggleCollapsed}`.
One addition: `aria-hidden="true"` on `ChevronRightIconSvg`.

- [ ] **Step 5: Run all ConfigPanel tests — expect GREEN**

```bash
npx vitest run src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx
```

Expected: all tests (existing + 4 new) pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/workflows/editor/ConfigPanel.tsx \
        src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx
git commit -m "EPMCDME-8582: Fix arrow button keyboard accessibility in ConfigPanel"
```

---

### Task 4: ConfigSection — add `type`, `aria-expanded`, and `aria-label` to existing button

**Test-first: yes — `button has type="button"`**

**Files:**
- Create: `src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx`
- Modify: `src/pages/settings/administration/components/ConfigSection.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import ConfigSection from '../ConfigSection'

vi.mock('@/assets/icons/chevron-down.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-down-icon" {...props} />,
}))

describe('ConfigSection — toggle button accessibility', () => {
  const defaultProps = {
    title: 'Profile',
    children: () => <div>content</div>,
  }

  it('button has type="button"', () => {
    render(<ConfigSection {...defaultProps} />)
    // defaultExpanded=true (default), so aria-label is "Collapse Profile"
    expect(screen.getByRole('button', { name: /collapse profile/i }))
      .toHaveAttribute('type', 'button')
  })

  it('button has aria-expanded="true" when expanded (default)', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={true} />)
    expect(screen.getByRole('button', { name: /collapse profile/i }))
      .toHaveAttribute('aria-expanded', 'true')
  })

  it('button has aria-expanded="false" when collapsed', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={false} />)
    expect(screen.getByRole('button', { name: /expand profile/i }))
      .toHaveAttribute('aria-expanded', 'false')
  })

  it('button aria-label is "Collapse {title}" when expanded', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={true} />)
    expect(screen.getByRole('button', { name: 'Collapse Profile' })).toBeInTheDocument()
  })

  it('button aria-label is "Expand {title}" when collapsed', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={false} />)
    expect(screen.getByRole('button', { name: 'Expand Profile' })).toBeInTheDocument()
  })

  it('clicking the button toggles aria-expanded from true to false', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={true} />)
    fireEvent.click(screen.getByRole('button', { name: /collapse profile/i }))
    expect(screen.getByRole('button', { name: /expand profile/i }))
      .toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking the button toggles aria-expanded from false to true', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={false} />)
    fireEvent.click(screen.getByRole('button', { name: /expand profile/i }))
    expect(screen.getByRole('button', { name: /collapse profile/i }))
      .toHaveAttribute('aria-expanded', 'true')
  })

  it('chevron icon has aria-hidden="true"', () => {
    render(<ConfigSection {...defaultProps} />)
    expect(screen.getByTestId('chevron-down-icon')).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 2: Run test — expect RED**

```bash
npx vitest run src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx
```

Expected failure: `Unable to find an accessible element with the role "button" and name /collapse profile/i` (the button has no `aria-label` yet, so the name comes only from child text, not matching the query).

- [ ] **Step 3: Fix ConfigSection.tsx — add `type`, `aria-expanded`, `aria-label`, and `aria-hidden` on chevron**

Replace lines 70–82 (the `<button>` element):

```tsx
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left group transition hover:opacity-85"
        >
          {icon && <span className="text-xl">{icon}</span>}
          <h3 className="font-bold text-text-quaternary">{title}</h3>
          <ChevronDownSvg
            aria-hidden="true"
            className={cn(
              'w-4 h-4 text-text-quaternary transition-transform ml-2 group-hover:opacity-85',
              isExpanded ? 'rotate-180' : ''
            )}
          />
        </button>
```

Three attribute additions: `type="button"`, `aria-expanded={isExpanded}`, `aria-label={...}`.
One addition: `aria-hidden="true"` on `ChevronDownSvg`.

- [ ] **Step 4: Run test — expect GREEN**

```bash
npx vitest run src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/components/ConfigSection.tsx \
        src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx
git commit -m "EPMCDME-8582: Fix arrow button keyboard accessibility in ConfigSection"
```

---

## Final verification

After all 4 tasks are committed, run the full test suite to confirm no regressions:

```bash
npm test
```

Expected: all tests pass. If any pre-existing test fails, investigate before proceeding to code review.
