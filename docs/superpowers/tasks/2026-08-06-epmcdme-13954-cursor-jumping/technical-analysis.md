# Technical Analysis — EPMCDME-13954: Cursor jumps to end on Space keypress

## Codebase Findings

### Root Cause

`src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` lines 203–205:

```typescript
const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key === 'Enter' || e.key === ' ') editorRef.current?.focus()
}
```

This handler is applied to two wrapper `div` elements (lines 246, 272). It is missing the event target guard that is already correctly applied in the adjacent `focusEditor` and `handleMouseDown` handlers:

```typescript
const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
  if (e.target === e.currentTarget) e.preventDefault()  // ← guard present
}

const focusEditor = (e: MouseEvent<HTMLDivElement>) => {
  if (e.target === e.currentTarget) editorRef.current?.focus()  // ← guard present
}
```

Without the guard, a `keydown` event from the inner Quill editor bubbles up to the wrapper `div`, triggers `handleKeyDown`, and calls `editorRef.current?.focus()`.

### focus() side effect

`src/components/Editor/Editor.tsx` lines 157–163 (the imperative focus handle exposed via `editorRef`):

```typescript
focus: () => {
  const quill = editorRef.current?.getQuill()
  if (quill) {
    const length = quill.getLength()
    quill.setSelection(length, 0)  // ← moves cursor to end
    quill.focus()
  }
},
```

`quill.setSelection(length, 0)` unconditionally moves the cursor to the end of the document. So every Space keypress inside the editor triggers this and the cursor jumps to the end before Quill inserts the character.

### Regression History

- Introduced in commit `5867f3f38c` (EPMCDME-11292: Add draggable resize handle, 2026-08-04).
- Prior EPMCDME-13527 had the guard correctly in `handleFocusEditorKeyDown` via `dfae99d7f`; the pattern was copied without it.

### Affected Files

| File | Lines | Change needed |
|---|---|---|
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | 203–205 | Add `e.target === e.currentTarget &&` guard |
| `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` | new | Add regression tests for bubbled vs direct keydown |

### Risk Indicators

- **Low blast radius**: single guard addition, no logic change.
- **No dependency changes**: fix is self-contained in one handler.
- **Existing test file** covers ChatPrompt; test infrastructure is in place for the regression test.
- **No API, store, or routing changes** required.
