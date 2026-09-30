# Plan: EPMCDME-15211 — Open last chat after page change and collapse other folders

Spec: `docs/superpowers/tasks/2026-09-25-epmcdme-15211/spec.md`
Analysis: `docs/superpowers/tasks/2026-09-25-epmcdme-15211/technical-analysis.md`

Commit per task using the repository's existing convention (ticket-prefixed subject).

No change to `src/pages/chat/hooks/useChatNavigation.tsx` or to the two
`chatsStore.currentChat = null` reset points in `src/store/chats.ts` (~lines 533, 729) — the
spec's resolution order and those reset points are explicit non-goals.

## Negative constraints

- Does not touch `useChatNavigation.tsx`'s resolution order or router calls — T1–T6 only edit
  `ChatSidebarLists/**` and the new persistence hook.
- Does not persist `activeFolders`/`isFoldersExpanded` — T1 adds `setActiveFolder` calls but no
  storage write for folders.
- Does not persist Workflow Runs' expand/collapse — the persistence hook (T4) stores only
  `pinnedExpanded`/`recentExpanded`/`recentAssistantsExpanded`; Workflow Runs keeps its hardcoded
  default in both view modes.
- No cross-device/browser sync — T4 uses `src/utils/storage.ts` (`localStorage`, per-user key),
  the same mechanism as `LAST_CHAT_ID`, nothing new.
- Preserves the existing `hasManuallyExpandedSection` guard (`useChatSidebarExpansion.ts` line 93)
  and the `if (isFoldersExpanded) return` guard (line 92) unchanged — T2 adds a sibling branch,
  it does not remove or loosen either guard.
- Does not add automated-test coverage beyond what each task's `Test-first` line requires; no task
  adds a whole-suite gate, manual/browser verification, or review step — those are owned by the
  calling flow.

## T1 — Unified view: clear-then-open-one for the resolved chat's folder tab

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarSectionsHelpers.ts:20-25,62-66` —
add `setActiveFolder: (folder: string | null) => void` to `SectionExpansionActions`, and in the
`'folder'` case call `actions.setActiveFolder(null)` then `actions.setActiveFolder(location.folderName)`
after the existing `actions.setFolders(true)` — the same "clear, then open one" pattern already
used in `useChatSidebarNavigation.ts` (`expandFolder`, `scrollToChat`).

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarExpansion.ts:24-30,94-99` —
add `setActiveFolder` to `UseChatSidebarExpansionParams` and pass it into the `expandSectionForLocation`
actions object.

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarSections.ts:109-115` — pass
the existing `setActiveFolder` (already returned by `useChatSidebarFolders` at line 72) into the
`useChatSidebarExpansion({...})` call.

Test-first: yes — a unit test for `expandSectionForLocation` asserting that, for a `'folder'`
location, it calls `setActiveFolder(null)` then `setActiveFolder(folderKey)` in addition to
`setFolders(true)`, and that a second call with a different folder location does not leave the
first folder's key applied (no accumulation).

## T2 — Focused view: open the resolved chat's folder/assistant drilldown

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarExpansion.ts:24-30,81-110` —
add `focusedViewModel: FocusedChatSidebarViewModel`, `setFocusedView`, `setFocusedNavigationSection`
params; add a sibling branch inside the existing effect (parallel to the `if (isFocused) return` at
line 84) that, when `isFocused` and `currentChat` is set, resolves
`focusedViewModel.chatLocations[currentChat.id]` and calls
`setFocusedNavigationSection(getFocusedNavigationSection(location))` then
`setFocusedView(getFocusedView(location, currentChat.id))` — reusing the two helpers already
exported from `chatSidebarSectionsHelpers.ts` (lines 27-47), mirroring `scrollToChat`'s `isFocused`
branch (`useChatSidebarNavigation.ts:130-139`). Gate this with its own "already initialized this
focused mount" ref (parallel to `hasInitializedUnifiedViewRef`) so it fires once per resolve, not on
every render.

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarSections.ts:109-115` — pass
`focusedViewModel`, `setFocusedView`, `setFocusedNavigationSection` (already destructured params of
`useChatSidebarSections`, lines 46-48) into the `useChatSidebarExpansion({...})` call.

Test-first: yes — a `renderHook` test on `useChatSidebarExpansion` with `isFocused: true` and a
`currentChat` whose `chatLocations`/`focusedViewModel.chatLocations` entry is a folder, asserting
`setFocusedView` is called with `{ type: 'folder', name, targetChatId: currentChat.id }` and
`setFocusedNavigationSection` is called with the location's section; and that re-rendering with the
same `currentChat.id` does not call either setter again.

## T3 — Scroll the resolved chat into view (both view modes)

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarNavigation.ts:104-124,129-173` —
factor the `scrollAfterRender(() => chatElementsRef.current.get(chatId), 'nearest', ...)` call
already used by `scrollToChat` into a plain function the hook also returns (not only reachable via
the imperative `ref`), e.g. `revealChat(chatId: string)`, so it can be called directly instead of
only through `ChatSidebarListsRef`.

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarSections.ts:100-135` — after
wiring T1/T2, add an effect (gated to fire once per resolved `currentChat.id` per mount, alongside
the refs added in T1/T2) that calls the new `revealChat(currentChat.id)` once the folder/drilldown
state from T1/T2 has been applied, for both Unified and Focused view.

Test-first: yes — a test asserting that calling the exposed reveal function scrolls the registered
element for a given chat id into view (`Element.scrollIntoView` called), for both a chat registered
via `registerChatElement` and a folder registered via `registerFolderElement`.

## T4 — Section-state persistence hook

New file `src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarSectionPersistence.ts`,
mirroring the `LAST_CHAT_ID` pattern (`src/store/chats.ts:84`, `src/utils/storage.ts`):

```ts
const SIDEBAR_SECTIONS_KEY = 'chat-sidebar-sections'

interface PersistedSidebarSections {
  pinnedExpanded: boolean
  recentExpanded: boolean
  recentAssistantsExpanded: boolean
}

const DEFAULTS: PersistedSidebarSections = {
  pinnedExpanded: true,
  recentExpanded: true,
  recentAssistantsExpanded: true,
}

export const getPersistedSidebarSections = (): PersistedSidebarSections =>
  storage.getObject(userStore.user?.userId ?? '', SIDEBAR_SECTIONS_KEY, DEFAULTS)

export const setPersistedSidebarSection = (
  patch: Partial<PersistedSidebarSections>
): void =>
  storage.put(userStore.user?.userId ?? '', SIDEBAR_SECTIONS_KEY, {
    ...getPersistedSidebarSections(),
    ...patch,
  })
```

Test-first: yes — a test that `getPersistedSidebarSections()` returns `DEFAULTS` when nothing is
stored, and that a value written via `setPersistedSidebarSection({ pinnedExpanded: false })` is
returned by a subsequent `getPersistedSidebarSections()` call (round-trips through `storage`).

## T5 — Wire Pinned/Recent persistence into both view modes

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarExpansion.ts:39-40` —
initialize `isRecentExpanded`/(via the caller) `isPinnedExpanded` from
`getPersistedSidebarSections()` instead of the hardcoded `true`; in `handleToggleSection` (lines
46-79), call `setPersistedSidebarSection({ pinnedExpanded/recentExpanded: shouldExpand })` on each
manual toggle of `'pinned'`/`'recent'`.

`src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedChatSidebar.tsx:71-72,220,237-244` —
same: initialize `isPinnedExpanded`/`isRecentExpanded` from `getPersistedSidebarSections()`, and
persist through `setPersistedSidebarSection` inside the `onTogglePinned` handler (line 220) and
`handleToggleRecent` (lines 237-244).

Do not change how the resolved-chat auto-expand (T1/T2, and the pre-existing effect body at lines
92-100) sets these same booleans — it already runs after the initial render and overwrites the
persisted value exactly when the resolved chat is in that section, matching the spec's precedence
rule; no extra guard is needed for that case.

Test-first: yes — a test that mounting `useChatSidebarExpansion` with a persisted
`{ recentExpanded: false }` initializes `isRecentExpanded` to `false`, and that calling
`handleToggleSection('recent')` updates the persisted value; a corresponding test for
`FocusedChatSidebar`'s `isPinnedExpanded` init/toggle.

## T6 — Persist Recent Assistants' expand state

`src/pages/chat/components/ChatSidebar/ChatSidebarSection.tsx:22-40` — add optional
`activeIndex?: number | null` and `onActiveIndexChange?: (index: number | null) => void` props;
when provided, use them instead of the internal `useState` (falls back to today's uncontrolled
behavior when omitted, so `ChatSidebarWorkflows.tsx`'s usage is unaffected).

`src/pages/chat/components/ChatSidebar/ChatSidebarAssistants.tsx:53-60,125-142` — derive
`activeIndex` from `getPersistedSidebarSections().recentAssistantsExpanded` (`0` when expanded,
`null` when collapsed) and pass it plus an `onActiveIndexChange` handler that calls
`setPersistedSidebarSection({ recentAssistantsExpanded: index !== null })` into `ChatsSidebarSection`.

Test-first: yes — a test that `ChatSidebarAssistants` renders collapsed when
`getPersistedSidebarSections()` returns `recentAssistantsExpanded: false`, and that toggling the
section header persists the new value.
