# Context Window Resize — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a draggable separator between chat history and the prompt input in `ChatPage`, letting users resize the prompt area height with the position persisted to localStorage per user.

**Architecture:** `ChatPage` owns the split layout using `react-resizable-panels` `Group`/`Panel`/`ChatResizableSeparator`. When history is present two panels are rendered with a pill-handle separator; when history is empty `ChatPrompt` renders standalone unchanged. A new `useChatPromptResize` hook encapsulates `useDefaultLayout` + a 300 ms debounced write to localStorage. `ChatPrompt` gains a `resizable?: boolean` prop that switches hardcoded height classes to `h-full`/`flex-1` variants; `ChatHistory` swaps `grow` for `h-full`.

**Tech Stack:** React, TypeScript, `react-resizable-panels` v4 (already installed), Tailwind CSS, Vitest + React Testing Library

**Implementation note — `Layout` type:** `react-resizable-panels` `Layout` is `{ [id: string]: number }` (a record keyed by panel `id`), not `number[]`. `minSize` on `Panel` is in **pixels**, not percentage; `defaultSize` is percentage (0–100).

---

### Task 1: `useChatPromptResize` hook

**Files:**
- Create: `src/pages/chat/hooks/useChatPromptResize.ts`
- Create: `src/pages/chat/hooks/__tests__/useChatPromptResize.test.ts`

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Run the test and confirm it fails** — `FAIL — Cannot find module '../useChatPromptResize'`
- [x] **Step 3: Implement `useChatPromptResize`**

```ts
import { useCallback, useEffect, useRef } from 'react'
import { useDefaultLayout } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'
import { userStore } from '@/store'

const STORAGE_KEY = 'chat-prompt-height'
const DEBOUNCE_MS = 300

export const useChatPromptResize = () => {
  const { user } = useSnapshot(userStore)
  const userId = user?.userId ?? 'default'

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: `${STORAGE_KEY}-${userId}`,
    storage: localStorage,
  })

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Layout type is { [id: string]: number } — use Parameters<> to avoid
  // hardcoding number[] which is incompatible
  const debouncedOnLayoutChanged = useCallback(
    (layout: Parameters<typeof onLayoutChanged>[0]) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => onLayoutChanged(layout), DEBOUNCE_MS)
    },
    [onLayoutChanged]
  )

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return { defaultLayout, debouncedOnLayoutChanged }
}
```

- [x] **Step 4: Run the test and confirm it passes** — `PASS — 4 tests`
- [x] **Step 5: Commit** — `EPMCDME-11292: Add useChatPromptResize hook with debounced localStorage persistence`

---

### Task 2: ChatHistory — `grow` → `h-full`

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatHistory.tsx`

- [x] **Step 1:** Change root div className `grow` → `h-full`
- [x] **Step 2:** Run existing ChatHistory tests — `PASS`
- [x] **Step 3: Commit** — `EPMCDME-11292: Update ChatHistory to fill panel height`

---

### Task 3: ChatPrompt — add `resizable` prop

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`

**Note:** The `box-content` border wrapper `cn()` call was extracted to a module-level `getBorderWrapperClassName(resizable, isInterrupted, isEditorFocused, isInProgress)` function to keep the component within the SonarJS cognitive complexity limit (adding ternaries for the `resizable` prop pushed it from 15 to 17).

- [x] **Step 1:** Add `ChatPromptProps`, `getBorderWrapperClassName` helper, and apply four conditional className changes
- [x] **Step 2:** Run existing ChatPrompt tests — `PASS`
- [x] **Step 3: Commit** — `EPMCDME-11292: Add resizable prop to ChatPrompt for panel layout mode`

---

### Task 4: ChatPage — Group/Panel split + unit test updates

**Files:**
- Modify: `src/pages/chat/ChatPage.tsx`
- Modify: `src/pages/chat/__tests__/ChatPage.test.tsx`

**Note:** `ChatResizableSeparator` (see Task 6) is used instead of `ResizableSeparator orientation="vertical"`. Test mock path is `'../components/ChatResizableSeparator'`, not `'@/components/ResizableSeparator/ResizableSeparator'`.

Panel sizes: `minSize` is in **pixels** — `minSize={80}` for history, `minSize={130}` for prompt.

- [x] **Step 1:** Add mocks (`react-resizable-panels`, `ChatResizableSeparator`, `useChatPromptResize`) and two new tests to `ChatPage.test.tsx`
- [x] **Step 2:** Run tests — new tests FAIL, existing PASS
- [x] **Step 3:** Update `ChatPage.tsx` with Group/Panel layout and `ChatResizableSeparator`
- [x] **Step 4:** Run unit tests — `PASS — 8 tests`
- [x] **Step 5: Commit** — `EPMCDME-11292: Add draggable resize separator between chat history and prompt`

---

### Task 5: Integration test

**Files:**
- Create: `src/pages/chat/__tests__/ChatPage.integration.test.tsx`

**Note:** Panel children do not render in jsdom when `ResizeObserver` reports 0 dimensions; the integration test asserts only `getByRole('separator')` (real library renders the role) and not `data-testid` of panel children (covered by unit test).

- [x] **Step 1:** Write integration test — uses real `react-resizable-panels`, mocks everything else
- [x] **Step 2:** Run integration test — `PASS — 2 tests`
- [x] **Step 3:** Run full chat suite — `PASS — 24 files, 212 tests`
- [x] **Step 4: Commit** — `EPMCDME-11292: Add integration test for chat page resize separator`

---

### Task 6: ChatResizableSeparator — pill handle with a11y

**Files:**
- Create: `src/pages/chat/components/ChatResizableSeparator.tsx`

Post-implementation visual and accessibility work extracted into this dedicated task.

**Design decision:** A full-width `ResizableSeparator orientation="vertical"` creates a jarring line across the entire panel width that bleeds to the edges. The pill-handle pattern (centered indicator, no line) follows modern UI conventions for resizable input areas.

**Implementation:**

```tsx
const ChatResizableSeparator = () => (
  <Separator
    aria-label="Resize chat prompt area"
    aria-controls="chat-history chat-prompt"
    aria-orientation="horizontal"
    className="relative h-4 -my-2 bg-transparent !cursor-[ns-resize] !outline-none z-[1] flex items-center justify-center group"
  >
    <div
      aria-hidden="true"
      className="w-10 h-1 rounded-full bg-white/20 pointer-events-none transition-all duration-150
        group-hover:bg-white/45 group-hover:w-12
        group-focus-visible:bg-white/60 group-focus-visible:w-12 group-focus-visible:h-[3px]
        group-focus-visible:ring-2 group-focus-visible:ring-white/50"
    />
  </Separator>
)
```

| WCAG criterion | Implementation |
|---|---|
| 2.1.1 Keyboard | ↑/↓ arrow keys handled by the library |
| 2.4.7 Focus Visible | `group-focus-visible:ring-2 ring-white/50` on pill |
| 4.1.2 Name/Role/Value | `aria-label`, `aria-controls`, `aria-orientation`; `aria-hidden` on decorative pill |

- [x] **Committed** — `EPMCDME-11292: Replace full-width separator with centered pill drag handle`
- [x] **Committed** — `EPMCDME-11292: Add WCAG a11y attributes and focus ring to resize handle`
