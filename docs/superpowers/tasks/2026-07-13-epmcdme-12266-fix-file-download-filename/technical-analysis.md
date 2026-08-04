# Technical Research

**Task**: file download filename export content-disposition assistant
**Generated**: 2026-07-13T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-12266 — file downloaded from CodeMie assistant has an unintelligible filename. When a user triggers a file download (e.g. .xlsx export) from the CodeMie assistant, the filename shown in the browser is not human-readable. The Jira ticket title says 'base64-encoded' but the user clarified that the actual filenames use UUID hashes (not base64). Expected: a descriptive filename like 'EIS EPAM REN Sprint 39 Release Notes 2026.05.09.xlsx'. Actual: a UUID-hash-based or base64-looking string. The fix should decode/map the UUID or derive a human-readable name from context (workflow name, prompt output, table/dataset name). Affected areas: file export/download functionality, filename generation logic in the CodeMie assistant UI, download link presentation and Content-Disposition handling.

---

## 2. Codebase Findings

### Existing Implementations

There are two distinct download APIs used in the codebase, each with separate filename resolution logic.

**Path A — `filesStore.downloadFile(fileId)` (`src/store/files.ts:87-96`):**
- Called from `File.tsx` when a user clicks the download button on a user-uploaded chat attachment.
- Calls `decodeFileName(fileUrl)` from `src/utils/helpers.ts`, which tries `atob(fileId)` and parses the result as `{mimeType}~{user}~{originalFileName}` (length-prefix or legacy underscore format).
- On a UUID `fileId`, `atob(uuid)` throws (hyphens are not valid base64 characters). The `helpers.ts` version catches the error and returns `[]`. Array destructuring yields `originalFileName = undefined`. Setting `a.download = undefined` causes the browser to fall back to the last URL path segment — the UUID.
- This path does **not** read `Content-Disposition` at all. It uses `URL.createObjectURL` + programmatic anchor click, bypassing `api.downloadFileStream`.

**Path B — `api.downloadFileStream(url, type?, fileName?)` (`src/utils/api.ts:226-277`):**
- Used by all server-generated export call sites.
- Fetches the URL, streams to a `Blob`, then resolves the filename with priority: (1) caller-supplied `fileName` arg, (2) `content-disposition` response header parsed by `parseContentDispositionFilename` + `sanitizeFileName`, (3) hardcoded fallback string `'download'`.
- `parseContentDispositionFilename` supports RFC 5987 `filename*=UTF-8''…` and plain `filename="…"` / `filename=…` forms.
- Call sites that pass no `fileName` (the bug-affected ones) are listed below.

**Download call sites and their filename strategy:**

| Call site | File | fileName arg | Filename source |
|---|---|---|---|
| `exportWorkflowExecution` | `src/store/workflowExecutions.ts:798` | Yes — explicit | `${workflow.name}_${formatDateTime(...)}.zip` |
| Data source export | `src/store/dataSources.ts:720` | Yes — explicit | `${name}.md` |
| `downloadWorkflowImage` | `src/utils/.../downloadWorkflowImage.ts:143` | Yes — explicit | `${workflowName}_export` |
| `exportChat` | `src/store/chats.ts:393-397` | **No** | Relies on Content-Disposition only |
| `exportConversationAIMessage` | `src/store/chats.ts:428-432` | **No** | Relies on Content-Disposition only |
| `downloadSelectedFile` | `src/store/agentWorkspace.ts:205-218` | **No** | Relies on Content-Disposition only; `this.selectedFilePath` (human-readable) is available but not passed |
| `downloadFile` (user attachment) | `src/store/files.ts:87-96` | N/A — uses anchor | Decoded from base64 fileId; fails silently on UUID input |

**Markdown inline links — no JS interception (`src/components/markdown/Markdown.utils.ts`):**
- Assistant messages containing file links use `sandbox:/v1/files/<uuid>` placeholders, which are replaced with `${api.BASE_URL}/v1/files/<uuid>` before markdown tokenisation.
- `getMarkdownRenderer` emits plain `<a href="..." target="_blank" rel="noopener noreferrer">` tags — no `download` attribute, no React `onClick`, no call to `api.downloadFileStream`.
- Clicking such a link in a chat message makes a plain browser HTTP request. The filename is governed entirely by the backend's `Content-Disposition` response header. If the server returns a UUID or omits the header, the browser uses the UUID.
- The same `sandbox:/v1/files/` substitution logic is duplicated in `src/utils/messageHelpers.ts`.

**Relevant utility files:**

- `src/utils/api.ts` — `parseContentDispositionFilename`, `sanitizeFileName`, `downloadFileStream` (the core, well-tested download engine).
- `src/utils/helpers.ts` — `decodeFileName(fileName): string[]` (array form, silent error recovery, used by `store/files.ts`).
- `src/utils/utils.ts:254` — `decodeFileName(fileName): { mimeType, user, originalFileName }` (object form, throws on invalid base64, used by `useFileUpload.tsx` and `getFileNameFromUrl.ts`).
- `src/pages/assistants/…/AssistantSetup/utils/getFileNameFromUrl.ts` — `getFileNameFromUrl(url)`: extracts a human-readable filename from a `/v1/files/<encodedId>` URL by calling the `utils.ts` variant of `decodeFileName`. Currently only wired to the assistant-setup form, not to any download path.

### Architecture and Layers Affected

| Layer | Components Affected |
|---|---|
| Store / business logic | `src/store/files.ts`, `src/store/chats.ts`, `src/store/agentWorkspace.ts` |
| API / HTTP client | `src/utils/api.ts` (`downloadFileStream`, `parseContentDispositionFilename`, `sanitizeFileName`) |
| Rendering / markdown | `src/components/markdown/Markdown.utils.ts`, `src/utils/messageHelpers.ts` |
| Components | `src/components/File.tsx`, `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessageActions.tsx` |
| Utility | `src/utils/helpers.ts`, `src/utils/utils.ts`, `src/pages/assistants/…/utils/getFileNameFromUrl.ts` |

### Integration Points

- `file-saver` (`saveAs`) is used exclusively inside `api.downloadFileStream` — the single centralised exit point for all binary downloads except `filesStore.downloadFile` (which uses the URL object + anchor pattern instead).
- The backend file endpoint is `v1/files/{fileId}` (GET). The backend is the only source of truth for the original filename when `fileId` is a UUID; the frontend has no other mapping.
- `v1/conversations/{id}/export`, `v1/conversations/{id}/history/{h}/{m}/export`, and `v1/workspaces/{id}/files/download` are the three other affected backend endpoints. Their `Content-Disposition` headers are the only filename signal those call sites consume.

### Patterns and Conventions

- The established pattern for human-readable filenames is to pass a composed name as the third argument to `api.downloadFileStream(url, type, fileName)`. This is used correctly in `workflowExecutions.ts` (`workflow.name + date`) and `dataSources.ts` (`name + extension`).
- `sanitizeFileName` from `api.ts` is the canonical sanitiser and should be applied to any derived name before passing it to `downloadFileStream` or `a.download`.
- `getFileNameFromUrl` already implements the correct fallback chain for `/v1/files/<encodedId>` URLs — it is reusable but currently not connected to the download flow.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` guide covers file download, export, or Content-Disposition handling. The API integration guide (`/Users/alex/Projects/Work/codemie-dev/codemie-ui/.ai-run/guides/development/api-integration.md`) documents the `api.*` usage pattern at a general level but does not mention `downloadFileStream`, `saveAs`, or filename derivation strategies.

No `docs/` directory contains design notes relevant to this feature. The task run directory (`docs/superpowers/tasks/2026-07-13-epmcdme-12266-fix-file-download-filename/`) was empty at research time.

### Architectural Decisions

No ADRs, inline `ADR:` / `DECISION:` markers, or recorded design decisions were found in any file in the download/export domain. The only explanatory inline comment in this area is in `src/hooks/useFileUpload.tsx` (lines 68–76), noting the defensive try/catch around `decodeFileName` for non-base64 file IDs imported from Claude Desktop chats.

### Derived Conventions

From the call sites that work correctly:
- Filename = entity name + date formatter + extension is the preferred pattern (see `workflowExecutions.ts`).
- `formatDateTime(date, 'file')` from `src/utils/dateTimeUtils.ts` is the shared date-format utility for filenames.
- `sanitizeFileName` (exported from `api.ts`) is the canonical filename cleaner; it strips control chars, path traversal sequences, leading dots and spaces.
- When entity name is available in the store, it should be composed and passed to `downloadFileStream` rather than leaving it to Content-Disposition.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/api.test.ts` — well-tested: 8 cases for `parseContentDispositionFilename`, 11 cases for `sanitizeFileName`, 5 cases for `downloadFileStream` (including explicit filename, Content-Disposition fallback, and `'download'` fallback). This is the most complete test coverage in the domain.
- `src/pages/assistants/…/utils/__tests__/getFileNameFromUrl.test.ts` — 5 cases covering the `getFileNameFromUrl` utility: empty string, valid `/v1/files/` URL, decode failure, null `originalFileName`, and non-backend URLs.
- `src/utils/__tests__/helpers.test.ts` — covers the array-form `decodeFileName` in `helpers.ts`.
- `src/store/__tests__/agentWorkspace.test.ts` — one test verifies `downloadFileStream` is called with the correct URL; `downloadFileStream` is fully mocked, so no filename logic is exercised.
- `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx` — 2 UI interaction tests verify `downloadSelectedFile` is called, but the store method itself is mocked.
- No test file exists for `src/store/chats.ts` export methods (`exportChat`, `exportConversationAIMessage`).

### Testing Framework and Patterns

- **Framework**: Vitest with jsdom environment.
- **DOM assertions**: `@testing-library/react` + `@testing-library/jest-dom`.
- **Two test projects**: `unit` (with isolated setup) and `integration` (real Valtio reactivity, still mocks the `fetch` layer).
- **Global mocks**: `file-saver` is globally mocked in `setupTests.tsx` as `{ saveAs: vi.fn() }`; `URL.createObjectURL` and `URL.revokeObjectURL` are stubbed globally.
- Store tests mock `@/utils/api` entirely via `vi.mock('@/utils/api', ...)`, so no store test exercises real Content-Disposition parsing.
- Component tests use `vi.hoisted(() => ({ ... }))` to hoist store mocks.
- Standard teardown: `beforeEach(() => vi.clearAllMocks())`.
- **Coverage exclusion**: `**/api.ts` is explicitly excluded from coverage reporting in `vite.config.ts:103`. This means `downloadFileStream`, `parseContentDispositionFilename`, and `sanitizeFileName` are not counted in coverage metrics despite having tests.

### Coverage Gaps

1. **`chatsStore.exportChat` and `exportConversationAIMessage`** — no store-level test file exists (`src/store/__tests__/chats.test.ts` is absent). No test verifies that a derived filename is passed to `downloadFileStream` or that the chat name propagates correctly.
2. **`agentWorkspaceStore.downloadSelectedFile` filename resolution** — existing test mocks `downloadFileStream` entirely; no test verifies that `this.selectedFilePath` produces a human-readable filename in `saveAs`.
3. **End-to-end filename chain**: no test wires a mock fetch returning a `content-disposition: attachment; filename="uuid.xlsx"` header through any store method all the way to asserting what `saveAs` receives.
4. **`decodeFileName` in `src/utils/utils.ts`** (object form) — not directly unit-tested; the array form in `helpers.ts` is covered but the two implementations share no tests.
5. **`ChatAiMessageActions.tsx`** — no test file exists for this component, which houses the per-message export action.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — base URL for all API calls; defaults to `/api` (build-time) and is overridable at runtime via `window._env_.VITE_API_URL`. Used in the `API` class constructor in `src/utils/api.ts:96`. No download-specific env vars exist.
- No feature flags, no environment variables, and no `config.js` entries govern filename behavior, Content-Disposition handling, or the file export flow.

### Configuration Files

- `config.js` — injects runtime values into `window._env_`. Does not include download-related keys.
- `vite.config.ts` — dev proxy: `/api` → `http://localhost:8080`. `**/api.ts` explicitly excluded from coverage reporting (line 103). Two Vitest projects: `unit` and `integration`.
- `.env` — declares `VITE_API_URL=/api`; no download-specific variables.

### Feature Flags and Deployment Concerns

None. The download flow is unconditional — no feature flags gate the filename behavior or Content-Disposition path. Any fix is a pure code change with no deployment configuration required.

---

## 6. Risk Indicators

- **Two incompatible `decodeFileName` implementations** — `src/utils/helpers.ts` (returns `string[]`, silent catch) and `src/utils/utils.ts:254` (returns `{ mimeType, user, originalFileName }`, throws). Callers must know which form they are using. The `files.ts` store uses the array form and silently gets `undefined` on UUID input; this is the primary bug cause.
- **`filesStore.downloadFile` bypasses `api.downloadFileStream` entirely** — it uses URL.createObjectURL + anchor, so improvements to the centralized `downloadFileStream` (Content-Disposition parsing, `saveAs`) do not benefit this path. A separate fix is required.
- **Markdown inline links in assistant messages have no JS interception** — `Markdown.utils.ts` and `messageHelpers.ts` emit plain `<a target="_blank">` anchors. For assistant-generated `.xlsx` or export links, the filename is 100% determined by the backend `Content-Disposition` header. A frontend-only fix cannot solve this path; it requires either a backend fix (correct `Content-Disposition`) or converting these links to programmatic downloads in `getMarkdownRenderer`.
- **`messageHelpers.ts` is a duplicate of `Markdown.utils.ts`** — both files contain the same `sandbox:/v1/files/` substitution and `getMarkdownRenderer` logic. A fix to `Markdown.utils.ts` must also be applied to `messageHelpers.ts` or the duplication must be resolved first.
- **No store-level tests for `chats.ts` export methods** — adding a filename derivation fix to `exportChat` / `exportConversationAIMessage` cannot be regression-tested without new tests.
- **`api.ts` excluded from coverage** — `parseContentDispositionFilename`, `sanitizeFileName`, and `downloadFileStream` are tested in `api.test.ts` but invisible in coverage reports; coverage metrics will not reflect test additions to this domain.
- **Three call sites rely on Content-Disposition with no fallback** — `exportChat`, `exportConversationAIMessage`, `downloadSelectedFile`. If the backend returns a UUID in the header (which is what the bug report indicates), all three will surface a UUID filename in the browser save dialog.
- **`agentWorkspaceStore.downloadSelectedFile` has `this.selectedFilePath` available** — the human-readable path (e.g. `outputs/report.xlsx`) is already in state at call time, but is not used as a filename fallback. This is a trivially fixable gap.

---

## 7. Summary for Complexity Assessment

The bug has three distinct manifestation paths, each requiring a separate fix. The first and most localized path is `src/store/files.ts → downloadFile()`, where a UUID `fileId` causes `decodeFileName` (from `helpers.ts`) to return `[]` and the anchor's `download` attribute is set to `undefined`. The fix here is either to fall back to `api.downloadFileStream(url)` (which reads Content-Disposition) when `decodeFileName` fails, or to use `getFileNameFromUrl` — an existing utility already wired for exactly this case — to extract a name before falling back. The second path involves three store methods (`exportChat`, `exportConversationAIMessage`, `downloadSelectedFile`) that pass no `fileName` to `api.downloadFileStream` and therefore expose whatever UUID the backend sends in `Content-Disposition`. For `downloadSelectedFile`, the fix is one line (`this.selectedFilePath` → `path.basename`). For `exportChat`, the chat name is available in store state. For `exportConversationAIMessage`, a generic derived name using message index and format is the best available option. The third path — assistant-generated markdown download links — cannot be fixed purely on the frontend without converting plain `<a>` anchors to programmatic `api.downloadFileStream` calls inside `getMarkdownRenderer`; this is the highest-risk change because it modifies the markdown rendering pipeline shared across all chat views and is duplicated in two files.

The change surface spans two architectural layers (Store and Rendering/Markdown) plus the Utility layer. Estimated file changes: `src/store/files.ts`, `src/store/chats.ts`, `src/store/agentWorkspace.ts`, `src/components/markdown/Markdown.utils.ts`, and `src/utils/messageHelpers.ts`. All changes follow well-established patterns already present in the codebase (`workflowExecutions.ts` and `dataSources.ts` are the reference implementations). No new abstractions are needed. The `api.ts` utilities (`parseContentDispositionFilename`, `sanitizeFileName`, `downloadFileStream`) are already correct and tested; the fix is entirely about which callers pass a derived name and how the markdown link renderer intercepts file links.

Test coverage for this domain is split: the `api.ts` core is well-tested, but `chats.ts` export methods have zero store-level test coverage, and the markdown rendering path has no integration tests for download behavior. New unit tests for the store methods and a snapshot or interaction test for the markdown renderer fix should accompany the changes. The markdown renderer change carries the highest regression risk because both `Markdown.utils.ts` and the duplicate `messageHelpers.ts` must be updated consistently, and the renderer is used across all assistant and chat history views.
