# EPMCDME-13806: Frontend defensive whitespace trim for folder names

## Context

Backend now trims and normalizes folder names server-side (merged, MR https://gitbud.epam.com/epm-cdme/codemie/-/merge_requests/3919). Frontend trim-before-send is a defensive secondary layer, not the source of truth — no collision-handling, migration, or backend logic is in scope here.

## Scope

### 1. Store layer — `src/store/chats.ts`

Apply the existing `renameChat` trim-then-send pattern (lines ~335-349) to the five folder-name write paths:

- `createFolder` (~453-455)
- `renameChatFolder` (~489-494) — trim both `oldFolder` and `newFolder`
- `moveChatToFolder` (~496-517)
- `startNewChat` (~271-291)
- `createChat` (~293-324)

Pattern per method: compute `trimmed = value?.trim()`, guard empty-after-trim with `toaster.error(...)` + early return, send the trimmed value to the API, and use the same trimmed value for any local/state update.

### 2. Form layer — `FolderFormPopup.tsx`

Yup's `.trim()` (line ~45) is validation-only in this codebase — it does not transform the submitted value. Fix: trim the value in the submit handler before it's passed to `createFolder`/`renameChatFolder`/`onCreate?.()`, matching the existing call-site-trim convention rather than introducing a new `.transform()` pattern (no `.transform()` precedent exists anywhere in this codebase).

### 3. Render layer — defensive trim

Existing rows may carry whitespace until backend migration fully lands. Add defensive `.trim()` at render time:

- `FolderList.tsx` (~129-131, ~166) — trim before `.slice()`, `data-pr-tooltip`, `aria-label`, `data-folder`, and **before** the DOM-id slug logic (`folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')`, 2 occurrences) to avoid stray leading/trailing dashes.
- `SearchResultItem.tsx` (~49) — trim `item.folder` before rendering.
- `MoveChatPopup.tsx` (~63-66) — trim the `name` used to build `folderOptions` (`{ label, value }`).

**Out of scope**: `MoveChatPopup.tsx`'s own Yup schema for `targetFolder` (no `.trim()` validator at all) — not touched, per ticket scope (render-time trim only for this file).

**Resolved ambiguity**: the ticket's "search placeholder text" item does not map to any folder-name-driven placeholder string in the codebase (`ChatSearchPanel.tsx`'s placeholder is a static `"Search"` literal). Treated as satisfied by the `SearchResultItem.tsx` render fix — no separate placeholder change.

### 4. Lint constraint

`sonarjs/no-duplicate-string` (threshold 9, error-level) is enabled. If a shared trim helper or repeated string literal ends up needed across multiple files, extract to a shared constant/util rather than repeating literals.

## Testing

Add focused coverage using existing Vitest/RTL patterns (`vi.mock('valtio', ...)`, mock `@/utils/api` and `@/utils/toaster`):

- `chats.ts`: for each of the 5 write methods — trims before sending, and rejects (guards) an empty-after-trim value with a toaster error.
- `FolderFormPopup.tsx`: submitted value is trimmed before the store call.

No test changes required for the render-layer defensive trims (`FolderList.tsx`, `SearchResultItem.tsx`, `MoveChatPopup.tsx`) — existing component tests are not extended for this pass; a bug-level regression there is low-risk and low-value to test given the store/form layer is where real inputs originate.

## Explicitly out of scope

- Backend, collision-handling, or migration logic (done, merged separately).
- `MoveChatPopup.tsx`'s Yup schema changes.
- New placeholder UI text.
