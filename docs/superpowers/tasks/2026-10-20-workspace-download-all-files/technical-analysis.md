# Technical Research

**Task**: workspace file download archive
**Generated**: 2026-10-20
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15770 — Enable download of all files from an Agent Workspace

Note from user: the backend part has already been implemented in the sibling repo ../codemie
(relative to this codemie-ui repo). This task is the frontend (codemie-ui) implementation only.

Description:
Users need a convenient way to download the complete contents of an Agent Workspace after an
agent or workflow completes its work. Currently, files must be downloaded individually where
downloadable links are available, which is inefficient for workspaces containing multiple
generated artifacts and folders.

The platform should provide a user-facing action that packages all files the current user is
authorized to access in the selected Agent Workspace into a single downloadable archive. This
will simplify retrieval, sharing, retention, and local review of complete agent outputs while
preserving workspace access boundaries.

Preconditions:
- A user is authenticated in AI/Run CodeMie.
- The user has access to an Agent Workspace.
- The workspace contains one or more files, optionally organized in folders.
- The workspace is associated with the user's current conversation, agent run, or workflow run.

Scenarios of Use:
1. A user opens an Agent Workspace that contains files created by an agent or workflow.
2. The user selects "Download all files".
3. The platform validates the user's access to the workspace and its files.
4. The platform packages eligible workspace files and folders into a single archive.
5. The platform provides a working download for the archive.
6. The user downloads and extracts the archive locally, with the workspace folder structure preserved.
7. If the workspace contains no downloadable files or archive generation fails, the platform shows an actionable message.

Affected Areas: Agent Workspace UI and file-management controls; workspace file listing and
metadata APIs; archive generation and download delivery; workspace access control and
authorization; agent and workflow output handling; error handling, audit logging, automated tests.

Acceptance Criteria:
1. Users with access to an Agent Workspace can initiate a "Download all files" action from the workspace UI.
2. The action generates one downloadable archive containing all files the user is authorized to access in that workspace.
3. The archive preserves the workspace folder hierarchy and original file names.
4. The archive contains binary and text files without altering their contents.
5. The platform does not include files from another user's, conversation's, or workflow run's workspace.
6. The platform displays a clear progress, success, or failure state while the archive is being prepared.
7. If the workspace is empty, the download action is disabled or returns an actionable message.
8. If one or more files cannot be included, the platform reports the failure clearly and does not expose unauthorized file details.
9. Existing individual-file download behavior remains unchanged.
10. Automated tests cover authorization, archive content integrity, nested folders, empty workspaces, and archive-generation failures.

Research focus: find the existing Agent Workspace UI (file listing, individual-file download
action, any existing zip/archive download flow elsewhere in the app we can reuse as a pattern),
the API layer for workspace files, and how downloads are currently triggered/streamed in this
frontend. Also identify whether an endpoint for "download all" already exists per the BE repo
naming conventions (even though BE itself lives in ../codemie, not in this repo) — look for any
existing API client calls, types, or constants referencing workspace file endpoints that a new
"download all" endpoint would plug into.

---

## 2. Codebase Findings

### Existing Implementations

- `src/store/agentWorkspace.ts` — Valtio store (`agentWorkspaceStore`) owning workspace state:
  `workspace`, `files`, `selectedFilePath`, `selectedFile`, `isDownloading`, `error`, etc.
  Actions: `openForConversation`, `listFiles`, `selectFile`, `downloadSelectedFile`, `reset`.
- `src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx` — the workspace browser
  popup UI: file list (left column), preview + per-file "Download" button (right column header,
  lines 279–288). Renders `agentWorkspaceStore` snapshot via `useSnapshot`.
- `src/pages/chat/components/ChatHeader/ChatHeaderBrowseFilesButton.tsx` — entry point button
  ("Browse files") in the chat header that opens the popup for `currentChat.id` and calls
  `agentWorkspaceStore.reset()` on close.
- `src/types/entity/agentWorkspace.ts` — `AgentWorkspace`, `AgentWorkspaceFile`,
  `AgentWorkspaceFileContent` types, mirroring backend response shapes.
- `src/utils/api.ts` — single HTTP layer (`API` class, default-exported instance `api`).
  `downloadFileStream(url, _type?, fileName?)` (lines 257–308) is the existing generic
  "stream a URL to a browser download" helper: fetches with auth headers, reads the body as a
  `ReadableStream`, builds a `Blob`, resolves the filename either from the explicit argument or
  from `Content-Disposition` via `parseContentDispositionFilename` + `sanitizeFileName`, then
  calls `saveAs(blob, fileName)` (FileSaver). On `!response.ok` it reads the JSON error body and
  calls `this.handleError(body)` → `toaster.error(...)`, returning `false`. This is exactly the
  helper `downloadSelectedFile()` already uses for the single-file download endpoint.

### Architecture and Layers Affected

- **Store layer** (`src/store/agentWorkspace.ts`): would gain a new async action analogous to
  `downloadSelectedFile`, plus a loading flag (pattern: `isDownloading` already exists for the
  single-file case).
- **Component layer** (`src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx`):
  would gain a "Download all files" `Button`, likely next to/near the existing file-list header
  or the per-file Download button, disabled when `files.length === 0` or while in flight.
- **HTTP layer** (`src/utils/api.ts`): no change expected — `downloadFileStream` is generic over
  URL and already handles blob streaming, filename resolution, and error toasting.
- **Types layer** (`src/types/entity/agentWorkspace.ts`): no new response type needed for the
  frontend since the download-all response is a raw binary (`application/zip`), not JSON.

### Integration Points

- **Backend endpoint already exists** in the sibling `../codemie` repo, on branch
  `EPMCDME-15770_workspace-download-all-files` (not yet merged to its main, per repo evidence):
  `GET /v1/workspaces/{workspace_id}/files/download-all`
  (`codemie/src/codemie/rest_api/routers/agent_workspace.py:225-234`). It mirrors the existing
  per-file download route `GET /v1/workspaces/{workspace_id}/files/download` that
  `downloadSelectedFile()` already calls. See External References for the full contract.
- Existing sibling patterns in this frontend for "stream a zip/blob to disk" (useful as a second
  precedent beyond `downloadFileStream`): `src/pages/skills/utils/skillUtils.ts`
  (`downloadMarkdownFile` — client-built Blob + `<a download>` pattern, not applicable here since
  the archive bytes come from the server, not built client-side) and
  `src/components/markdown/tokens/MermaidDiagram.tsx` (`downloadFile` — same client-Blob pattern).
  Neither is a better fit than `api.downloadFileStream`, which already exists for server-streamed
  files and is the one `downloadSelectedFile` uses.

### Patterns and Conventions

- Workspace actions live as methods on the `agentWorkspaceStore` Valtio proxy, not as free
  functions or hooks; UI components call `agentWorkspaceStore.<action>()` directly and read state
  via `useSnapshot`.
- Loading/error state is modeled as sibling boolean/string fields on the same store
  (`isWorkspaceLoading`, `isFilesLoading`, `isPreviewLoading`, `isDownloading`, `error`) rather
  than a generic status enum — a new "download all" flag should follow this same flat-boolean
  convention (e.g. `isDownloadingAll`).
  **Speculative**: see Risk Indicators for why this is a planning concern, not a researched fact.
- Error messages surfaced via `toaster.error` using `getErrorMessage(error, fallback)`, which
  reads `error?.parsedError?.message ?? error?.message ?? fallback`. `api.downloadFileStream`
  does its own error toasting internally (via `handleError`) and returns `false` rather than
  throwing, which is a different error-surfacing path than the other store actions (which throw
  and let `toaster.error` be called by the caller inside the store method). A new "download all"
  action should decide whether to rely on `downloadFileStream`'s internal toast or add workspace-
  specific messaging.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` contains guides for architecture, components, patterns/state-management,
development/api-integration, testing, styling, security, but none specifically named for "agent
workspace" or "download". No guide file targeted "workspace" or "download" by name; the two most
relevant by category are `.ai-run/guides/patterns/state-management.md` (Valtio store conventions)
and `.ai-run/guides/development/api-integration.md` (backend call conventions), neither of which
was read in full for this pass — codegraph coverage of the actual store/component code was
sufficient to establish the pattern directly from source.

### Architectural Decisions

No ADRs found referencing workspace downloads. The existing per-file download route and the new
download-all route both live under the same `/v1/workspaces/{workspace_id}/files/...` prefix in
the backend router, establishing a clear REST convention the frontend already follows for the
per-file case.

### Derived Conventions

- Workspace store actions always resolve `this.workspace` first and no-op (return early) if it is
  null (see `selectFile`, `downloadSelectedFile`).
- Download actions set a loading boolean in a `try/finally`, not `try/catch/finally`, letting
  `api.downloadFileStream`'s own internal error handling apply.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx` — exists
  and is the test file covering `agentWorkspaceStore`, `AgentWorkspace`, `AgentWorkspaceFile`,
  `AgentWorkspaceFileContent`, and (via caller-hop) `AgentWorkspaceBrowserPopup`. This is the file
  a "download all" test would extend or sit alongside.
- No dedicated test file currently exercises `agentWorkspaceStore.downloadSelectedFile` or any
  future `downloadAllFiles` in isolation — coverage comes through the popup/button integration
  test.

### Testing Framework and Patterns

Vitest + React Testing Library (per AGENTS.md and observed `vi.fn()`/`describe`/`it` usage across
the codebase's test files, e.g. `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`).
Two Vitest projects exist (`unit`, `integration`) per `AGENTS.md`/`vite.config.ts`, not
independently re-verified in this pass.

### Coverage Gaps

- No existing frontend test asserts behavior of `downloadFileStream` against a 4xx/5xx JSON error
  body shaped like the backend's `ExtendedHTTPException` (400 empty workspace, 413 too large, 500
  generic) — the "download all" feature will be the first frontend consumer that needs to surface
  these three distinct backend failure modes distinctly, per AC #7 and #8.
  **Speculative**: whether the UI needs to distinguish all three vs. show one generic failure
  message is a design decision, not something existing code already does.
- No frontend test currently covers an **empty workspace** disabling or blocking a download
  action (AC #7) — `files.length === 0` is already available on the store/popup, but no download-
  all affordance exists yet to disable.

---

## 5. Configuration and Environment

### Environment Variables

No workspace- or download-specific `VITE_*`/`window._env_` environment variables were found in
`src/types/global.ts` (`EnvConfig`: `VITE_ENV`, `VITE_API_URL`, `VITE_APP_VERSION` only) or
elsewhere in the explored code. Backend-side limits (`WORKSPACE_DOWNLOAD_MAX_FILES`,
`WORKSPACE_DOWNLOAD_MAX_BYTES`, in the sibling `../codemie` repo's config) are not mirrored by any
frontend constant — the frontend currently has no client-side equivalent of these caps and relies
on the backend's 413 response.

### Configuration Files

None specific to workspace downloads found in this repo.

### Feature Flags and Deployment Concerns

No feature flag or toggle found gating the existing "Browse files" / workspace popup feature; it
is unconditionally rendered in `ChatHeader` when `currentChat?.id` is present. No reason found to
expect the new action to need one.

---

## 6. Risk Indicators

- **Speculative**: the exact state-field name, button placement, and disabled-state wiring for a
  "Download all" action are design choices for the plan/spec, not yet-discovered facts — flagged
  here only as the natural next step, not as a requirement.
- The backend's three distinct failure modes (empty workspace → 400, over-cap → 413, unreadable →
  500) all currently funnel through `api.downloadFileStream`'s single generic `handleError` +
  `toaster.error` path, which reads `body.message`/`body.details`/`body.help` generically. No
  code was found that inspects status code to vary UI copy per AC #6/#7/#8 — worth confirming
  whether the generic toast is accepted as "actionable message" or whether per-status copy is
  wanted.
- The backend sets an `X-Workspace-Skipped-Count` response header when some files were skipped
  from the archive (AC #8's "reports the failure clearly" for partial failures). No current
  frontend code reads any custom response header from `downloadFileStream` — that function
  currently only reads `Content-Disposition`, so surfacing a partial-skip warning would need new
  header-reading logic that doesn't exist yet in the shared helper.
  **Speculative**: whether to add it to the shared helper or handle it in a new store action.
- The sibling backend branch `EPMCDME-15770_workspace-download-all-files` (same ticket number) is
  a feature branch of `../codemie`, not confirmed merged to its main — confirm its merge/release
  status before depending on the endpoint being live in any shared environment.
- No frontend test currently exists for `agentWorkspaceStore.downloadSelectedFile` or the download
  button's disabled/loading states in isolation (only indirect coverage via
  `ChatHeaderBrowseFilesButton.test.tsx`), so a new download-all test will be establishing pattern
  as much as following one.

---

## 7. Summary for Complexity Assessment

This is a frontend-only addition that plugs into an already-implemented backend endpoint
(`GET /v1/workspaces/{workspace_id}/files/download-all` in the sibling `../codemie` repo) and an
already-established frontend pattern: the `agentWorkspaceStore` Valtio store already has
`downloadSelectedFile()` using `api.downloadFileStream()` for the single-file case, and
`AgentWorkspaceBrowserPopup.tsx` already renders a `Download` button wired to it. The layers
touched are the store (one new action + one new boolean flag, following the exact shape of
`downloadSelectedFile`/`isDownloading`) and the popup component (one new `Button`, disabled when
`files.length === 0` or in flight). No new types, API client, or HTTP method are needed — the
existing generic `downloadFileStream` helper already handles blob streaming, filename resolution
from `Content-Disposition`, and JSON-error-body toasting, and the backend route returns exactly
that shape (zip bytes + `Content-Disposition` + JSON error bodies on failure).

The main source of complexity is not code volume but clarifying three backend-already-defined
failure modes (400 empty, 413 over-cap, 500 unreadable, plus a non-fatal
`X-Workspace-Skipped-Count` header for partial success) against the UI messaging acceptance
criteria (#6, #7, #8) — none of which the existing generic toast path distinguishes today. Test
coverage for the download flow is currently only indirect (via the popup/button integration test),
so the new action and its empty/error/partial states will need their own test additions rather
than extending a well-isolated existing suite. No environment variables, feature flags, or
migrations are implicated on the frontend side.

---

## 8. External References

The task named one source of truth: the backend implementation in the sibling repo `../codemie`
(relative to this `codemie-ui` repo), resolved to `/home/siarhei/projects/codemie-dev/codemie`.

- **Resolved**: `/home/siarhei/projects/codemie-dev/codemie/src/codemie/rest_api/routers/agent_workspace.py`
  (lines 225–234). Defines:
  ```
  @router.get("/workspaces/{workspace_id}/files/download-all", dependencies=[Depends(authenticate)])
  def download_all_workspace_files(workspace_id: str, user: User = Depends(authenticate)) -> Response:
  ```
  Full route: `GET /v1/workspaces/{workspace_id}/files/download-all` (router prefix `/v1`).
  Behavior: calls `workspace_service.build_workspace_archive(workspace_id, user)`; on success
  returns `Response(content=archive.content, media_type="application/zip", headers={...})` with
  `Content-Disposition: attachment; filename="<archive.filename>"` and, only when some files were
  skipped, an extra header `X-Workspace-Skipped-Count: <N>`. No JSON response model/schema (raw
  binary body), so no frontend type is needed for the success path.

- **Resolved**: `/home/siarhei/projects/codemie-dev/codemie/src/codemie/service/workspace_archive.py`.
  Defines `build_workspace_archive(service, workspace_id, user) -> WorkspaceArchive` (NamedTuple:
  `content: bytes, filename: str, included_count: int, skipped_paths: list[str], total_bytes: int`).
  Facts relevant to the frontend contract:
  - Archive filename is derived from the workspace name (sanitized to `[A-Za-z0-9._-]`, falling
    back to the workspace id), suffixed `.zip` — the frontend does not need to construct a
    filename; it should rely on `Content-Disposition` same as the single-file download already
    does via `parseContentDispositionFilename`.
  - Raises `ValidationException("Workspace has no downloadable files")` when the workspace has no
    files, and also `ValidationException("Workspace '<id>' not found")` for a workspace the user
    cannot access — **both map identically to HTTP 400** (confirmed by
    `test_download_all_foreign_workspace_looks_like_a_missing_one`), satisfying AC #5 (no leak of
    cross-workspace existence) and AC #7 (empty workspace → actionable message) with the same
    status code; the frontend cannot distinguish "empty" from "forbidden/missing" by status code
    alone and should not try to.
  - Raises `WorkspaceArchiveTooLargeError` (→ HTTP 413, via the router's `_archive_http_error`)
    when the workspace exceeds `config.WORKSPACE_DOWNLOAD_MAX_FILES` files or
    `config.WORKSPACE_DOWNLOAD_MAX_BYTES` total bytes; its message is client-safe and explicitly
    suggests "Download individual files instead."
  - Raises `WorkspaceArchiveFailedError("None of the workspace files could be read")` (→ HTTP 500)
    only when **every** file failed to read; partial failures are instead recorded in
    `skipped_paths` and written into a `_SKIPPED_FILES.txt` manifest entry inside the zip itself,
    plus reported via the `X-Workspace-Skipped-Count` response header — this is the archive-level
    mechanism satisfying AC #8 ("one or more files cannot be included... reports the failure
    clearly").
  - Any other unexpected exception is logged server-side only and surfaces to the client as a
    generic HTTP 500 with a fixed safe message ("Workspace request failed" /
    "Workspace archive could not be created") — confirmed by
    `test_download_all_unexpected_error_does_not_leak_its_text`.

- **Resolved**: `/home/siarhei/projects/codemie-dev/codemie/tests/codemie/rest_api/routers/test_agent_workspace_download_all.py`.
  Confirms the above status-code mapping (400/413/500), confirms the single-file download route
  (`GET /workspaces/{workspace_id}/files/download`) is unchanged (AC #9,
  `test_single_file_download_is_unchanged`), and confirms the route is registered on the router
  (`test_download_all_route_is_registered`).

- Note: this branch (`EPMCDME-15770_workspace-download-all-files`) exists as a local/remote git
  branch in `../codemie` distinct from its default branch — confirm with the backend team whether
  it has been merged/deployed before relying on the endpoint being live anywhere other than a
  local backend checkout.
