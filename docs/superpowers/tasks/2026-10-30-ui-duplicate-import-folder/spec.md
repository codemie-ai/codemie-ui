# EPMCDME-16623: Show each CLI agent folder once in Folders

Requirements source: `codemie-code/docs/stories/2026-10-30-ui-duplicate-import-folder/story.md` (decisions D1-D4 settled). Size S (13/36). Amended at the spec gate: `kimi` is now in scope (user-directed, overrides the story's out-of-scope for kimi).

## Problem

The sidebar Folders list merges two sources: backend-registered folder names and chats grouped by import identity. A registered name is keyed by `sidebarFolderKeyFromName` (`chatSidebarFolderHelpers.ts:51-55`). Only the legacy map in `src/constants/chatImportSources.ts` (`claude`, `claude desktop`, `claude imports`, `codemie-code`) is aliased to a `legacy-import:` key. Any other agent name, e.g. `gemini`, becomes `custom:gemini`. Chats with `importSource` are grouped as `import:gemini`. The two keys never merge, so the user sees a populated "Gemini" entry and an empty custom "gemini" folder. `useChatSidebarFolders.ts` (the `folders` memo, ~lines 46-88) hides empty `import` and `legacy-import` folders but keeps empty `custom` ones.

## Approach

Treat a registered folder as an agent twin when its name, normalized, equals a known agent source. Hide it when it has no chats of its own. Do not change key mapping.

1. `src/constants/chatImportSources.ts`: add an exported predicate, e.g. `isAgentImportFolderName(name)`. It normalizes by lowercasing, trimming, and treating `-` and `_` alike. It matches the `ImportSourceKind` values `codex`, `gemini`, `copilot_cli`, `opencode`, `pi` and `kimi` (D1, D3, user amendment). `claude*` kinds are excluded (D4: `claude` stays on the legacy path).
2. `useChatSidebarFolders.ts`: in the registered-folder filter, drop a `custom`-kind folder when `isAgentImportFolderName(name)` is true and `foldersToChatsMap[key]` is empty. The `import:<kind>` group still comes from `additionalFolderKeys` and carries the chats.

Why a filter and not a key remap: the key scheme is shared by `FolderList`, `MoveChatPopup`, `buildAggregates` and `unifiedChatSidebarViewModel`, and a remap widens blast radius. A filter changes only which registered names are listed.

Why "only when empty": a chat that sits in a registered `gemini` folder without an `importSource`, or that a user moved there, stays in its custom folder (AC7) and the folder stays visible rather than orphaning the chat.

## Acceptance criteria

- AC1: Registered `gemini` plus chats with `importSource: 'gemini'` yields exactly one Gemini entry holding those chats.
- AC2: The same holds for codex, copilot-cli, opencode, pi and kimi.
- AC3: `claude` and its legacy aliases behave exactly as today.
- AC4: A registered folder with any non-agent name still shows, empty or with chats.
- AC5: A registered agent-named folder whose import group has no chats yields no entry.
- AC6: `Gemini`, `GEMINI`, `copilot-cli`, `copilot_cli`, `Copilot_CLI` and `Kimi` are all recognized.
- AC7: A chat moved into a custom folder stays in it. An agent-named folder that holds chats is not hidden.

## Non-goals

- No change to the CLI or backend, or to the folder names the CLI sends.
- No renaming, merging, or deleting of existing folders. The hidden registered row stays in the backend.
- No change to key scheme, `FolderList`, icons, menus, or the import grouping design.
- No change to `CHAT_IMPORT_SOURCES` or the `claude` path.
- No tests for `UnifiedChatSidebar`.

## Testing

Unit cases belong in `ChatSidebarLists/__tests__/useChatSidebarFolders.test.ts` (AC1-AC7 using `chatFolders` and `foldersToChatsMap` inputs). Predicate cases (case, hyphen, underscore, kimi, non-agent names, `claude`) go next to the constants tests. Follow `.ai-run/guides/testing/testing-patterns.md`.

## Risks

- A user-created empty folder named exactly like an agent (e.g. `pi` or `kimi`) is hidden. This follows D2, which treats agent folder names as duplicates.
- Backend names (`copilot-cli` and so on) come from the story, not verified in the backend repo. The CLI does not file kimi under its own folder name today, so the kimi entry is forward-looking.
