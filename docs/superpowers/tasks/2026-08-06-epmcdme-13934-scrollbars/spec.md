# EPMCDME-13934: Fix unwanted scrollbars in chat page

## Goal

Remove the two unwanted scrollbar artifacts visible in the chat history/prompt area:
- A thin scrollbar track at the **right edge** of the chat content (from Firefox inheriting `scrollbar-width: thin` via the `.show-scroll` ancestor)
- A phantom gutter strip at the **left edge** of the chat scroll containers (from `scrollbar-gutter: stable both-edges` reserving a mirrored gutter space)

## Root cause

EPMCDME-11292 added a full-height `ChatPrompt` in resizable mode. Before that change, the ChatPrompt scroll container had `h-fit` sizing (tiny height, ~64px). After EPMCDME-11292, in resizable mode, the ChatPrompt scroll container fills its entire Panel allocation (e.g., ~30% of screen height ≈ 180px).

Two CSS factors combine to produce the visible scrollbars:

1. **Inherited `scrollbar-width: thin`**: PageLayout's children container carries the `.show-scroll` class, which defines `scrollbar-width: thin`. `scrollbar-width` is a CSS-inherited property. Both `ChatHistory` and `ChatPrompt`'s `overflow-y-auto` scroll containers are descendants of this `.show-scroll` element and therefore inherit `scrollbar-width: thin`. The existing global WebKit rule (`::-webkit-scrollbar { display: none }`) hides scrollbars on Chrome/Safari but does not affect Firefox, where `scrollbar-width: thin` produces a visible thin scrollbar. With the newly full-height ChatPrompt Panel, this thin scrollbar is now prominently visible in Firefox where it previously went unnoticed.

2. **`scrollbar-gutter: stable both-edges` left gutter**: The `.scrollbar-gutter` CSS class applies `scrollbar-gutter: stable both-edges`, which reserves gutter space on **both** left and right sides of vertical scroll containers. On Windows (non-overlay scrollbars), this left-side reserved space renders as a visible blank/colored strip. Before EPMCDME-11292 this also existed on ChatHistory, but the addition of the same class to the full-height resizable ChatPrompt makes it more prominent in the has-history state where both containers are visible simultaneously.

## Scope

Pure CSS/class change. No API calls, no store changes, no new dependencies.

Files: `src/assets/stylesheets/main.scss`, `src/pages/chat/components/ChatHistory/ChatHistory.tsx`, `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`.

## Fix

### 1. `main.scss` — Extend global scrollbar hiding to Firefox and IE/Edge

The existing rule only covers WebKit (Chrome/Safari). Extend it with `scrollbar-width: none` and `-ms-overflow-style: none` for Firefox and IE/Edge, scoped to the same non-`.show-scroll` selector:

```scss
html, body, #app {
  // Existing rule — WebKit scrollbar hiding
  :not(textarea):not(.show-scroll)::-webkit-scrollbar {
    display: none;
  }

  // NEW: same scope, covers Firefox and IE/Edge
  :not(textarea):not(.show-scroll) {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
}
```

This prevents `scrollbar-width: thin` (inherited from `.show-scroll` ancestors) from leaking into descendant scroll containers on Firefox. It is consistent with the existing WebKit behavior and applies project-wide to all elements that are not `.show-scroll`.

### 2. `ChatHistory.tsx` — Replace `scrollbar-gutter` with `scrollbar-gutter-edge`

Change `scrollbar-gutter` (which is `scrollbar-gutter: stable both-edges`) to `scrollbar-gutter-edge` (which is `scrollbar-gutter: stable`, right side only). This removes the left-side phantom gutter strip while preserving single-edge stability (content does not shift when the scrollbar appears on ChatHistory overflow).

Before: `"h-full w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter"`
After:  `"h-full w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter-edge"`

### 3. `ChatPrompt.tsx` — Remove `scrollbar-gutter` from the resizable scroll container

In resizable mode, the ChatPrompt scroll container's inner content is bounded by `h-full min-h-0` chain exactly filling the Panel height — there is no scroll overflow to stabilize. The `scrollbar-gutter` class there adds a `both-edges` left-side gutter strip without providing any layout-shift benefit.

Before: `'w-full flex flex-col px-6 scrollbar-gutter overflow-y-auto z-10'`
After:  `'w-full flex flex-col px-6 overflow-y-auto z-10'`

The `overflow-y-auto` is retained (safety valve for edge cases where content might transiently exceed the panel); only the `scrollbar-gutter` class is removed.

## Acceptance criteria

- AC-1: No visible scrollbar tracks at the left or right edge of the chat content area (ChatHistory and ChatPrompt scroll containers) in either Firefox or Chrome on Windows.
- AC-2: Chat history messages still scroll correctly when they exceed the Panel height.
- AC-3: The ChatPrompt resize handle and panel sizing are unaffected.
- AC-4: No regression on pages that use `.show-scroll` for their intentional scrollbars (PageLayout, Sidebar, etc.).
- AC-5: All existing unit and integration tests pass.
