# Spec — EPMCDME-13954: Fix cursor jumping to end on Space keypress

## Problem

Pressing Space inside the Quill prompt editor moves the cursor to the end of the text instead of inserting a space at the current position.

## Root Cause

`handleKeyDown` in `ChatPrompt.tsx` is missing the `e.target === e.currentTarget` guard. Without it, Space keydown events from the inner Quill editor bubble up to the wrapper `div`, trigger `handleKeyDown`, and call `editorRef.current?.focus()`. That focus method calls `quill.setSelection(length, 0)`, moving the cursor to the end before Quill inserts the character.

The guard is already applied correctly in the adjacent `handleMouseDown` and `focusEditor` handlers in the same component.

## Fix

Add `e.target === e.currentTarget &&` to `handleKeyDown` in `ChatPrompt.tsx`:

```typescript
// Before
const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key === 'Enter' || e.key === ' ') editorRef.current?.focus()
}

// After
const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' '))
    editorRef.current?.focus()
}
```

## Regression Risk

None. Both wrapper `div`s have `role="none"` and no `tabIndex`, so they cannot receive keyboard focus directly. The guard makes the handler a true no-op for bubbled events, which is the correct and safe behavior.

## Acceptance Criteria

1. Pressing Space inside the Quill prompt editor inserts a space at the current cursor position.
2. The cursor does not jump to the end of the text on Space keypress.
3. Pressing Enter or Space directly on the wrapper `div` (when it is the event target) still calls `editorRef.current?.focus()`.
4. A regression test verifies that a bubbled Space keydown from a child element does NOT call `editorRef.current?.focus()`.
5. A regression test verifies that a Space keydown directly on the wrapper DOES call `editorRef.current?.focus()`.
6. No existing tests break.

## Files Changed

| File | Change |
|---|---|
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | Add `e.target === e.currentTarget &&` guard (1 line) |
| `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` | Add 2 regression test cases |
