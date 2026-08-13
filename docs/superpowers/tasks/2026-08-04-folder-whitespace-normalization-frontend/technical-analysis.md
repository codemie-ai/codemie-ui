# Technical Research

**Task**: chat folder store frontend whitespace trim
**Generated**: 2026-08-04
**Research path**: filesystem

---

## 1. Original Context

Implement the frontend portion of EPMCDME-13806 (folder name whitespace normalization) in codemie-ui. Backend already trims/normalizes folder names server-side (merged). Frontend needs a defensive secondary layer: (1) trim-before-send in src/store/chats.ts write methods (createFolder, renameChatFolder, moveChatToFolder, startNewChat, createChat) so folder name payloads sent to the API are never sent with leading/trailing whitespace; (2) fix src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx so the Yup schema's `.trim()` actually transforms the submitted value, not just validates length; (3) defensive trim on render for folder name text in FolderList.tsx, SearchResultItem.tsx, MoveChatPopup.tsx, and the search placeholder text, since existing folder rows may still carry whitespace until backend migration fully lands. Do not implement any backend, collision-handling, or migration logic — that's done and out of scope.

---

## 2. Codebase Findings

### Existing Implementations

- `src/store/chats.ts` — Valtio proxy store (`chatsStore`). Contains all five target write methods:
  - `createFolder` (lines ~453-455): `api.post('v1/conversations/folder', { folder })` — `folder` sent raw, untrimmed.
  - `renameChatFolder` (lines ~489-494): `api.put(...folder/${encodeURIComponent(oldFolder)}, { folder: newFolder })` — `newFolder` sent raw.
  - `moveChatToFolder` (lines ~496-517): computes `folderValue`, sends `{ folder: folderValue }` — raw.
  - `startNewChat` (lines ~271-291): uses `folderValue` in `URLSearchParams` param `folder` — raw.
  - `createChat` (lines ~293-324): uses `folderValue` in POST body `folder` — raw.
  - **Existing precedent already in this file**: `renameChat` (lines ~335-349, chat name not folder name) already does the exact pattern needed:
    ```ts
    const trimmedName = name?.trim()
    if (!trimmedName) {
      toaster.error('Chat name cannot be empty')
      return
    }
    await api.put(`v1/conversations/${id}`, { name: trimmedName }).then(...)
    ```
    This is the model to replicate for all five folder-name write paths.

- `src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx` (line ~45) — Yup schema:
  ```ts
  const formSchema = Yup.object({
    folderName: Yup.string().trim().required(VALIDATION_MESSAGES.FOLDER_NAME_REQUIRED),
  })
  ```
  `.trim()` here is validation-only (fails validation on leading/trailing space via yup's internal test) — it does **not** transform the submitted value. The submitted `folderName` is passed as-is to `renameChatFolder`/`createFolder` and to `onCreate?.(folderName)`.

- `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx` — renders folder name raw in multiple spots (lines ~129-131, ~166): `folder.slice(0, MAX_CHAT_NAME_LENGTH)`, `data-pr-tooltip={folder}`, `aria-label={folder}`, `data-folder={folder}`, plus a DOM-id slug `folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')` (2 occurrences) — leading/trailing whitespace would produce stray `-` artifacts in the slug too, so trim before slugging.

- `src/pages/chat/components/ChatSearchPanel/SearchResultItem.tsx` (line ~49) — renders `item.folder` raw: `<span className="truncate">{item.folder}</span>`.

- `src/pages/chat/components/ChatSidebar/ChatList/MoveChatPopup.tsx` (lines ~63-66) — builds `folderOptions` from `chatFolders` using `{ label: name, value: name }` raw. Also has its own separate Yup schema for `targetFolder`: `Yup.string().required(...)` with **no `.trim()` at all**.

- `src/pages/chat/components/ChatSearchPanel/ChatSearchPanel.tsx` (line ~136) — literal `placeholder="Search"`, not folder-name-derived. **Flag**: the task's "search placeholder text" item is ambiguous against this codebase — no folder-name-driven placeholder string was found. Likely the ticket means the folder-name text shown inside `SearchResultItem.tsx`, which is already covered above. Confirm scope with ticket/PM if a literal placeholder was intended.

- `src/types/entity/conversation.ts` — `FolderListItem` (id, date, updateDate, name, userId, ...) backs `chatsStore.chatFolders`; `ChatFolder` has `folder_name`.
- `src/types/chats.ts` — `SearchResultItem` type: `{ id, name, updated_at, type, folder? }`.
- `src/store/utils/chats.ts` — has `transformFolderListItemsDTOs` (DTO→FE transform), a plausible (but out-of-scope per task) location for centralized normalization; not required for this task.

### Architecture and Layers Affected

- **Store layer** (`src/store/chats.ts`) — Valtio proxy store, owns all API calls per this repo's mandatory Component → Store → API layering convention (`.ai-run/guides/patterns/state-management.md`). Trim-before-send belongs here, not in components.
- **Form/Component layer** — `FolderFormPopup.tsx` (React Hook Form + Yup via `yupResolver`), `FolderList.tsx`, `SearchResultItem.tsx`, `MoveChatPopup.tsx` — render-time defensive trims only; per convention these components must not call `api.*` directly.
- **Types layer** — `src/types/entity/conversation.ts`, `src/types/chats.ts` — no changes needed, just consumed.

### Integration Points

- `chatsStore` is imported by `FolderFormPopup.tsx` (`createFolder`, `renameChatFolder`), `FolderList.tsx` (`chatsStore.startNewChat`, `useSnapshot(chatsStore)`), `MoveChatPopup.tsx` (`moveChatToFolder`, `chatFolders`), and `ChatSearchPanel.tsx` (`chatsStore.searchChats`).
- `FolderFormPopup.tsx` is rendered by both `FolderList.tsx` (create/rename) and `MoveChatPopup.tsx` context — fixing its submit-value trim is the single shared entry point for folder creation/rename.
- No external service or third-party SDK involved — pure client-side string handling plus existing `axios`-based `api` wrapper.

### Patterns and Conventions

- **Trim-then-send precedent already exists** in this exact file (`chats.ts` `renameChat`) — replicate that shape (`trimmedName = x?.trim()`, guard empty with `toaster.error`, send trimmed value, use trimmed value for any local state update) across the five folder methods.
- **No `.transform(` usage found anywhere in the codebase for Yup.** `.trim()` is used only as a validator elsewhere too — there is no established transform convention to mirror. Recommended: either add `.transform((value) => value?.trim())` to the Yup schema, or trim inside the `onSubmit` handler before calling the store method (simpler, consistent with the `renameChat` call-site-trim pattern already used in `chats.ts`).
- `MoveChatPopup.tsx`'s own Yup schema for `targetFolder` has no `.trim()` at all — task scope doesn't explicitly call for adding one there (task only lists defensive *render* trim for this file), but worth flagging as an inconsistency for the planner to decide on.
- Repeated folder-name→DOM-id slug logic in `FolderList.tsx` (`folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')`, 2 occurrences) — trim before slugging to avoid stray dashes.
- Lint constraint: `.eslintrc.cjs` enables `sonarjs/no-duplicate-string` (threshold 9, error-level). If a shared trim helper or repeated string literal is introduced across `FolderList.tsx`, `FolderFormPopup.tsx`, `SearchResultItem.tsx`, `MoveChatPopup.tsx`, extract to a shared constant/util rather than repeating literals, to avoid failing lint.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — mandates Component → Store → API layering; stores exported as named `proxy<T>()`; async methods follow loading/error/finally pattern. Confirms trim-before-send must live in `chats.ts` store methods, not components.
- `.ai-run/guides/patterns/form-patterns.md` — documents React Hook Form + Yup convention; explicitly states "Validation Lives in the Schema, Not in Component State" and that a Yup validator like `.trim()` only gates the Save button — it does not transform the submitted value. Confirms the bug description in the task and the fix approach (transform or submit-handler trim).

### Architectural Decisions

- `notes/projects/EPMCDME-13806-folder-whitespace.md` (project working notes, not a formal ADR, found in the user's personal notes repo, not part of codemie-ui itself) — records:
  - Backend decision: on trim collision, merge into canonical folder, earliest `date` wins. Backend is source of truth; frontend trim-before-send is explicitly a **secondary/defensive layer**, not a substitute.
  - "Frontend (sequenced after backend lands)" section enumerates the exact same three action items as this task's context (trim-before-send in `chats.ts`; transform value in `FolderFormPopup.tsx`; defensive render-time trim in `FolderList.tsx`, `SearchResultItem.tsx`, `MoveChatPopup.tsx`, search text).
  - Codebase Findings section in that note independently enumerates the same file/line targets found in this research pass, confirming consistency.
  - Note also records a prior complexity estimate for the frontend slice: 11/36 → S (~1 day).

### Derived Conventions

- Trim-then-send pattern: compute trimmed value, guard against empty-after-trim with a `toaster.error(...)` + early return, send trimmed value to API, use the same trimmed value for any local/state update (see `renameChat` in `chats.ts`).
- Yup `.trim()` is validation-only in this codebase; must pair with either `.transform()` or a submit-handler trim to actually normalize the value — no existing `.transform()` usage to copy, so this will be a new (small) local pattern.

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/chats.storageCleanup.test.ts` — covers `deleteChat`, `deleteAllConversations`, `deleteChatFolder` cleanup side effects. Does **not** cover `createFolder`, `renameChatFolder`, `moveChatToFolder`, `startNewChat`, or `createChat`.
- `src/pages/chat/components/ChatSidebar/__tests__/FolderList.test.tsx` — covers ARIA/role rendering (treeitem, aria-expanded, aria-owns slug) using `folders: ['Work', 'Personal']`. No whitespace/trim assertions currently.
- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx` — exercises `MoveChatPopup` only indirectly via composition; not a direct trim-behavior coverage source.
- No test file exists at all for `FolderFormPopup.tsx` or `SearchResultItem.tsx`.

### Testing Framework and Patterns

- **Vitest** (`vitest run` in package.json), React Testing Library for component tests.
- Store action test pattern: `vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj) }))`; mock `@/utils/api` (`{ delete, get, post, put, downloadFileStream: vi.fn() }`); mock `@/utils/toaster`, `@/utils/storage`, sibling stores as needed (`vi.hoisted`); import real `chatsStore` from `../chats` and mutate fields directly in `beforeEach`; assert via mocked API call args and mocked side-effect fn calls.
- Component/Yup form test pattern (inferred from `FolderList.test.tsx`, no direct Yup-form test example exists yet): mock child components/icons/svg imports, mock router, mock `valtio`'s `useSnapshot` as identity, render with RTL, assert via `screen.getByRole`/`getByTestId`.

### Coverage Gaps

- `src/store/chats.ts` — no tests for any of the 5 target write methods.
- `FolderFormPopup.tsx` — zero test coverage; no precedent for testing a Yup-schema submit-value transform in this codebase.
- `FolderList.tsx` — has tests, but none assert whitespace/trim rendering behavior.
- `SearchResultItem.tsx` — zero test coverage.
- `MoveChatPopup.tsx` — no dedicated test coverage for the trim behavior.

---

## 5. Configuration and Environment

### Environment Variables

None relevant — no environment variables reference the chat/folder feature.

### Configuration Files

None found — no `src/config` directory exists in this project; no feature flags or config toggles reference "folder."

### Feature Flags and Deployment Concerns

None. This is a pure client-side string-trim change with no config/env/deployment surface. One lint concern noted above (sonarjs/no-duplicate-string) if a shared trim constant/util is introduced and reused across files — extract to a shared location rather than repeating literals.

---

## 6. Risk Indicators

- Zero test coverage on 4 of the 5 files being changed (`FolderFormPopup.tsx`, `SearchResultItem.tsx`, `MoveChatPopup.tsx` fully untested; `chats.ts` untested for these specific methods; `FolderList.tsx` has tests but none cover this behavior) — any regression here would go undetected without new tests.
- No established Yup `.transform()` convention in the codebase — this task introduces a new local pattern; ensure the chosen approach (transform vs. submit-handler trim) matches the existing `renameChat` call-site-trim style for consistency, per `.ai-run/guides/patterns/form-patterns.md` guidance.
- "Search placeholder text" from the task description does not clearly map to any folder-name-driven placeholder string found in the codebase (`ChatSearchPanel.tsx` placeholder is a static literal "Search"). Ambiguous scope item — clarify with ticket before implementing, or treat `SearchResultItem.tsx` render trim as satisfying this bullet.
- `MoveChatPopup.tsx`'s own Yup schema for `targetFolder` has no `.trim()` validator at all (inconsistent with `FolderFormPopup.tsx`) — task scope only asks for render-time defensive trim here, not schema changes, but this asymmetry may resurface in review.
- This is explicitly a temporary defensive layer per the project notes — backend is source of truth and already merged; frontend change is small, additive, and low-risk architecturally, but must not attempt to implement collision-handling or migration logic (explicitly out of scope).
- Existing prior working notes (`notes/projects/EPMCDME-13806-folder-whitespace.md`, outside this repo) already scoped this exact task with matching file/line targets and a prior S-size (~1 day) estimate — strong signal this is a small, well-understood change with low uncertainty.

---

## 7. Summary for Complexity Assessment

This task touches two architectural layers only: the store layer (`src/store/chats.ts`, 5 methods) and the component/form render layer (4 files: `FolderFormPopup.tsx`, `FolderList.tsx`, `SearchResultItem.tsx`, `MoveChatPopup.tsx`). No API, backend, database, or type-definition changes are required — this is a pure client-side string-normalization change with no config, env, or deployment surface. Total file change surface is small: 5 files with direct edits, all localized to single-purpose trim insertions at well-identified line numbers found during this research pass. An existing precedent for the exact trim-then-send pattern already lives in the same store file (`renameChat`), so this is not a novel pattern for the store layer — it's a direct copy of established local convention.

The one genuinely novel element is the Yup schema fix in `FolderFormPopup.tsx`: this codebase has no existing `.transform()` usage anywhere, so the implementer must either introduce that (new local pattern) or trim in the submit handler (safer, consistent with existing `renameChat` call-site style, and recommended). This is a low-risk, well-understood JS/TS pattern regardless of choice, not an architectural risk.

Test coverage posture is a real gap: 4 of 5 touched files have zero existing test coverage for the behavior being changed (`FolderFormPopup.tsx` and `SearchResultItem.tsx` have no tests at all; `chats.ts` has no tests for the 5 target methods; `MoveChatPopup.tsx` is only indirectly touched by an unrelated composition test). If tests are required for this change, that adds meaningful effort beyond the trivial code edits — the Vitest/RTL patterns to follow are well-established elsewhere in the codebase (mock `valtio`, mock `@/utils/api`, assert on mocked call args), so scaffolding new tests would be mechanical, not exploratory. One scope ambiguity remains: the task's "search placeholder text" item doesn't clearly map to a folder-name-derived string in the current code and should be clarified or treated as covered by the `SearchResultItem.tsx` fix.
