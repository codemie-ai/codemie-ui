# EPMCDME-8477: Fix Semantic Headings on Assistants Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the count heading element in `AssistantGrid` from a non-semantic `<div>` to a semantic `<h2>` so that "N ASSISTANTS" / "N TEMPLATES" headings are programmatically determined as heading level 2 (WCAG 2.1 AA).

**Architecture:** Single display-layer change in `AssistantGrid.tsx` — the one component that renders the count heading for all three affected tab views (Project Assistants, Marketplace, Templates). A new unit test describe-block is added to the existing test file using a `vi.mock` for `AssistantCard` to isolate heading assertions.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, React Testing Library

## Global Constraints

- WCAG 2.1 AA — heading level must be `<h2>` (ticket explicitly specifies "heading level 2")
- Tailwind classes on the element must not change
- `WorkflowTemplates.tsx` is explicitly OUT OF SCOPE
- Quality gates: `npm run lint`, `npm run typecheck`, `npm run test:unit` must all pass

---

### Task 1: Add failing tests then implement the `<h2>` fix

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`
- Modify: `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx:65-69`

**Interfaces:**
- Consumes: `AssistantGrid` component from `../AssistantGrid`
- Produces: `AssistantGrid` renders `{totalCountInfo}` inside `<h2>` instead of `<div>` when `totalCount > 0` and assistants list is non-empty

- [ ] **Step 1: Write failing tests**

Replace the full content of `src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx` with:

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
import { describe, it, expect, vi } from 'vitest'

import type { Assistant, AssistantTemplate } from '@/types/entity/assistant'
import AssistantGrid from '../AssistantGrid'

vi.mock('@/pages/assistants/components/AssistantList/AssistantCard', () => ({
  default: () => <div data-testid="assistant-card" />,
}))

const baseProps = {
  assistants: [],
  assistantTemplates: [],
  user: null,
  showAssistant: vi.fn(),
  reloadAssistants: vi.fn(),
  totalCount: 0,
}

const stubAssistant = { id: '1', slug: 'a' } as unknown as Assistant
const stubTemplate = { id: '2', slug: 'b' } as unknown as AssistantTemplate

describe('AssistantGrid empty state', () => {
  it('shows "No assistants found." when isTemplate is false and the list is empty', () => {
    render(<AssistantGrid {...baseProps} isTemplate={false} />)
    expect(screen.getByText('No assistants found.')).toBeInTheDocument()
    expect(screen.queryByText('No templates found.')).toBeNull()
  })

  it('shows "No templates found." when isTemplate is true and the list is empty', () => {
    render(<AssistantGrid {...baseProps} isTemplate />)
    expect(screen.getByText('No templates found.')).toBeInTheDocument()
    expect(screen.queryByText('No assistants found.')).toBeNull()
  })
})

describe('AssistantGrid count heading', () => {
  it('renders the assistant count as a level-2 heading (plural)', () => {
    render(
      <AssistantGrid
        {...baseProps}
        assistants={[stubAssistant]}
        totalCount={5}
        isTemplate={false}
      />
    )
    expect(
      screen.getByRole('heading', { name: '5 ASSISTANTS', level: 2 })
    ).toBeInTheDocument()
  })

  it('renders the singular assistant count as a level-2 heading', () => {
    render(
      <AssistantGrid
        {...baseProps}
        assistants={[stubAssistant]}
        totalCount={1}
        isTemplate={false}
      />
    )
    expect(
      screen.getByRole('heading', { name: '1 ASSISTANT', level: 2 })
    ).toBeInTheDocument()
  })

  it('renders the template count as a level-2 heading', () => {
    render(
      <AssistantGrid
        {...baseProps}
        assistantTemplates={[stubTemplate]}
        totalCount={3}
        isTemplate
      />
    )
    expect(
      screen.getByRole('heading', { name: '3 TEMPLATES', level: 2 })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (RED)**

```bash
npm run test:unit -- AssistantGrid
```

Expected: 3 new tests fail with:
```
Unable to find an accessible element with the role "heading"
```
The 2 existing empty-state tests should still pass.

- [ ] **Step 3: Change `<div>` to `<h2>` in AssistantGrid.tsx**

In `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx`, replace lines 65-69:

```tsx
// Before
{totalCount && (
  <div className="flex-row px-1 w-full text-xs text-text-quaternary font-semibold pb-4 pt-6 bg-surface-base-primary">
    {totalCountInfo}
  </div>
)}

// After
{totalCount && (
  <h2 className="flex-row px-1 w-full text-xs text-text-quaternary font-semibold pb-4 pt-6 bg-surface-base-primary">
    {totalCountInfo}
  </h2>
)}
```

- [ ] **Step 4: Run tests to verify they pass (GREEN)**

```bash
npm run test:unit -- AssistantGrid
```

Expected: All 5 tests pass (2 empty-state + 3 count-heading).

- [ ] **Step 5: Run full quality gates**

```bash
npm run lint && npm run typecheck && npm run test:unit
```

Expected: All pass with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx
git add src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx
git commit -m "EPMCDME-8477: Mark assistant count headings as semantic h2"
```
