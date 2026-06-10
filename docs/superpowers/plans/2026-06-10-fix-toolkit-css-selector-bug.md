# Fix Toolkit CSS Selector Bug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix querySelectorAll crash when MCP tool names contain invalid CSS selector characters (spaces, `?`, etc.)

**Architecture:** Add `sanitizeHtmlId()` utility function to convert strings with special characters into valid HTML IDs, then use it in Toolkit.tsx before passing tool names to the Hint component.

**Tech Stack:** TypeScript, React, Vitest

---

## File Structure

**New Tests:**
- `src/utils/__tests__/utils.test.ts` - Test suite for sanitizeHtmlId function

**Modified Files:**
- `src/utils/utils.ts:254` - Add sanitizeHtmlId export after decodeFileName
- `src/pages/assistants/components/AssistantDetails/components/UserMapping/components/Toolkit.tsx:95` - Use sanitizeHtmlId for Hint id prop

---

### Task 1: Add sanitizeHtmlId utility function

**Test-first: yes** — Write failing test for sanitizeHtmlId, verify RED, implement minimal passing code, verify GREEN

**Files:**
- Create: `src/utils/__tests__/utils.test.ts`
- Modify: `src/utils/utils.ts:254`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/utils.test.ts`:

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

import { describe, it, expect } from 'vitest'

import { sanitizeHtmlId } from '@/utils/utils'

describe('sanitizeHtmlId', () => {
  it('should convert spaces to hyphens', () => {
    expect(sanitizeHtmlId('Fetch MCP Server')).toBe('hint-fetch-mcp-server')
  })

  it('should remove question marks and convert to hyphens', () => {
    expect(sanitizeHtmlId('Fetch ? MCP Server')).toBe('hint-fetch-mcp-server')
  })

  it('should handle EPAM Matching case from bug report', () => {
    expect(sanitizeHtmlId('EPAM Matching ? Relevance score')).toBe('hint-epam-matching-relevance-score')
  })

  it('should convert to lowercase', () => {
    expect(sanitizeHtmlId('UPPERCASE')).toBe('hint-uppercase')
  })

  it('should collapse consecutive hyphens', () => {
    expect(sanitizeHtmlId('multiple   spaces')).toBe('hint-multiple-spaces')
  })

  it('should trim leading and trailing hyphens', () => {
    expect(sanitizeHtmlId('?leading and trailing?')).toBe('hint-leading-and-trailing')
  })

  it('should handle simple names', () => {
    expect(sanitizeHtmlId('simple-name')).toBe('hint-simple-name')
  })

  it('should handle names with numbers', () => {
    expect(sanitizeHtmlId('Tool 123')).toBe('hint-tool-123')
  })

  it('should remove all invalid characters', () => {
    expect(sanitizeHtmlId('a@b#c$d%e')).toBe('hint-a-b-c-d-e')
  })

  it('should handle empty string', () => {
    expect(sanitizeHtmlId('')).toBe('hint')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/utils.test.ts`

Expected: FAIL with "sanitizeHtmlId is not exported from '@/utils/utils'" or similar

- [ ] **Step 3: Write minimal implementation**

Add to `src/utils/utils.ts` after line 254 (after `decodeFileName`):

```typescript
export const sanitizeHtmlId = (str: string): string => {
  return (
    'hint-' +
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace invalid chars with hyphens
      .replace(/-+/g, '-') // Collapse consecutive hyphens
      .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/__tests__/utils.test.ts`

Expected: PASS - all 10 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/utils.ts src/utils/__tests__/utils.test.ts
git commit -m "EPMCDME-12628: Add sanitizeHtmlId utility function

Add utility to convert strings with special characters into valid HTML IDs.
Converts spaces and invalid CSS selector chars to hyphens, collapses
consecutive hyphens, trims edges, and prefixes with 'hint-'.

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 2: Update Toolkit component to use sanitization

**Test-first: no** — This is a straightforward integration of the tested utility function

**Files:**
- Modify: `src/pages/assistants/components/AssistantDetails/components/UserMapping/components/Toolkit.tsx:16,95`

- [ ] **Step 1: Add import for sanitizeHtmlId**

In `src/pages/assistants/components/AssistantDetails/components/UserMapping/components/Toolkit.tsx`, add to existing imports around line 16:

```typescript
import { classNames as cn } from 'primereact/utils'
import React from 'react'

import Hint from '@/components/Hint'
import { sanitizeHtmlId } from '@/utils/utils'
```

- [ ] **Step 2: Update Hint component usage**

At line 95, change:

```typescript
<Hint
  id={tool.name}
  showDelay={0}
  position="right"
  hint={toolkitToolsDescriptions?.[tool.name] || tool.user_description}
/>
```

To:

```typescript
<Hint
  id={sanitizeHtmlId(tool.name)}
  showDelay={0}
  position="right"
  hint={toolkitToolsDescriptions?.[tool.name] || tool.user_description}
/>
```

- [ ] **Step 3: Build to verify no TypeScript errors**

Run: `npm run build`

Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/assistants/components/AssistantDetails/components/UserMapping/components/Toolkit.tsx
git commit -m "EPMCDME-12628: Use sanitizeHtmlId for Hint IDs in Toolkit

Sanitize tool.name before passing to Hint component to prevent
querySelectorAll crash when tool names contain spaces or special
characters like '?'.

Fixes: EPMCDME-12628

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 3: Manual verification testing

**Test-first: n/a** — Manual QA verification

**Files:**
- None (manual testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

Wait for server to start on http://localhost:5173

- [ ] **Step 2: Navigate to Assistant Details page**

1. Open browser to http://localhost:5173
2. Navigate to Assistants page
3. Click on a published assistant that has MCP tools with special characters in their names (e.g., "Fetch ? MCP Server")

Expected: Page loads without errors

- [ ] **Step 3: Verify no console errors**

1. Open browser DevTools Console (F12)
2. Check for any errors related to querySelectorAll or CSS selectors

Expected: No "Failed to execute 'querySelectorAll'" errors

- [ ] **Step 4: Verify Hint tooltips work**

1. In the "Your Integration Settings" section, find a tool with a hint icon
2. Hover over the info icon

Expected: Tooltip displays correctly

- [ ] **Step 5: Inspect sanitized IDs in DOM**

1. Open browser DevTools Elements tab
2. Find a Hint component's div element
3. Check the `id` attribute

Expected: IDs follow pattern `hint-fetch-mcp-server` (readable, lowercase, hyphenated)

- [ ] **Step 6: Document verification results**

Create a comment noting:
- Browser and version tested
- Whether error was reproduced before fix
- Whether error is resolved after fix
- Whether tooltips still work correctly

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Add sanitizeHtmlId function to utils.ts (Task 1)
- ✅ Use it in Toolkit.tsx line 95 (Task 2)
- ✅ Manual verification of fix (Task 3)

**Placeholder scan:**
- ✅ No TBD, TODO, or "implement later"
- ✅ No "add appropriate error handling" without specifics
- ✅ No "write tests for above" without actual test code

**Type consistency:**
- ✅ sanitizeHtmlId signature consistent: `(str: string): string`
- ✅ Usage matches signature in Toolkit.tsx

**Test coverage:**
- ✅ Task 1 includes comprehensive unit tests for sanitizeHtmlId
- ✅ Task 2 verified with build check
- ✅ Task 3 provides manual QA verification steps
