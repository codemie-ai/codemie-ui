# Technical Research

**Task**: file-upload share-token attachments decodeFileName
**Generated**: 2026-08-25T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-12708 — tolerate a ?share_token=… suffix on backend file references

Background. The CodeMie backend is closing an IDOR on GET /v1/files/{file_name}: the endpoint now requires authentication and authorizes each download. To keep attachments visible on a shared conversation page, the backend rewrites file references in the response of GET /v1/share/conversations/{token}, appending ?share_token=<token> to every entry in a message's file_names and to every sandbox:/v1/files/<token> URL inside message text. The stored conversation is not modified — only the copy returned to a share recipient.

What breaks today. createFileMetadata in src/hooks/useFileUpload.tsx (~line 74) passes the raw reference into decodeFileName from src/utils/utils.ts (~line 255), which starts with atob(fileName). ? is not in the base64 alphabet, so atob throws InvalidCharacterError, the catch on the next line falls back to { mimeType: '', user: '', originalFileName: fileInput }, and the result on a shared page is: the attachment chip shows the whole token plus the query string instead of a filename, and mimeType is empty so File.tsx treats the file as non-image and never renders a preview. src/store/files.ts downloadFile (~line 96) decodes the same way (via the array-returning decodeFileName in src/utils/helpers.ts), loses the filename, and falls through to downloadFileStream; its UUID_PATTERN test just above also stops matching once a query is present.

Inline markdown images are already fine: src/utils/messageHelpers.ts:38 and src/components/markdown/Markdown.utils.ts:113 only replace the sandbox:/v1/files/ prefix and never decode, so an appended query string survives untouched. Do not change those two.

Required change. Decode only the part before ?, while keeping the full string — query included — everywhere a request URL is built.

Add a small exported helper (suggested name stripFileTokenQuery, in src/utils/utils.ts next to decodeFileName) that returns the substring before the first ?. It must be a no-op for values with no ?.
src/hooks/useFileUpload.tsx — in createFileMetadata, decode stripFileTokenQuery(fileInput). Leave fileId: fileInput exactly as it is: getFileURL and downloadFile must still receive the query so the backend authorizes the download.
src/store/files.ts — in downloadFile, apply the same strip before the UUID_PATTERN test and before decodeFileName, but keep using the original unstripped value when building the request path (v1/files/${fileUrl}).

Do not change getFileURL — raw concatenation is what makes the query reach the server, and that is intended.

Leave the other decodeFileName call sites alone: src/components/Editor/quillModules.ts (~line 174) and src/pages/assistants/.../utils/getFileNameFromUrl.ts are editor and assistant-setup paths that never receive share tokens.

Backward compatibility is a requirement, not a nice-to-have. Stripping a query from a reference that has none must behave exactly as today, so this change can ship on its own, before the backend change, with no coordinated release. Add a test that pins this.

Tests. Extend the existing suites rather than creating new files:
- src/utils/__tests__/helpers.test.ts (or the matching utils.ts suite) — the helper strips a query, is a no-op without one, and handles an empty string.
- src/hooks/__tests__/useFileUpload.test.tsx — createFileMetadata given a valid base64 token with ?share_token=abc suffix returns the decoded fileName and mimeType, and fileId still holds the full string including the query. Add the no-query case as the backward-compatibility pin.
- Cover downloadFile with a token carrying a query if the existing store suite makes that reasonable; skip it rather than building heavy new scaffolding.

---

## 2. Codebase Findings

### Existing Implementations

**`src/utils/utils.ts` — object-returning `decodeFileName` (line 255)**
- Signature: `export const decodeFileName = (fileName: string) => { ... }`
- Returns: `{ mimeType: string, user: string, originalFileName: string }`
- First operation: `const bytesData = atob(fileName)` — no try/catch, propagates `InvalidCharacterError` on invalid input
- Encoding constants at lines 251–253: `FILENAME_SEPARATOR_REGEXP = /^\d+~/`, `FILENAME_SEPARATOR_LEGACY = '_'`, `FILENAME_CHAR_COUNT_REGEXP = /^\d+/`
- `stripFileTokenQuery` does not yet exist — this is a greenfield addition in this file

**`src/utils/helpers.ts` — array-returning `decodeFileName` (line 212)**
- Signature: `export const decodeFileName = (fileName: string): string[]`
- Returns: `[mimeType, user, originalFileName]` positional array
- Wrapped in try/catch at lines 215–220; returns `[]` on `atob` failure — tolerant but produces the wrong result (empty, not decoded) when the query suffix is present
- Imports the same encoding constants (lines 202–204)
- Used exclusively by `src/store/files.ts`

**`src/hooks/useFileUpload.tsx` — `createFileMetadata` (line 58)**
- Signature: `export const createFileMetadata = (fileInput: File | string): FileMetadata`
- For string inputs (lines 72–78): calls object-variant `decodeFileName` from `@/utils/utils`, wrapped in try/catch
- On throw: falls back to `{ mimeType: '', user: '', originalFileName: fileInput }` — raw string becomes both the display name and a blank MIME type
- `fileId: fileInput` is always set to the unmodified input regardless of success/failure path
- Comment at lines 68–71 documents that Claude Desktop imports use plain (non-base64) filenames, making the throw-and-fallback path intentional for that caller

**`src/store/files.ts` — `downloadFile` (line 87)**
- `UUID_PATTERN` at line 88: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` — anchored with `^` and `$`, fails for any `uuid?share_token=…` input
- Three dispatch branches:
  1. UUID match → `api.downloadFileStream('v1/files/${fileUrl}')`, filename from `Content-Disposition`
  2. `decodeFileName` success → `api.get('v1/files/${fileUrl}')` + anchor-click download using decoded name
  3. Fallback → `api.downloadFileStream('v1/files/${fileUrl}')`
- `decodeFileName` imported from `@/utils/helpers` (array variant), destructured as `const [_mimeType, _user, originalFileName]`
- `getFileURL` at line 134: `${api.BASE_URL}/v1/files/${fileName}` — raw concatenation, correctly passes query strings through to the server

**`src/components/File.tsx` — chip rendering**
- `isImage` at line 57: `file.mimeType?.startsWith('image')` — when `mimeType` is `''` (the fallback), this is `false`
- Effects of `mimeType: ''`: preview toggle button not rendered, `canTogglePreview = false`, inline image `<img>` block never shown
- Download button at line 76 calls `downloadFile(file.fileId)` — uses raw `fileId`, which must still carry `?share_token=…` at the point of the HTTP call

**Data flow: backend → chip**
1. `GET v1/share/conversations/{token}` returns `{ conversation: ChatBackend }`
2. `HistoryItemBackend.fileNames?: string[]` (type at `src/types/entity/conversation.ts:268`) carries raw, possibly-rewritten IDs
3. `transformChatBEtoFE` → `groupAndTransformHistory` → `transformHistoryGroup` (chatHelpers.ts:127) — values copied verbatim, no transformation
4. `ChatUserMessage.tsx:63` — `fileNames.map((f) => createFileMetadata(f))`
5. `File.tsx` chip rendered with `fileId` = raw backend string, `fileName` = decoded original name (or fallback to raw string)

### Architecture and Layers Affected

- **Utility layer** (`src/utils/utils.ts`, `src/utils/helpers.ts`): New `stripFileTokenQuery` helper added to `utils.ts`; internal call to `atob` in both `decodeFileName` variants protected by stripping before decode
- **Hook layer** (`src/hooks/useFileUpload.tsx`): `createFileMetadata` calls `stripFileTokenQuery` before passing to `decodeFileName`; `fileId` assignment left untouched
- **Store/data-access layer** (`src/store/files.ts`): `downloadFile` strips query before UUID test and before `decodeFileName`; all three branches continue to build URLs with the original `fileUrl` (including query) so the backend receives `?share_token=…`

### Integration Points

- `src/pages/chat/components/ChatHistory/ChatUserMessage/ChatUserMessage.tsx:63` — maps `fileNames` through `createFileMetadata`; no change needed here
- `src/pages/chat/SharedChatPage.tsx` — loads shared conversation, sets `isSharedPage: true` context; no change needed
- `src/store/chats.ts:265` — `getSharedChat` fetches via `v1/share/conversations/${token}`; no change needed
- `src/utils/api.ts:241` — `downloadFileStream` and `api.get` receive full URL including query string; no change needed
- `src/utils/messageHelpers.ts:38` and `src/components/markdown/Markdown.utils.ts:113` — prefix-replace only, no decoding; must not be changed
- `src/components/Editor/quillModules.ts:174` — calls object-variant `decodeFileName`; operates on stored history values that never receive share tokens; no change needed
- `src/pages/assistants/.../getFileNameFromUrl.ts:22` — calls object-variant `decodeFileName` for assistant logo URLs; never receives share tokens; no change needed

### Patterns and Conventions

- Pure utility functions in `src/utils/` as named exports; no barrel re-export of `decodeFileName` from an index
- New helper `stripFileTokenQuery` should be exported from `src/utils/utils.ts` next to `decodeFileName` (same file, as specified in the ticket)
- The "strip at the entry point, preserve original for HTTP" pattern follows existing practice: `createFileMetadata` already stores `fileId: fileInput` unmodified; `downloadFile` already builds `v1/files/${fileUrl}` with the unmodified value
- `decodeFileName` in `helpers.ts` already has a try/catch that returns `[]` on failure — the fix there makes it decode correctly rather than silently degrade

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/kyrylo_korotych/codemie-ui/.ai-run/guides/testing/testing-patterns.md` — covers Vitest unit vs integration split, `vi.mock` placement rules, `afterEach(cleanup)` requirement
- `/Users/kyrylo_korotych/codemie-ui/.ai-run/guides/development/api-integration.md` — documents `api.*` HTTP layer conventions; `downloadFileStream` and `api.get` patterns
- `/Users/kyrylo_korotych/codemie-ui/.ai-run/guides/architecture/architecture.md` — utilities in `src/utils/` are pure transforms; stores in `src/store/` are Valtio proxies calling `api.*`
- `/Users/kyrylo_korotych/codemie-ui/.ai-run/guides/patterns/state-management.md` — Valtio store structure: `loading`, `error`, try/finally pattern

### Architectural Decisions

- **Two `decodeFileName` implementations are intentional** — `helpers.ts` returns a positional array used by the store; `utils.ts` returns a named object used by hooks, editor, and assistant utilities. Both exist without a consolidation plan (no recorded ADR).
- **`fileId` must always be the raw unmodified backend string** — documented by the inline comment in `useFileUpload.tsx` (lines 68–71) explaining that plain-filename fallback is intentional for non-base64 sources such as Claude Desktop imports.
- **`getFileURL` must not decode or sanitize its argument** — raw concatenation is intentional so query strings reach the server.

### Derived Conventions

- No `TODO`/`HACK`/`FIXME`/`NOTE` markers exist in any of the four files under modification
- `btoa()` used directly in tests to produce base64 fixture values — same pattern should be used for new tests
- Mocks are declared at module top level with `vi.mock()`, never inside `describe`/`it` blocks
- `vi.mock('@/utils/utils')` is already present in `useFileUpload.test.tsx` — new tests for the `share_token` case that need a real (unregistered) `decodeFileName` must use `vi.unmock` or be placed in a separate `describe` block with `vi.importActual`

---

## 4. Testing Landscape

### Existing Coverage

**`src/utils/__tests__/utils.test.ts`**
- Contains only `sanitizeHtmlId` tests
- Zero tests for `decodeFileName` from `utils.ts`

**`src/utils/__tests__/helpers.test.ts`**
- Tests the array-returning `decodeFileName` from `helpers.ts`:
  - Invalid base64 → returns `[]`
  - Empty string → returns `[]`
  - Legacy `_`-separated format → correct array
  - Length-prefixed `N~` format → correct array
  - Single part with no separators → correct array
- No test for input with `?share_token=…` suffix
- No test for `stripFileTokenQuery` (does not yet exist)

**`src/hooks/__tests__/useFileUpload.test.tsx`**
- `describe('createFileMetadata')` block (lines 535–552):
  - `'falls back to the raw name when decodeFileName throws instead of crashing'` — mocks `decodeFileName` to throw, asserts `meta.fileName` and `meta.fileId` equal raw input
- `decodeFileName` is mocked via `vi.mock('@/utils/utils')` for the entire file — tests do not exercise the real function
- No happy-path test for a successfully decoded base64 input
- No test for the `?share_token=…` case

**`src/store/__tests__/files.test.ts`**
- `'calls downloadFileStream when fileId is a UUID'` — asserts `api.downloadFileStream` called correctly
- `'uses the anchor approach when fileId is base64-encoded with a decodable name'` — `btoa('application/xlsx_user_report.xlsx')` → asserts `api.get` called with correct path
- No test for UUID with `?share_token=…` suffix (UUID_PATTERN would fail)
- No test for base64-encoded name with `?share_token=…` suffix

### Testing Framework and Patterns

- **Framework:** Vitest 1.6.1 + React Testing Library
- **Two projects:** `unit` (jsdom, auto-mocked `@/utils/api` and Valtio `useSnapshot`) and `integration` (real Valtio + stubbed `fetch`)
- All four test files above are in the `unit` project
- Mock pattern: `vi.mock('@/utils/api', ...)` and `vi.mock('@/store/files', ...)` at module top level; `vi.mocked(fn).mockReturnValue(...)` per-test
- Spies: `vi.spyOn(api, 'downloadFileStream')` pattern in `files.test.ts`
- `beforeEach(() => vi.clearAllMocks())` standard per describe block
- `afterEach(cleanup)` required after RTL renders

### Coverage Gaps

1. **`src/utils/__tests__/utils.test.ts`** — needs a new `describe('decodeFileName')` block covering: valid base64 with legacy separator, valid base64 with length-prefix format, invalid base64 throws, and the `?share_token=…` case (after fix, must decode correctly using the stripped value)
2. **`src/utils/__tests__/utils.test.ts`** (or `helpers.test.ts`) — needs `describe('stripFileTokenQuery')`: strips a query, is a no-op without one, handles empty string
3. **`src/hooks/__tests__/useFileUpload.test.tsx`** — the `vi.mock('@/utils/utils')` global mock covers the whole file; new `?share_token=…` tests need to either use `vi.importActual` or restructure to test through the mock. Needs: `fileId` holds the full string including `?share_token=…`, `fileName` and `mimeType` are decoded from the base64 part only, and backward-compat case (no query string behaves identically to today)
4. **`src/store/__tests__/files.test.ts`** — needs: UUID with `?share_token=…` suffix routes to `downloadFileStream` using the full URL, base64-encoded name with `?share_token=…` routes to `api.get` using the full URL with decoded display name

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — sets `api.BASE_URL`; defaults to `'/api'` in `.env`. Resolved at runtime from `window._env_?.VITE_API_URL || import.meta.env.VITE_API_URL`. Used in `getFileURL` and `downloadFileStream` URL construction.
- No file-download-specific or share-specific environment variables exist.

### Configuration Files

- `/Users/kyrylo_korotych/codemie-ui/.env` — `VITE_API_URL=/api` (local default)
- `/Users/kyrylo_korotych/codemie-ui/vitest.workspace.ts` — defines `unit` and `integration` projects; test files for this task are all `unit`

### Feature Flags and Deployment Concerns

- No feature flags control file downloads or shared conversations
- `isSharedPage: true` (ChatContext) suppresses editing controls but does not alter file download or chip rendering logic — the fix applies equally to normal and shared pages
- Backward compatibility requirement is explicit: `stripFileTokenQuery` on a string with no `?` must be a no-op, allowing the change to ship independently of the backend deployment

---

## 6. Risk Indicators

- **`decodeFileName` is duplicated across two files with different return types** — `src/utils/utils.ts` (object) and `src/utils/helpers.ts` (array). The fix must be applied to the correct variant for each call site; applying it only to one would leave `downloadFile` or `createFileMetadata` unprotected. The ticket calls for `stripFileTokenQuery` to be placed in `utils.ts`; the call in `helpers.ts` `decodeFileName` also needs protection.
- **`vi.mock('@/utils/utils')` covers the entire `useFileUpload.test.tsx` file** — any new test that needs to exercise the real `decodeFileName` (to verify `stripFileTokenQuery` is called) must work within or around this module-level mock. Using `vi.mocked(decodeFileName).mockImplementation(...)` with the real implementation via `vi.importActual` is the clean pattern; failing to do so would mean the test never exercises the actual code path.
- **`UUID_PATTERN` uses `$` anchor** — `uuid?share_token=…` always fails the UUID test and falls to `decodeFileName`. If `stripFileTokenQuery` is applied before the UUID test in `downloadFile`, the UUID branch is correctly restored. If applied only inside `decodeFileName` but not before the UUID test, UUID-based share files would take the wrong (legacy-decode) path.
- **`fileId: fileInput` must remain unstripped** — `getFileURL` and the URL-building steps in `downloadFile` depend on the raw string (including `?share_token=…`) reaching the HTTP layer. Any accidental stripping of the query from `fileId` would break share-authorized downloads. This is a correctness constraint, not just a style preference.
- **`src/utils/__tests__/utils.test.ts` has zero coverage for `decodeFileName`** — the object-returning variant has no direct unit tests at all, only indirect coverage through mocks. This means regressions in `decodeFileName` would not be caught by the existing suite.
- **`useFileUpload.test.tsx` global mock** — the mock of `@/utils/utils` means `createFileMetadata` tests do not exercise the real `decodeFileName`. New tests for the share_token case must be structured carefully to test actual behavior.
- **The ticket instructs not to touch `quillModules.ts` or `getFileNameFromUrl.ts`** — both are covered by fixing the underlying `utils.ts` `decodeFileName`, so no change is needed at those sites. However, if `stripFileTokenQuery` is added inside `decodeFileName` rather than at the call sites, these paths also get the fix automatically. The ticket places `stripFileTokenQuery` at the call sites (in `createFileMetadata` and `downloadFile`), not inside `decodeFileName` itself — so these two call sites remain unguarded. That is fine because they never receive share tokens (editor and assistant-setup paths), but it is a subtle distinction to preserve during implementation.
- **No tests exist for `SharedChatPage` itself** — the integration path (shared page → file chip → download) has no end-to-end test coverage. This is pre-existing debt and is out of scope for this ticket.

---

## 7. Summary for Complexity Assessment

This ticket touches three architectural layers — Utility, Hook, and Store/data-access — across four production files (`src/utils/utils.ts`, `src/utils/helpers.ts`, `src/hooks/useFileUpload.tsx`, `src/store/files.ts`) and three test files (`src/utils/__tests__/utils.test.ts`, `src/hooks/__tests__/useFileUpload.test.tsx`, `src/store/__tests__/files.test.ts`). The production change surface is narrow: one new exported helper (`stripFileTokenQuery`, ~3 lines) plus two call-site additions (one in `createFileMetadata`, one in `downloadFile`). The change is purely additive at the utility level and surgical at the call sites. No component, route, or store interface changes are required. File change count: 7 files total (4 production, 3 test).

The task follows a well-established pattern — "strip a decoration from an ID before decoding, keep it for HTTP requests" — and does not introduce any novel architecture. The existing try/catch in `createFileMetadata` and the existing fallback chain in `downloadFile` already handle failure modes; the fix short-circuits the failure before it occurs. The backward-compatibility constraint (no-op on inputs with no `?`) is trivially satisfiable with a `indexOf('?')` or `.split('?')[0]` idiom. The primary implementation risk is the `fileId` contract: the raw string including `?share_token=…` must reach `getFileURL` and the URL-building lines in `downloadFile`, which requires stripping only for decode operations, never for URL-construction. This distinction is explicit in the ticket and is visible in all three code paths.

Test coverage posture is mixed. The store's `downloadFile` and the helpers `decodeFileName` have moderate coverage for happy and sad paths, but no share-token cases exist anywhere. The `decodeFileName` in `utils.ts` (the object-returning variant, the one used by `createFileMetadata`) has zero direct test coverage — only indirect coverage through module-level mocks in `useFileUpload.test.tsx`. The new tests must work around the global `vi.mock('@/utils/utils')` in that file, which is the highest-friction testing challenge in this ticket. The recommended approach is to add a `describe('stripFileTokenQuery')` block to `utils.test.ts` that tests the helper directly with real (unmocked) imports, and then in `useFileUpload.test.tsx` either use `vi.importActual` for a targeted describe block or verify `createFileMetadata` behavior indirectly by having the mock call through to the real implementation for the new test cases.
