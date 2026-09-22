# Technical Research

**Task**: chat sidebar ChatSidebarLists FocusedChatSidebar ChatViewSettings
**Generated**: 2026-08-12T13:10:00Z
**Research path**: codegraph + manual source audit

---

## 1. Original Context

EPMCDME-13270 — align chats sidebar with final prototype. Align the ChatSidebar component and its sub-components (ChatSidebarLists, FocusedChatSidebar, FocusedConversationSections) with the final UX prototype. The prototype branch is EPMCDME-13270_chats-sidebar-prototype. Prior research available at docs/superpowers/tasks/2026-08-11-epmcdme-13270-chats-sidebar-alignment/technical-analysis.md and specs at docs/superpowers/specs/2026-08-11-epmcdme-13270-chats-sidebar-final-rules.md

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatSidebar/ChatSidebar.tsx` — top-level shell: sidebar header, search bar, `ChatViewSettings` trigger, delegates list rendering to `ChatSidebarLists`; calls `assistantsStore.getRecentAssistants()` but does not render the result
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx` — unified/focused mode switcher; owns Pinned / Recent / Workflow Runs / Folders accordions in unified mode; passes `FocusedChatSidebar` for focused mode; **681 lines** (exceeds 300-line guide limit)
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedChatSidebar.tsx` — focused mode root-view (groups list) and drill-down view (header + conversation sections); 267 lines
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedConversationSections.tsx` — renders Pinned and Recent accordions inside a focused drill-down view; merges pinned chats and pinned folder aggregates into one time-sorted list
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedAggregateRow.tsx` — single row for a folder or assistant aggregate in focused root view; renders icon, name, "Last:" chat name, and chat count
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedViewHeader.tsx` — header shown after drill-down: back button, avatar/name, chat count, New chat button, scoped search input
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarListsHelpers.ts` — pure view-model builders: `buildUnifiedChatSidebarViewModel`, `buildFocusedChatSidebarViewModel`; contains folder/assistant grouping, pinned-folder aggregate logic, chat location mapping. Currently `foldersToChatsMap` is keyed on `chat.folder` (line 159) — has no mechanism to group chats by `import_source` value.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/focusedAggregateAvatars.ts` — deduplicates unique assistant avatars across a group's chats
- `src/pages/chat/components/ChatSidebar/ChatViewSettings/ChatViewSettings.tsx` — settings popover: Organize by / List density / Sections checkboxes (including the `showPinnedChats` toggle that the spec requires removal of)
- `src/store/chatViewSettings.ts` — Valtio store; persists to `sessionStorage` under key `chat-view-settings`; default density is `DETAILED` (spec requires `COMPACT`); `readStoredSettings()` validates each field individually — unknown fields are silently ignored; existing valid fields are preserved; **no separate legacy storage key is needed** for the `showPinnedChats` → `showRecentAssistants` migration
- `src/constants/chats.ts:18` — `export const AVATAR_CHAT_FOLDER = 'avatar'`; used in `ChatListItem.tsx` and `DeleteChatPopup.tsx` to route to `/avatar-chat` vs `/chats` path. **Active legacy routing contract** — see dedicated section below.
- `src/constants/chatImportSources.ts` — `CHAT_IMPORT_SOURCES` dictionary maps legacy folder name strings to `ChatImportSource` (icon + label). Current keys: `'claude desktop'`, `'claude imports'`, `'claude'`, `'codemie-code'`. All four currently map to the same `{ name: 'Claude Desktop', iconUrl: chatImportIcon }` — no per-source icons yet.

### AVATAR_CHAT_FOLDER — active legacy routing contract

`AVATAR_CHAT_FOLDER = 'avatar'` is an **active legacy mechanism**, not dead code. It is used in:
- `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx` — routing: `folder === AVATAR_CHAT_FOLDER ? 'avatar-chat' : 'chats'`
- `src/pages/chat/components/ChatSidebar/ChatList/DeleteChatPopup.tsx` — same routing conditional

This value must not be reclassified as an import folder, a custom folder, or any part of the new `ImportGroupIdentity` model. The classification algorithm must handle `folder === AVATAR_CHAT_FOLDER` as an early exit before any import or custom folder checks.

**This is not part of the target folder architecture.** It is preserved only for backward compatibility. A separate follow-up is required to:
- Audit all places that read or write `folder = 'avatar'`
- Define conditions under which this routing can be safely removed
- Schedule removal in a dedicated cleanup task, separate from the import-source migration

### Import Folder Grouping Gap — canonical and legacy

`chatSidebarListsHelpers.ts` builds `foldersToChatsMap` keyed on `chat.folder` (line 159). This map cannot group chats by `import_source` value — chats with `importSource` set but `folder = null/''` are invisible to it.

The view model requires two separate group structures:

**Canonical Import groups**: chats with a valid `ImportSourceKind` in `importSource`. Each distinct `ImportSourceKind` value is a separate group. Grouped independently of the `foldersToChatsMap`.

**Legacy Import groups**: chats where `importSource` is null but `folder` matches a key in `CHAT_IMPORT_SOURCES`. These are temporary transitional groups, keyed by the raw legacy folder name string.

These two kinds of groups must have distinct identities and must never be merged:

```ts
// Illustrative group identity semantics (exact type name is implementation choice):
type ImportGroupIdentity =
  | { kind: 'import'; source: ImportSourceKind }       // canonical
  | { kind: 'legacy-import'; folderName: string }      // transitional
```

This prevents namespace collisions: `import:codex` and `legacy-import:codemie-code` are independent groups. Legacy folder names are **not** inferred to a canonical `ImportSourceKind`.

### startNewChat Caller Audit

Full audit of `chatsStore.startNewChat(assistantId, folder, isWorkflow)` call sites in non-test source files:

| File | Line | Second arg (folder) | Status |
|---|---|---|---|
| `Navigation.tsx` | 62 | `''` | OK |
| `ChatHeader.tsx` | 50 | `''` | OK |
| `ChatHeader.tsx` | 67 | `currentChat?.folder ?? ''` | OK — current Custom Folder |
| `ChatSidebarLists.tsx` | 446 | `aggregate.kind === 'folder' ? aggregate.name : ''` | OK — Custom Folder name |
| `FolderList.tsx` | 99 | `folderName` | OK — Custom Folder context |
| `AwsAgentCoreRuntimeDetails.tsx` | 113 | *(not passed)* | OK — no folder arg |
| **`NavigationPinnedSection.tsx`** | **88** | **`a.name`** | **PROBLEM — assistant name** |
| **`AssistantChatStartPage.tsx`** | **43** | **`assistant.name`** | **PROBLEM — assistant name** |
| **`AssistantDetailsPage.tsx`** | **74** | **`assistant.name`** | **PROBLEM — assistant name** |
| **`AssistantCard.tsx`** | **112** | **`assistant.name`** | **PROBLEM — assistant name** |
| **`ChatSidebarAssistants.tsx`** | **62** | **`assistant.name`** | **PROBLEM — assistant name** |
| **`StartNewChatModal.tsx`** | **86** | **`folder ?? assistant.name`** | **PROBLEM — assistant name fallback** |
| `ChatSidebarWorkflows.tsx` | 48 | `workflow.name` | Workflow — `isWorkflow=true`, separate concern |
| `FavoritesPage.tsx` | 61 | `workflow.name` | Workflow — `isWorkflow=true`, separate concern |
| `RunChatButton.tsx` | 43 | `workflow.name` | Workflow — `isWorkflow=true`, separate concern |
| `ViewWorkflowHeader.tsx` | 84 | `workflow.name` | Workflow — `isWorkflow=true`, separate concern |
| `WorkflowsList.tsx` | 155 | `workflow.name` | Workflow — `isWorkflow=true`, separate concern |

**6 confirmed problematic callers** (all pass `assistant.name` with `isWorkflow=false`). The plan originally listed 2 callers — 4 additional callers were found: `NavigationPinnedSection.tsx:88`, `AssistantChatStartPage.tsx:43`, `AssistantDetailsPage.tsx:74`, `AssistantCard.tsx:112`.

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| Store | `chatViewSettings.ts` (Valtio proxy), `chats` store |
| View-model | `chatSidebarListsHelpers.ts` — `buildUnifiedChatSidebarViewModel`, `buildFocusedChatSidebarViewModel` |
| Container | `ChatSidebarLists.tsx`, `FocusedChatSidebar.tsx`, `ChatSidebar.tsx` |
| Presentation | `FocusedAggregateRow.tsx`, `FocusedViewHeader.tsx`, `FocusedConversationSections.tsx`, `ChatViewSettings.tsx` |

### Integration Points

- `valtio` — reactive state via `proxy` / `useSnapshot`; all components subscribe to `chatViewSettingsStore`
- `primereact/overlaypanel` — `ChatViewSettings` popover container
- `assistantsStore.getRecentAssistants()` — fetched in `ChatSidebar.tsx` but not yet rendered; loads from **local storage**, not from a server-side API; no server-side assistant-scoped conversation endpoint exists
- `ChatSidebarLists` exposes imperative API (`expandFolder`, `scrollToChat`) via `forwardRef` — must remain intact after the 681-line file is split

### Patterns and Conventions

- Valtio `proxy` + `useSnapshot` for all store subscriptions
- Pure view-model builder functions in `chatSidebarListsHelpers.ts` separated from rendering components
- Accordion-based sections with mutual-exclusion toggle logic
- `forwardRef` on `ChatSidebarLists` to expose `expandFolder`/`scrollToChat` imperative API
- Tailwind semantic tokens, `cn()` conditional class utility
- 300-line hard limit on component files (from `.ai-run/guides/components/component-patterns.md`)

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` — component structure, props typing, 300-line hard limit, store access pattern
- `.ai-run/guides/styling/styling-guide.md` — Tailwind-only, semantic tokens, `cn()` usage
- `.ai-run/guides/testing/testing-patterns.md` — Vitest AAA pattern, unit vs integration workspaces
- `docs/superpowers/specs/2026-08-11-epmcdme-13270-chats-sidebar-final-rules.md` — Ihor's final UX baseline (authoritative spec for this task)
- `docs/superpowers/tasks/2026-08-11-epmcdme-13270-chats-sidebar-alignment/technical-analysis.md` — prior manual research (detailed analysis of prototype vs. production gaps)

### Architectural Decisions

- The spec (`final-rules.md`) explicitly rejects synthetic "Pinned folder aggregates" (section 4 and section 20). The current `buildPinnedFolderGroups` logic in `chatSidebarListsHelpers.ts` must be removed.
- The prototype branch (`EPMCDME-13270_chats-sidebar-prototype`) is the reference implementation. The file `ChatPanelPrototype.tsx` is intentionally NOT copied into the integration branch; the integration must implement the behavior natively in the existing component tree.
- `docs/chat-view-states.md` was removed from the deployed branch and must be ignored — it partially conflicts with the final rules.

### Derived Conventions

- The `showPinnedChats` setting is being removed entirely. Pinned section visibility is governed solely by whether there are pinned items (non-empty = visible). All view-model builders must treat pinned as always-visible.
- Settings descriptions in `ChatViewSettings.tsx` must match the exact tooltip text from `final-rules.md` section 19.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx` — unified mode: folder-chat stays in Recent, sort by date, folder sort order
- `src/pages/chat/components/ChatSidebar/__tests__/FocusedConversationSections.test.tsx` — pinned items batch-loading, chat+folder-aggregate sort order in Pinned
- `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts` — comprehensive unit tests for both view-model builders; covers folder vs assistant grouping, pinned-folder aggregation, workflow separation, import-folder exclusion from Recent

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library
- AAA pattern (Arrange / Act / Assert)
- Unit workspace (`*.test.tsx`)
- Fixture factories with minimal required props
- `useSnapshot` mocked via valtio test utilities or store reset patterns

### Coverage Gaps

- `FocusedAggregateRow.tsx` — no dedicated tests; density-conditional rendering (Compact vs Detailed) is untested
- `FocusedViewHeader.tsx` — no dedicated tests; element ordering and search label logic are untested
- `ChatViewSettings.tsx` — no tests for checkbox visibility or tooltip text
- Recent Assistants section (not yet implemented) — data source is local storage, not server API
- **client-side Assistant History view** — no server-side assistant-scoped endpoint; tests must validate client-side filtering logic only and must not assert completeness of server history
- After `showPinnedChats` removal: `chatSidebarListsHelpers.test.ts` must be updated
- `ImportGroupIdentity` grouping — zero coverage today; needs: canonical import placement, legacy import fallback, chat with both `importSource` and `folder` set, unknown `dto.import_source` value
- Import UI restrictions — no tests for context menu item visibility on imported chats or Custom Folder picker exclusion
- Namespace collision — no test verifying `custom:codex` and `import:codex` render as independent groups

---

## 5. Configuration and Environment

### Environment Variables

- None directly relevant to the sidebar feature area.

### Configuration Files

- `src/store/chatViewSettings.ts` — `CHAT_VIEW_SETTINGS_STORAGE_KEY = 'chat-view-settings'` (sessionStorage); default: `UNIFIED` organize mode, `DETAILED` density, `showPinnedChats: true`, `showWorkflowRunsSeparately: false`
- **Settings migration approach**: `readStoredSettings()` reads the same key and validates each field individually. Replacing `showPinnedChats` with `showRecentAssistants` requires only updating `DEFAULT_CHAT_VIEW_SETTINGS` and the validation block inside `readStoredSettings()`. No separate legacy key is needed — unknown fields are silently ignored; missing fields use defaults. No explicit migration loop is required.

### Feature Flags and Deployment Concerns

- No feature flags on sidebar components.
- `sessionStorage` persistence: changing the default density from `DETAILED` to `COMPACT` only affects new sessions. Existing sessions retain saved density. No migration needed (sessionStorage is ephemeral per-tab).

---

## 6. Risk Indicators

- **`showPinnedChats` setting removal** — `ChatViewSettings.tsx` still renders a "Show pinned chats" checkbox (line 152–156); `chatViewSettingsStore` still exposes `showPinnedChats`; both view-model builders accept it as a parameter. Three-layer removal required (store → helpers → UI).
- **Default density mismatch** — `DEFAULT_CHAT_VIEW_SETTINGS.density` is `DETAILED`; spec requires `COMPACT` as default (section 19).
- **Settings description text outdated** — `ORGANIZE_OPTIONS[1].description` and all `DENSITY_OPTIONS` descriptions are stubs; spec section 19 defines the exact tooltip text.
- **Focused root view incorrect "Folders" accordion** — `FocusedChatSidebar.tsx` renders a collapsible `ChatSidebarAccordion` titled `"Folders"`. The spec (sections 2, 14.2) shows a flat navigable list with no collapsible accordion wrapper.
- **`FocusedAggregateRow` always renders "Last:" regardless of density** — line 82 always renders `Last: {getChatName(aggregate.latestChat)}`; spec section 15.4 requires simple one-line rows in Compact with no metadata.
- **`FocusedAggregateRow` compact branch always uses generic folder icon** — Compact branch sets `leadingIcon = <FolderSvg>` regardless of aggregate type; spec requires structural icons and assistant avatars to remain visible in every density (section 15.1).
- **`FocusedViewHeader` search label hardcodes "chats" suffix** — `searchLabel` = `` `Search in ${displayName} chats` `` for all contexts; folder views should show no "chats" suffix.
- **`FocusedViewHeader` element ordering inverted** — current order: avatar/name → New chat → All chats back; spec (section 14.2) shows: ← All chats → folder name → search → chats list.
- **Synthetic `pinnedFolderGroups` must be removed** — `buildPinnedFolderGroups` creates aggregates when 2+ chats from the same folder are pinned; spec sections 4 and 20 explicitly reject this pattern.
- **`ChatSidebarLists.tsx` is 681 lines** — exceeds the 300-line hard limit; extraction into sub-components required.
- **`showPinnedChats` threaded through view-model builders** — both builders must be updated to hardcode pinned as always-visible; the `hidden` case in `getChatLocation`/`collectFocusedListMembership` can be deleted.
- **Recent Assistants section not implemented** — `assistantsStore.getRecentAssistants()` is called in `ChatSidebar.tsx` but nothing renders the result. Data source is local storage, not a server API.
- **Import Folder grouping gap** — `foldersToChatsMap` is keyed on `chat.folder`. Chats with `importSource` set but `folder = null/''` are invisible to this map. A new group structure keyed on `ImportGroupIdentity` must be added to the view model. Without it, migrated import chats cannot be rendered in the sidebar.
- **Canonical vs legacy import group collision risk** — if canonical Import groups and legacy Import groups share the same identity key space (e.g., both `'codex'`), groups will be merged incorrectly. The `ImportGroupIdentity` discriminated union — `{ kind: 'import', source }` vs `{ kind: 'legacy-import', folderName }` — must be used throughout: FolderList, focused navigation, ChatSidebarLocation.
- **Import Folder not guarded against Custom Folder assignment** — currently no UI restriction prevents adding an imported chat to a Custom Folder. Imported chats must be excluded from Custom Folder add/move flows and their context menus must not show `Add to folder...`, `Move to folder...`, `Remove from folder`.
- **AVATAR_CHAT_FOLDER is an active legacy routing contract** — `AVATAR_CHAT_FOLDER = 'avatar'` drives URL routing in `ChatListItem.tsx` and `DeleteChatPopup.tsx`. It is not a permanent folder type and must not be incorporated into the target folder architecture. Handle it as an early-exit legacy case in the classification algorithm. Cleanup tracked as a separate follow-up.
- **startNewChat sends assistant.name as folder in 6 places** — full audit found 4 additional callers beyond the 2 in the original plan: `NavigationPinnedSection.tsx:88`, `AssistantChatStartPage.tsx:43`, `AssistantDetailsPage.tsx:74`, `AssistantCard.tsx:112`. All 6 must be fixed.
- **client-side Assistant History limitation** — no server-side assistant-scoped conversation endpoint exists. Task 11 must be implemented via client-side filtering of already-loaded chats. Test assertions must not claim completeness of server history.

---

## 7. Cross-Repo Contract: import_source

### codemie (backend) — current state

- **Model** (`src/codemie/rest_api/models/conversation.py`): `Conversation` has `folder: Optional[str]`, no `import_source` field. `ConversationListItem` exposes `assistant_icon` and `assistant_names` but no `import_source`.
- **`UpsertHistoryRequest`** (line 160–168): three fields only — `assistant_id`, `folder: Optional[str]`, `history`. No `import_source`.
- **`get_user_conversations`** (line 476): raw SQL with LEFT JOIN on `assistants`. `import_source` must be added to the SELECT list.
- **Migration pattern**: `op.add_column('conversations', sa.Column('col', sa.String(), nullable=True))`. Latest migration: `t1u2v3w4x5y6_add_sort_indexes_to_assistants.py`.
- **Upsert endpoint**: `PUT /v1/conversations/{id}/history` (line 404). Must accept and store `import_source` with write-once semantics.

### codemie-code — current state

- **Entry point**: `syncProcessor.ts` → `apiClient.upsertConversation()` → `PUT /v1/conversations/{id}/history`.
- **Payload** (`apiClient.ts` lines 92–96): `{ assistant_id, folder, history }`. No `import_source`.
- **Source identification**: `resolveConversationFolder()` in `syncProcessor.ts` maps `clientType` → folder string (legacy behaviour):
  - `codemie-claude` → `'claude'` / `'Claude Desktop'`
  - `codemie-codex` / agentName codex → `'codex'`
  - `codemie-copilot` → `'copilot-cli'`
  - `codemie-gemini` → `'gemini'`
  - `codemie-opencode` → `'opencode'`
  - `codemie-pi` → `'pi'`
- **Required change**: add `import_source` field to payload using `resolveImportSource(clientType)` helper.
- **`claude_code` mapping gap**: `ImportSourceKind` includes `claude_code`, but no `codemie-code` clientType currently maps to it. The Claude Code CLI integration has no confirmed clientType. **Open question** — leave undefined until confirmed.

### codemie-ui — current import detection

- `src/constants/chatImportSources.ts`: `CHAT_IMPORT_SOURCES` maps legacy folder strings to `ChatImportSource`. Keys: `'claude desktop'`, `'claude imports'`, `'claude'`, `'codemie-code'`.
- `getChatImportSource(folder)` is called in two places: `src/store/utils/chats.ts` (transform) and `src/utils/chatHelpers.ts`.
- `ChatListItem` does NOT yet have an `importSource` field.
- **After Task 1–2**: `importSource` added to `ChatListItem` via direct DTO mapping only. `resolveImportDisplay` handles display metadata. Legacy folder names are never written back to `importSource`.
- **`resolveImportDisplay` responsibility boundary**: display metadata only (icon + label). Grouping placement is `getChatLocation()`'s responsibility. Keep concerns separate.

---

## 8. Summary for Complexity Assessment

This task touches four architectural layers: the Valtio store (`chatViewSettings.ts`), the pure view-model builders (`chatSidebarListsHelpers.ts`), container components (`ChatSidebarLists`, `FocusedChatSidebar`, `ChatSidebar`), and presentation leaf components (`FocusedAggregateRow`, `FocusedViewHeader`, `FocusedConversationSections`, `ChatViewSettings`). The file change surface spans 10–12 files with one mandatory split (`ChatSidebarLists.tsx` at 681 lines). The total diff is estimated at M–L size.

The technical novelty is moderate. The patterns are well-established (Valtio, view-model builders, `cn()`/Tailwind), but there are multiple coordinated removals: `showPinnedChats`, synthetic `pinnedFolderGroups`, and the focused root view accordion. Net-new additions include: `ImportGroupIdentity` model, sidebar group namespace model, import UI restrictions, and the client-side Assistant History view. Key risk factors: 6 startNewChat callers (not 2), the `ImportGroupIdentity` canonical/legacy split to prevent namespace collisions, imported chat UI restrictions, the 300-line file extraction, and the absence of tests for presentation leaf components being changed.
