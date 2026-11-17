# Spec: Download all files from an Agent Workspace

**Ticket**: EPMCDME-15770 · **Scope**: frontend only (`codemie-ui`)

## Intent

Users currently download Agent Workspace files one at a time. When a workspace has many
generated artifacts across folders, that's tedious. The backend already exposes a single
"download everything as one zip" endpoint (sibling `../codemie` repo, branch
`EPMCDME-15770_workspace-download-all-files`, not confirmed merged). This spec covers wiring the
existing frontend workspace browser to that endpoint.

Authorization, archiving, and folder/content fidelity (AC#2-5) are enforced server-side. The
frontend's job is to trigger the request, stream the response to disk, and show the user what
happened — the same shape as the single-file download it already has.

## Design

### Store: `src/store/agentWorkspace.ts`

Add `isDownloadingAll: boolean` next to `isDownloading`, and an action `downloadAllFiles()`
mirroring `downloadSelectedFile()` (lines 205-222):

- Guard `if (!this.workspace) return false` (no selected-file requirement — this acts on the
  whole workspace).
- `isDownloadingAll = true` in try, reset to `false` in finally — no catch block, same as
  `downloadSelectedFile`.
- Calls `api.downloadFileStream(\`v1/workspaces/${this.workspace.id}/files/download-all\`, undefined, undefined, onSkipped)` where `onSkipped` is a `Headers` callback (see below). No
  explicit filename — the backend derives one from the workspace name and sends it via
  `Content-Disposition`, same resolution path `downloadFileStream` already uses.
- `reset()` (lines 224-237) gains `isDownloadingAll = false`.

### Shared helper: `src/utils/api.ts`

`downloadFileStream` gains one optional trailing parameter, backward-compatible with every
existing call site:

```ts
downloadFileStream(
  url: string,
  _type?: string,
  fileName?: string,
  onSuccessHeaders?: (headers: Headers) => void
): Promise<boolean>
```

Call `onSuccessHeaders?.(response.headers)` once, right after the existing `!response.ok` check
passes (src/utils/api.ts:270), before the blob is built. This is the only change to this file.

### Partial-skip signal

The backend reports a non-fatal partial failure (some files skipped, archive still produced) via
an `X-Workspace-Skipped-Count` response header on an otherwise-200 response — not via any error
path. `downloadAllFiles()`'s `onSuccessHeaders` callback reads that header and, when present and
`> 0`, calls `toaster.info(...)` naming the count and pointing at the `_SKIPPED_FILES.txt`
manifest inside the archive for detail. This follows the existing non-fatal-warning convention at
`src/utils/workflowWarnings.ts:85-102` (`toaster.info` for non-fatal issues). No new store field
is needed — the toast is a direct side effect of the callback.

### Errors (400 / 413 / 500) — no new logic

All three map to the existing generic path already inside `downloadFileStream`: on `!response.ok`
it reads the JSON error body and calls `toaster.error(...)` internally, then returns `false`.
The backend already crafts a distinct, client-safe, actionable message per status (empty/missing
workspace, over-cap suggesting individual downloads, generic failure with no leaked detail) — the
frontend forwards that message as-is and does not branch on status code. This satisfies AC#6
(failure state shown), AC#7 (actionable message for empty/missing workspace), and AC#8 (no leaked
detail on partial/total failure) without adding any per-status UI copy.

### Component: `AgentWorkspaceBrowserPopup.tsx`

Add a "Download all" button in the left "Files" panel header (src/pages/.../AgentWorkspaceBrowserPopup.tsx:228-230, next to the static "Files" label), reusing the existing `DownloadSvg`
icon import:

- `disabled={files.length === 0 || isDownloadingAll}` — disabling on an empty list is the first
  line of defense for AC#7; the backend's 400 is the authoritative backstop if files vanish
  between list-load and click.
- `isLoading={isDownloadingAll}` — same `Button` prop already driving the per-file button's
  progress state (AC#6).
- `onClick={() => agentWorkspaceStore.downloadAllFiles()}`.
- `aria-label="Download all workspace files"`, distinct from the existing per-file button's
  `aria-label="Download selected file"`.

No success toast is added — matching `downloadSelectedFile`, where the browser's own
save/download affordance is the existing success signal.

## Acceptance criteria → coverage

1. New button in the workspace popup triggers the archive download.
2./3./4. Delegated to the backend endpoint; frontend streams the response unchanged.
5. Enforced server-side (400 on foreign/missing workspace, identical to empty).
6. `isDownloadingAll`-driven `isLoading` for progress; generic toast for failure.
7. Button disabled when `files.length === 0`; 400 backstop otherwise.
8. Generic `toaster.error` (total failure) + `toaster.info` via `X-Workspace-Skipped-Count`
   (partial failure) — neither leaks file-level detail.
9. `downloadSelectedFile`, its route, and every other `downloadFileStream` call site are
   untouched; the new parameter is optional and additive.
10. See Testing below.

## Testing

- `src/store/__tests__/agentWorkspace.test.ts` (existing file, already mocks
  `api.downloadFileStream` and `toaster`): add cases for `downloadAllFiles()` — correct URL/args
  when a workspace is set, no-op when it isn't, and a case that captures the 4th-argument
  callback and invokes it with a header map to assert `toaster.info` fires with the skipped
  count. Status-code → toast plumbing is already covered by `src/utils/__tests__/api.test.ts:208+`
  and is not re-tested here.
- Component test alongside `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx` (already exercises `AgentWorkspaceBrowserPopup` via caller hop): assert the
  new button is disabled when `files` is empty and while `isDownloadingAll` is true.

## Non-goals

- No client-side mirror of the backend's file-count/byte-size cap — the frontend has no such
  constant today and relies entirely on the backend's 413.
- No per-status-code UI copy variation (400 vs 413 vs 500 render the same way: a generic toast
  with the backend's message).
- No retry/resume affordance for a failed or partially-skipped archive.
- No change to `downloadSelectedFile`, the single-file `/files/download` route, or any other
  `downloadFileStream` call site's behavior.
- No new environment variable or feature flag.

## Risks / open items for later stages

- The backend branch is not confirmed merged — confirm before relying on the endpoint being live
  in any shared environment.
- `AgentWorkspaceBrowserPopup.tsx` currently names a single data-testid convention
  (`workspace-file-list`, `workspace-preview`); the new button should get its own `data-testid`
  for test targeting, left to the implementer.
