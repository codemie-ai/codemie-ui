# EPMCDME-12708 — Tolerate a `?share_token=…` suffix on backend file references

## Problem

The backend is closing an IDOR on `GET /v1/files/{file_name}` by requiring authentication and
per-request authorization. To keep attachments visible on a shared conversation page without that
authentication, the backend rewrites the response of `GET /v1/share/conversations/{token}`,
appending `?share_token=<token>` to every entry in a message's `file_names` and to every
`sandbox:/v1/files/<token>` URL inside message text. The stored conversation itself is not
modified — only the copy returned to a share recipient carries the suffix.

Today this breaks two decode paths in the frontend:

- `createFileMetadata` (`src/hooks/useFileUpload.tsx`) passes the raw reference into the
  object-returning `decodeFileName` (`src/utils/utils.ts`), which starts with `atob(fileName)`.
  `?` is not in the base64 alphabet, so `atob` throws, the catch block falls back to
  `{ mimeType: '', user: '', originalFileName: fileInput }`, and the attachment chip shows the
  raw token instead of a filename with no preview (empty `mimeType`).
- `downloadFile` (`src/store/files.ts`) decodes the same way via the array-returning
  `decodeFileName` (`src/utils/helpers.ts`), loses the filename, and its `UUID_PATTERN` test
  (anchored with `$`) also stops matching once a query string is appended.

Inline markdown images (`src/utils/messageHelpers.ts:38`,
`src/components/markdown/Markdown.utils.ts:113`) only do prefix replacement and never decode, so
they already tolerate the suffix untouched — they are out of scope.

## Goal

Decode only the part of a file reference before `?`, while keeping the full original string
(including the query) everywhere a request URL is built, since the backend needs the query to
authorize the download.

## Design

### New helper — `src/utils/utils.ts`

Add, next to `decodeFileName`:

```ts
export const stripFileTokenQuery = (fileName: string): string => fileName.split('?')[0]
```

- No `?` present → returns the input unchanged (backward-compatible no-op).
- Empty string input → returns `''`.
- Multiple `?` in the input → only the first is treated as the separator; everything from the
  first `?` onward is dropped from the decode-facing value (this can only happen for malformed
  input the backend never produces, but the behavior falls out naturally from `split('?')[0]`).

### `src/hooks/useFileUpload.tsx` — `createFileMetadata`

Change the decode call (current line 74) from:

```ts
fileData = decodeFileName(fileInput)
```

to:

```ts
fileData = decodeFileName(stripFileTokenQuery(fileInput))
```

`fileId: fileInput` (line 80) is left exactly as-is — `getFileURL` and `downloadFile` still need
the full string including the query so the backend can authorize the download.

### `src/store/files.ts` — `downloadFile`

Import `stripFileTokenQuery` from `@/utils/utils` (the file already imports `hash` from the same
module). Inside `downloadFile`, strip once and use the stripped value only for the routing
decisions, never for the request path:

```ts
async downloadFile(fileUrl) {
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const strippedFileUrl = stripFileTokenQuery(fileUrl)

  if (UUID_PATTERN.test(strippedFileUrl)) {
    await api.downloadFileStream(`v1/files/${fileUrl}`)
    return
  }

  const [_mimeType, _user, originalFileName] = decodeFileName(strippedFileUrl)

  if (originalFileName) {
    const response = await api.get(`v1/files/${fileUrl}`)
    // ...unchanged...
  } else {
    await api.downloadFileStream(`v1/files/${fileUrl}`)
  }
}
```

Every `v1/files/${fileUrl}` request path keeps using the original, unstripped `fileUrl`.

### Out of scope — explicitly unchanged

- `getFileURL` (`src/store/files.ts`) — raw concatenation is intentional; it must keep forwarding
  the query string to the server.
- `src/utils/messageHelpers.ts:38`, `src/components/markdown/Markdown.utils.ts:113` — inline
  markdown image handling; prefix-replace only, never decodes, already tolerant.
- `src/components/Editor/quillModules.ts:174`, the assistant `getFileNameFromUrl.ts` — editor and
  assistant-setup paths that operate on stored (non-share) values and never receive a share token.

## Backward compatibility

`stripFileTokenQuery` on a value with no `?` returns that value unchanged, so every existing
decode path behaves identically to today. This lets the frontend change ship ahead of the backend
change, independently, with no coordinated release. A dedicated test pins this behavior.

## Testing

Extend existing suites; no new test files.

- **`src/utils/__tests__/utils.test.ts`** (or wherever `decodeFileName`/helper tests for this file
  already live) — new `describe('stripFileTokenQuery')`:
  - strips everything from the first `?` onward
  - no-op when there is no `?` (backward-compatibility pin)
  - empty string input returns empty string

- **`src/hooks/__tests__/useFileUpload.test.tsx`** — the module-level
  `vi.mock('@/utils/utils')` factory only exports `decodeFileName` today; it must gain a
  `stripFileTokenQuery` export (real stripping logic, e.g. `(s: string) => s.split('?')[0]`) so
  `createFileMetadata` doesn't call `undefined()` once it starts using the real helper. New cases
  in the existing `describe('createFileMetadata')` block:
  - a base64-shaped token with a `?share_token=abc` suffix: `decodeFileName` is called with the
    stripped (query-free) value, and the returned `fileId` still holds the full original string
    including the query.
  - the same input with no query suffix, asserting identical `fileName`/`mimeType`/`fileId`
    behavior to today — the backward-compatibility pin for this call site.

- **`src/store/__tests__/files.test.ts`** — extend both existing `downloadFile` tests with a
  `?share_token=…` variant on the same fixtures:
  - UUID + `?share_token=…` still routes to `downloadFileStream`, called with the full URL
    including the query.
  - base64-encoded name + `?share_token=…` still routes to `api.get`, called with the full URL
    including the query.

## Risks

- The two `decodeFileName` implementations (object-returning in `utils.ts`, array-returning in
  `helpers.ts`) are separate and both need protection at their respective call sites; this design
  covers both call sites (`createFileMetadata` and `downloadFile`) explicitly.
- `UUID_PATTERN` in `downloadFile` must be tested against the *stripped* value, not the raw
  `fileUrl` — otherwise a UUID carrying a share token falls through to the wrong branch.
