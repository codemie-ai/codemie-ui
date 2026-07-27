# Technical Analysis — EPMCDME-13611: Fix Copy Table Button Hover Behavior

**Feature area**: copy table button markdown chat assistant hover
**Generated**: 2026-07-21
**Research path**: codegraph

---

## 1. Original Context

Fix the Copy button on Markdown tables in AI Assistant output so it auto-hides when the pointer leaves the hover area, without requiring an additional click.

Bug details:
- The Copy button displayed for a Markdown table in the AI Assistant output remains visible after the user clicks it and moves the mouse away from the button.
- The button should be hidden when the pointer leaves the table/button hover area and should not require an additional click to disappear.
- Likely cause: a click-triggered state change (e.g. toggling a CSS class or React state like `copied: true`) overrides the CSS hover-only visibility rule.

Acceptance Criteria:
- Copy button appears when user hovers over a Markdown table in assistant output.
- After clicking Copy, table content is copied as expected.
- Copy button is hidden when pointer leaves the table/button hover area.
- No additional click required to dismiss.
- Existing copy functionality not broken.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/markdown/tokens/TableBlock.tsx` — The single component responsible for rendering a Markdown table with its Copy button overlay. Lines 28–44 contain the entire relevant logic.
- `src/utils/utils.ts:119` — `copyToClipboard(message, notification)`: pure async function; writes to `navigator.clipboard` and fires a toaster. Sets **no React state** and returns nothing meaningful.
- `src/utils/helpers.ts:144` — Duplicate `copyToClipboard` implementation (for other domains); not used by `TableBlock`.

`TableBlock` is registered in `src/components/markdown/tokens/MarkdownTokens` and rendered dynamically via the `Markdown` component, which is consumed by `ChatAiMessage` among other places.

### Architecture and Layers Affected

| Layer | Component |
|---|---|
| Presentation / Markdown tokens | `src/components/markdown/tokens/TableBlock.tsx` |
| Chat output | `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` (consumer, no change needed) |
| Utility | `src/utils/utils.ts` — `copyToClipboard` (no change needed) |

Only the **Presentation layer** (`TableBlock.tsx`) needs to change.

### Integration Points

- `MarkdownTokens` → `TableBlock` (dynamic JSX dispatch — confirmed by codegraph call graph)
- `ChatAiMessage` → `Markdown` → `MarkdownTokens` → `TableBlock`
- `TableBlock` → `Button` (shared `src/components/Button/Button.tsx`)
- `TableBlock` → `copyToClipboard` from `src/utils/utils.ts`

No external service connections involved.

### Patterns and Conventions

- Visibility is managed via **Tailwind CSS group-hover** pattern: parent div carries `group` class; child uses `group-hover:opacity-100`. No React state (`useState`) is involved in `TableBlock` — it is a pure functional component with no hooks.
- `Button` component from `src/components/Button/Button.tsx` is the standard interactive element; no custom button primitives.
- `copyToClipboard` is the project-standard clipboard utility (44 callers across the codebase).

---

## 3. Root Cause Analysis

**File**: `src/components/markdown/tokens/TableBlock.tsx`, line 31

```tsx
<div className="absolute top-0 right-0 z-10 flex items-center h-9 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
```

The overlay div has **two** visibility conditions:
1. `group-hover:opacity-100` — shows when the pointer is over the parent `.group` div (correct behavior)
2. `focus-within:opacity-100` — shows when **any descendant element has DOM focus** (the bug trigger)

**Sequence that causes the bug:**
1. User hovers the table → `group-hover:opacity-100` → button appears.
2. User clicks the Copy button → browser assigns DOM focus to the `<button>` element (standard browser behavior on click).
3. User moves mouse away → `group-hover` deactivates, but the `<button>` still holds focus.
4. `focus-within` on the overlay div remains satisfied → `opacity-100` persists.
5. Button stays visible until the user clicks somewhere else (which moves focus), requiring an extra click.

**This is not a React state issue.** There is no `useState` in `TableBlock`, and `copyToClipboard` performs no state mutation. The cause is entirely CSS: `:focus-within` keeps the overlay visible because mouse clicks transfer focus to the clicked element.

---

## 4. Files to Change

| File | Change |
|---|---|
| `src/components/markdown/tokens/TableBlock.tsx` | Blur the button after click so `:focus-within` is released immediately |

**Minimal fix — change only the `onClick` prop of `Button` (line 38):**

Current:
```tsx
onClick={() => copyToClipboard(raw.trim(), 'Table copied to clipboard')}
```

Required:
```tsx
onClick={(e) => {
  copyToClipboard(raw.trim(), 'Table copied to clipboard')
  ;(e.currentTarget as HTMLElement).blur()
}}
```

`e.currentTarget.blur()` removes DOM focus from the button immediately after the click handler runs. This clears the `:focus-within` condition on the overlay div, allowing `opacity-0` to take effect as soon as the pointer leaves the `.group` area.

**Why not remove `focus-within:opacity-100` entirely?**  
Removing it would break keyboard accessibility: keyboard users Tab to the button and it must become visible. The `focus-within` class is correct for that use-case. The fix must keep it and just drop focus programmatically after a pointer click.

**Why not use `focus-visible-within`?**  
Tailwind has no built-in `focus-visible-within` variant. A custom variant would work but is a larger change. The `blur()` approach is surgical and self-contained to the one file.

**No other files require changes.** `copyToClipboard`, `Button`, and the parent components are unaffected.

---

## 5. Risk Indicators

- **No existing test coverage for `TableBlock`** — codegraph confirms zero test files cover this component. Any fix requires a new test to be written.
- **No tests for `copyToClipboard`** — 44 callers, zero tests; adding `.blur()` to the onClick does not change `copyToClipboard` itself, but the integration is untested.
- **`dangerouslySetInnerHTML`** used in `TableBlock` line 30 — pre-existing risk, not introduced by this fix; must not be touched.
- **Accessibility regression risk** — if `focus-within:opacity-100` were removed rather than using `blur()`, keyboard users would be unable to discover the button. The proposed fix avoids this.
- **`e.currentTarget` type** — inside a React synthetic event handler, `e.currentTarget` is typed as `EventTarget & HTMLButtonElement` via the `Button` component's `onClick` signature; the cast `as HTMLElement` is safe and consistent with other usages in the codebase.

---

## 6. Test Files

| File | Status | Notes |
|---|---|---|
| `src/components/markdown/tokens/__tests__/TableBlock.test.tsx` | **Does not exist** | Must be created |
| `src/utils/__tests__/utils.test.ts` | Not found by codegraph | `copyToClipboard` has no covering tests |

**Tests to create for `TableBlock`:**
1. Button is not visible initially (opacity class present, `aria-label="Copy table"` button in DOM).
2. Button becomes visible on hover (simulate `mouseenter` on group div).
3. After click, `copyToClipboard` is called with `raw.trim()`.
4. After click, button loses focus (`document.activeElement` is not the button).
5. Button is visible when focused via keyboard Tab (focus state).

---

## 7. Summary for Complexity Assessment

The bug lives in a single 44-line presentational component with no state, no hooks, and no external dependencies beyond a clipboard utility and a shared `Button`. The root cause is a CSS interaction between `focus-within:opacity-100` (for accessibility) and default browser focus behavior on click: when the Copy button is clicked, the browser assigns it DOM focus, which satisfies `:focus-within` and keeps the overlay visible even after the pointer leaves. The fix is one line added to the `onClick` handler — `(e.currentTarget as HTMLElement).blur()` — which drops focus immediately post-click and restores the CSS-only hover behavior.

The change surface is exactly one file (`TableBlock.tsx`, one prop change) with zero cascading effects. The component is a pure functional component with no shared state, and `copyToClipboard` is not modified. The `Button` component and all 44 other `copyToClipboard` callers are untouched.

Test coverage is the only elevated risk: `TableBlock` has zero tests. A new test file must be written to cover the hover/focus/click visibility cycle. Since the project uses Vitest and React Testing Library (pattern confirmed from other test files in the codebase), the test can simulate hover via `fireEvent.mouseEnter`, click via `userEvent.click`, and assert `document.activeElement` to verify the blur. Complexity is low — one file change, one new test file.
