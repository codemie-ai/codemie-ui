# Spec: Add-folder button missing in Focused sidebar mode (EPMCDME-15206)

## Problem

This started as "the Add-folder button doesn't render in Focused mode," but the button is only the
visible symptom of two deeper gaps, both confirmed by direct UI testing:

1. **Focused mode's view model never sees custom folders that have no chats yet.**
   `buildFocusedChatSidebarViewModel` (`chatSidebarListsHelpers.ts` / `focusedChatSidebarViewModel.ts:88-117`)
   takes only `chats` and `assistantFolders` as input — it never receives `chatsStore.chatFolders`.
   Focused's folder groups are derived exclusively from chats that already carry a `folder` value
   (`focusedChatSidebarCollections.ts:83-116`, `focusedChatSidebarViewModel.ts:34-48`), so a folder
   that exists in `chatFolders` (refreshed by `createFolder`, `chats.ts:731-732`) but has zero chats
   in it never becomes a `viewModel.groups` entry. Unified mode has no such gap — it reads
   `chatFolders` directly. Verified in the UI: an empty custom folder shows up in Unified mode, not
   in Focused mode. Even with the button fixed, a user in Focused mode who creates a folder sees
   nothing appear.
2. **Focused mode's "Folders" accordion doesn't expand on create.** `handleCreateFolder`
   (`useChatSidebarSections.ts:150-156`) only flips `isFoldersExpanded`, state owned by
   `useChatSidebarExpansion.ts:41,71-76` and consumed solely by `UnifiedChatSidebar.tsx:59,161`.
   Focused's equivalent, `isGroupsExpanded` (`FocusedChatSidebar.tsx:66,202-209`), is local state
   inside `FocusedChatSidebar` with no external handle — `handleCreateFolder` cannot reach it.
3. **The button itself.** `ChatSidebarLists.tsx` builds one `createFolderButton` element and passes
   it only to `UnifiedChatSidebar` (`ChatSidebarLists.tsx:165-182,210`); `FocusedChatSidebar` has no
   equivalent prop, and its "Folders" accordion is also wrapped in
   `{viewModel.groups.length > 0 && (...)}` (`FocusedChatSidebar.tsx:252`), so the section — and any
   button in its header — disappears entirely for a user with zero groups.

Fixing only (3) would still leave a real bug: folders would still fail to appear or expand in
Focused mode after creation. This is a view-model correctness fix with a UI-plumbing fix layered on
top of it, not a pure "thread a button down" change.

## Approach

1. **View model — surface empty custom folders in Focused mode, without misclassifying or
   duplicating anything.** Add `chatFolders: FolderListItem[]` as a new (defaulted,
   backward-compatible) parameter to `buildFocusedChatSidebarViewModel`. Merging `chatFolders` in
   unfiltered is unsafe: `getFolderKindFromKey` (`chatSidebarFolderHelpers.ts:72-79`) classifies a
   raw name as `'legacy-import'` when `getLegacyImportGroupName` (`chatImportSources.ts:88-90`)
   recognizes it, and as `'legacy-avatar'` when it equals `AVATAR_CHAT_FOLDER`
   (`chats.ts:18`) — only names matching neither fall through to the `'custom'` default. Raw-name
   dedup against Focused's existing group keys is also unsafe on its own: import-derived groups are
   keyed `import:<source>` / `legacy-import:<name>` (`importGroupKey`,
   `chatSidebarFolderHelpers.ts:29-30`), not the plain raw name, and a chat whose `folder` equals an
   assistant's own name is folded into that assistant's group via `isAssistantNameFolder`
   (`focusedChatSidebarCollections.ts:108-113`, `chatSidebarCollectionHelpers.ts:64-67`) rather than
   into `sourceFolderChats` at all. An unfiltered, raw-name merge would therefore risk: an empty
   folder named after a legacy-import source surfacing as a bogus group; an empty folder duplicating
   a real import group under a different key; and an empty folder duplicating an assistant group.
   Reuse Unified's existing exclusion pattern instead of inventing a new one — `useChatSidebarFolders`
   (`useChatSidebarFolders.ts:48-58`) already normalizes each `chatFolders.name` through
   `sidebarFolderKeyFromName` and drops empty import/legacy-import entries that don't have a matching
   chat-derived key. Extract this normalize-and-exclude step into a shared helper (new export
   alongside `chatSidebarFolderHelpers.ts` or `chatSidebarListsHelpers.ts`) used by both
   `useChatSidebarFolders` and the Focused view model, rather than duplicating the filter logic. For
   Focused, the helper must, per `chatFolders` entry: map the name through `sidebarFolderKeyFromName`
   and keep it only when `getFolderKindFromKey` reports `'custom'`; skip it if the name is already
   represented by an existing Focused folder group (a key already present in `sourceFolderChats`) or
   by an existing assistant group (matches a registered or chat-derived assistant name); and skip
   `AVATAR_CHAT_FOLDER` explicitly. Contribute an empty entry (`chats: []`) for every surviving name
   before folders are turned into `FocusedChatSidebarAggregate`s. `buildAggregates`
   (`chatSidebarCollectionHelpers.ts:69-80`) already sets `latestChat: group.chats[0]`, which is
   `undefined` for an empty array, satisfying the `chats: [], latestChat: undefined` shape with no
   further change.
2. **Button plumbing — mirror Unified mode.** Pass `ChatSidebarLists.tsx`'s existing
   `createFolderButton` down to `FocusedChatSidebar` as a new `createFolderButton?: ReactNode` prop,
   rendered via `headerContentTemplate` on its "Folders" `ChatSidebarAccordion`
   (`FocusedChatSidebar.tsx:252-281`), the same slot Unified mode already uses
   (`UnifiedChatSidebar.tsx:158-182`). Remove the `viewModel.groups.length > 0 &&` guard so the
   section (and its header button) always renders in the root Focused view, matching Unified mode's
   parity, which is never conditionally hidden.
3. **Expansion — make the Folders section open on create.** Give `ChatSidebarLists` a way to expand
   Focused's "Folders" accordion when a folder is created, so `handleCreateFolder` drives both modes
   symmetrically. The established convention here is container-owns-state / child-renders-via-prop
   (already used for `isFoldersExpanded` → `UnifiedChatSidebar`); the recommended shape is to lift
   `isGroupsExpanded` out of `FocusedChatSidebar` next to `isFoldersExpanded` and pass it down as a
   controlled prop + setter, preserving the existing mutual-exclusivity toggle behavior between
   Pinned/Recent/Workflows/Groups. The other three Focused-local expand states are untouched. The
   exact wiring (lifted state vs. an equivalent trigger prop) is left for the plan stage to choose
   the minimal-diff mechanism.
4. **Drill-down for an empty folder.** No new code is expected here: once (1) puts the empty CUSTOM
   folder into `viewModel.groups`, the existing `selectedAggregate` lookup by name
   (`FocusedChatSidebar.tsx:136-140`) already finds it, and `FocusedAggregateRow` already renders
   `'No chats yet'` instead of `Last: …` when `latestChat` is undefined (`FocusedAggregateRow.tsx:186-189`).
   This path is currently unreachable (an empty group never existed), so it must be covered by an
   explicit test rather than assumed to work; `FocusedViewHeader.tsx` stays unchanged.
5. **Ordering.** No reordering work. Empty groups naturally sort last because
   `getValidDateTimestamp` (`chatSidebarCollectionHelpers.ts:24-31`) returns `0` for an
   undefined/missing date, and the existing `buildGroups` sort
   (`focusedChatSidebarViewModel.ts:80-85`) already orders by that timestamp descending.

## Acceptance Criteria

- An empty custom folder created via `handleCreateFolder`/`FolderFormPopup` appears as a group in
  Focused mode's "Folders" list without a mode switch or page reload — sourced from
  `chatsStore.chatFolders`, not just from chats.
- `buildFocusedChatSidebarViewModel` given a `chatFolders` entry with no matching chats produces a
  `FocusedChatSidebarAggregate` with `chats: []` and `latestChat: undefined` only when that entry's
  kind (via `sidebarFolderKeyFromName` + `getFolderKindFromKey`) is `'custom'`; it does not
  synthesize a group for a name classified `'legacy-import'` or `'legacy-avatar'`, does not
  synthesize empty workflow or assistant groups, and does not duplicate a folder name already
  represented by an existing folder group or an existing assistant group.
- An empty `chatFolders` entry named after a recognized legacy-import group produces no group in
  Focused mode (kind is `'legacy-import'`, filtered out).
- A `chatFolders` entry named after an assistant that already has chats in Focused mode produces no
  extra empty custom group alongside that assistant's group.
- An import/legacy-import folder with real chats plus an empty `chatFolders` entry sharing its raw
  name produces exactly one group in Focused mode, not two.
- In Focused mode's root view, the "Folders" accordion header shows the same Add-folder button
  (icon, title/aria-label "Create Folder") as Unified mode, and clicking it opens `FolderFormPopup`
  via the existing `activePopup === 'folder-form'` flow.
- The "Folders" section in Focused mode's root view is visible even when `viewModel.groups` is
  empty, with the button still present in its header.
- Creating a folder while in Focused mode expands the Focused "Folders" accordion
  (`isGroupsExpanded`/its replacement becomes `true`), matching Unified mode's existing behavior.
- Clicking an empty custom folder in Focused mode's root "Folders" list opens its drill-down view
  showing an empty state (no chats), without crashing or bouncing back to root.
- `FocusedAggregateRow` shows a "no chats" line (not "Last: …") for a group whose `latestChat` is
  undefined.
- Unified mode's existing "Folders" accordion, button, and expansion behavior are unchanged.
- The drill-down view's `FocusedViewHeader.tsx` is unchanged — no create-folder control is added there.

## Non-goals

- No change to `FocusedViewHeader.tsx` or its drill-down layout/controls.
- No change to `FolderFormPopup.tsx`'s dialog UI or to the mode-agnostic `onCreate` contract it
  already has — only where/how its resulting expansion signal is consumed changes.
- No change to Unified mode's existing "Folders" accordion, button, or behavior, or to
  `useChatSidebarFolders`'s existing output — it gains a shared helper dependency, not a behavior
  change.
- No new popup, modal, or folder-creation entry point beyond the existing `FolderFormPopup` flow.
- No change to `ChatSidebarAccordion.tsx`'s `headerContentTemplate` mechanism itself.
- No change to folder ordering, pinning, or move behavior — empty folders keep sorting last via the
  existing timestamp-0 fallback; no new sort/reorder logic.
- No change to the three other Focused-local expand states (Pinned/Recent/Workflows) beyond what's
  needed to keep their existing mutual-exclusivity toggle behavior intact alongside Groups.
- No defensive handling added for a folder literally named with a reserved prefix (e.g. `"import:…"`)
  colliding with `getFolderKindFromKey`'s classification — a pre-existing quirk unrelated to this fix.

## Testing

- View-model unit test (alongside existing `buildFocusedChatSidebarViewModel` coverage in
  `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts`): an empty custom
  `chatFolders` entry with no matching chats produces a Focused group with `chats: []` and
  `latestChat: undefined`; a `chatFolders` entry that already has chats is not duplicated; empty
  workflow/assistant groups are never synthesized from `chatFolders`.
- An empty `chatFolders` entry whose name resolves to `'legacy-import'` or `'legacy-avatar'`
  (matching a known import source / `AVATAR_CHAT_FOLDER`) produces no group in Focused mode.
- A `chatFolders` entry named after an assistant that already has chats produces no extra custom
  group alongside the assistant's group.
- An import folder with real chats plus an empty `chatFolders` entry of the same raw name produces
  exactly one group, not two.
- Component-level test (`ChatSidebarLists.test.tsx` or a new file) with `organizeBy` set to
  `ChatOrganizeMode.FOCUSED`: the Add-folder button is present in the "Folders" header, including
  when `viewModel.groups` is empty; clicking it opens `FolderFormPopup`.
- A test that submits folder creation while in Focused mode and asserts (a) the new folder appears
  in the Folders list and (b) the Folders accordion is expanded afterward — not just that the button
  exists.
- A test that clicks an empty custom folder in Focused mode's root list and asserts the drill-down
  view opens showing an empty/no-chats state, rather than crashing or returning to root.
- Regression assertion that Unified mode's existing button/accordion/expansion tests still pass
  unchanged.

## Open Risks

- Lifting `isGroupsExpanded` out of `FocusedChatSidebar` turns it from fully local state into a
  controlled prop; the mutual-exclusivity logic between Pinned/Recent/Workflows/Groups toggles
  (`FocusedChatSidebar.tsx:186-209`) must keep working whether the expand call originates from a
  user click or from the new external create-folder signal.
- Removing the `groups.length > 0` guard changes the Focused root view's layout for zero-folder
  users (a previously-absent section now always appears); empty-state styling for `count={0}`
  should follow whatever convention Unified mode already uses for zero folders, if any.
- The merge point for `chatFolders` into the view model (view-model layer vs. collections layer) is
  an implementation choice left to the plan stage, as is the exact shape of the shared exclusion
  helper's signature — either is consistent with this spec as long as duplicates are prevented and
  only `'custom'`-kind groups are synthesized.
- Focused's own group keys are not uniform with `sidebarFolderKeyFromName`'s output: a plain custom
  folder's key in `sourceFolderChats` is the raw `chat.folder` string, while
  `sidebarFolderKeyFromName` prefixes the same name as `custom:<name>` (import/legacy-import keys do
  align, since both `importGroupKey` and `sidebarFolderKeyFromName` produce `legacy-import:<name>`
  for the same raw name). The shared helper's "already represented" check must account for this
  mismatch rather than compare the two key spaces directly — left to the plan stage.
