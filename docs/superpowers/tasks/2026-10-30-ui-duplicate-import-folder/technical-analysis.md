# Technical Research

**Task**: chat sidebar folders import source gemini legacy alias custom folder chatImportSources useChatSidebarFolders
**Generated**: 2026-10-30
**Research path**: codegraph

---

## 1. Original Context

Follow-up UI bug to EPMCDME-15191. In the CodeMie web UI chat sidebar (repository codemie-ui, path /Users/Andrada_Anca/work/codemie-dev/codemie-ui), the Folders section shows the same agent twice for chats synced by the CLI agent codemie-gemini: a folder labelled "Gemini" that contains the synced chat, and an empty folder labelled "gemini" (custom-folder icon, own menu). Verified facts: the backend has exactly one registered folder row named `gemini` for the user and one conversation with folder `gemini` and import_source `gemini`. The sidebar builds its folder list from (1) the backend registered folder names, each classified by classifyFolderListItemName/sidebarFolderKeyFromName in src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarFolderHelpers.ts, and (2) chats grouped by import identity (resolveImportGroupIdentity -> key `import:gemini`, label from IMPORT_SOURCE_DISPLAY in src/constants/chatImportSources.ts). The registered name `gemini` is not in the hard-coded legacy alias map CHAT_IMPORT_SOURCES (which only has 'claude desktop', 'claude imports', 'claude', 'codemie-code'), so it becomes `custom:gemini` and is shown as an empty custom folder next to the `import:gemini` group. For `claude` the legacy alias maps the registered folder onto the import group and useChatSidebarFolders.ts drops it when it has no chats, so no duplicate appears. The same gap probably exists for other CLI agents whose backend folder names are codex, copilot-cli, opencode, pi, kimi (backend resolveConversationFolder in codemie-code uses those names). Desired outcome: one folder per agent in Folders, no empty twin, existing behaviour for claude and real user-created custom folders unchanged. Acceptance ideas: a registered folder whose name equals a known agent import source shows once, with the chat; a genuine user-created custom folder with any other name still shows; an empty user-created custom folder still shows; no change for claude.

---

## 2. Codebase Findings

All paths relative to /Users/Andrada_Anca/work/codemie-dev/codemie-ui.

### Existing Implementations
- `src/constants/chatImportSources.ts`
  - `ImportSourceKind` union: claude_desktop, claude_cli, claude_code, codex, gemini, copilot_cli, opencode, pi, kimi. Note the underscore in `copilot_cli`; the task states the backend folder name is `copilot-cli` (hyphen).
  - `VALID_IMPORT_SOURCES` set and `isValidImportSourceKind` guard.
  - `IMPORT_SOURCE_DISPLAY` maps each kind to a label (gemini -> "Gemini").
  - Private, `@deprecated` `CHAT_IMPORT_SOURCES`: 'claude desktop', 'claude imports', 'claude' (all labelled "Claude Imports") and 'codemie-code'. `getChatImportSource` does a lowercase lookup. `getLegacyImportGroupName` returns the label.
  - `resolveImportDisplay` and `isImportedConversation` prefer `importSource`, then fall back to the legacy folder map.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarFolderHelpers.ts`
  - `sidebarFolderKeyFromName(name)` (line 51): AVATAR folder is returned as is. If `getLegacyImportGroupName(name)` matches, the key is `legacy-import:<label>`. Otherwise the key is `custom:<name>`. `gemini` lands in the last branch.
  - `getFolderKindFromKey`: `custom:` -> custom, `import:` -> import, `legacy-import:` -> legacy-import.
  - `classifyFolderListItemName` combines key and kind.
  - `resolveImportGroupIdentity(chat)`: `importSource` set -> `{kind:'import', source}`, key `import:<source>`. Otherwise it uses the legacy folder name -> `legacy-import:<label>`.
  - `getFolderDisplayName` strips the `custom:` prefix or uses `IMPORT_SOURCE_DISPLAY`.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarFolders.ts` (the `folders` useMemo, lines 46-88)
  - Classifies every registered `chatFolders` name.
  - Filter at lines 53-56: kinds `import` and `legacy-import` are kept only if `foldersToChatsMap[key]` has chats. All other kinds are kept, so `custom:gemini` is kept even when empty.
  - `additionalFolderKeys` are the keys in `foldersToChatsMap` not already named. This is where `import:gemini` comes from.
  - Empty folders rank after non-empty ones, using the `folderTimestampMap` fallback.
  - `folderKinds` is derived from `getFolderKindFromKey`, with `custom` upgraded to `workflow` via `isWorkflowAssociatedFolder`.
- Rendering:
  - `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx` (uses `folderKinds`, `folderLabels`, and a `legacy-import:` key lookup for chats).
  - `src/pages/chat/components/ChatSidebar/FolderTypeIcon.tsx` (import/legacy-import -> ChatImportSvg, custom -> FolderStarSvg).
  - `src/pages/chat/components/ChatSidebar/FolderList/useFolderListActions.tsx` (menu).
  - `UnifiedChatSidebar.tsx` and `FocusedChatSidebar.tsx` consume the folder data.
- Other users of the same helpers: `unifiedChatSidebarViewModel.ts` (`getFolderKey`), `chatSidebarCollectionHelpers.ts` (`buildAggregates`), `MoveChatPopup.tsx`, `useChatSidebarSections.ts` (calls `useChatSidebarFolders`, plus `handleCreateFolder` and `handleMoveChat`), `src/store/utils/chats.ts` (`transformChatListItemDTO` uses `resolveImportDisplay`), and `src/utils/chatHelpers.ts`.

### Architecture and Layers Affected
- Constants layer: `src/constants/chatImportSources.ts`.
- Pure helper layer: `chatSidebarFolderHelpers.ts`, re-exported through `chatSidebarListsHelpers`.
- Hook and view-model layer: `useChatSidebarFolders` -> `useChatSidebarSections` -> `UnifiedChatSidebar` and `FocusedChatSidebar` -> `FolderList`.

### Integration Points
- Backend folder list (`FolderListItem`, with `name`, `date`, `updateDate`) arrives as `chatFolders`. Chat `importSource` is normalized by `isValidImportSourceKind` in the store transform.
- `renameChatFolder` and `createFolder` in `chatsStore` (via `FolderFormPopup`) operate on raw folder names.

### Patterns and Conventions
- Folder keys are prefixed strings (`custom:`, `import:`, `legacy-import:`, `assistant:`).
- Legacy alias lookup is case-insensitive on the lowercased name.
- Registered import and legacy-import folders are hidden when empty (the filter described above).

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists. The relevant guides are `testing/testing-patterns.md`, `development/constants-usage.md`, `patterns/state-management.md`, `development/code-organization.md` and `quality-gates.md`. They were not read in detail; they are general conventions. There is no sidebar-folder-specific guide.

### Architectural Decisions
Inline comments in `chatImportSources.ts` mark `CHAT_IMPORT_SOURCES` and `getChatImportSource` as deprecated, kept "until backend migration is complete". `resolveImportDisplay` is documented as display-only, not a grouping decision. Inline JSDoc in `isWorkflowAssociatedFolder` references EPMCDME-15012.

### Derived Conventions
Canonical import sources are grouped by `import:<kind>`. Legacy names are grouped by `legacy-import:<label>`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/__tests__/useChatSidebarFolders.test.ts` covers the hook.
- `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts` covers the helpers, including `getLegacyImportGroupName` indirectly.
- `src/store/utils/__tests__/chats.test.ts` covers `IMPORT_SOURCE_DISPLAY`, `resolveImportDisplay` and the DTO transform.
- `ChatSidebarLists/__tests__/FocusedChatSidebar.test.tsx` and `FocusedAggregateRow.test.tsx` cover rendering.

### Testing Framework and Patterns
Test files sit in `__tests__` directories next to the code. Framework and version were not confirmed from `package.json`; the runner is likely Vitest, but this is not verified. Pure helpers and the hook are tested with plain inputs (`chatFolders`, `foldersToChatsMap`).

### Coverage Gaps
- No test was located for `UnifiedChatSidebar` ("no tests found within 3 caller hops").
- Whether existing tests cover a registered `gemini` or other agent-named folder was not inspected. The test files were not opened.

---

## 5. Configuration and Environment

### Environment Variables
None found relevant to this feature area.

### Configuration Files
None governing the sidebar folders. Folder alias data is hard-coded in `src/constants/chatImportSources.ts`.

### Feature Flags and Deployment Concerns
None found.

---

## 6. Risk Indicators

- The registered-name path (`sidebarFolderKeyFromName`) and the chat-grouping path (`resolveImportGroupIdentity`) use different identity schemes. Registered `claude` becomes `legacy-import:Claude Imports`. A chat with `importSource` becomes `import:<kind>`. `custom:gemini` and `import:gemini` therefore never merge. This is the root cause.
- Naming mismatch: `ImportSourceKind` uses `copilot_cli`, while the backend folder is reportedly `copilot-cli`. A direct `name === kind` comparison would miss it. The backend names were not verified from the codemie-code repository by this run.
- Speculative: the fix must not match on label text alone. A user-created empty folder named "Gemini" or "pi" would be indistinguishable from the agent's registered folder, and the acceptance criteria require such folders to remain visible only if the name is not an agent source. This is a product decision for the spec.
- The other case with chats and no `importSource`: a chat in a registered `gemini` folder that lacks `import_source` would currently be grouped under `custom:gemini`. Speculative: hiding an empty registered `gemini` folder would not affect it.
- Many consumers share the key scheme (`unifiedChatSidebarViewModel.getFolderKey`, `buildAggregates`, `MoveChatPopup`, `FolderList`). Changing key mapping, as opposed to the empty-folder filter, has a wider blast radius.
- A registered folder row remains in the backend. Rename, delete and move actions on the hidden row are not reachable, which is a behaviour question once it is hidden.
- `UnifiedChatSidebar` has no tests.

---

## 7. Summary for Complexity Assessment

The bug sits in the frontend folder-classification layer of codemie-ui. The code involved is two small pure modules (`src/constants/chatImportSources.ts` and `chatSidebarFolderHelpers.ts`) and one hook (`useChatSidebarFolders.ts`), whose `folders` memo keeps registered `custom:` folders when they are empty and drops only empty `import` and `legacy-import` kinds. The registered name `gemini` is absent from the deprecated `CHAT_IMPORT_SOURCES` map, so it is classified `custom:gemini`. The chat itself is grouped as `import:gemini`, which gives the two entries.

The change surface looks small: probably two to three source files and their existing tests. The pattern is not novel, because the `claude` alias path already shows how a registered name is mapped and filtered. The open design points are how to recognise a registered name as an agent source (the `copilot-cli` vs `copilot_cli` mismatch, and case handling) and whether to alias the name into `import:<kind>` or filter it when empty. Both are spec decisions.

Test posture: the hook and helpers have dedicated unit tests (`useChatSidebarFolders.test.ts`, `chatSidebarListsHelpers.test.ts`), so the acceptance cases fit the existing pure-function test style. Risks: the shared key scheme used by many sidebar consumers, and the absence of tests for `UnifiedChatSidebar`.

---

## 8. External References

None named by the task. The task mentions the backend `resolveConversationFolder` in codemie-code as the source of the folder names, but gives no path, and it was not read. The folder names codex, copilot-cli, opencode, pi and kimi are therefore unverified here.
