# Templates Empty-State Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (run inline in the current conversation per `sdlc-task` Stage 3 — do NOT dispatch a subagent). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Templates-tab empty state read "No templates found." instead of the generic "No assistants found.", with zero change to any other Assistants tab.

**Architecture:** `AssistantGrid` already receives an `isTemplate` boolean prop (used one line above the empty-state branch to build `totalCountInfo`). Extend that same signal to the empty-state `<h2>` text via a ternary.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react.

## Global Constraints

- Commit message format: `EPMCDME-13268: Capital sentence` (enforced by CI regex in `.ai-run/guides/standards/git-workflow.md`).
- No i18n framework in this codebase — empty-state copy is a hardcoded JSX string literal, matching existing convention (e.g. `MCPEmptyState.tsx`).
- No new props, no new shared abstraction (message-lookup map / subcomponent) — spec explicitly rejects this as unnecessary (YAGNI).
- Must not change rendered output for `isTemplate=false` (Project Assistants, Marketplace, Favorites tabs).

---

### Task 1: Context-specific empty-state message in AssistantGrid

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx:57-63`
- Create: `src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`

**Interfaces:**
- Consumes: `AssistantGrid`'s existing `AssistantGridProps` (`assistants`, `user`, `showAssistant`, `exportAssistant?`, `isTemplate?`, `assistantTemplates`, `reloadAssistants`, `totalCount`) — no signature change.
- Produces: no new exports; behavior change only in the empty-state render branch.

**Test-first:** yes — "renders 'No templates found.' when isTemplate=true and the template list is empty; still renders 'No assistants found.' when isTemplate=false and the list is empty"

- [ ] **Step 1: Write the failing test**

Create `src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`:

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

import AssistantGrid from '../AssistantGrid'

const baseProps = {
  assistants: [],
  assistantTemplates: [],
  user: null,
  showAssistant: vi.fn(),
  reloadAssistants: vi.fn(),
  totalCount: 0,
}

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
```

- [ ] **Step 2: Run the test to verify the "isTemplate" case fails**

Run: `npx vitest run src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`
Expected: first test (`isTemplate=false`) PASSes against current code; second test (`isTemplate=true`) FAILs — `getByText('No templates found.')` throws `Unable to find an element with the text: No templates found.` because the component still renders "No assistants found." unconditionally.

- [ ] **Step 3: Implement the minimal fix**

In `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx`, replace the current empty-state branch:

```tsx
  if (assistantList.length === 0) {
    return (
      <>
        <div className="flex justify-center m-40">
          <h2>No assistants found.</h2>
        </div>
      </>
    )
  }
```

with:

```tsx
  if (assistantList.length === 0) {
    return (
      <div className="flex justify-center m-40">
        <h2>{isTemplate ? 'No templates found.' : 'No assistants found.'}</h2>
      </div>
    )
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`
Expected: both tests PASS.

- [ ] **Step 5: Verify no regression in the existing integration test**

Run: `npx vitest run src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx`
Expected: PASS, including `shows empty state when no assistants found` (PROJECT/ALL tab, `isTemplate=false`), unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx
git commit -m "EPMCDME-13268: Show templates-specific empty-state message on Templates tab"
```
