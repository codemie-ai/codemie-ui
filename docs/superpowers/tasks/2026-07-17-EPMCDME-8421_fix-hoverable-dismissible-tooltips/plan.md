# Plan: EPMCDME-8421 — Fix Hoverable and Dismissible Tooltips

## Overview

Single-file change to the react-tooltip global singleton. Two props added to `setupGlobalTooltip()`. All 9 reported reproduction sites are fixed simultaneously with no per-component changes.

---

## Task 1 — Add `clickable` and `globalCloseEvents` to the singleton

**File:** `src/utils/tooltip.ts`

**Change:** In `setupGlobalTooltip()`, add two props to the `React.createElement(Tooltip, {...})` call:

```ts
clickable: true,
globalCloseEvents: { escape: true },
```

**Test-first: yes** — write a test that renders the singleton and asserts both props are present on the rendered `<Tooltip>` element before touching the implementation.

**Verify edge case:** After adding the props, manually test `ChatHeaderDownloadConversationButton` — open the export overlay, confirm no blank tooltip appears (empty string content should suppress rendering in react-tooltip v5).

---

## Commit

```
EPMCDME-8421: Fix tooltip hover and Esc dismiss behavior
```

Single commit covering the implementation and any test added.
