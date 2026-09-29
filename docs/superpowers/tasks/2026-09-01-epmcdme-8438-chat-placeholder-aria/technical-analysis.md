# Technical Analysis — EPMCDME-8438

## 1. Task Context

Screen reader (NVDA) does not announce the chat input placeholder text. Quill renders a `contenteditable` div whose placeholder is CSS-only (`.ql-editor::before`), invisible to assistive technology. Fix: set `aria-label` on `quill.root` at both imperative call sites in `Editor.tsx`.

## 2. Project Structure

- React 18 / TypeScript 5 / Vite 5 / PrimeReact (Quill wrapper) / Valtio / React Router 7 / DOMPurify
- Tests: Vitest + React Testing Library, two projects — `unit` and `integration`

## 3. Key Files

| File | Role |
|---|---|
| `src/components/Editor/Editor.tsx` | Shared component wrapping `primereact/editor`; exposes `placeholder` prop |
| `src/components/Editor/quillModules.ts` | Quill module config; already uses `setAttribute('aria-label', ...)` on mention list items |
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | Consumer; holds `PLACEHOLDERS` record; passes active value as `placeholder` to `<Editor>` |
| `src/components/Editor/Editor.scss` | CSS `.ql-editor::before` placeholder (visual only, invisible to screen readers) |

## 4. Codebase Findings

### Call sites in `Editor.tsx`

**Site 1 — `useEffect([placeholder])`** (lines 128–133):
```typescript
useEffect(() => {
  const quill = editorRef.current?.getQuill()
  if (quill && placeholder !== undefined) {
    quill.root.setAttribute('data-placeholder', placeholder)
    // FIX: add quill.root.setAttribute('aria-label', placeholder)
  }
}, [placeholder])
```

**Site 2 — `onLoad` callback** (lines 181–190):
```typescript
onLoad={() => {
  const quill = editorRef.current?.getQuill()
  if (quill) {
    quill.root.innerHTML = DOMPurify.sanitize(value.messageRaw)
    const length = quill.getLength()
    quill.setSelection(length, 0)
    quill.focus()
    onEditorLoad?.(quill)
    // FIX: if (placeholder !== undefined) quill.root.setAttribute('aria-label', placeholder)
  }
}}
```

### PLACEHOLDERS in `ChatPrompt.tsx` (lines 59–63):
```typescript
const PLACEHOLDERS: Record<PromptMode, string> = {
  [PROMPT_MODES.DEFAULT]: "Ask anything or add an assistant with '@'",
  [PROMPT_MODES.WORKFLOW]: 'Ask anything',
  [PROMPT_MODES.WORKFLOW_INTERRUPTED]: 'Leave empty or type a message for the next step',
}
```

No callers need API changes — `placeholder` prop already flows through unchanged.

### Established pattern
`quillModules.ts` lines 113 and 141 already call `container.setAttribute('aria-label', ...)` on mention list items — same imperative pattern.

## 5. Test Coverage

| Test file | What it covers | Relevance |
|---|---|---|
| `src/components/Editor/__tests__/Editor.font.integration.test.ts` | Source-inspection, font-family rules | None for this fix |
| `src/components/Editor/__tests__/quillModules.font.integration.test.ts` | Source-inspection, mention container class | None |
| `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` | Stubs `<Editor>` with forwardRef mock | Does not exercise `quill.root` |

**Gap:** No test exercises `aria-label` on `quill.root`. Both `useEffect` and `onLoad` call sites are untested at the DOM level.

## 6. Risk Indicators

1. **`undefined` guard on `onLoad`**: `onLoad` currently does not guard `placeholder !== undefined`. `setAttribute('aria-label', undefined)` would write the string `"undefined"`. Must add the same guard already present in the `useEffect`.
2. **Both sites must stay in sync**: A late-arriving `placeholder` prop update is handled by `useEffect([placeholder])` — this already re-syncs the attribute. The `onLoad` site handles initial mount. Both sites are necessary to cover all states.

## 7. Summary for Complexity Assessment

Single shared component (`src/components/Editor/Editor.tsx`), two precisely identified call sites. Both already call `quill.root.setAttribute(...)` imperatively — the addition mirrors the existing `data-placeholder` pattern exactly. No new architectural surface. No callers need to change their API. Technical novelty is minimal; the pattern is already established in the codebase. Change is small, low-risk, entirely contained within `src/components/Editor/Editor.tsx`.

## 8. External References

None.
