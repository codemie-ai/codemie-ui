# Spec: Open last chat after page change and collapse other folders

**Ticket**: EPMCDME-15211

## Problem

The redesigned Chats side panel (EPMCDME-13270) already resolves and navigates to a "last chat"
after a page change, via `useChatNavigation` (`src/pages/chat/hooks/useChatNavigation.tsx`), but
the sidebar UI does not fully reflect that resolution. Three gaps remain:

1. **Unified view folder tab** — `expandSectionForLocation`'s `'folder'` branch in
   `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarSectionsHelpers.ts` (~line 49)
   only expands the outer "Folders" accordion group (`actions.setFolders(true)`); it never calls
   `setActiveFolder(folderKey)`, so the user sees the Folders group open but has to click the
   correct folder tab manually, and any other folder tab left open is never closed.
2. **Focused view is not wired at all.** `useChatSidebarExpansion.ts`'s effect that drives
   `expandSectionForLocation` returns immediately when `isFocused` is true (line 84:
   `if (isFocused) return`). Focused view's own drilldown state (`focusedView` in
   `ChatSidebarLists.tsx`, initialized to `{ type: 'root' }`) has no effect anywhere that opens the
   resolved chat's folder/assistant drilldown on mount — only the imperative `scrollToChat`/
   `expandFolder` handle methods in `useChatSidebarNavigation.ts` (search-jump flows) do this, via
   their own `isFocused` branch. A page change while in Focused mode currently leaves the sidebar at
   the root view regardless of which chat was resolved.
3. **Nothing scrolls the resolved chat into view.** Expanding a section/folder only toggles boolean
   state; the actual `.scrollIntoView()` call lives in `scrollAfterRender`
   (`useChatSidebarNavigation.ts` ~lines 88–102) and today only runs from the imperative
   `expandFolder`/`scrollToChat` handle methods (search-jump), never from the mount-time
   auto-expand path. If the resolved chat's folder/section is long, the chat can be expanded into
   the DOM but remain outside the visible scroll area.
4. **Pinned, Recent Chats, and Recent Assistants reset to a hardcoded default on every page change**,
   because the whole `ChatSidebar`/`ChatSidebarLists` tree unmounts whenever the user leaves `/chats`
   for any other top-level route (`src/router.tsx` — all routes are flat siblings under one
   `<Outlet>`) and remounts on return. `isPinnedExpanded`/`isRecentExpanded` in
   `useChatSidebarExpansion.ts` (~lines 39–40), the equivalents in `FocusedChatSidebar.tsx`
   (~lines 71–73), and "Recent Assistants"'s own `activeIndex` state in
   `ChatSidebarSection.tsx` (~line 33, rendered by `ChatSidebarAssistants.tsx`) all reset to their
   compiled-in defaults, discarding whatever the user last chose, independent of the folder/chat
   auto-open behavior in points 1–3.

## Approach

**Folder tab (Unified view, unchanged from prior revision):** extend the `'folder'` branch of
`expandSectionForLocation` to follow the "clear then open one" pattern already established
elsewhere in the same file family (`useChatSidebarNavigation.ts` `expandFolder`/`scrollToChat`,
`useChatSidebarSections.ts` `handleCreateFolder`/`handleMoveChat`): call
`actions.setActiveFolder(null)` immediately followed by `actions.setActiveFolder(folderKey)`, in
addition to the existing `actions.setFolders(true)`. This mirrors the inline rationale already in
`useChatSidebarNavigation.ts` (~lines 115–116): additive-only folder opening previously accumulated
open tabs until the browser froze; "clear then open one" is the proven fix.

**Focused view parity:** when `currentChat` resolves while `isFocused` is true, drive the same
`focusedView`/navigation-section transition that `scrollToChat`'s existing `isFocused` branch
already performs for search-jump (`useChatSidebarNavigation.ts` ~lines 129–140): resolve the chat's
`ChatSidebarLocation`, call `setFocusedNavigationSection(getFocusedNavigationSection(location))` and
`setFocusedView(getFocusedView(location, chatId))` (both helpers already exist in
`chatSidebarSectionsHelpers.ts`). This reuses existing helpers rather than inventing a new
Focused-view resolution path, and gives Focused view the same "open the right container, highlight
the resolved chat" outcome that Unified view gets from point 1 — closing the exact gap the review
flagged: today's fix only fires for `!isFocused`.

**Scroll into view:** after the resolved chat's folder (Unified) or drilldown (Focused) opens
automatically, if the chat's row is not already within the visible scroll area of its list, scroll
it into view. Reuse the existing `scrollAfterRender` + `chatElementsRef`/`folderElementsRef`
machinery in `useChatSidebarNavigation.ts` rather than adding a second scrolling mechanism; the
mount-time auto-open path invokes the same scroll call the imperative `expandFolder`/`scrollToChat`
methods already use.

**Section-state persistence (Pinned / Recent Chats / Recent Assistants):** persist each section's
last manually-toggled expand/collapse state to `localStorage`, scoped per user, mirroring the
existing `LAST_CHAT_ID` pattern (`src/store/chats.ts` ~line 84, `src/utils/storage.ts`), and restore
it on mount instead of the hardcoded default. This applies to the same semantic section in whichever
view mode is active (Unified's `isPinnedExpanded`/`isRecentExpanded` and Focused view's own
`isPinnedExpanded`/`isRecentExpanded` in `FocusedChatSidebar.tsx` share the restored value, per AC4's
cross-mode consistency requirement), and to "Recent Assistants"'s independent `activeIndex` state.
The existing (and, per the Focused-view point above, newly-extended) auto-expand-for-resolved-chat
behavior continues to take precedence over the restored value for whichever section actually
contains the resolved chat — persistence only changes what a section defaults to when it is *not*
the one containing the resolved chat; it does not change or weaken AC1's "last chat opens
automatically" guarantee. Workflow Runs and the Folders group/`activeFolders` are explicitly out of
scope for persistence: Workflow Runs was not named in the review feedback, and Folders remains fully
driven by the resolved chat's location (there is no hardcoded default for it to fall back to).

No change is needed to `useChatNavigation.tsx` itself — its three-tier resolution (`currentChat` →
`getLastChat()` → first chat) already implements "open last chat after page change" correctly; this
task closes the sidebar-reflection gaps only.

## Acceptance Criteria

- After navigating away from `/chats` to any other top-level route and back while in Unified view,
  if the resolved chat lives inside a folder, that folder's accordion tab is open without the user
  clicking it, and no other folder tab is open.
- In that same Unified-view scenario, if the resolved chat is in Recent or Workflow Runs (not a
  folder), behavior is unchanged: no folder tab opens or needs closing.
- In the same scenario while in Focused view (`organizeBy === FOCUSED` or an active drilldown), the
  resolved chat's folder or assistant drilldown opens automatically, and the resolved chat is shown
  selected/highlighted within it — mirroring Unified view's outcome for AC4's cross-mode consistency.
- In both view modes, if the resolved chat's row is not visible within the current scroll position
  of its list, the sidebar scrolls it into view automatically, matching the existing search-jump
  scroll behavior.
- Pinned, Recent Chats, and Recent Assistants each restore their last manually-toggled
  expand/collapse state from `localStorage` on mount instead of resetting to a hardcoded default —
  unless that section is the one containing the resolved chat, in which case the
  auto-expand-for-resolved-chat behavior takes precedence exactly as it does for the folder case.
- If there is no chat to resolve (empty chat list), folder/drilldown auto-open behavior is
  unchanged from today; persisted Pinned/Recent Chats/Recent Assistants state still restores
  normally.
- The existing "manually pinned section" guard (`hasManuallyExpandedSection`) continues to suppress
  the Unified-view auto-expand-for-location behavior exactly as it does today.
- No regression is introduced for opening chats manually or switching between folders/drilldowns
  while already on `/chats` (in-mount navigation, as opposed to a full page-change remount).

## Non-goals

- Does not change `useChatNavigation.tsx`'s chat-resolution order or its router calls.
- Does not persist `activeFolders`/`isFoldersExpanded` (the Folders group or which specific folder
  tab is open) — remains fully driven by the resolved chat's location, as before; there is no
  hardcoded default for it to fall back to.
- Does not persist Workflow Runs' expand/collapse state — not named in the review feedback; left at
  today's hardcoded default.
- Does not add cross-device or cross-browser sync for persisted section state — `localStorage`
  only, same scope as the existing `LAST_CHAT_ID` mechanism.
- Does not address `currentChat` changing to a different folder/section *without* a full page
  unmount/remount (e.g., clicking a different chat while already on `/chats`) — gated by the
  pre-existing `hasManuallyExpandedSection`/`isFoldersExpanded` guards, unchanged here.
- Does not add new automated test coverage as a hard requirement of this spec (see Open Risks);
  test scope is left to the implementation plan.
- Does not change the two `chatsStore.currentChat = null` reset points in `src/store/chats.ts`
  (~lines 533, 729) — plain navigation never nulls `currentChat`, so those paths are unrelated.

## Open Risks

- Neither `useChatNavigation`, `expandSectionForLocation`'s `'folder'` branch, nor the Focused-view
  drilldown path has existing test coverage.
- Reusing `scrollAfterRender`'s `requestAnimationFrame`-based timing for the mount-time auto-expand
  path (rather than the imperative ref-driven call sites it serves today) may need different
  sequencing if the accordion/drilldown is still animating open on first mount; verify during
  implementation.
- Precedence between restored persisted section state and the auto-expand-for-resolved-chat
  behavior needs a concrete check once wired, to rule out a visible flicker (persisted-collapsed
  state briefly rendering before the resolved-chat effect re-expands it).
- If the `if (isFoldersExpanded) return` guard (`useChatSidebarExpansion.ts` ~line 92) or its
  Focused-view equivalent is ever relaxed, its interaction with the newly-added persistence needs
  re-checking.
