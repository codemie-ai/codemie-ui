# Plan: Focused-mode folder parity (EPMCDME-15206)

Commit per task using the repository's existing convention.

## Task 1 — Extract shared folder-name classification helper; refactor `useChatSidebarFolders` onto it

- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarFolderHelpers.ts`: add an
  exported helper that composes the existing `sidebarFolderKeyFromName` + `getFolderKindFromKey`
  calls used inline today at `useChatSidebarFolders.ts:51-54`:

  ```ts
  export const classifyFolderListItemName = (name: string): { key: string; kind: FolderKind } => {
    const key = sidebarFolderKeyFromName(name)
    return { key, kind: getFolderKindFromKey(key) }
  }
  ```

- Re-export it from the `chatSidebarListsHelpers.ts` barrel (next to the other
  `chatSidebarFolderHelpers` re-exports, lines 16-27).
- `useChatSidebarFolders.ts:48-58`: replace the inline `sidebarFolderKeyFromName(...)` /
  `getFolderKindFromKey(key)` pair with `classifyFolderListItemName(folder.name)`. No behavior
  change — same key and kind values, same filter predicate.
- **Test-first: no** — this is a pure extraction; `useChatSidebarFolders.test.ts` and
  `ChatSidebarLists.test.tsx`'s existing Unified-mode folder coverage already pin the current
  output and must stay green unchanged.

## Task 2 — View model: surface empty custom `chatFolders` entries in Focused mode

- `focusedChatSidebarViewModel.ts` (`buildFocusedChatSidebarViewModel`, lines 88-117): add a new
  parameter `chatFolders: FolderListItem[] = []` (import `FolderListItem` from
  `@/types/entity/conversation`). Before calling it, `collectFocusedChats` already built
  `collections.sourceFolderChats` — but that map is keyed inconsistently (raw custom-folder names,
  `import:<source>`, `legacy-import:<name>`, or `AVATAR_CHAT_FOLDER`), so a `chatFolders` entry's
  raw name cannot be deduped by checking those keys: a chat with `importSource` set is keyed
  `import:<source>` in `sourceFolderChats` regardless of that chat's own `chat.folder` value, so a
  `chatFolders` entry sharing that chat's raw `folder` name would not match any
  `sourceFolderChats` key and would wrongly synthesize a second, empty group next to the real
  import group. The same gap applies to a chat with `isImported === true` but no resolvable import
  identity, which `collectFocusedChats` skips entirely via `if (isImportedChat(chat)) continue`
  (`focusedChatSidebarCollections.ts:107`) — it never lands in `sourceFolderChats` under any key,
  so a same-named `chatFolders` entry would not be excluded by a keys-based check either.

  Fix with one rule instead of the keys-based exclusion: build `const chatFolderNames = new
  Set(chats.map((chat) => chat.folder).filter((name): name is string => !!name))` from the raw
  `chats` input (this captures every chat's `chat.folder` value regardless of which
  `sourceFolderChats` key — if any — that chat ended up under, so it dedupes imports,
  legacy-imports, assistant-name-polluted folders, and plain custom folders with a single check).
  Then, after the `assistantFolders` merge into `collections.assistantChats` (lines 97-104) and
  before `buildFolderGroups` (line 105), for each `chatFolders` entry: add it to
  `collections.sourceFolderChats` keyed by its raw `folder.name` with `chats: []`, but only when
  `classifyFolderListItemName(folder.name).kind === 'custom'` AND `folder.name` is not in
  `chatFolderNames` AND `folder.name !== AVATAR_CHAT_FOLDER` (this last check is already implied by
  the kind check — `sidebarFolderKeyFromName(AVATAR_CHAT_FOLDER)` returns `AVATAR_CHAT_FOLDER`
  itself and `getFolderKindFromKey` resolves that to `'legacy-avatar'`, never `'custom'` — keep it
  explicit at the call site anyway so the exclusion is visible without tracing through
  `getFolderKindFromKey`). This single rule replaces the multi-check exclusion (keys-based +
  assistant-name-based) entirely; it is not layered on top of it.
- No change to `buildFolderGroups`/`buildAggregates`/`buildGroups` — an empty array flows through
  unchanged to `latestChat: undefined`, and `getFolderKindFromKey(group.id)` (a raw name for a
  custom folder) already resolves to `'custom'` the same way it does for a non-empty one.
- `ChatSidebarLists.tsx:92-102`: pass `chatFolders` (already destructured at line 56) as the new
  4th argument to `buildFocusedChatSidebarViewModel`, and add `chatFolders` to that `useMemo`'s deps.
- **Test-first: yes** — add cases to
  `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts` calling
  `buildFocusedChatSidebarViewModel` with a 4th `chatFolders` argument:
  - an empty custom `chatFolders` entry with no matching chats produces a group with
    `chats: []`, `latestChat: undefined`, `folderKind: 'custom'`;
  - an entry whose name resolves to `'legacy-import'` or equals `AVATAR_CHAT_FOLDER` produces no
    group;
  - an entry named after an assistant that already has chats produces no extra `'folder'` group
    alongside that assistant's `'assistant'` group;
  - a chat-backed import/legacy-import folder plus an empty `chatFolders` entry of the same raw
    name produces exactly one group, not two;
  - **new**: a chat with `importSource` set and `folder: 'My Claude export'` (a non-legacy,
    non-reserved raw name) plus a `chatFolders` entry also named `'My Claude export'` produces
    exactly one group (the import group), not two — this is the case the keys-based exclusion
    missed, since the chat is keyed `import:<source>` while its raw `folder` value is the
    `chatFolders` entry's name.

## Task 3 — Button plumbing and always-visible Folders section in Focused mode

- `FocusedChatSidebar.tsx`: add `createFolderButton?: ReactNode` to `FocusedChatSidebarProps`
  (after `registerChatElement`, line 49) and destructure it (line 61). Pass it as
  `headerContentTemplate={createFolderButton}` on the "Folders" `ChatSidebarAccordion` (lines
  252-281) — the same slot Unified mode already uses (`UnifiedChatSidebar.tsx:158-182`). Remove the
  `viewModel.groups.length > 0 &&` guard around that block (line 252) so the section always renders
  in the root view, with `count={viewModel.groups.length}` (may be `0`).
- `ChatSidebarLists.tsx:189-199`: pass `createFolderButton={createFolderButton}` (already built at
  lines 165-182) to `<FocusedChatSidebar>`.
- **Test-first: yes** — in `ChatSidebarLists.test.tsx`, with `chatViewSettingsStore.organizeBy` set
  to `ChatOrganizeMode.FOCUSED` (extend the store mock the same way `ChatSidebar.test.tsx` already
  does at line 44, defaulting to `UNIFIED` for existing tests) and `chatFolders`/`chats` empty:
  - the "Create Folder" button is present in the Folders header even though `viewModel.groups` is
    empty, and clicking it results in `FolderFormPopup` receiving `isVisible: true` (upgrade its
    stub mock, currently `() => null` at line 129, to a minimal component asserting on props);
  - clicking an empty custom folder row (from Task 2's synthesized group) opens the drill-down view
    showing an empty/no-chats state (`FocusedViewHeader` renders, no chat rows, no crash/bounce to
    root);
  - Unified mode's existing Folders-header/button tests still pass unchanged.

## Task 4 — Expand Focused's "Folders" accordion on folder creation

`isGroupsExpanded` must stay local state inside `FocusedChatSidebar`, not become a lifted/controlled
prop: Focused's Recent and Workflows sections default to expanded, also as local state, and
`handleToggleGroups`'s existing mutual-exclusivity branch (lines 202-209) is the only thing allowed
to put Groups/Recent/Workflows into a mix of true/false — an externally-set `isGroupsExpanded=true`
from `handleCreateFolder` would leave Recent and Workflows still `true` (their own local state,
untouched by the lift), violating that exclusivity. Lifted state would also incorrectly survive a
Unified→Focused mode switch, unlike today's per-mount local state that resets on remount.

Instead, add a one-way signal `FocusedChatSidebar` reacts to with the exact same state transition
`handleToggleGroups` already performs when opening Groups, without exposing `isGroupsExpanded`
itself to the parent:

- `FocusedChatSidebar.tsx`: add `expandFoldersSignal: number` to `FocusedChatSidebarProps`
  (after `registerChatElement`, line 49) and destructure it. Add
  `const isInitialExpandSignalRef = useRef(true)` and a `useEffect` keyed on `[expandFoldersSignal]`
  that returns early and flips the ref on the first run (skipping the mount value), then on every
  subsequent change calls `setIsGroupsExpanded(true)`, `setIsRecentExpanded(false)`,
  `setIsWorkflowRunsExpanded(false)` — the identical three-call branch `handleToggleGroups` (lines
  202-209) already runs when a user manually expands Groups. `isPinnedExpanded` is untouched,
  matching that same existing branch.
- `ChatSidebarLists.tsx`: add `const [expandFoldersSignal, setExpandFoldersSignal] = useState(0)`
  next to the other local state (around lines 61-66), pass `expandFoldersSignal` to
  `<FocusedChatSidebar>`, and pass `setExpandFoldersSignal` into `useChatSidebarSections`'s params.
- `useChatSidebarSections.ts`: add `setExpandFoldersSignal: (updater: (n: number) => number) =>
  void` to `UseChatSidebarSectionsParams`, destructure it, and call
  `setExpandFoldersSignal((n) => n + 1)` inside `handleCreateFolder` (lines 150-156) alongside the
  existing Unified-mode calls, unconditionally — `handleCreateFolder` already runs regardless of
  `isFocused` today, so this keeps both modes driven from the same callback without branching on
  mode.
- **Test-first: yes** — in `ChatSidebarLists.test.tsx`/Focused-mode describe block: with Focused
  mode's Recent section expanded (its default), submitting folder creation results in the Folders
  accordion expanded (`data-expanded="true"` on the mocked accordion) and Recent **and** Workflows
  collapsed afterward — asserting the mutual-exclusivity outcome, not just that Folders opened; a
  companion assertion confirms Unified mode's existing create-folder expansion test still passes
  unchanged.

## Negative-constraint check

- No change to `FocusedViewHeader.tsx` — untouched by all four tasks. ✓
- No change to `FolderFormPopup.tsx`'s UI or `onCreate` contract — only its existing `isVisible`
  trigger is exercised. ✓
- No change to Unified mode's accordion, button, or expansion behavior — Tasks 1, 3, 4 touch only
  `useChatSidebarFolders`'s internals (behavior-preserving) and Focused-only files; each task's
  tests include an explicit Unified-mode regression assertion. ✓
- No new popup/modal/entry point — only the existing `activePopup === 'folder-form'` flow is wired
  further down. ✓
- No change to `ChatSidebarAccordion.tsx`'s `headerContentTemplate` mechanism — consumed as-is. ✓
- No change to folder ordering/pinning/move — Task 2 relies on the existing timestamp-0 fallback
  and sort in `buildGroups`/`buildAggregates`; neither is touched. ✓
- No change to the three other Focused-local expand states beyond what Task 4's signal-driven
  effect requires — `isPinnedExpanded` is never touched by the new effect; `isRecentExpanded` and
  `isWorkflowRunsExpanded` are only set to `false` by it, the same outcome a manual Groups-toggle
  already produces via `handleToggleGroups`. ✓
- `isGroupsExpanded` stays local/uncontrolled state inside `FocusedChatSidebar` — Task 4
  deliberately does not lift it to a parent-controlled prop, so mutual exclusivity
  (Pinned/Recent/Workflows/Groups) and the reset-on-remount behavior across Unified↔Focused mode
  switches are both preserved unchanged. ✓
- No defensive handling for a reserved-prefix folder name — Task 2 adds no such handling. ✓
