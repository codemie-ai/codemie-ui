# EPMCDME-14054 — Sticky Code Block Header

## Overview

Make the code block header sticky so Copy and Download buttons remain accessible when scrolling through a long code block in the chat UI. Approach C (Codex Desktop style): the existing header pins to the top of the chat scroll container as the user scrolls down. No new buttons are added.

## Scope

Three files change; one test block is added.

| File | Change |
|---|---|
| `src/components/CodeBlock/CodeBlock.tsx` | New `stickyHeader?: boolean` prop + sticky wrapper div around header |
| `src/components/markdown/MarkdownTokens.tsx` | Pass `stickyHeader` at the code-token render site |
| `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx` | New test cases asserting sticky class presence |
| `CodeBlock.scss` | No changes |
| `ChatHistory.tsx` | No changes |

## Architecture

`ChatHistory`'s `overflow-y-auto` div is already the correct sticky ancestor. No scroll-listener or JS is involved — pure `position: sticky` CSS.

## Component Design

### `CodeBlock.tsx`

Add `stickyHeader?: boolean` to `CodeBlockProps` (default `false`). Wrap the existing header div in a thin outer div that carries the sticky classes:

```tsx
<div className={cn(stickyHeader && 'sticky top-0 z-10')}>
  <div
    className={cn(
      'flex justify-between code-block-header items-center gap-x-4 gap-y-2 flex-wrap py-2 !pl-4 !pr-2 !m-0 bg-surface-base-tertiary shadow-block border border-border-specific-panel-outline rounded-t-lg',
      expandable && 'code-block-header--has-expand',
      headerClassName
    )}
  >
    {/* unchanged content */}
  </div>
</div>
```

The wrapper div has no class when `stickyHeader` is `false`. All existing callers (workflow drawer, settings, ConfigPanel, expand popup) are unaffected.

The `.code-block-header` div keeps `container-type: inline-size` exclusively on itself — the sticky anchor is the outer wrapper, avoiding the CSS containment/sticky interaction edge case.

### `MarkdownTokens.tsx`

Line 104 — add the `stickyHeader` prop:

```tsx
return <CodeBlock key={i} text={token.text ?? ''} language={token.lang} stickyHeader />
```

### CSS notes

- `bg-surface-base-tertiary` already set on the inner header div — no scrolled content bleeds through when sticking.
- `z-10` follows the codebase convention for panel-level sticky headers.
- `rounded-t-lg` stays on the inner header div. Rounded top corners remain visible when sticking — consistent with Claude.ai code block behavior and accepted design.
- Sticky boundary is the `.code-block` parent div: the header unsticks naturally once the user scrolls past the bottom of the code block.

## Testing

`CodeBlock.integration.test.tsx` — two new cases:

1. **Default (no `stickyHeader` prop)** — the wrapper element (`.code-block-header`'s `parentElement`) does not have class `sticky`.
2. **`stickyHeader={true}`** — the wrapper element has classes `sticky`, `top-0`, `z-10`.

JSDOM does not implement sticky layout. Tests assert class presence only. Browser verification required: scroll a long code block in chat and confirm the header pins at the top of the viewport.

## Non-goals

- No JavaScript scroll listeners or IntersectionObserver.
- No sticky in workflow, settings, or expand-popup contexts.
- No changes to the copy/download button behavior.
- No new buttons.
