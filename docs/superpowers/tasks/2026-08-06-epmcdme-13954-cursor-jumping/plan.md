# EPMCDME-13954: Cursor Jumping Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing `e.target === e.currentTarget` guard to `handleKeyDown` in `ChatPrompt.tsx` and cover it with regression tests.

**Architecture:** Single guard addition to an existing keyboard handler. The pattern is already established by `handleMouseDown` and `focusEditor` in the same component. Tests update the Editor mock to expose a spy via `forwardRef`/`useImperativeHandle` so the focus call can be directly asserted.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react, Quill (via Editor abstraction)

---

### Task 1: Write failing regression test then apply the fix

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx`
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:203-205`

- [ ] **Step 1: Add `mockEditorFocus` to the hoisted block**

In `ChatPrompt.test.tsx`, the existing hoisted block (line 23) reads:

```typescript
const { mockChatGenerationStore, mockChatsStore, mockUseChatPromptDraft } = vi.hoisted(() => ({
  mockChatGenerationStore: { ... },
  ...
}))
```

Add a separate hoisted declaration immediately after `vi.hoisted(() => vi.resetModules())` and before the existing hoisted block:

```typescript
const mockEditorFocus = vi.hoisted(() => vi.fn())
```

- [ ] **Step 2: Replace the Editor mock with a forwardRef version**

Find this line (currently around line 72):

```typescript
vi.mock('@/components/Editor/Editor', () => ({ default: () => null }))
```

Replace it with:

```typescript
vi.mock('@/components/Editor/Editor', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef((_props: object, ref: Parameters<typeof forwardRef>[0]) => {
      useImperativeHandle(ref, () => ({ focus: mockEditorFocus }))
      return null
    }),
  }
})
```

- [ ] **Step 3: Add a `handleKeyDown` describe block with the failing regression test**

Append the following describe block at the end of the outer `describe('ChatPrompt', ...)` block (after the existing `describe('draft cleared on submit', ...)` block, before the final closing `}`):

```typescript
describe('handleKeyDown', () => {
  beforeEach(() => {
    mockEditorFocus.mockClear()
  })

  it('does NOT focus the editor when Space keydown bubbles from a child element', () => {
    const { container } = render(<ChatPrompt />)
    const outerWrapper = container.querySelector('[data-onboarding="chat-input"]') as HTMLElement
    const innerEditorContainer = outerWrapper.firstElementChild as HTMLElement

    fireEvent.keyDown(innerEditorContainer, { key: ' ' })

    expect(mockEditorFocus).not.toHaveBeenCalled()
  })

  it('focuses the editor when Space keydown fires directly on the wrapper', () => {
    const { container } = render(<ChatPrompt />)
    const outerWrapper = container.querySelector('[data-onboarding="chat-input"]') as HTMLElement

    fireEvent.keyDown(outerWrapper, { key: ' ' })

    expect(mockEditorFocus).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 4: Run the first new test to confirm it is RED**

```bash
npx vitest run src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx --reporter=verbose 2>&1 | grep -A 5 "does NOT focus"
```

Expected output: test fails — `mockEditorFocus` was called 1 time but expected 0.

- [ ] **Step 5: Apply the one-line fix in `ChatPrompt.tsx`**

Find line 203–205:

```typescript
const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key === 'Enter' || e.key === ' ') editorRef.current?.focus()
}
```

Replace with:

```typescript
const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' '))
    editorRef.current?.focus()
}
```

- [ ] **Step 6: Run the full test file to confirm all tests are GREEN**

```bash
npx vitest run src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx --reporter=verbose
```

Expected: all tests pass, including both new `handleKeyDown` cases.

- [ ] **Step 7: Commit**

```bash
git add src/pages/chat/components/ChatPrompt/ChatPrompt.tsx \
        src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx
git commit -m "EPMCDME-13954: Add e.target guard to handleKeyDown in ChatPrompt"
```

---

**Test-first: yes — Step 4 (RED) precedes Step 5 (fix)**
