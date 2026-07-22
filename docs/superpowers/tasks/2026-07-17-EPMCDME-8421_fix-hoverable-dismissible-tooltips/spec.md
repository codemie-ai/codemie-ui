# Spec: EPMCDME-8421 — Fix Hoverable and Dismissible Tooltips

## Problem

Tooltips triggered by hover violate WCAG 2.1 SC 1.4.13 "Content on Hover or Focus" in two ways:

1. **Not hoverable** — moving the cursor from the trigger onto the tooltip causes it to disappear immediately, because the tooltip loses its anchor's `mouseover`/`mouseleave` boundary.
2. **Not dismissible** — pressing Esc does not close the tooltip. The cursor hiding on keyboard input (macOS/Windows OS behavior) is unrelated to dismissal.

## Affected Sites (all from ticket reproduction list)

All reproduction sites use the app-wide react-tooltip singleton via `data-tooltip-id="react-tooltip"`:

| Site | File |
|---|---|
| Hide/Open Sidebar button | `src/components/Sidebar/SidebarToggle.tsx` |
| Workflows/Applications sidebar toggle | renders `<SidebarToggle />` |
| Execution info button | `src/components/DataOverlayButton/DataOverlayButton.tsx` |
| Share Chat button | `src/pages/chat/components/ChatHeader/ChatHeaderShareButton/ChatHeaderShareButton.tsx` |
| Export Chat button | `src/pages/chat/components/ChatHeader/ChatHeaderDownloadConversationButton.tsx` |
| Clear Chat button | `src/pages/chat/components/ChatHeader/ChatHeaderClearButton.tsx` |
| AI/Run Chatbot image buttons (assistant avatars in chat sidebar) | `src/components/Avatar/Avatar.tsx` (`withTooltip` prop) |
| Chatbot containers in Configuration sidebar | `src/pages/chat/components/ChatConfiguration/ChatConfigAssistants/ChatConfigAssistantCard.tsx` |
| Copy / Edit / Resend / Delete message buttons | `src/pages/chat/components/ChatHistory/ChatMessageAction.tsx` |
| Attach file button | `src/pages/chat/components/ChatPrompt/ChatPromptFileUpload.tsx` |

## Root Cause

`setupGlobalTooltip()` in `src/utils/tooltip.ts` creates the singleton with neither `clickable` nor `globalCloseEvents` configured:

```ts
React.createElement(Tooltip, {
  id: 'react-tooltip',
  arrowColor: 'transparent',
  openEvents: { mouseover: true },
  className: '...',
})
```

- Without `clickable: true`, the tooltip closes when the cursor leaves the anchor element boundary — moving onto the tooltip itself counts as leaving.
- Without `globalCloseEvents`, no keyboard event triggers dismissal.

## Solution

Add two props to the singleton in `src/utils/tooltip.ts`. No other files change.

```ts
React.createElement(Tooltip, {
  id: 'react-tooltip',
  arrowColor: 'transparent',
  openEvents: { mouseover: true },
  clickable: true,
  globalCloseEvents: { escape: true },
  className: '...',
})
```

- `clickable: true` (react-tooltip v5 API) — keeps the tooltip mounted while the cursor is over the tooltip element itself, satisfying the "hoverable" requirement.
- `globalCloseEvents: { escape: true }` (react-tooltip v5 API) — registers a `keydown` listener that closes the tooltip on Esc, satisfying the "dismissible" requirement. The listener is scoped to this tooltip instance.

**react-tooltip version:** 5.29.1 — both props are stable v5 APIs. No dependency changes required.

## Files Changed

| File | Change |
|---|---|
| `src/utils/tooltip.ts` | Add `clickable: true` and `globalCloseEvents: { escape: true }` to singleton props |

## Edge Case: Export Chat Button Tooltip Suppression

`ChatHeaderDownloadConversationButton` suppresses its tooltip while the export overlay is open:

```tsx
data-tooltip-content={isOverlayVisible ? '' : 'Export Conversation'}
```

With `clickable: true`, an empty string content is treated as falsy by react-tooltip v5 — the tooltip does not render. The existing suppression logic continues to work unchanged. Verify this in the RED/GREEN cycle.

## Acceptance Criteria

1. Hovering over any listed button shows the tooltip.
2. Moving the cursor from the button onto the tooltip keeps the tooltip visible.
3. Moving the cursor off the tooltip closes it.
4. Pressing Esc while a tooltip is open closes it without moving the cursor.
5. The Export Chat tooltip does not appear (blank or otherwise) while the export overlay is open.
6. Tooltip appearance (color, border, padding, placement, arrow) is unchanged.

## Out of Scope

- **PrimeReact tooltips** (`src/components/Tooltip/Tooltip.tsx` and its 25 callers, including the description/title popup on assistant cards in `src/components/Card/Card.tsx`) — different visual system, different styling, WCAG fix requires a separate approach. Follow-on ticket.
- **`data-pr-tooltip` sites** (18 files: RadioButton, WorkflowCard, SkillCard, DataSourceStatus, etc.) — same follow-on scope.
- **Floating UI migration** — not needed for this ticket; all reported sites already use react-tooltip.

## Testing

No existing tests cover the affected components or `setupGlobalTooltip`. Manual verification against the reproduction steps in the ticket is the primary gate. A focused smoke test verifying `clickable` and `globalCloseEvents` props are passed to the singleton is sufficient for automated coverage.
