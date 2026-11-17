# EPMCDME-16623: Show each CLI agent folder once — Implementation Plan

**Goal:** Hide an empty registered folder whose name equals a known CLI agent source, so only the `import:<kind>` group shows. Spec: `spec.md` (filter, not key remap).

**Conventions:** Commit per task using the repository's existing convention (ticket EPMCDME-16623 in the subject, per `.ai-run/guides/standards/git-workflow.md`). Tests follow `.ai-run/guides/testing/testing-patterns.md` (Vitest, `__tests__` next to code). No formatter runs needed (hook does it).

---

### Task 1 — Add `isAgentImportFolderName` predicate

**Files:** modify `src/constants/chatImportSources.ts` (after `isValidImportSourceKind`, line ~52); create `src/constants/__tests__/chatImportSources.test.ts` (or extend it if it already exists).

Export `isAgentImportFolderName(name?: string | null): boolean`. Normalize with trim, lowercase, and `-` to `_`. Return true only for `codex`, `gemini`, `copilot_cli`, `opencode`, `pi`, `kimi`. Exclude the `claude_*` kinds and `codemie-code`. Do not touch `CHAT_IMPORT_SOURCES`.

```ts
const AGENT_FOLDER_KINDS: ReadonlySet<string> = new Set<ImportSourceKind>([
  'codex', 'gemini', 'copilot_cli', 'opencode', 'pi', 'kimi',
])
```

Test-first: yes — predicate test asserts `Gemini`, `GEMINI`, `copilot-cli`, `copilot_cli`, `Copilot_CLI`, `Kimi`, ` pi ` return true, and `claude`, `claude desktop`, `codemie-code`, `my-folder`, `''`, `null` return false (fails: export missing).

---

### Task 2 — Filter empty agent-named custom folders in `useChatSidebarFolders`

**Files:** modify `src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarFolders.ts`; extend `ChatSidebarLists/__tests__/useChatSidebarFolders.test.ts`.

Filter location confirmed: the `.filter(({ key, kind }) => ...)` at lines 53-56 inside the `namedFolderKeys` chain of the `folders` memo. It currently receives only `{key, kind}` from `classifyFolderListItemName(folder.name)`. Change the chain so the folder name is available (e.g. `.map` to `{ ...classifyFolderListItemName(folder.name), name: folder.name }`, or move the check into a `.filter` on `chatFolders` before the `.map`). Add a rule: when `kind === 'custom'` and `isAgentImportFolderName(name)` and `(foldersToChatsMap[key] ?? []).length === 0`, drop the folder. Keep the existing import and legacy-import rule unchanged. Do not change `sidebarFolderKeyFromName`, the timestamp map (lines 66-71), or the sort. Import the predicate from `@/constants/chatImportSources`.

Test-first: yes — cases (fail before the change):
- AC1/AC2: registered `gemini` (and each of codex, copilot-cli, opencode, pi, kimi) with `foldersToChatsMap` holding `import:<kind>` chats yields only `import:<kind>` and no `custom:<name>`.
- AC5: registered `gemini` with an empty map yields no entry.
- AC6: `Gemini` and `Copilot_CLI` are also hidden when empty.
- AC7: `custom:gemini` holding chats stays listed.
- AC4: empty registered `my-folder` stays listed.
- AC3: registered `claude` behaves as before (existing tests stay green).
