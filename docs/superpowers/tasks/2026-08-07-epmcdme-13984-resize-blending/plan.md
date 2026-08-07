# Chat Input Resize Handle Dark Theme Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the horizontal chat input resize handle pill visible in dark theme by replacing border-subtle token classes with explicit black/white opacity overrides.

**Architecture:** Single className change on the pill `<div>` inside `ChatResizableSeparator`, aligning it with the identical pattern already used in `ChatConfigResizableSeparator`.

**Tech Stack:** React, Tailwind CSS, tailwindcss-themer (`[.codemieDark_&]` variant), react-resizable-panels, Vitest + React Testing Library

---

### Task 1: Write and run a failing test

**Files:**
- Create: `src/pages/chat/components/__tests__/ChatResizableSeparator.test.tsx`

- [ ] **Step 1: Write the failing test**

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

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import ChatResizableSeparator from '../ChatResizableSeparator'

vi.mock('react-resizable-panels', () => ({
  Separator: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className} {...rest}>
      {children}
    </div>
  ),
}))

describe('ChatResizableSeparator', () => {
  it('applies dark theme overrides on the pill', () => {
    const { container } = render(<ChatResizableSeparator />)
    const pill = container.querySelector('[aria-hidden="true"]') as HTMLElement

    expect(pill).toBeInTheDocument()
    expect(pill.className).toContain('[.codemieDark_&]:bg-white/25')
    expect(pill.className).toContain('[.codemieDark_&]:group-hover:bg-white/50')
    expect(pill.className).toContain('[.codemieDark_&]:group-focus-visible:bg-white/65')
    expect(pill.className).toContain('[.codemieDark_&]:group-focus-visible:ring-white/50')
  })

  it('retains light theme base classes on the pill', () => {
    const { container } = render(<ChatResizableSeparator />)
    const pill = container.querySelector('[aria-hidden="true"]') as HTMLElement

    expect(pill.className).toContain('bg-black/20')
    expect(pill.className).toContain('group-hover:bg-black/45')
    expect(pill.className).toContain('group-focus-visible:bg-black/60')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/pages/chat/components/__tests__/ChatResizableSeparator.test.tsx
```

Expected: FAIL — assertions on `[.codemieDark_&]:bg-white/25` and `bg-black/20` fail because current code uses `bg-border-subtle/40`.

---

### Task 2: Fix the className and verify green

**Files:**
- Modify: `src/pages/chat/components/ChatResizableSeparator.tsx:31`

- [ ] **Step 1: Replace the pill className**

In `ChatResizableSeparator.tsx`, replace the entire `className` value on the `<div aria-hidden="true">` (line 31) with:

```tsx
className="w-10 h-1 rounded-full bg-black/20 [.codemieDark_&]:bg-white/25 pointer-events-none transition-all duration-150 group-hover:bg-black/45 [.codemieDark_&]:group-hover:bg-white/50 group-hover:w-12 group-focus-visible:bg-black/60 [.codemieDark_&]:group-focus-visible:bg-white/65 group-focus-visible:w-12 group-focus-visible:h-[3px] group-focus-visible:ring-2 group-focus-visible:ring-black/30 [.codemieDark_&]:group-focus-visible:ring-white/50"
```

The full updated component should be:

```tsx
const ChatResizableSeparator = () => (
  <Separator
    aria-label="Resize chat prompt area"
    aria-controls="chat-history chat-prompt"
    aria-orientation="horizontal"
    className="relative h-4 -my-2 bg-transparent !cursor-[ns-resize] !outline-none z-[1] flex items-center justify-center group"
  >
    {/* Decorative pill — focus ring appears here so the indicator is visible */}
    <div
      aria-hidden="true"
      className="w-10 h-1 rounded-full bg-black/20 [.codemieDark_&]:bg-white/25 pointer-events-none transition-all duration-150 group-hover:bg-black/45 [.codemieDark_&]:group-hover:bg-white/50 group-hover:w-12 group-focus-visible:bg-black/60 [.codemieDark_&]:group-focus-visible:bg-white/65 group-focus-visible:w-12 group-focus-visible:h-[3px] group-focus-visible:ring-2 group-focus-visible:ring-black/30 [.codemieDark_&]:group-focus-visible:ring-white/50"
    />
  </Separator>
)
```

- [ ] **Step 2: Run the new tests to verify they pass**

```bash
npx vitest run src/pages/chat/components/__tests__/ChatResizableSeparator.test.tsx
```

Expected: PASS (both tests green).

- [ ] **Step 3: Run the existing resize test to confirm no regression**

```bash
npx vitest run src/pages/chat/__tests__/ChatPage.resize.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/chat/components/ChatResizableSeparator.tsx \
        src/pages/chat/components/__tests__/ChatResizableSeparator.test.tsx
git commit -m "EPMCDME-13984: Fix resize handle pill visibility in dark theme"
```
