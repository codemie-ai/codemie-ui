# Technical Analysis — Fix scrollbar on chat page (EPMCDME-14842)

## Task Summary
Restore the visible scrollbar on the chat history transcript area. The scrollbar disappeared but content remained scrollable.

## Codebase Findings

### Root Cause
`src/assets/stylesheets/main.scss` applies `scrollbar-width: none` to all elements **except** those carrying the `.show-scroll` CSS class (lines ~76-84). This hides native scrollbars globally.

The chat history scroll container in `src/pages/chat/components/ChatHistory/ChatHistory.tsx` was missing the `.show-scroll` class. It had `overflow-y-auto scrollbar-gutter-edge` but not `.show-scroll`, so the scrollbar was hidden.

### Affected File
- `src/pages/chat/components/ChatHistory/ChatHistory.tsx` — the outermost scrollable div at line ~50

### Related Context
- `src/assets/stylesheets/main.scss` owns the scrollbar visibility rule
- The `.show-scroll` class is the established project opt-in for visible scrollbars
- Recent changes to panel/chat input resize (EPMCDME-13934, EPMCDME-13955, EPMCDME-13984) likely removed or overwrote this class from the container

## Risk Indicators

1. **Regression surface**: chat history is a core user-facing area
2. **CSS global rule**: the hide-by-default pattern affects many components; adding `.show-scroll` only fixes this specific container
3. **Keyboard navigation**: the ticket also notes keyboard Up/Down does not scroll — this is a side-effect of the same missing scrollable container visibility
4. **Test coverage**: existing unit tests cover ChatHistory render but may not assert scrollbar class presence
