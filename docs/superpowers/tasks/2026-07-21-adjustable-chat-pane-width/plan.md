# Adjustable Chat Pane Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drag-resize the chat pane (left sidebar on `/chat`) between a min and max pixel width, persist that width per-user across sessions, and keep the existing Ctrl+B show/hide toggle working.

**Architecture:** Wrap the chat page's sidebar/main-content split in `react-resizable-panels`' `Group`/`Panel` (already a dependency, used today for the Workflows drawer) at the `ChatPage.tsx` level — not inside `Sidebar.tsx` — because the library requires both sides of a split to be sibling `Panel`s in one `Group`, and the main chat content lives in `ChatPage.tsx`, not inside `Sidebar`. A new hook, `useChatSidebarResize`, mirrors `useWorkflowDrawer.tsx`'s pattern (`useDefaultLayout`, `panelRef`, manual localStorage width memory) but reconciles with the *existing* `appInfoStore.sidebarExpanded` boolean (Ctrl+B) instead of introducing a second collapse mechanism: the boolean drives `panelRef.collapse()/expand()`, while dragging only ever moves the panel between the min/max bounds. Because compile-time Tailwind width tokens (`theme(spacing.sidebar)`) can't reflect a runtime-variable width, the two utilities that compute absolute-position offsets from the old boolean+fixed-width assumption (`useSidebarOffsetClass.ts`, `helpers.ts`'s `getSidebarMaxWidthClass`/`getSidebarOffsetClass`) are converted to read a `--chat-sidebar-width` CSS custom property instead, kept in sync by the resize hook and initialized at app bootstrap from localStorage so it's correct even on pages where the chat sidebar isn't mounted.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (utility classes only, no CSS modules/styled-components), `react-resizable-panels` `^4.11.2`, `valtio` (state), `vitest` + `@testing-library/react` (tests).

## Global Constraints

- Min chat-pane width: `260px`. Max chat-pane width: `520px`. Default/initial width: `308px` (today's fixed value). **Assumption, not a design spec** — no min/max value exists anywhere in the ticket or codebase; flagged for product/design confirmation post-implementation.
- No new dependency — `react-resizable-panels` is already installed.
- Reuse `src/components/ResizableSeparator/ResizableSeparator.tsx` as the drag handle (`orientation="horizontal"` for the left-right `ew-resize` cursor — the prop name refers to the panel-stacking axis, not the cursor, easy to get backwards).
- Reuse `useWorkflowDrawer.tsx`'s localStorage key convention: `` `${KEY}-${userId}` `` (hyphen suffix), `userId ?? 'default'` fallback.
- Styling is Tailwind utility classes via the `cn()` helper only.
- `Sidebar.tsx` has exactly one consumer (`ChatSidebar.tsx`) — safe to change its width model without touching other call sites. `WorkflowExecutions.tsx`'s `workflow-exec-sidebar` token is a separate, unrelated 308px value — do not touch it.

---

## File Structure

- **Create** `src/pages/chat/components/ChatSidebar/chatSidebarWidth.ts` — pure constants + localStorage read/clamp + CSS-var setter. No React, easiest to unit test in isolation.
- **Create** `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarWidth.test.ts`
- **Create** `src/pages/chat/components/ChatSidebar/useChatSidebarResize.ts` — the resize/collapse orchestration hook, mirrors `useWorkflowDrawer.tsx`.
- **Create** `src/pages/chat/components/ChatSidebar/__tests__/useChatSidebarResize.test.ts`
- **Modify** `src/utils/helpers.ts:359-381` — `getSidebarMaxWidthClass`/`getSidebarOffsetClass` read the CSS var instead of the compile-time Tailwind token.
- **Create** `src/utils/__tests__/helpers.sidebar.test.ts` — no existing coverage of these two functions; new file keeps the addition scoped instead of growing the existing `helpers.test.ts`.
- **Modify** `src/hooks/useSidebarOffsetClass.ts:25-32` — same CSS-var substitution.
- **Create** `src/hooks/__tests__/useSidebarOffsetClass.test.ts` — no existing coverage.
- **Modify** `src/components/Sidebar/Sidebar.tsx` — remove the fixed `w-sidebar`/`max-w-sidebar`/`w-0` width classes and the local `isVisible` boolean-driven width logic (the parent `Panel` now owns width and collapse/expand); the `aside` and inner `div` become `w-full h-full`.
- **Modify** `src/pages/chat/ChatPage.tsx` — replace the plain `<div className="flex h-full">` wrapper with `Group`/`Panel`/`ResizableSeparator`, wired to `useChatSidebarResize`.
- **Modify** `src/App.tsx` — one-time bootstrap effect that sets the `--chat-sidebar-width` CSS var from localStorage on mount, so pages other than `/chat` (e.g. `AssistantsListPage`, `Gradient`) compute correct offsets even though `ChatPage`'s resize hook isn't mounted there.
- **Modify** `src/components/appLevel/__tests__/Gradient.test.tsx` — verify only (no code change expected: `Gradient.tsx` calls `getSidebarMaxWidthClass()` with no args and the test mocks the whole function, so its signature/behavior contract is unchanged). Task 6 includes a verification step, not a rewrite.

---

### Task 1: Chat sidebar width constants and storage helpers

**Files:**
- Create: `src/pages/chat/components/ChatSidebar/chatSidebarWidth.ts`
- Test: `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarWidth.test.ts`

**Interfaces:**
- Produces: `CHAT_SIDEBAR_MIN_WIDTH = 260`, `CHAT_SIDEBAR_MAX_WIDTH = 520`, `CHAT_SIDEBAR_DEFAULT_WIDTH = 308` (exported numbers, px).
- Produces: `CHAT_SIDEBAR_WIDTH_CSS_VAR = '--chat-sidebar-width'` (exported string).
- Produces: `getStoredChatSidebarWidth(userId: string): number` — reads `` `chat-sidebar-width-${userId}` `` from `localStorage`, clamps to `[CHAT_SIDEBAR_MIN_WIDTH, CHAT_SIDEBAR_MAX_WIDTH]`, returns `CHAT_SIDEBAR_DEFAULT_WIDTH` if missing/invalid.
- Produces: `setStoredChatSidebarWidth(userId: string, width: number): void` — writes the same key, only when `width >= CHAT_SIDEBAR_MIN_WIDTH`.
- Produces: `setChatSidebarWidthCssVar(width: number): void` — `document.documentElement.style.setProperty(CHAT_SIDEBAR_WIDTH_CSS_VAR, \`${width}px\`)`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/pages/chat/components/ChatSidebar/__tests__/chatSidebarWidth.test.ts
import { describe, it, expect, beforeEach } from 'vitest'

import {
  CHAT_SIDEBAR_MIN_WIDTH,
  CHAT_SIDEBAR_MAX_WIDTH,
  CHAT_SIDEBAR_DEFAULT_WIDTH,
  CHAT_SIDEBAR_WIDTH_CSS_VAR,
  getStoredChatSidebarWidth,
  setStoredChatSidebarWidth,
  setChatSidebarWidthCssVar,
} from '../chatSidebarWidth'

describe('chatSidebarWidth', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty(CHAT_SIDEBAR_WIDTH_CSS_VAR)
  })

  describe('getStoredChatSidebarWidth', () => {
    it('returns the default width when nothing is stored', () => {
      expect(getStoredChatSidebarWidth('user-1')).toBe(CHAT_SIDEBAR_DEFAULT_WIDTH)
    })

    it('returns the stored width when present and within bounds', () => {
      localStorage.setItem('chat-sidebar-width-user-1', '400')
      expect(getStoredChatSidebarWidth('user-1')).toBe(400)
    })

    it('clamps a stored width below the minimum', () => {
      localStorage.setItem('chat-sidebar-width-user-1', '10')
      expect(getStoredChatSidebarWidth('user-1')).toBe(CHAT_SIDEBAR_MIN_WIDTH)
    })

    it('clamps a stored width above the maximum', () => {
      localStorage.setItem('chat-sidebar-width-user-1', '9999')
      expect(getStoredChatSidebarWidth('user-1')).toBe(CHAT_SIDEBAR_MAX_WIDTH)
    })

    it('returns the default width for a non-numeric stored value', () => {
      localStorage.setItem('chat-sidebar-width-user-1', 'not-a-number')
      expect(getStoredChatSidebarWidth('user-1')).toBe(CHAT_SIDEBAR_DEFAULT_WIDTH)
    })

    it('scopes the storage key by userId', () => {
      localStorage.setItem('chat-sidebar-width-user-1', '400')
      expect(getStoredChatSidebarWidth('user-2')).toBe(CHAT_SIDEBAR_DEFAULT_WIDTH)
    })
  })

  describe('setStoredChatSidebarWidth', () => {
    it('persists a width at or above the minimum', () => {
      setStoredChatSidebarWidth('user-1', 350)
      expect(localStorage.getItem('chat-sidebar-width-user-1')).toBe('350')
    })

    it('does not persist a width below the minimum', () => {
      setStoredChatSidebarWidth('user-1', 0)
      expect(localStorage.getItem('chat-sidebar-width-user-1')).toBeNull()
    })
  })

  describe('setChatSidebarWidthCssVar', () => {
    it('sets the CSS custom property on the document root', () => {
      setChatSidebarWidthCssVar(340)
      expect(document.documentElement.style.getPropertyValue(CHAT_SIDEBAR_WIDTH_CSS_VAR)).toBe(
        '340px'
      )
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/chatSidebarWidth.test.ts`
Expected: FAIL — `Cannot find module '../chatSidebarWidth'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/pages/chat/components/ChatSidebar/chatSidebarWidth.ts
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

export const CHAT_SIDEBAR_MIN_WIDTH = 260
export const CHAT_SIDEBAR_MAX_WIDTH = 520
export const CHAT_SIDEBAR_DEFAULT_WIDTH = 308
export const CHAT_SIDEBAR_WIDTH_CSS_VAR = '--chat-sidebar-width'

const STORAGE_KEY_PREFIX = 'chat-sidebar-width'

const clamp = (width: number): number =>
  Math.min(CHAT_SIDEBAR_MAX_WIDTH, Math.max(CHAT_SIDEBAR_MIN_WIDTH, width))

export const getStoredChatSidebarWidth = (userId: string): number => {
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}-${userId}`)
  const parsed = stored ? parseInt(stored, 10) : NaN

  return Number.isFinite(parsed) ? clamp(parsed) : CHAT_SIDEBAR_DEFAULT_WIDTH
}

export const setStoredChatSidebarWidth = (userId: string, width: number): void => {
  if (width >= CHAT_SIDEBAR_MIN_WIDTH) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}-${userId}`, width.toString())
  }
}

export const setChatSidebarWidthCssVar = (width: number): void => {
  document.documentElement.style.setProperty(CHAT_SIDEBAR_WIDTH_CSS_VAR, `${width}px`)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/chatSidebarWidth.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatSidebar/chatSidebarWidth.ts src/pages/chat/components/ChatSidebar/__tests__/chatSidebarWidth.test.ts
git commit -m "feat(chat): add chat sidebar width constants and storage helpers"
```

---

### Task 2: `useChatSidebarResize` hook

**Files:**
- Create: `src/pages/chat/components/ChatSidebar/useChatSidebarResize.ts`
- Test: `src/pages/chat/components/ChatSidebar/__tests__/useChatSidebarResize.test.ts`

**Interfaces:**
- Consumes (Task 1): `CHAT_SIDEBAR_MIN_WIDTH`, `CHAT_SIDEBAR_DEFAULT_WIDTH`, `getStoredChatSidebarWidth`, `setStoredChatSidebarWidth`, `setChatSidebarWidthCssVar` from `./chatSidebarWidth`.
- Consumes: `appInfoStore` (`sidebarExpanded: boolean`, `toggleSidebar()`) from `@/store/appInfo`; `userStore` (`user?.userId`) from `@/store/user`; `useSnapshot` from `valtio`.
- Consumes: `PanelImperativeHandle`, `PanelSize`, `useDefaultLayout` from `react-resizable-panels`.
- Produces: `useChatSidebarResize(): { panelRef: RefObject<PanelImperativeHandle | null>; defaultLayout: Layout | undefined; onLayoutChanged: (layout: Layout) => void; initialWidth: number; handleResize: (panelSize: PanelSize) => void }` — `initialWidth` is `getStoredChatSidebarWidth(userId)`, used by the caller as the `Panel`'s `defaultSize`. `handleResize` persists the new width (via `setStoredChatSidebarWidth` + `setChatSidebarWidthCssVar`) whenever the panel isn't collapsed (`panelSize.inPixels > 0`).
- Produces (internal, not exported): an effect that watches `appInfoStore.sidebarExpanded` and calls `panelRef.current?.collapse()` when it goes `false`, or `panelRef.current?.expand()` (which restores the panel's last non-collapsed size automatically per `PanelImperativeHandle.expand()`'s documented behavior) when it goes `true`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/pages/chat/components/ChatSidebar/__tests__/useChatSidebarResize.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import { CHAT_SIDEBAR_WIDTH_CSS_VAR } from '../chatSidebarWidth'
import { useChatSidebarResize } from '../useChatSidebarResize'

vi.mock('@/store/user', () => ({
  userStore: {
    user: { userId: 'test-user-123' },
  },
}))

describe('useChatSidebarResize', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty(CHAT_SIDEBAR_WIDTH_CSS_VAR)
    appInfoStore.sidebarExpanded = true
  })

  it('returns the stored width as the initial width', () => {
    localStorage.setItem('chat-sidebar-width-test-user-123', '400')
    const { result } = renderHook(() => useChatSidebarResize())

    expect(result.current.initialWidth).toBe(400)
  })

  it('returns the default width when nothing is stored', () => {
    const { result } = renderHook(() => useChatSidebarResize())

    expect(result.current.initialWidth).toBe(308)
  })

  it('persists width and updates the CSS var on resize while expanded', () => {
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      result.current.handleResize({ inPixels: 450, asPercentage: 40 })
    })

    expect(localStorage.getItem('chat-sidebar-width-test-user-123')).toBe('450')
    expect(document.documentElement.style.getPropertyValue(CHAT_SIDEBAR_WIDTH_CSS_VAR)).toBe(
      '450px'
    )
  })

  it('does not persist width when resize reports a collapsed (0px) panel', () => {
    localStorage.setItem('chat-sidebar-width-test-user-123', '400')
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      result.current.handleResize({ inPixels: 0, asPercentage: 0 })
    })

    expect(localStorage.getItem('chat-sidebar-width-test-user-123')).toBe('400')
  })

  it('calls panelRef.collapse() when appInfoStore.sidebarExpanded becomes false', () => {
    const { result } = renderHook(() => useChatSidebarResize())
    const collapse = vi.fn()
    // @ts-expect-error -- assigning a partial imperative handle for the test double
    result.current.panelRef.current = { collapse, expand: vi.fn() }

    act(() => {
      appInfoStore.sidebarExpanded = false
    })

    expect(collapse).toHaveBeenCalledTimes(1)
  })

  it('calls panelRef.expand() when appInfoStore.sidebarExpanded becomes true', () => {
    appInfoStore.sidebarExpanded = false
    const { result } = renderHook(() => useChatSidebarResize())
    const expand = vi.fn()
    // @ts-expect-error -- assigning a partial imperative handle for the test double
    result.current.panelRef.current = { collapse: vi.fn(), expand }

    act(() => {
      appInfoStore.sidebarExpanded = true
    })

    expect(expand).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/useChatSidebarResize.test.ts`
Expected: FAIL — `Cannot find module '../useChatSidebarResize'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/pages/chat/components/ChatSidebar/useChatSidebarResize.ts
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

import { useCallback, useEffect, useRef } from 'react'
import { PanelImperativeHandle, PanelSize, useDefaultLayout } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'

import {
  getStoredChatSidebarWidth,
  setChatSidebarWidthCssVar,
  setStoredChatSidebarWidth,
} from './chatSidebarWidth'

export const useChatSidebarResize = () => {
  const { user } = useSnapshot(userStore)
  const userId = user?.userId ?? 'default'
  const { sidebarExpanded } = useSnapshot(appInfoStore)

  const panelRef = useRef<PanelImperativeHandle>(null)
  const initialWidth = getStoredChatSidebarWidth(userId)

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: `chat-sidebar-${userId}`,
    storage: localStorage,
  })

  useEffect(() => {
    setChatSidebarWidthCssVar(initialWidth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResize = useCallback(
    (panelSize: PanelSize) => {
      if (panelSize.inPixels > 0) {
        setStoredChatSidebarWidth(userId, panelSize.inPixels)
        setChatSidebarWidthCssVar(panelSize.inPixels)
      }
    },
    [userId]
  )

  useEffect(() => {
    if (sidebarExpanded) {
      panelRef.current?.expand()
    } else {
      panelRef.current?.collapse()
    }
  }, [sidebarExpanded])

  return { panelRef, defaultLayout, onLayoutChanged, initialWidth, handleResize }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/useChatSidebarResize.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatSidebar/useChatSidebarResize.ts src/pages/chat/components/ChatSidebar/__tests__/useChatSidebarResize.test.ts
git commit -m "feat(chat): add useChatSidebarResize hook"
```

---

### Task 3: Convert `getSidebarMaxWidthClass`/`getSidebarOffsetClass` to runtime width

**Files:**
- Modify: `src/utils/helpers.ts:359-381`
- Test: `src/utils/__tests__/helpers.sidebar.test.ts`

**Interfaces:**
- Consumes (Task 1): `CHAT_SIDEBAR_DEFAULT_WIDTH` from `@/pages/chat/components/ChatSidebar/chatSidebarWidth` (used as the `var()` fallback value so pre-hydration renders match today's default).
- Produces: `getSidebarMaxWidthClass(): string` and `getSidebarOffsetClass(): string` — same names/signatures as today (zero args, returns a Tailwind class string); only the string content of the two "both expanded" branches changes.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/utils/__tests__/helpers.sidebar.test.ts
import { describe, it, expect, beforeEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { getSidebarMaxWidthClass, getSidebarOffsetClass } from '@/utils/helpers'

describe('sidebar offset helpers', () => {
  beforeEach(() => {
    appInfoStore.sidebarExpanded = true
    appInfoStore.navigationExpanded = false
  })

  it('getSidebarMaxWidthClass uses the runtime CSS var when sidebar is expanded, nav collapsed', () => {
    expect(getSidebarMaxWidthClass()).toBe(
      'max-w-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('getSidebarMaxWidthClass uses the runtime CSS var when sidebar and nav are expanded', () => {
    appInfoStore.navigationExpanded = true
    expect(getSidebarMaxWidthClass()).toBe(
      'max-w-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('getSidebarMaxWidthClass is unaffected by the CSS var when sidebar is collapsed', () => {
    appInfoStore.sidebarExpanded = false
    expect(getSidebarMaxWidthClass()).toBe('max-w-navbar')
  })

  it('getSidebarOffsetClass uses the runtime CSS var when sidebar is expanded, nav collapsed', () => {
    expect(getSidebarOffsetClass()).toBe(
      'left-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('getSidebarOffsetClass uses the runtime CSS var when sidebar and nav are expanded', () => {
    appInfoStore.navigationExpanded = true
    expect(getSidebarOffsetClass()).toBe(
      'left-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('getSidebarOffsetClass is unaffected by the CSS var when sidebar is collapsed', () => {
    appInfoStore.sidebarExpanded = false
    expect(getSidebarOffsetClass()).toBe('left-navbar')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/helpers.sidebar.test.ts`
Expected: FAIL — actual strings still contain `theme(spacing.sidebar)`, not `var(--chat-sidebar-width,308px)`

- [ ] **Step 3: Write the implementation**

Replace `src/utils/helpers.ts:359-381` with:

```typescript
export const getSidebarMaxWidthClass = (): string => {
  if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded) return 'max-w-navbar'
  if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
    return 'max-w-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]'
  if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'max-w-navbar-expanded'
  if (appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'max-w-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'

  return ''
}

export const getSidebarOffsetClass = (): string => {
  if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded) return 'left-navbar'
  if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
    return 'left-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]'
  if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'left-navbar-expanded'
  if (appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'left-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'

  return ''
}
```

(The `308px` literal matches `CHAT_SIDEBAR_DEFAULT_WIDTH` from Task 1 — it is inlined here rather than imported because Tailwind's arbitrary-value class strings must be statically analyzable at build time; add a one-line comment noting the two must stay in sync.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/helpers.sidebar.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/helpers.ts src/utils/__tests__/helpers.sidebar.test.ts
git commit -m "fix(sidebar): compute max-width/offset classes from runtime chat sidebar width"
```

---

### Task 4: Convert `useSidebarOffsetClass` to runtime width

**Files:**
- Modify: `src/hooks/useSidebarOffsetClass.ts:25-32`
- Test: `src/hooks/__tests__/useSidebarOffsetClass.test.ts`

**Interfaces:**
- Produces: `useSidebarOffsetClass(): string | null` — same signature as today; only the two "both expanded" branch strings change, identical replacement to Task 3.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/hooks/__tests__/useSidebarOffsetClass.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import { useSidebarOffsetClass } from '../useSidebarOffsetClass'

describe('useSidebarOffsetClass', () => {
  beforeEach(() => {
    appInfoStore.sidebarExpanded = true
    appInfoStore.navigationExpanded = false
  })

  it('uses the runtime CSS var when sidebar is expanded, nav collapsed', () => {
    const { result } = renderHook(() => useSidebarOffsetClass())

    expect(result.current).toBe('left-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]')
  })

  it('uses the runtime CSS var when sidebar and nav are expanded', () => {
    const { result } = renderHook(() => useSidebarOffsetClass())

    act(() => {
      appInfoStore.navigationExpanded = true
    })

    expect(result.current).toBe(
      'left-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('is unaffected by the CSS var when sidebar is collapsed', () => {
    const { result } = renderHook(() => useSidebarOffsetClass())

    act(() => {
      appInfoStore.sidebarExpanded = false
    })

    expect(result.current).toBe('left-navbar')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useSidebarOffsetClass.test.ts`
Expected: FAIL — actual strings still contain `theme(spacing.sidebar)`

- [ ] **Step 3: Write the implementation**

Replace `src/hooks/useSidebarOffsetClass.ts:24-33`'s `update` function body with:

```typescript
  const update = () => {
    if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
      setOffsetClass('left-navbar')
    if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
      setOffsetClass('left-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]')
    if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
      setOffsetClass('left-navbar-expanded')
    if (appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
      setOffsetClass(
        'left-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'
      )
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useSidebarOffsetClass.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSidebarOffsetClass.ts src/hooks/__tests__/useSidebarOffsetClass.test.ts
git commit -m "fix(sidebar): compute toggle offset class from runtime chat sidebar width"
```

---

### Task 5: Initialize the CSS var at app bootstrap

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/App.sidebarWidth.test.tsx` (create — check whether `src/__tests__/` already exists as a convention before creating; if `App.tsx` has no existing test directory, create `src/__tests__/App.sidebarWidth.test.tsx`)

**Interfaces:**
- Consumes (Task 1): `getStoredChatSidebarWidth`, `setChatSidebarWidthCssVar`, `CHAT_SIDEBAR_WIDTH_CSS_VAR` from `@/pages/chat/components/ChatSidebar/chatSidebarWidth`.
- Consumes: `userStore` snapshot (`user?.userId`), already imported in `App.tsx`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/App.sidebarWidth.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CHAT_SIDEBAR_WIDTH_CSS_VAR } from '@/pages/chat/components/ChatSidebar/chatSidebarWidth'

vi.mock('@/hooks/appLevel/useHistoryStack', () => ({ useHistoryStack: vi.fn() }))
vi.mock('@/hooks/appLevel/usePrismThemeToggle', () => ({ default: vi.fn() }))
vi.mock('@/hooks/appLevel/useInitialDataFetch', () => ({ default: vi.fn() }))
vi.mock('@/store/user', () => ({
  userStore: { user: { userId: 'boot-user' }, isLoadingUser: false },
}))

import App from '../App'

describe('App bootstrap', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty(CHAT_SIDEBAR_WIDTH_CSS_VAR)
  })

  it('sets --chat-sidebar-width from localStorage on mount', () => {
    localStorage.setItem('chat-sidebar-width-boot-user', '440')

    render(<App />)

    expect(document.documentElement.style.getPropertyValue(CHAT_SIDEBAR_WIDTH_CSS_VAR)).toBe(
      '440px'
    )
  })

  it('sets the default width when nothing is stored', () => {
    render(<App />)

    expect(document.documentElement.style.getPropertyValue(CHAT_SIDEBAR_WIDTH_CSS_VAR)).toBe(
      '308px'
    )
  })
})
```

Note: mock any other `App.tsx` dependencies (router context, other stores) that the existing test setup already mocks globally in `src/setupTests.tsx` — check that file first; only add mocks here for things not already globally handled, adjusting the list above if some are redundant.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/App.sidebarWidth.test.tsx`
Expected: FAIL — CSS var is not set (empty string), because `App.tsx` doesn't call `setChatSidebarWidthCssVar` yet

- [ ] **Step 3: Write the implementation**

In `src/App.tsx`, add the import and a bootstrap effect:

```typescript
import { getStoredChatSidebarWidth, setChatSidebarWidthCssVar } from '@/pages/chat/components/ChatSidebar/chatSidebarWidth'
```

Inside the `App` component, alongside the existing `useEffect` for `floatingKataStore`:

```typescript
  useEffect(() => {
    setChatSidebarWidthCssVar(getStoredChatSidebarWidth(user?.userId ?? 'default'))
  }, [user?.userId])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/App.sidebarWidth.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/__tests__/App.sidebarWidth.test.tsx
git commit -m "feat(chat): initialize chat sidebar width CSS var at app bootstrap"
```

---

### Task 6: Make `Sidebar.tsx` width-agnostic (fill its parent `Panel`)

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Test: `src/components/Sidebar/__tests__/Sidebar.test.tsx` (create — no existing coverage)

**Interfaces:**
- Consumes: unchanged props (`title`, `description`, `children`, `headerContent`, `className`).
- Produces: unchanged public shape — still renders an `<aside>` wrapping the title/description/children and `<SidebarToggle />`; only the width-related classes and the `isVisible`/`w-0` collapse logic are removed (collapse/hide is now the parent `Panel`'s job — see Task 7).

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/Sidebar/__tests__/Sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import Sidebar from '../Sidebar'

describe('Sidebar', () => {
  it('renders the title and children', () => {
    render(
      <Sidebar title="Chats">
        <div>list content</div>
      </Sidebar>
    )

    expect(screen.getByText('Chats')).toBeInTheDocument()
    expect(screen.getByText('list content')).toBeInTheDocument()
  })

  it('fills its container width instead of using a fixed sidebar width class', () => {
    const { container } = render(<Sidebar title="Chats" />)
    const aside = container.querySelector('aside')

    expect(aside).not.toHaveClass('w-sidebar')
    expect(aside).not.toHaveClass('max-w-sidebar')
    expect(aside).not.toHaveClass('w-0')
    expect(aside).toHaveClass('w-full')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Sidebar/__tests__/Sidebar.test.tsx`
Expected: FAIL — `aside` currently has `w-sidebar`/`max-w-sidebar` classes and lacks `w-full`

- [ ] **Step 3: Write the implementation**

Replace `src/components/Sidebar/Sidebar.tsx` (lines 33-70) with:

```typescript
const Sidebar = ({ title, description, children, headerContent, className }: SidebarProps) => {
  const { appearance } = useTheme()
  const showGradient = appearance?.gradients ?? true

  return (
    <aside
      className={cn(
        'flex flex-col border-r min-h-full w-full h-full',
        showGradient && 'bg-sidebar-gradient',
        'transition-all ease-in-out duration-150 overflow-x-hidden shrink-0',
        {
          'border-border-specific-sidebar': !appearance,
          'border-border-structural': Boolean(appearance),
        }
      )}
    >
      <div className="pt-10 flex h-full flex-col w-full">
        <div className="flex justify-between items-center px-6">
          <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
          {headerContent}
        </div>
        {description && (
          <p className="text-sm text-text-quaternary font-semibold mt-1 px-6">{description}</p>
        )}
        <div className={cn('mt-7 h-full z-[10] overflow-y-auto px-6', className)}>{children}</div>
      </div>
      <SidebarToggle />
    </aside>
  )
}
```

Also remove the now-unused `isVisible`/`setIsVisible`/`subscribe` wiring (the `useState`, the `subscribe(appInfoStore, ...)` call, and the `ReactNode, useState` / `subscribe` / `appInfoStore` imports that become unused — keep `cn`, `useTheme`, `SidebarToggle` imports; `ReactNode` is still needed for the `SidebarProps` type).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Sidebar/__tests__/Sidebar.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar/Sidebar.tsx src/components/Sidebar/__tests__/Sidebar.test.tsx
git commit -m "refactor(sidebar): make Sidebar fill its container instead of a fixed width"
```

---

### Task 7: Wire `Group`/`Panel`/`ResizableSeparator` into `ChatPage.tsx`

**Files:**
- Modify: `src/pages/chat/ChatPage.tsx`
- Test: `src/pages/chat/__tests__/ChatPage.resize.test.tsx` (create)

**Interfaces:**
- Consumes (Task 2): `useChatSidebarResize()` → `{ panelRef, defaultLayout, onLayoutChanged, initialWidth, handleResize }`.
- Consumes (Task 1): `CHAT_SIDEBAR_MIN_WIDTH`, `CHAT_SIDEBAR_MAX_WIDTH` from `@/pages/chat/components/ChatSidebar/chatSidebarWidth`.
- Consumes: `Group`, `Panel` from `react-resizable-panels`; `ResizableSeparator` from `@/components/ResizableSeparator/ResizableSeparator`.
- Existing `src/pages/chat/__tests__/ChatPage.test.tsx:108` already mocks `ChatSidebar` entirely (`vi.mock`) — this task's new test file follows the same mocking approach so it doesn't depend on real `ChatSidebar` internals.

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/chat/__tests__/ChatPage.resize.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../components/ChatSidebar/ChatSidebar', () => ({
  default: () => <div data-testid="chat-sidebar-content">sidebar</div>,
}))
vi.mock('../components/ChatHeader/ChatHeader', () => ({ default: () => <div /> }))
vi.mock('../components/ChatConfiguration/ChatConfiguration', () => ({ default: () => <div /> }))
vi.mock('../components/ChatHistory/ChatHistory', () => ({ default: () => <div /> }))
vi.mock('../components/ChatPrompt/ChatPrompt', () => ({ default: () => <div /> }))
vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({ default: () => <div /> }))
vi.mock('@/hooks/useNewIntegrationPopup', () => ({
  useNewIntegrationPopup: () => ({
    showNewIntegration: false,
    showNewIntegrationPopup: vi.fn(),
    hideNewIntegrationPopup: vi.fn(),
    onIntegrationSuccess: vi.fn(),
  }),
}))
vi.mock('../hooks/useChatNavigation', () => ({ useChatNavigation: vi.fn() }))
vi.mock('../hooks/useChatInitialPrompt', () => ({ useChatInitialPrompt: vi.fn() }))
vi.mock('../hooks/useChatAuthCallbacks', () => ({ useChatAuthCallbacks: vi.fn() }))
vi.mock('../hooks/useChatConfiguration', () => ({ useChatConfiguration: () => ({}) }))
vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ currentRoute: { value: { params: {} } }, push: vi.fn() }),
}))
vi.mock('@/store/chats', () => ({ chatsStore: { currentChat: null } }))

import ChatPage from '../ChatPage'

describe('ChatPage resizable sidebar', () => {
  it('renders the sidebar inside a resizable Group/Panel structure', () => {
    const { container } = render(<ChatPage />)

    expect(screen.getByTestId('chat-sidebar-content')).toBeInTheDocument()
    expect(container.querySelector('[data-group]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-panel]')).toHaveLength(2)
    expect(container.querySelector('[data-separator]')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/chat/__tests__/ChatPage.resize.test.tsx`
Expected: FAIL — no `[data-group]`/`[data-panel]`/`[data-separator]` elements yet (plain `<div className="flex h-full">`)

- [ ] **Step 3: Write the implementation**

In `src/pages/chat/ChatPage.tsx`, add imports:

```typescript
import { Group, Panel } from 'react-resizable-panels'

import ResizableSeparator from '@/components/ResizableSeparator/ResizableSeparator'

import {
  CHAT_SIDEBAR_MAX_WIDTH,
  CHAT_SIDEBAR_MIN_WIDTH,
} from './components/ChatSidebar/chatSidebarWidth'
import { useChatSidebarResize } from './components/ChatSidebar/useChatSidebarResize'
```

Inside the `ChatPage` component, call the hook alongside the other hooks:

```typescript
  const { panelRef, defaultLayout, onLayoutChanged, initialWidth, handleResize } =
    useChatSidebarResize()
```

Replace the `<div className="flex h-full">...</div>` block (lines 70-84) with:

```typescript
      <Group
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="h-full"
      >
        <Panel
          id="chat-sidebar"
          panelRef={panelRef}
          defaultSize={initialWidth}
          minSize={CHAT_SIDEBAR_MIN_WIDTH}
          maxSize={CHAT_SIDEBAR_MAX_WIDTH}
          collapsible
          collapsedSize={0}
          groupResizeBehavior="preserve-pixel-size"
          onResize={handleResize}
        >
          <ChatSidebar />
        </Panel>

        <ResizableSeparator orientation="horizontal" />

        <Panel id="chat-main-content">
          <PageLayout key={currentChat?.id} childrenClassName="px-0" renderHeader={<ChatHeader />}>
            <div className="flex h-full">
              {currentChat && (
                <div className="flex flex-col items-center grow min-w-0 pb-4">
                  {!!currentChat?.history.length && <ChatHistory />}
                  <ChatPrompt />
                </div>
              )}
              <ChatConfiguration showNewIntegrationPopup={showNewIntegrationPopup} />
            </div>
          </PageLayout>
        </Panel>
      </Group>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/chat/__tests__/ChatPage.resize.test.tsx`
Expected: PASS (1 test)

Then run the pre-existing chat page test to confirm no regression:

Run: `npx vitest run src/pages/chat/__tests__/ChatPage.test.tsx`
Expected: PASS (no changes needed to that file — it already mocks `ChatSidebar`)

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/ChatPage.tsx src/pages/chat/__tests__/ChatPage.resize.test.tsx
git commit -m "feat(chat): make chat sidebar drag-resizable via react-resizable-panels"
```

---

### Task 8: Verify `Gradient` and full regression pass

**Files:**
- Verify (no code change expected): `src/components/appLevel/Gradient.tsx`, `src/components/appLevel/__tests__/Gradient.test.tsx`

**Interfaces:**
- None new — this task is a verification checkpoint, not a code change. `Gradient.tsx` calls `getSidebarMaxWidthClass()` with the same zero-arg signature (Task 3 didn't change it), and `Gradient.test.tsx` mocks that function entirely, so it should pass unmodified.

Test-first: no — this task runs and inspects existing tests rather than adding new ones.

- [ ] **Step 1: Run the existing Gradient test suite**

Run: `npx vitest run src/components/appLevel/__tests__/Gradient.test.tsx`
Expected: PASS (no changes needed; confirms Task 3 didn't break the mocked contract)

- [ ] **Step 2: Run the full unit test project**

Run: `npm run test:unit` (or the project's equivalent script — confirm exact script name in `package.json` `scripts` before running; fall back to `npx vitest run --project unit` if `test:unit` doesn't exist)
Expected: PASS — all tests including the six new/modified suites from Tasks 1-7

- [ ] **Step 3: Run the integration test project**

Run: `npm run test:integration` (or `npx vitest run --project integration`)
Expected: PASS — in particular `src/pages/chat/__tests__/ChatPage.test.tsx` (mocks `ChatSidebar`, unaffected) and `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx` (unrelated `Group`/`Panel` usage, should be unaffected by the chat-page changes)

- [ ] **Step 4: Manual smoke check (documented, not automated)**

Start the dev server (`npm run dev` or the project's script), open `/chat`, and manually verify:
- Dragging the border between the chat pane and main area resizes the pane, clamped to 260–520px.
- Reloading the page preserves the last dragged width.
- Ctrl+B (or Cmd+B) still hides/shows the pane, and re-showing restores the last dragged width (not the 260px floor).
- Chat list titles/rows render without overlap or clipping at both the 260px and 520px extremes.
- Navigating to a non-chat page (e.g. Assistants list) after resizing the chat pane still shows a correctly-offset "toggle sidebar" affordance/gradient (no visual jump caused by a stale offset).

This step has no pass/fail command output to paste — note the outcome in the task's completion comment.

- [ ] **Step 5: Commit** (only if Step 4 uncovered a fix)

If the manual check passes with no changes needed, skip this step — nothing to commit for a verification-only task.

---

## Self-Review Notes

- **Spec coverage:** AC1 (drag to resize) → Task 7. AC2 (min/max enforced) → Task 1 constants + Task 7 `minSize`/`maxSize` props. AC3 (persists for session) → Task 1 storage + Task 2 hook + Task 5 bootstrap (also survives across pages, exceeding "at least session" requirement). AC4 (no functionality loss at extremes) → Task 8 manual check.
- **Risk from research Section 6 covered:** stale offset risk → Tasks 3-5. Two collapse mechanisms → Task 2 reconciles them into one (`appInfoStore.sidebarExpanded` drives `panelRef`, no second threshold-based collapse). `WorkflowExecutions.tsx`'s separate token → untouched, not referenced anywhere in this plan. Zero test coverage → every new/modified file gets a new test file in this plan.
- **Type consistency:** `useChatSidebarResize`'s returned shape (`panelRef`, `defaultLayout`, `onLayoutChanged`, `initialWidth`, `handleResize`) is defined once in Task 2 and consumed with the same five names in Task 7 — no renaming drift.
