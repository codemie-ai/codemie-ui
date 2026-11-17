# Download All Workspace Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Download all" action to the Agent Workspace browser popup that streams the
backend's `/files/download-all` zip endpoint to disk, mirroring the existing single-file download.

**Architecture:** Three small, independently testable edits along the existing single-file
download path: `api.downloadFileStream` gains one optional header-reading callback (additive,
backward compatible); `agentWorkspaceStore` gains `isDownloadingAll` + `downloadAllFiles()`
mirroring `isDownloading`/`downloadSelectedFile()`; `AgentWorkspaceBrowserPopup` gains one `Button`
wired to it. No new types, HTTP method, or endpoint config — the backend archive endpoint and its
400/413/500 JSON error bodies already exist and already flow through `downloadFileStream`'s
existing error path.

**Tech Stack:** React, TypeScript, Valtio, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-10-20-workspace-download-all-files/spec.md`

Commit per task using the repository's existing convention (ticket-prefixed commit messages per
`.ai-run/guides/standards/git-workflow.md`).

## Global Constraints

- Backend route: `GET v1/workspaces/{workspace_id}/files/download-all` (no query params).
- `downloadFileStream`'s new parameter is optional and trailing — every existing call site
  (`downloadSelectedFile`, any other caller) must keep working unchanged.
- No per-status-code UI copy: 400/413/500 all render via the existing generic
  `handleError` → `toaster.error` path inside `downloadFileStream`, unmodified.
- No new environment variable, feature flag, or frontend-side file-count/byte cap.
- `X-Workspace-Skipped-Count` is read only when present and `> 0`; it triggers `toaster.info`, not
  an error — the download itself already succeeded.

## Review Focus

- Header value `"0"` or absent for `X-Workspace-Skipped-Count` must not toast — only `> 0` toasts.
- `downloadAllFiles()` must no-op (return `false`) when `this.workspace` is null, same guard shape
  as `downloadSelectedFile`, not throw.
- `reset()` must clear `isDownloadingAll` back to `false` so a stale "loading" state can't persist
  across popup re-opens.
- The new button's `disabled`/`isLoading` must react to `files.length === 0` and
  `isDownloadingAll` independently of the per-file button's own `isDownloading`/`selectedFilePath`
  state — they must not share or clobber each other.
- Existing `downloadFileStream` callers that pass only 1–3 arguments must not break when the
  signature grows a 4th optional parameter — covered by the existing `api.test.ts` suite plus
  Task 1's new case, not by re-running every caller.

---

### Task 1: `api.downloadFileStream` — optional success-headers callback

**Files:**
- Modify: `src/utils/api.ts:257-308`
- Test: `src/utils/__tests__/api.test.ts` (append inside the existing `describe('downloadFileStream', ...)` block, using its `mockFetchResponse` helper)

**Interfaces:**
- Produces: `downloadFileStream(url: string, _type?: string, fileName?: string, onSuccessHeaders?: (headers: Headers) => void): Promise<boolean>` — the 4th parameter is called once, synchronously, with `response.headers`, immediately after the existing `!response.ok` check passes and before the blob is built. Not called when `!response.ok`.

Test-first: yes — a new case asserting the callback receives the response's `Headers` on a 2xx response, and is never called when `response.ok` is `false`.

- [ ] **Step 1: Write the failing tests**

```ts
it('calls onSuccessHeaders with the response headers on success', async () => {
  mockFetchResponse(mockBlob, { 'x-workspace-skipped-count': '2' })
  const onSuccessHeaders = vi.fn()

  await api.downloadFileStream('v1/files/123', undefined, 'report.pdf', onSuccessHeaders)

  expect(onSuccessHeaders).toHaveBeenCalledTimes(1)
  expect(onSuccessHeaders.mock.calls[0][0].get('x-workspace-skipped-count')).toBe('2')
})

it('does not call onSuccessHeaders when response is not ok', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: { message: 'Not found' } }),
  })
  const onSuccessHeaders = vi.fn()

  await api.downloadFileStream('v1/files/123', undefined, undefined, onSuccessHeaders)

  expect(onSuccessHeaders).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/utils/__tests__/api.test.ts -t downloadFileStream`
Expected: FAIL — `onSuccessHeaders` is not called (parameter doesn't exist yet).

- [ ] **Step 3: Implement the parameter in `src/utils/api.ts:257-274`**

Add `onSuccessHeaders?: (headers: Headers) => void` as the 4th parameter of `downloadFileStream`,
and call `onSuccessHeaders?.(response.headers)` on the line right after the existing
`if (!response.ok) { ... }` block, before the `reader`/blob-building code.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/utils/__tests__/api.test.ts -t downloadFileStream`
Expected: PASS, including the three pre-existing `downloadFileStream` tests still passing.

- [ ] **Step 5: Commit**

---

### Task 2: `agentWorkspaceStore.downloadAllFiles()` + `isDownloadingAll`

**Files:**
- Modify: `src/store/agentWorkspace.ts` (interface at 22-39, proxy init at 81-92, add action after `downloadSelectedFile` at 205-222, `reset()` at 224-237)
- Test: `src/store/__tests__/agentWorkspace.test.ts` (append inside `describe('agentWorkspaceStore', ...)`; reuse the `workspace` object literal from the existing `'downloads selected file...'` test for `agentWorkspaceStore.workspace` in every new case below)

**Interfaces:**
- Consumes: `api.downloadFileStream(url, _type?, fileName?, onSuccessHeaders?)` from Task 1.
- Produces: `agentWorkspaceStore.isDownloadingAll: boolean`; `agentWorkspaceStore.downloadAllFiles(): Promise<boolean>`.

Test-first: yes — four cases: no-op when `workspace` is null, correct URL/args, `toaster.info`
firing when a captured header callback reports `skipped > 0`, and no toast when skipped is absent.

- [ ] **Step 1: Write the failing tests**

```ts
it('does not call downloadFileStream when no workspace is set', async () => {
  const { agentWorkspaceStore } = await import('@/store/agentWorkspace')

  const result = await agentWorkspaceStore.downloadAllFiles()

  expect(result).toBe(false)
  expect(mockDownloadFileStream).not.toHaveBeenCalled()
})

it('downloads the whole workspace as an archive', async () => {
  mockDownloadFileStream.mockResolvedValue(true)
  const { agentWorkspaceStore } = await import('@/store/agentWorkspace')
  agentWorkspaceStore.workspace = { id: 'workspace-1' /* ...rest as in the existing fixture */ }

  const result = await agentWorkspaceStore.downloadAllFiles()

  expect(result).toBe(true)
  expect(mockDownloadFileStream).toHaveBeenCalledWith(
    'v1/workspaces/workspace-1/files/download-all',
    undefined,
    undefined,
    expect.any(Function)
  )
})
```

For the partial-skip behavior, capture the 4th argument `downloadFileStream` is called with (as
above) and invoke it directly in the test body with a `new Headers({ 'x-workspace-skipped-count': '3' })` — assert `toaster.info` (already mocked in this file) was called with a message containing
`'3'`. A sibling case invokes the same captured callback with `new Headers()` (header absent) and
asserts `toaster.info` was **not** called. Both reuse the same workspace fixture and
`mockDownloadFileStream` setup as the test above.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/store/__tests__/agentWorkspace.test.ts`
Expected: FAIL — `downloadAllFiles` is not a function.

- [ ] **Step 3: Implement `downloadAllFiles()` in `src/store/agentWorkspace.ts`**

Add `isDownloadingAll: boolean` to the `AgentWorkspaceStoreType` interface and the proxy's initial
state (next to `isDownloading`), and `downloadAllFiles: () => Promise<boolean>` to the interface.
Add the action after `downloadSelectedFile` (205-222), same shape: guard
`if (!this.workspace) return false`; set `this.isDownloadingAll = true` in `try`, reset to `false`
in `finally` (no `catch`); call
`api.downloadFileStream(\`v1/workspaces/${this.workspace.id}/files/download-all\`, undefined, undefined, onSuccessHeaders)`
where `onSuccessHeaders` reads `headers.get('x-workspace-skipped-count')`, parses it as a number,
and when `> 0` calls `toaster.info(...)` with a message naming the count (mentioning the
`_SKIPPED_FILES.txt` manifest per the spec). Add `this.isDownloadingAll = false` to `reset()`
(224-237).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/store/__tests__/agentWorkspace.test.ts`
Expected: PASS, including all pre-existing `agentWorkspaceStore` tests.

- [ ] **Step 5: Commit**

---

### Task 3: "Download all" button in `AgentWorkspaceBrowserPopup`

**Files:**
- Modify: `src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx:112-123,228-230`
- Test: `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx`

**Interfaces:**
- Consumes: `agentWorkspaceStore.files`, `agentWorkspaceStore.isDownloadingAll`,
  `agentWorkspaceStore.downloadAllFiles()` from Task 2.

Test-first: yes — button disabled when `files` is empty, enabled with files present, disabled
while `isDownloadingAll` is true, and calls `downloadAllFiles()` on click.

- [ ] **Step 1: Write the failing tests**

Add to `ChatHeaderBrowseFilesButton.test.tsx`: extend `mockAgentWorkspaceStore` with
`isDownloadingAll: false` and `downloadAllFiles: vi.fn()` in the `vi.hoisted` block and the
`beforeEach` reset. Reuse the single-file object literal already used in this file's
`'renders file list...'` test (e.g. `{ path: 'src/app.py', ... }`) for `mockAgentWorkspaceStore.files` in the two cases below that need a non-empty list.

```ts
it('disables download all when the workspace has no files', async () => {
  render(<ChatHeaderBrowseFilesButton />)
  await user.click(screen.getByRole('button', { name: 'Browse files' }))

  expect(screen.getByRole('button', { name: 'Download all workspace files' })).toBeDisabled()
})

it('enables download all once files are loaded and calls downloadAllFiles on click', async () => {
  mockAgentWorkspaceStore.files = [/* one file, as above */]

  render(<ChatHeaderBrowseFilesButton />)
  await user.click(screen.getByRole('button', { name: 'Browse files' }))
  const button = screen.getByRole('button', { name: 'Download all workspace files' })
  expect(button).toBeEnabled()

  await user.click(button)

  expect(mockAgentWorkspaceStore.downloadAllFiles).toHaveBeenCalled()
})

it('disables download all while the archive is being prepared', async () => {
  mockAgentWorkspaceStore.files = [/* one file, as above */]
  mockAgentWorkspaceStore.isDownloadingAll = true

  render(<ChatHeaderBrowseFilesButton />)
  await user.click(screen.getByRole('button', { name: 'Browse files' }))

  expect(screen.getByRole('button', { name: 'Download all workspace files' })).toBeDisabled()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx`
Expected: FAIL — no button with that accessible name exists yet.

- [ ] **Step 3: Add the button in `AgentWorkspaceBrowserPopup.tsx`**

Destructure `isDownloadingAll` from `useSnapshot(agentWorkspaceStore)` (112-123). In the "Files"
panel header (228-230, currently just the static "Files" label), wrap the label and a new `Button`
in a flex row: reuse the existing `DownloadSvg` import, `variant="secondary"`,
`aria-label="Download all workspace files"`, `data-testid="workspace-download-all"`,
`disabled={files.length === 0 || isDownloadingAll}`, `isLoading={isDownloadingAll}`,
`onClick={() => agentWorkspaceStore.downloadAllFiles()}`. No success toast (matches
`downloadSelectedFile`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx`
Expected: PASS, including all pre-existing tests in this file.

- [ ] **Step 5: Commit**
