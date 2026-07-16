# EPMCDME-13243: Table Copy Button

## Summary

Add a dedicated copy button to markdown table outputs in the CodeMie UI. Users currently must manually select wide or long tables with the mouse to copy them. The button copies the full markdown pipe-table text to the clipboard regardless of table size.

## Problem

The markdown renderer renders tables via `dangerouslySetInnerHTML`, making the table a plain DOM node with no interactive affordance. Wide or long tables are inconvenient to select and copy manually.

## Solution

Extract the `table` token type from the generic `blockTokens` path in `MarkdownTokens.tsx` and render it through a new `TableBlock.tsx` component. The component wraps the existing sanitized HTML in a `relative`-positioned container and overlays a copy button in the top-right corner — the same pattern used by `MermaidDiagram.tsx`.

## Components

### `src/components/markdown/tokens/TableBlock.tsx`

New component. Receives two props:

- `html: string` — DOMPurify-sanitized HTML string produced by `Parser.parse([token], options)` (same call `MarkdownTokens` already makes for block tokens; includes the `overflow-x-auto` wrapper added by the table renderer).
- `raw: string` — The raw markdown pipe-table string from `token.raw`, used as the clipboard payload.

Structure:

```
<div className="relative my-1">
  <div dangerouslySetInnerHTML={{ __html: html }} />
  <Button
    variant={ButtonType.TERTIARY}
    size={ButtonSize.MEDIUM}
    className="absolute top-0 right-0 z-10 bg-surface-base-primary hover:bg-surface-specific-dropdown-hover"
    aria-label="Copy table"
    data-tooltip-id="react-tooltip"
    data-tooltip-content="Copy table"
    onClick={() => copyToClipboard(raw, 'Table copied to clipboard')}
  >
    <CopySvg className="h-4 w-4" />
  </Button>
</div>
```

### `src/components/markdown/MarkdownTokens.tsx`

Two changes:

1. Remove `'table'` from the `blockTokens` array (line 44).
2. Add an explicit branch before the `blockTokens` check (or after the existing special-case checks):

```ts
if (token.type === TOKEN_TYPES.table) {
  return (
    <TableBlock
      key={i}
      html={DOMPurify.sanitize(Parser.parse([token], options), { ADD_ATTR: ['target'] })}
      raw={token.raw}
    />
  )
}
```

No other files change.

## Copy Behaviour

- **Payload**: `token.raw` — the original markdown pipe-table string, unmodified.
- **Format**: Plain text (markdown pipe-table syntax).
- **Feedback**: `toaster.info('Table copied to clipboard')` via the existing `copyToClipboard` utility.
- Works for tables of any size because the source is the token, not the visible viewport.

## Accessibility

- Button has `aria-label="Copy table"`.
- Button uses the global `react-tooltip` system (`data-tooltip-id="react-tooltip"`, `data-tooltip-content="Copy table"`).
- `Button` component is keyboard-focusable by default.

## Style

- `ButtonType.TERTIARY` / `ButtonSize.MEDIUM` — matches MermaidDiagram button style.
- `bg-surface-base-primary hover:bg-surface-specific-dropdown-hover` — matches MermaidDiagram.
- Button is always visible (not hover-only).

## What Does Not Change

- `Markdown.utils.ts` table renderer (`overflow-x-auto` wrapper is preserved — it is part of the rendered HTML string passed to `TableBlock`).
- `ChatAiMessageActions.tsx` message-level copy (completely independent code path).
- All other token types in `MarkdownTokens.tsx`.

## Testing

File: `src/components/markdown/tokens/__tests__/TableBlock.test.tsx`

| # | Test | Assertion |
|---|---|---|
| 1 | Renders table HTML | The sanitized HTML string appears in the DOM |
| 2 | Renders copy button | Button with `aria-label="Copy table"` is present |
| 3 | Copy on click | Clicking the button calls `copyToClipboard` with the raw markdown string |

## Acceptance Criteria (from ticket)

- A visible copy button is available for generated table outputs. ✓
- Clicking copies the full table content, not only the visible portion. ✓
- Copied content preserves markdown pipe-table structure. ✓
- Works for wide and long tables. ✓
- User receives clear feedback after copying (`toaster.info`). ✓
- Copy button follows existing CodeMie UI style. ✓
- Accessible via keyboard navigation. ✓
- Button has accessible name "Copy table". ✓
- Existing message-level copy is not broken. ✓
