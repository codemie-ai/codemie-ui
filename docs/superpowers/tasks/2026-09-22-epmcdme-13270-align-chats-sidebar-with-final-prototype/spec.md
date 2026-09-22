# Spec — Chats Sidebar: import_source Contract + Final Prototype Alignment

**Tickets:** EPMCDME-13270, EPMCDME-13271
**Date:** 2026-08-12
**Status:** Draft
**Repos:** codemie-ui (primary), codemie (backend), codemie-code

---

## 1. Goals

1. Introduce an explicit `import_source` field to replace folder-name-based import detection.
2. Fix folder pollution: stop sending `folder = assistant.name` when creating chats from assistants.
3. Complete the remaining sidebar alignment tasks from the approved integration plan (Tasks 2–10).

---

## 2. Folder Classification Contract

### 2.1 Classification algorithm

Each chat belongs to exactly one category. The algorithm applies checks in strict priority order and stops at the first match:

```
1. Workflow     — is_workflow = true (handled per showWorkflowRunsSeparately setting)
2. Legacy avatar — folder === AVATAR_CHAT_FOLDER  (legacy routing compat only)
3. Canonical Import — isValidImportSourceKind(chat.importSource)
4. Legacy Import   — getLegacyImportDisplay(chat.folder) matches CHAT_IMPORT_SOURCES
5. Custom Folder   — folder set, not avatar, not assistant-name
6. Assistant Folder — initialAssistantId set
7. Recent / Uncategorized
```

Pseudocode (function names may be adapted to match existing architecture):

```ts
if (chat.isWorkflow && settings.showWorkflowRunsSeparately) {
  return workflowLocation
}
if (chat.folder === AVATAR_CHAT_FOLDER) {
  return legacyAvatarLocation   // legacy routing; not part of target architecture
}
if (isValidImportSourceKind(chat.importSource)) {
  return canonicalImportLocation(chat.importSource)
}
const legacyImport = getLegacyImportDisplay(chat.folder)
if (legacyImport) {
  return legacyImportLocation(chat.folder)
}
if (isCustomFolder(chat.folder, chat.initialAssistantId, assistants)) {
  return customFolderLocation(chat.folder)
}
if (chat.initialAssistantId) {
  return assistantFolderLocation(chat.initialAssistantId)
}
return recentOrUncategorizedLocation
```

> **Key policy**: canonical `import_source` (step 3) is evaluated **before** Custom Folder (step 5). A chat with a valid `import_source` is placed in its Import Folder regardless of whether `folder` is also set. `folder` on an imported chat is treated as inconsistent/legacy data (see §2.5) and does not override placement.

### 2.2 Import Folder policy

Imported chats are system/technical conversations. They are not subject to user folder organisation.

**Rules:**

- A chat with a valid canonical `import_source` is always placed in its corresponding Import Folder.
- `import_source` takes priority over `folder` for sidebar placement.
- If a chat arrives from the backend with both `importSource` set and `folder` set, the canonical `import_source` determines placement. The conflicting `folder` is treated as inconsistent/legacy data and does not change placement. Such records should be flagged during the data migration audit.
- Imported chats cannot be added or moved to Custom Folders via the UI.
- Import Folders do not accept arbitrary regular chats.
- Context menu on an imported chat **does not show**: `Add to folder...`, `Move to folder...`, `Remove from folder`.
- Imported chats are excluded from the `Add chats...` picker inside Custom Folder flows.
- Contextual New Chat inside an Import Folder is disabled or redirected to the global New Chat (no pre-filled folder).
- `import_source` remains read-only on the frontend; it is never set or modified by UI actions.
- Moving imported chats to Custom Folders may be added in a future separate product decision.

### 2.3 Import Folder group identity

Import Folder groups have two distinct identity kinds that must not be merged:

```ts
type ImportGroupIdentity =
  | { kind: 'import'; source: ImportSourceKind }       // canonical — from import_source field
  | { kind: 'legacy-import'; folderName: string }      // transitional — from legacy folder name
```

Canonical groups are keyed by their `ImportSourceKind` value. Legacy groups are keyed by the raw legacy folder name string. **Legacy folder names are never inferred to a canonical ImportSourceKind** without a confirmed migration mapping. The strings `'codemie-code'` and `'claude imports'` remain as `legacy-import` until explicitly mapped during the data migration audit.

**Examples:**

| Chat record | Group identity |
|---|---|
| `{ importSource: 'codex' }` | `{ kind: 'import', source: 'codex' }` |
| `{ importSource: null, folder: 'codemie-code' }` | `{ kind: 'legacy-import', folderName: 'codemie-code' }` |
| `{ importSource: null, folder: 'claude imports' }` | `{ kind: 'legacy-import', folderName: 'claude imports' }` |

After migration completes, legacy groups are removed. Only canonical groups remain.

### 2.4 Sidebar group namespace model

All sidebar groups are identified with namespaced keys to prevent collisions between different group types that may share the same string (e.g., a custom folder named "codex" must not be confused with the canonical import source "codex"):

| Group type | Key format | Example |
|---|---|---|
| Assistant Folder | `assistant:<assistant-id>` | `assistant:abc-123` |
| Custom Folder | `custom:<folder-name>` | `custom:codex` |
| Canonical Import Folder | `import:<import-source>` | `import:codex` |
| Legacy Import Folder | `legacy-import:<folder-name>` | `legacy-import:codemie-code` |
| Legacy avatar routing | `legacy-avatar:<identity>` | `legacy-avatar:avatar` |

`custom:codex` and `import:codex` are independent groups and must render independently with their respective icons and context menus. The namespace must be preserved in: `FolderKind`, `FolderList` routing, focused navigation drill-down, `ChatSidebarLocation`, and any place that reads group identity from state.

The concrete implementation may use namespaced string keys, separate maps, or a discriminated union group object — as long as the above constraints hold.

> `legacy-avatar` is a compatibility namespace, not part of the target folder architecture. Do not introduce it as a permanent `FolderKind` variant.

### 2.5 Inconsistent / legacy data handling

The state `{ importSource: 'codex', folder: 'Research' }` should not be created by the frontend. If it arrives from the backend:

- The chat is placed in `import:codex` (canonical import wins).
- `folder: 'Research'` is ignored for placement.
- The record is flagged in the data migration audit — `folder` should be cleared during migration.

### 2.6 import_source values

```ts
type ImportSourceKind =
  | 'claude_desktop'
  | 'claude_code'      // open question: no confirmed clientType in codemie-code yet
  | 'codex'
  | 'gemini'
  | 'copilot_cli'
  | 'opencode'
  | 'pi'
```

`import_source` is nullable and write-once. Each value represents a distinct Import Folder. Different sources must not be merged into a single group.

### 2.7 AVATAR_CHAT_FOLDER — legacy routing contract

`AVATAR_CHAT_FOLDER = 'avatar'` (defined in `src/constants/chats.ts:18`) is used in `ChatListItem.tsx` and `DeleteChatPopup.tsx` to route chats to the `/avatar-chat` path. This is an **active legacy routing mechanism** that remains in place for backward compatibility. It is not part of the target folder architecture.

- Do not reclassify or remove `AVATAR_CHAT_FOLDER` in this task.
- Do not treat `folder === 'avatar'` as an import folder, custom folder, or assistant folder.
- Handle it as a separate legacy case in the classification algorithm (step 2).
- Follow-up required: audit all routing dependencies and define conditions for eventual removal. Do not merge this cleanup into the import-source migration.

### 2.8 Legacy fallback (transitional)

Until the backend migration is complete, the frontend falls back to the current folder-name dictionary (`CHAT_IMPORT_SOURCES`) when `import_source` is null and `folder` matches a known legacy import folder name. This produces a `{ kind: 'legacy-import', folderName }` group identity.

Legacy fallback rules:
- Do not infer a canonical `ImportSourceKind` from an ambiguous legacy folder name.
- Do not write inferred legacy source into `ChatListItem.importSource`.
- Unknown folder values are not guessed; they remain Custom Folder candidates.
- The mapping from legacy folder names to canonical `ImportSourceKind` is confirmed only during the data migration audit.

Once migration stabilises, the legacy fallback and all `legacy-import` groups are removed.

---

## 3. Changes by Repo

### 3.1 codemie (backend)

**Model (`src/codemie/rest_api/models/conversation.py`)**

- Add `import_source: Optional[str] = Column(String, nullable=True)` to `Conversation` model.
- Add `import_source: Optional[str]` to `ConversationListItem`.
- Add `import_source: Optional[str] = None` to `UpsertHistoryRequest`.

**DB migration**
```python
op.add_column('conversations', sa.Column('import_source', sa.String(), nullable=True))
```

**`get_user_conversations` SQL** — include `c.import_source` in the SELECT list.

**Upsert endpoint** — when `UpsertHistoryRequest.import_source` is present and the conversation's existing `import_source` is null, set it. Never overwrite a non-null `import_source` (write-once semantics).

**API response** — `import_source` must be included in both GET `/v1/conversations` and GET `/v1/conversations/{id}` responses.

### 3.2 codemie-code

Add `import_source` to the upsert payload:

```ts
const payload = {
  assistant_id: ...,
  folder: ...,        // keep for backward compat during transition
  import_source: resolveImportSource(clientType),
  history: [...],
}
```

**New helper** `resolveImportSource(clientType: string): ImportSourceKind | undefined`:

| clientType | import_source |
|---|---|
| `codemie-claude` | `claude_desktop` |
| `codemie-codex` / agentName codex | `codex` |
| `codemie-copilot` | `copilot_cli` |
| `codemie-gemini` | `gemini` |
| `codemie-opencode` | `opencode` |
| `codemie-pi` | `pi` |
| unknown | `undefined` |

> **Open question — `claude_code` mapping**: `ImportSourceKind` includes `claude_code`, but no `codemie-code` clientType currently maps to it. The value is reserved in the type union but has no write path. Leave undefined until the Claude Code CLI integration clientType is confirmed.

`resolveConversationFolder()` in `syncProcessor.ts` remains unchanged during transition. Remove it only after data migration completes and the frontend fallback is removed.

### 3.3 codemie-ui (frontend)

#### 3.3.1 Types and DTO mapping

Add to `ChatListItem` (`src/types/entity/conversation.ts`):
```ts
importSource?: ImportSourceKind | null
```

`ChatListItem.importSource` must directly reflect `dto.import_source` only:
- `dto.import_source` present and valid → `importSource = dto.import_source`
- `dto.import_source` absent or null → `importSource = null/undefined`
- `dto.import_source` contains an unknown value → normalize to `null/undefined`; do not create a canonical Import Folder for unknown values
- Legacy folder name detection is **never** written back to `ChatListItem.importSource`; it is applied separately at display and group resolution time

Add `ImportSourceKind` type to `src/constants/chatImportSources.ts`. DTO is runtime input — unknown values must be handled safely (type guard or validation, not a bare cast).

#### 3.3.2 Import source display resolution

`resolveImportDisplay` resolves **display metadata only** (icon + label for render). It does not determine sidebar placement or group identity — that is `getChatLocation()`'s responsibility. Keep these concerns strictly separate.

```ts
resolveImportDisplay(chat: { importSource?: ImportSourceKind | null; folder?: string | null }): ChatImportSource | undefined
```

Priority:
1. If `chat.importSource` is a valid `ImportSourceKind` → use `IMPORT_SOURCE_DISPLAY[chat.importSource]`.
2. Else → fall back to `getChatImportSource(chat.folder)` (legacy).

Add `IMPORT_SOURCE_DISPLAY: Record<ImportSourceKind, ChatImportSource>` to `chatImportSources.ts`.

#### 3.3.3 Folder classification in chatSidebarListsHelpers.ts

Update `getChatLocation()` to implement the §2.1 algorithm. The import check runs before the custom folder check.

New helpers:
- `isValidImportSourceKind(value: unknown): value is ImportSourceKind` — type guard; validates against the known `ImportSourceKind` union
- `isImportChat(chat: ChatListItem): boolean` — `isValidImportSourceKind(chat.importSource) || !!getChatImportSource(chat.folder)`; must return `false` when `chat.folder === AVATAR_CHAT_FOLDER`
- `isAssistantNameFolder(chat: ChatListItem, assistants: AssistantListItem[]): boolean` — returns `true` when `chat.folder` exactly matches the name of the assistant identified by `chat.initialAssistantId`

Replace `importSourceGroupsMap: Partial<Record<ImportSourceKind, ChatListItem[]>>` with a structure keyed by `ImportGroupIdentity`. The implementation may use a string-keyed map with namespaced keys (`import:codex`, `legacy-import:codemie-code`) or a separate canonical map and legacy map — as long as both identity kinds are preserved and canonical sources are never merged with legacy folder names.

#### 3.3.4 Stop sending folder = assistant.name

All 6 confirmed callers that pass `assistant.name` as the `folder` argument must be fixed:

| File | Line | Change |
|---|---|---|
| `src/pages/chat/components/ChatSidebar/ChatSidebarAssistants.tsx` | 62 | `assistant.name` → `''` |
| `src/pages/chat/components/ChatSidebar/StartNewChatModal.tsx` | 86 | `folder ?? assistant.name` → `folder ?? ''` |
| `src/pages/navigation/components/NavigationPinnedSection.tsx` | 88 | `a.name` → `''` |
| `src/pages/chat/AssistantChatStartPage.tsx` | 43 | `assistant.name` → `''` |
| `src/pages/assistant/AssistantDetailsPage.tsx` | 74 | `assistant.name` → `''` |
| `src/pages/assistant/components/AssistantCard.tsx` | 112 | `assistant.name` → `''` |

No change to `chatsStore.startNewChat` signature.

`AVATAR_CHAT_FOLDER` callers (`ChatListItem.tsx`, `DeleteChatPopup.tsx`) — not modified; the `'avatar'` value is a legacy routing contract.

Workflow callers (all have `isWorkflow=true`) — out of scope.

#### 3.3.5 Remaining integration tasks

- **Task 2 — Settings**: replace `showPinnedChats` with `showRecentAssistants`, default density `Compact`, tooltip text. Settings migration: update `DEFAULT_CHAT_VIEW_SETTINGS` and `readStoredSettings()` in-place, same storage key `'chat-view-settings'`. No separate legacy key needed — `readStoredSettings()` already silently ignores unknown fields and fills missing ones with defaults.
- **Task 3 — Recent Assistants section**: data source is `assistantsStore.getRecentAssistants()` (local storage, not a server API). Primary click → `startNewChat(assistant.id, '', false)`.
- **Task 4 — Remove synthetic `pinnedFolderGroups`** aggregation.
- **Task 5 — Explicit folder semantics**: `FolderKind` with namespaced identity per §2.4; icons and context menus per kind. Import Folder kind: no Add/Move/Remove chat actions; Custom Folder kind: full membership actions.
- **Task 6 — Custom-folder membership rules**: Add/Move/Remove flow for Custom Folders only. Imported chats are excluded from all Custom Folder add/move flows.
- **Task 7 — client-side Assistant History view**: no server-side assistant-scoped conversation endpoint exists. History is derived by client-side filtering of the already-loaded `chatsStore` set (primary assistant + available participant metadata). Completeness across all server conversations is **not guaranteed** when the full conversation set has not been loaded. Do not add a new API call. Full server-side history requires a separate backend ticket.
- **Task 8 — Density and avatar rules**: Compact/Detailed per spec section 15.
- **Task 9 — Search, New Chat, Import, Workflow behaviour**: contextual New Chat inside Import Folder is disabled or redirected to global New Chat.
- **Task 10 — Remove transitional code, validate, split `ChatSidebarLists.tsx`** (681→≤300 lines).

---

## 4. Required test scenarios

In addition to existing test coverage, the following scenarios must be added:

**Import classification:**
- Chat with valid `importSource` → placed in its canonical Import Folder
- Chat with `importSource = 'codex'` AND `folder = 'Research'` → placed in `import:codex`, not `custom:Research`
- Chat with `importSource = null` and `folder = 'codemie-code'` → placed in `legacy-import:codemie-code`
- Chat without `importSource` and without a known legacy folder → placed in Custom Folder or Assistant Folder per normal rules
- Unknown `dto.import_source` value → `importSource` normalised to null, no Import Folder created

**Import UI restrictions:**
- Imported chat context menu → no `Add to folder...`, `Move to folder...`, `Remove from folder`
- Custom Folder `Add chats...` picker → imported chats are absent from the list
- Import Folder context menu → no generic Custom Folder actions

**Namespace isolation:**
- `custom:codex` and `import:codex` both exist simultaneously → rendered as independent groups with correct icons and distinct context menus
- `legacy-import:codemie-code` does not merge with `import:claude_desktop` or any other canonical group

**DTO mapping:**
- `dto.import_source = 'codex'` → `chat.importSource = 'codex'`
- `dto.import_source = null` → `chat.importSource = null`; legacy fallback may independently produce a `legacy-import` group
- `dto.import_source = 'unknown_value'` → `chat.importSource = null`; no canonical Import Folder created

---

## 5. Data Migration

Performed by the backend team after backend deploy + codemie-code deploy:

1. Audit production `folder` values against `CHAT_IMPORT_SOURCES` keys. Confirm the mapping for each value before writing `import_source`.
2. For confirmed mappings only: set `import_source`; do not clear `folder` until frontend fallback removal.
3. Records where `folder` equals the name of the assistant in `initial_assistant_id`: set `folder = null`.
4. Records where both `import_source` and an unrelated `folder` are set: flag for review; `folder` is cleared after confirmation.
5. Unknown or ambiguous `folder` values: leave as-is. Do not guess the mapping.

---

## 6. Rollout Order

```
1. Backend: add import_source column, DB migration, DTO, upsert endpoint (write-once semantics)
2. Frontend (this branch):
   - add importSource to types + DTO transform (with unknown-value normalisation)
   - implement classification algorithm (import_source priority over folder)
   - implement ImportGroupIdentity and namespace model
   - fix all 6 startNewChat callers
   - complete remaining sidebar tasks (2–10)
   - UI import restrictions (no add/move to Custom Folder)
3. codemie-code: add import_source to upsert payload
   (deploy after claude_code mapping is confirmed or omit claude_code for now)
4. Data migration: audit production data; populate confirmed import_source values;
   flag inconsistent records
5. Cleanup: remove legacy import fallback and legacy-import groups;
   remove resolveConversationFolder folder-assignment in codemie-code;
   AVATAR_CHAT_FOLDER audit and removal tracked separately
```

Steps 2 and 3 can ship independently with the frontend legacy fallback still in place.

---

## 7. Out of Scope

- Multi-folder membership.
- Drag & drop.
- Projects concept.
- Modifying `Sidebar.tsx` (generic, shared).
- Backend assistant-scoped conversations endpoint (separate ticket; required for complete server-side Assistant History).
- codemie-code implementation (separate repo/ticket, described here for context only).
- Reclassifying, re-routing, or removing `AVATAR_CHAT_FOLDER` (separate follow-up after full routing audit).
- Moving imported chats to Custom Folders (separate product decision, future scope).
- Resolving the `claude_code` clientType mapping in codemie-code (open question, tracked separately).

---

## 8. Open Questions

| ID | Question | Owner |
|---|---|---|
| OQ-1 | What is the confirmed `clientType` for the Claude Code CLI integration? Needed before `claude_code` can have a write path in codemie-code. | codemie-code team |
| OQ-2 | What are all routing dependencies on `AVATAR_CHAT_FOLDER`? What conditions allow its safe removal? | Frontend team, separate follow-up |
| OQ-3 | Which ambiguous legacy folder names (`'claude'`, `'claude imports'`) map to which canonical `ImportSourceKind`? Requires production data audit before migration. | Backend + data team |
