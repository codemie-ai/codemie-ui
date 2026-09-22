# Implementation Plan — Chats Sidebar: import_source + Final Prototype Alignment

**Scope:** codemie-ui plus the backend contract described below. No codemie-code change is required: it already sends `X-CodeMie-Client` on conversation sync requests.
**Branch:** EPMCDME-13270_align-sidebar-with-final-prototype
**Spec:** `docs/superpowers/tasks/2026-08-12-epmcdme-13270-align-chats-sidebar-with-final-prototype/spec.md`

---

## Cross-Repo Prerequisite — Derive import_source on the backend

The backend, not codemie-code, owns the mapping from the existing `X-CodeMie-Client` request header to the canonical `import_source` value. This keeps client identification in one place and avoids a codemie-code change solely to duplicate information that is already sent with every conversation sync request.

**Backend changes:**
1. Read `X-CodeMie-Client` in `PUT /v1/conversations/{conversation_id}/history`.
2. Resolve the canonical import source from the header:

   | `X-CodeMie-Client` | `import_source` |
   |---|---|
   | `codemie-claude` | `claude_code` |
   | `claude-desktop` | `claude_desktop` |
   | `codemie-codex` | `codex` |
   | `codemie-gemini` | `gemini` |
   | `codemie-copilot` | `copilot_cli` |
   | `codemie-opencode` | `opencode` |
   | `codemie-pi` | `pi` |

3. Leave `import_source` null for unknown client types. Do not guess.
4. Preserve write-once semantics: set `import_source` only when the stored value is null; never overwrite a non-null value.
5. Keep `folder` independent from `import_source`. Renaming a folder must not change whether a chat is imported or which client imported it.
6. Return `import_source` from the conversation list and detail APIs for frontend classification.

**Legacy data and rollout:**
1. Existing conversations with `import_source = null` continue to use the frontend legacy-folder fallback.
2. Backfill only confirmed legacy folder mappings after a production-data audit; leave ambiguous records on the fallback path.
3. New conversations and existing conversations synced again after deployment receive `import_source` from `X-CodeMie-Client`.
4. Remove the legacy fallback only after the backfill is complete and production data has been verified.

**codemie-code:** no implementation change. Its existing conversation API client already sends `X-CodeMie-Client`.

---

## Task 1 — Add ImportSourceKind type and importSource to ChatListItem

**Files:**
- `src/constants/chatImportSources.ts`
- `src/types/entity/conversation.ts`
- `src/store/utils/chats.ts`

**Steps:**
1. Add `ImportSourceKind` union type to `chatImportSources.ts`. Add a runtime type guard `isValidImportSourceKind(value: unknown): value is ImportSourceKind`.
2. Add `importSource?: ImportSourceKind | null` to `ChatListItem` interface.
3. In `transformChatListItemDTO` (`src/store/utils/chats.ts`): map `dto.import_source → importSource` using the type guard. If `dto.import_source` is absent or null → `importSource = null`. If the value is present but unknown → normalize to `null` (do not throw; do not create a group). **Never infer legacy folder names into `importSource`.**
4. Do NOT call `getChatImportSource(folder)` inside the DTO transform. Legacy fallback is applied separately at display and group resolution time.

**Test-first:** yes — update `src/store/utils/__tests__/chats.test.ts`:
- valid `dto.import_source` → `importSource` is populated
- `dto.import_source = null` → `importSource` is `null`; no Import Folder group created from DTO alone
- unknown `dto.import_source` value → `importSource` is `null`; no canonical group created

---

## Task 2 — Import source display resolver with legacy fallback

**Files:**
- `src/constants/chatImportSources.ts`
- `src/store/utils/chats.ts`
- `src/utils/chatHelpers.ts`

**Steps:**
1. Add `IMPORT_SOURCE_DISPLAY: Record<ImportSourceKind, ChatImportSource>` to `chatImportSources.ts`.
2. Add `resolveImportDisplay(chat: { importSource?: ImportSourceKind | null; folder?: string | null }): ChatImportSource | undefined`:
   - If `chat.importSource` is a valid `ImportSourceKind` → return from `IMPORT_SOURCE_DISPLAY`.
   - Else → return `getChatImportSource(chat.folder)` (legacy fallback).
   - This function resolves **display metadata only** (icon + label for render). It does not determine sidebar placement or group identity — that is `getChatLocation()`'s responsibility.
3. Replace the two existing `getChatImportSource(folder)` call sites with `resolveImportDisplay(chat)`.

**Test-first:** yes:
- canonical `importSource` → `IMPORT_SOURCE_DISPLAY` result returned
- `importSource = null`, known legacy folder → legacy fallback result
- `importSource = null`, unknown folder → `undefined`

---

## Task 3 — Fix startNewChat callers (stop folder = assistant.name)

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatSidebarAssistants.tsx`
- `src/pages/chat/components/ChatSidebar/StartNewChatModal.tsx`
- `src/pages/navigation/components/NavigationPinnedSection.tsx`
- `src/pages/chat/AssistantChatStartPage.tsx`
- `src/pages/assistant/AssistantDetailsPage.tsx`
- `src/pages/assistant/components/AssistantCard.tsx`

**Steps:**
1. `ChatSidebarAssistants.tsx:62` — change `assistant.name` → `''`.
2. `StartNewChatModal.tsx:86` — change `folder ?? assistant.name` → `folder ?? ''`.
3. `NavigationPinnedSection.tsx:88` — change `a.name` → `''`.
4. `AssistantChatStartPage.tsx:43` — change `assistant.name` → `''`.
5. `AssistantDetailsPage.tsx:74` — change `assistant.name` → `''`.
6. `AssistantCard.tsx:112` — change `assistant.name` → `''`.
7. Do NOT modify workflow callers (`isWorkflow=true`) or `AVATAR_CHAT_FOLDER` callers.

`startNewChat` signature does not change.

**Test-first:** yes — update each caller's test: verify `startNewChat` is called with `''` as the folder argument, not `assistant.name`.

---

## Task 4 — Update folder classification (chatSidebarListsHelpers)

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarListsHelpers.ts`
- `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts`

**Steps:**
1. Implement the classification algorithm from spec §2.1 in priority order: Workflow → legacy avatar → canonical import → legacy import → custom folder → assistant folder → uncategorized. Canonical `import_source` is evaluated before Custom Folder.
2. Add helpers:
   - `isValidImportSourceKind(value: unknown): value is ImportSourceKind` — type guard
   - `isImportChat(chat: ChatListItem): boolean` — `isValidImportSourceKind(chat.importSource) || !!getChatImportSource(chat.folder)`; must return `false` when `chat.folder === AVATAR_CHAT_FOLDER`
   - `isAssistantNameFolder(chat: ChatListItem, assistants: AssistantListItem[]): boolean` — `true` when `chat.folder` equals the name of the assistant with id `chat.initialAssistantId`
3. Add `ImportGroupIdentity` type (or equivalent namespaced key scheme) to separate canonical and legacy import groups — see spec §2.3. Implementation may use discriminated union, separate maps, or namespaced string keys (`import:codex`, `legacy-import:codemie-code`). The constraint: canonical and legacy groups must never share an identity.
4. Replace `importSourceGroupsMap: Partial<Record<ImportSourceKind, ChatListItem[]>>` with a structure keyed by `ImportGroupIdentity`. Populate canonical groups from chats where `isValidImportSourceKind(chat.importSource)`; populate legacy groups from chats where `isImportChat(chat) && !isValidImportSourceKind(chat.importSource)`.
5. A chat with both `importSource` set and `folder` set: place in canonical import group. The `folder` is treated as inconsistent data and does not change placement.

**Test-first:** yes:
- Chat with valid `importSource` → placed in canonical import group, NOT in Custom Folder or legacy group
- Chat with `importSource = 'codex'` AND `folder = 'Research'` → canonical `import:codex`, not `custom:Research`
- Chat with `importSource = null`, `folder = 'codemie-code'` → legacy import group, not Custom Folder
- Chat with `folder = assistant.name` → classified as Assistant Folder, not Custom Folder
- Chat with `folder = AVATAR_CHAT_FOLDER` → `isImportChat` returns false; handled as legacy avatar
- `custom:codex` and `import:codex` groups exist independently with no collision

---

## Task 5 — Align Settings (replace showPinnedChats, default Compact, tooltips)

**Files:**
- `src/store/chatViewSettings.ts`
- `src/pages/chat/components/ChatSidebar/ChatViewSettings/ChatViewSettings.tsx`
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarListsHelpers.ts`

**Steps:**
1. Replace `showPinnedChats: boolean` with `showRecentAssistants: boolean` in the store type and `DEFAULT_CHAT_VIEW_SETTINGS`.
2. Change `DEFAULT_CHAT_VIEW_SETTINGS.density` from `DETAILED` to `COMPACT`.
3. Update `readStoredSettings()` in-place (same storage key `'chat-view-settings'`, no new key needed):
   - Remove the `showPinnedChats` validation block.
   - Add `showRecentAssistants` with default `true`.
   - The existing unknown-field handling silently ignores stale fields — no migration loop needed.
4. Remove `showPinnedChats` parameter from both view-model builders; hardcode pinned as always-visible.
5. Replace settings option descriptions and tooltips with the exact text from spec §15 / final-rules.md §19.
6. Ensure info icons do not toggle their associated radio/checkbox.

**Test-first:** yes:
- Default density is `COMPACT`; default `showRecentAssistants` is `true`
- Old storage without `showRecentAssistants` → field defaults to `true`
- Old storage with `showPinnedChats` → silently ignored
- View-model builders no longer accept `showPinnedChats`

---

## Task 6 — Add Recent Assistants section

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatSidebar.tsx`
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx`
- new `src/pages/chat/components/ChatSidebar/RecentAssistants/RecentAssistants.tsx`

**Steps:**
1. Create `RecentAssistants.tsx`: accordion section rendering assistant rows (avatar always visible regardless of density).
2. Primary click → `startNewChat(assistant.id, '', false)` (empty folder, not `assistant.name`).
3. Show only when `showRecentAssistants` setting is ON.
4. Wire up in `ChatSidebar.tsx` using `assistantsStore.getRecentAssistants()` (local storage — no server API dependency).
5. Bounded internal scroll for long lists.
6. Assistant row menu: New chat, View chat history, Edit assistant, Remove from Recent Assistants.

**Test-first:** yes — renders with setting ON, hidden with setting OFF, primary click calls `startNewChat` with `''` as folder.

---

## Task 7 — Remove synthetic pinnedFolderGroups aggregation

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarListsHelpers.ts`
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedConversationSections.tsx`
- `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts`

**Steps:**
1. Remove `buildPinnedFolderGroups` and `pinnedFolderGroups` from the focused view model.
2. Remove `pinned-folder` navigation state and all rendering branches in `FocusedConversationSections`.
3. Pinned section shows individual chat rows only.
4. Replace aggregation tests with individual-row tests.

**Test-first:** yes — no pinned-folder aggregate produced even when 2+ chats from the same folder are pinned.

---

## Task 8 — Explicit folder semantics (FolderKind, namespace, icons, menus)

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarListsHelpers.ts`
- `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx`
- folder action popups

**Steps:**
1. Define `FolderKind` based on the namespace model from spec §2.4:
   - `assistant` — keyed `assistant:<assistant-id>`
   - `custom` — keyed `custom:<folder-name>`
   - `import` — keyed `import:<import-source>` (canonical)
   - `legacy-import` — keyed `legacy-import:<folder-name>` (transitional)
   - `legacy-avatar` — keyed `legacy-avatar:avatar` (compat only, not a real folder kind)
2. Build the folder identity map from view model data using `ImportGroupIdentity` (from Task 4) and the namespace model. Do NOT derive kind from `Record<string, FolderKind>` with unnamespaced keys — this would cause collisions (e.g., `'codex'` ambiguous between custom and import).
3. `FolderList.tsx`: render correct icon per kind; pass kind + identity to focused navigation drill-down.
4. `custom` kind: full actions — `Add chats...`, rename, delete (with confirmation).
5. `import` and `legacy-import` kinds: **no** `Add chats...`, no generic rename/delete, no `Move to folder...`; context New Chat disabled or redirected.
6. `assistant` kind: `New chat`, `View chat history`, `Edit assistant`, special delete.
7. `legacy-avatar` kind: preserve existing routing behaviour; no new context menu.

**Test-first:** yes — folder action availability per kind; icon per kind; `custom:codex` and `import:codex` both exist with different icons and different action sets.

---

## Task 9 — Custom-folder membership rules + import restrictions

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`
- folder add/move/remove/delete popups

**Steps:**
1. Regular chat (no Custom Folder) → show `Add to folder...`.
2. Regular chat inside Custom Folder → show `Move to folder...` + `Remove from folder`.
3. **Imported chat** (canonical or legacy import) → **no** `Add to folder...`, `Move to folder...`, `Remove from folder`. No Custom Folder context menus at all.
4. Custom Folder `Add chats...` picker — exclude imported chats from the list.
5. Import Folder does not accept regular chats (no drag-drop or picker that assigns a regular chat to an import group).
6. Remove any `Manage folders...` or multi-membership behaviour.
7. `Remove from folder` for regular chat → clears `folder`, returns chat to Assistant Folder organisation.
8. Destructive Custom Folder delete → confirmation stating all chats are deleted.
9. Assistant Folder delete → two-option confirmation: `Delete chats only` / `Delete folder & chats`.

**Test-first:** yes:
- Regular chat context menu: `Add to folder...` shown
- Imported chat context menu: no folder-related actions shown
- Custom Folder `Add chats...` picker: imported chats absent
- Remove from folder: calls correct API with cleared folder

---

## Task 10 — Density and avatar rules

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedAggregateRow.tsx`
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedViewHeader.tsx`
- `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`

**Steps:**
1. `FocusedAggregateRow`: Compact → one-line, no `Last:`, correct structural icon (not always `FolderSvg`); Detailed → count + last chat title + participant avatars.
2. `FocusedViewHeader`: fix element order (← All chats → folder name → search); fix search label (no "chats" suffix for folder contexts).
3. `ChatListItem`: Compact → no avatars; Detailed → avatar visible; inside primary Assistant Folder → suppress avatar for primary-only chats.
4. Recent Assistants rows → always show avatar regardless of density.

**Test-first:** yes — `FocusedAggregateRow` Compact vs Detailed snapshot; `FocusedViewHeader` element order and search label.

---

## Task 11 — client-side Assistant History view

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedChatSidebar.tsx`
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarListsHelpers.ts`

**Steps:**
1. Add `assistant-history` view state distinct from `assistant-folder` view.
2. `View chat history` menu → opens `assistant-history` view.
3. Primary click on Recent Assistant → `startNewChat`, not history.
4. `assistant-history` view: Pinned + Recent sections; hide empty sections; scoped search; New Chat → directly with that assistant.
5. History is built by client-side filtering of the already-loaded `chatsStore` set: chats where `initial_assistant_id` matches, plus chats where the assistant participated successfully.
6. **Do not add a new API call.** No server-side assistant-scoped conversation endpoint exists. The resulting history covers only what `chatsStore` has already loaded — completeness across all server conversations is **not guaranteed**. A dedicated server-side endpoint is a separate backend concern, not part of this task.
7. Add a code comment on the filtering function to document the completeness limitation.

**Test-first:** yes:
- `assistant-history` view navigation
- New Chat from history context calls `startNewChat`
- History includes secondary-participant chats
- No new API call is made; all data comes from the existing `chatsStore` state

---

## Task 12 — Split ChatSidebarLists.tsx + remove transitional code

**Files:**
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx` (681 lines → ≤300)
- new sub-components extracted from it

**Steps:**
1. Extract unified-mode section rendering into `UnifiedSidebarSections.tsx`.
2. Extract focused-mode wrapper into `FocusedSidebarWrapper.tsx` (or reuse existing `FocusedChatSidebar`).
3. `ChatSidebarLists.tsx` retains the `forwardRef` + `ChatSidebarListsRef` imperative API unchanged — `expandFolder` and `scrollToChat` must continue to work after extraction.
4. Remove any prototype query param (`?chatPanelPrototype`), hard-coded demo data, or stale helper/setting references.
5. Run full test suite; fix any broken imports.

**Test-first:** yes — `expandFolder` and `scrollToChat` still callable after refactor; existing `ChatSidebarLists` integration tests still pass.

---

## Task 13 — Tests, validation, and QA

**Steps:**
1. Update all tests that reference `showPinnedChats`, `pinnedFolderGroups`, or stale folder-detection logic.
2. Add `FocusedAggregateRow` and `FocusedViewHeader` dedicated test files.
3. Add `RecentAssistants` component tests.
4. Add `ImportGroupIdentity` tests (spec §4): canonical placement, legacy fallback, chat with both `importSource` + `folder`, unknown `dto.import_source`.
5. Add import restriction tests: imported chat context menu has no folder actions; `Add chats...` picker excludes imported chats.
6. Add namespace collision test: `custom:codex` and `import:codex` exist simultaneously with different icons and action sets.
7. Run quality gates in order:
   ```
   npm run lint
   npm run typecheck
   npm run test:unit
   npm run test:integration
   ```
   All must pass with no errors or warnings.
8. Manual verification: all four navigation/density combinations (Unified+Compact, Unified+Detailed, Focused+Compact, Focused+Detailed).

---

## Execution Order

```
1 → 2  (types + display resolver — foundation for grouping and display)
3      (fix startNewChat — independent, safe)
4      (classification + ImportGroupIdentity — depends on 1+2)
5      (settings — independent store change)
6      (Recent Assistants — depends on 5 for showRecentAssistants)
7      (pinned aggregation removal — independent)
8      (folder semantics + namespace model — depends on 4)
9      (membership rules + import restrictions — depends on 8)
10     (density/avatars — depends on 8)
11     (client-side Assistant History — depends on 8+6)
12     (split + cleanup — last, after all logic is stable)
13     (tests + QA — runs alongside each task and as a final pass)
```

---

## Constraints

- NEVER modify `Sidebar.tsx`.
- NEVER remove `data-chat-id`, `data-folder`, `data-folder-open`, `data-onboarding` attributes.
- NEVER change `ChatSidebarListsRef` interface.
- `forwardRef` + `ref` on `<ul>` in `ChatList` must stay.
- `importSource` is read-only on the frontend — never set or modified by UI actions.
- `import_source` on backend is write-once — never overwrite a non-null value.
- `AVATAR_CHAT_FOLDER = 'avatar'` routing contract must be preserved in `ChatListItem.tsx` and `DeleteChatPopup.tsx`. Handle as an early-exit legacy case in classification. Do not incorporate into the target folder architecture. Cleanup is a separate follow-up.
- Canonical and legacy import group identities must never share the same key — use the `ImportGroupIdentity` namespace model throughout FolderList, focused navigation, and ChatSidebarLocation.
- Imported chats cannot be placed in Custom Folders via UI. Context menus on imported chats must not show `Add to folder...`, `Move to folder...`, or `Remove from folder`. Imported chats must be excluded from Custom Folder `Add chats...` pickers.
- Do NOT add a new API call for assistant history (Task 11). Client-side filtering only.
- Do NOT infer or write canonical `ImportSourceKind` from legacy folder names into `ChatListItem.importSource`.
