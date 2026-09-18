# EPMCDME-8436: Fix Focus Order for Configuration Sidebar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make keyboard focus move into the Configuration sidebar when it opens, and return to the trigger button when it closes — fixing WCAG 2.4.3 Focus Order.

**Architecture:** Add `sidebarRef` (targeting `<aside tabIndex={-1}>`) + call `useFocusOnVisible(sidebarRef, isConfigVisible)` for open-focus; add `prevFocusRef` + one `useEffect` to capture `document.activeElement` on open and restore it on close. All changes in `ChatConfiguration.tsx` and its test file only.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react, `useFocusOnVisible` hook (`src/hooks/useFocusOnVisible.ts`).

---

## Files

| File | Action |
|---|---|
| `src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` | Modify — add refs, hook call, useEffect, tabIndex |
| `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx` | Modify — add 2 focus-order test cases |

---

### Task 1: Write failing focus-order tests

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx`

- [ ] **Step 1: Add `act` and `afterEach` to imports**

Open `ChatConfiguration.test.tsx`. The current first two import lines are:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
```

Replace them with:

```tsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
```

- [ ] **Step 2: Add a `describe('focus management')` block at the end of the file**

Append the following block after the closing `})` of the existing `describe('ChatConfiguration')` block (after the last `})` in the file):

```tsx
describe('focus management', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockChatContext.isConfigVisible = false
    mockChatContext.isConfigFormVisible = false
    mockChatsStore.currentChat = mockChat
    mockCanEdit.mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves focus to the sidebar panel when isConfigVisible transitions to true', () => {
    const { rerender } = render(
      <ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />
    )

    mockChatContext.isConfigVisible = true
    rerender(<ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByTestId('chat-configuration-panel')).toHaveFocus()
  })

  it('restores focus to the previously focused element when isConfigVisible transitions to false', () => {
    const triggerButton = document.createElement('button')
    document.body.appendChild(triggerButton)
    triggerButton.focus()

    mockChatContext.isConfigVisible = true
    const { rerender } = render(
      <ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />
    )

    act(() => {
      vi.advanceTimersByTime(100)
    })

    mockChatContext.isConfigVisible = false
    rerender(<ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(triggerButton).toHaveFocus()

    document.body.removeChild(triggerButton)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail (RED)**

```bash
npm run test:unit -- --reporter verbose "ChatConfiguration.test.tsx"
```

Expected: the two new tests in `focus management` fail. Existing tests still pass. The failure messages should say something like `toHaveFocus()` received element that does not have focus, or `tabIndex` is missing.

- [ ] **Step 4: Test-first: yes** — both tests are verified red before implementation.

---

### Task 2: Implement focus management in ChatConfiguration.tsx

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx`

- [ ] **Step 1: Add `useRef`, `useEffect`, and `useFocusOnVisible` to the imports**

Current import block (lines 16–28):

```tsx
import { FC } from 'react'
import { useSnapshot } from 'valtio'

import { useAssistantFeatures } from '@/pages/chat/hooks/useAssistantFeatures'
import { useChatContext } from '@/pages/chat/hooks/useChatContext'
import { chatsStore } from '@/store/chats'
```

Replace with:

```tsx
import { FC, useRef, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
import { useAssistantFeatures } from '@/pages/chat/hooks/useAssistantFeatures'
import { useChatContext } from '@/pages/chat/hooks/useChatContext'
import { chatsStore } from '@/store/chats'
```

- [ ] **Step 2: Add refs and hooks inside the component body**

Current component body starts at line 34:

```tsx
const ChatConfiguration: FC<ChatConfigurationProps> = ({ showNewIntegrationPopup }) => {
  const { isConfigVisible, isConfigFormVisible } = useChatContext()
  const { currentChat } = useSnapshot(chatsStore)
  const assistantFeatures = useAssistantFeatures(currentChat?.assistantData ?? [])

  return (
```

Replace with:

```tsx
const ChatConfiguration: FC<ChatConfigurationProps> = ({ showNewIntegrationPopup }) => {
  const { isConfigVisible, isConfigFormVisible } = useChatContext()
  const { currentChat } = useSnapshot(chatsStore)
  const assistantFeatures = useAssistantFeatures(currentChat?.assistantData ?? [])

  const sidebarRef = useRef<HTMLElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useFocusOnVisible(sidebarRef, isConfigVisible)

  useEffect(() => {
    if (isConfigVisible) {
      prevFocusRef.current = document.activeElement as HTMLElement
    } else {
      prevFocusRef.current?.focus()
    }
  }, [isConfigVisible])

  return (
```

- [ ] **Step 3: Add `ref` and `tabIndex={-1}` to the `<aside>` element**

Current `<aside>` opening tag (line 40):

```tsx
    <aside
      id="chat-configuration-panel"
      data-testid="chat-configuration-panel"
      className="flex flex-col h-full overflow-x-hidden bg-surface-base-sidebar shadow-surface-base-sidebar border-l border-border-specific-panel-outline"
    >
```

Replace with:

```tsx
    <aside
      ref={sidebarRef}
      tabIndex={-1}
      id="chat-configuration-panel"
      data-testid="chat-configuration-panel"
      className="flex flex-col h-full overflow-x-hidden bg-surface-base-sidebar shadow-surface-base-sidebar border-l border-border-specific-panel-outline"
    >
```

- [ ] **Step 4: Run the full focus-management test suite (GREEN)**

```bash
npm run test:unit -- --reporter verbose "ChatConfiguration.test.tsx"
```

Expected: all tests in `ChatConfiguration.test.tsx` pass, including both new `focus management` tests. Confirm the `Test Files` line shows 1 file; the `Tests` line shows the previous count + 2.

- [ ] **Step 5: Run the full unit suite to check for regressions**

```bash
npm run test:unit -- --reporter verbose
```

Expected: no failures outside `ChatConfiguration.test.tsx`. Confirm `Test Files` count matches the pre-change baseline.

---

### Task 3: Commit

- [ ] **Step 1: Stage only the two changed files**

```bash
git add src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx
git add src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx
```

Do **not** stage `vite.config.ts` — that file has an unrelated local change.

- [ ] **Step 2: Commit**

```bash
git commit -m "EPMCDME-8436: Fix focus order when Configuration sidebar opens"
```

Expected: pre-commit hook runs and exits 0. Commit appears in `git log --oneline -1`.
