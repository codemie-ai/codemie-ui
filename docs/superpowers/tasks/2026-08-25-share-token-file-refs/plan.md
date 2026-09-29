# EPMCDME-12708 — Tolerate a `?share_token=…` suffix on file references — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decode only the part of a backend file reference before its first `?`, while always sending the full original string (including any `?share_token=…` query) to the backend, so shared-conversation attachments render correctly once the backend starts appending share tokens.

**Architecture:** One new pure helper (`stripFileTokenQuery`) added to `src/utils/utils.ts`, applied at exactly two call sites that decode a file reference for display purposes (`createFileMetadata` in `src/hooks/useFileUpload.tsx`, `downloadFile` in `src/store/files.ts`). Every place that builds an HTTP request path keeps using the raw, unstripped string.

**Tech Stack:** TypeScript, Vitest + React Testing Library (`unit` project), Valtio.

## Global Constraints

- `fileId` in `createFileMetadata` and every `v1/files/${...}` request path in `downloadFile` must always carry the full original string, including any `?share_token=…` suffix — never the stripped value.
- `stripFileTokenQuery` must be a no-op (return the input unchanged) when the input has no `?` — this is the backward-compatibility contract that lets this change ship ahead of the backend change.
- Do not modify `getFileURL` (`src/store/files.ts`), `src/utils/messageHelpers.ts`, `src/components/markdown/Markdown.utils.ts`, `src/components/Editor/quillModules.ts`, or the assistant `getFileNameFromUrl.ts`.
- Do not create new test files — extend `src/utils/__tests__/utils.test.ts`, `src/hooks/__tests__/useFileUpload.test.tsx`, and `src/store/__tests__/files.test.ts`.

---

### Task 1: Add `stripFileTokenQuery` helper to `src/utils/utils.ts`

**Files:**
- Modify: `src/utils/utils.ts:251-253` (insert the new export just above `decodeFileName`)
- Test: `src/utils/__tests__/utils.test.ts`

**Interfaces:**
- Produces: `export const stripFileTokenQuery = (fileName: string): string => ...` — used by Task 2 (`src/hooks/useFileUpload.tsx`) and Task 3 (`src/store/files.ts`).

**Test-first: yes — `stripFileTokenQuery` strips everything from the first `?` onward; is a no-op when there's no `?`; returns `''` for `''`.**

- [ ] **Step 1: Write the failing tests**

Add this import and `describe` block to `src/utils/__tests__/utils.test.ts` (the file currently only imports and tests `sanitizeHtmlId`):

```ts
import { sanitizeHtmlId, stripFileTokenQuery } from '@/utils/utils'
```

```ts
describe('stripFileTokenQuery', () => {
  it('strips everything from the first ? onward', () => {
    expect(stripFileTokenQuery('YWJjZGVm?share_token=abc123')).toBe('YWJjZGVm')
  })

  it('returns the input unchanged when there is no query', () => {
    expect(stripFileTokenQuery('YWJjZGVm')).toBe('YWJjZGVm')
  })

  it('handles an empty string', () => {
    expect(stripFileTokenQuery('')).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/utils.test.ts --project unit`
Expected: FAIL — `stripFileTokenQuery` is not exported from `@/utils/utils` (TypeScript/import error, or `undefined is not a function`).

- [ ] **Step 3: Implement `stripFileTokenQuery`**

In `src/utils/utils.ts`, immediately above the existing `export const decodeFileName = (fileName: string) => {` (currently line 255), add:

```ts
export const stripFileTokenQuery = (fileName: string): string => fileName.split('?')[0]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/utils.test.ts --project unit`
Expected: PASS — all `stripFileTokenQuery` and existing `sanitizeHtmlId` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/utils.ts src/utils/__tests__/utils.test.ts
git commit -m "EPMCDME-12708: Add stripFileTokenQuery helper for share_token file references"
```

---

### Task 2: Apply `stripFileTokenQuery` in `createFileMetadata` (`src/hooks/useFileUpload.tsx`)

**Files:**
- Modify: `src/hooks/useFileUpload.tsx:16-21` (import), `src/hooks/useFileUpload.tsx:74` (decode call)
- Test: `src/hooks/__tests__/useFileUpload.test.tsx`

**Interfaces:**
- Consumes: `stripFileTokenQuery(fileName: string): string` from Task 1.
- Produces: no new exports — `createFileMetadata` behavior changes only for string inputs containing `?`.

**Test-first: yes — `createFileMetadata` given a base64 token with a `?share_token=abc` suffix decodes the token part and keeps the full string (with query) as `fileId`; the same input with no query behaves identically to today (backward-compatibility pin).**

- [ ] **Step 1: Write the failing tests**

The test file mocks `@/utils/utils` at module scope (`src/hooks/__tests__/useFileUpload.test.tsx:43-53`), and that mock factory only exports `decodeFileName`. Once `createFileMetadata` calls `stripFileTokenQuery`, the mocked module must also export it — otherwise the call becomes `undefined(...)` and every test in the file breaks. Update the mock factory (lines 43-53) to add the export:

```ts
vi.mock('@/utils/utils', () => ({
  decodeFileName: vi.fn((fileUrl: string) => {
    if (fileUrl === 'existing-url')
      return { mimeType: 'text/plain', user: 'test-user', originalFileName: 'existing-file.txt' }
    return {
      mimeType: 'text/plain',
      user: 'test-user',
      originalFileName: fileUrl.split('/').pop() ?? '',
    }
  }),
  stripFileTokenQuery: (fileUrl: string) => fileUrl.split('?')[0],
}))
```

Then add these two cases to the existing `describe('createFileMetadata', ...)` block (`src/hooks/__tests__/useFileUpload.test.tsx:535-552`), after the existing `'falls back to the raw name...'` test:

```ts
  it('decodes the token part and keeps the full string with query as fileId', () => {
    const meta = createFileMetadata('existing-url?share_token=abc123')

    expect(decodeFileName).toHaveBeenCalledWith('existing-url')
    expect(meta.fileName).toBe('existing-file.txt')
    expect(meta.mimeType).toBe('text/plain')
    expect(meta.fileId).toBe('existing-url?share_token=abc123')
  })

  it('behaves identically to today when there is no query (backward-compatibility pin)', () => {
    const meta = createFileMetadata('existing-url')

    expect(decodeFileName).toHaveBeenCalledWith('existing-url')
    expect(meta.fileName).toBe('existing-file.txt')
    expect(meta.mimeType).toBe('text/plain')
    expect(meta.fileId).toBe('existing-url')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useFileUpload.test.tsx --project unit -t createFileMetadata`
Expected: FAIL — `decodeFileName` is called with `'existing-url?share_token=abc123'` (the raw, unstripped input) instead of `'existing-url'`, so `toHaveBeenCalledWith('existing-url')` fails for the first new test. (The second test, with no query, already passes today — it's the pin, not the driver — but keep it in this step so both land together.)

- [ ] **Step 3: Implement the call-site change**

In `src/hooks/useFileUpload.tsx`, change the import (line 21) from:

```ts
import { decodeFileName } from '@/utils/utils'
```

to:

```ts
import { decodeFileName, stripFileTokenQuery } from '@/utils/utils'
```

Then change line 74 from:

```ts
    fileData = decodeFileName(fileInput)
```

to:

```ts
    fileData = decodeFileName(stripFileTokenQuery(fileInput))
```

Leave line 80 (`fileId: fileInput`) exactly as-is.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useFileUpload.test.tsx --project unit`
Expected: PASS — all tests in the file pass, including the new two and the pre-existing throw-fallback test.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFileUpload.tsx src/hooks/__tests__/useFileUpload.test.tsx
git commit -m "EPMCDME-12708: Strip share_token query before decoding file names in createFileMetadata"
```

---

### Task 3: Apply `stripFileTokenQuery` in `downloadFile` (`src/store/files.ts`)

**Files:**
- Modify: `src/store/files.ts:21` (import), `src/store/files.ts:87-111` (`downloadFile`)
- Test: `src/store/__tests__/files.test.ts`

**Interfaces:**
- Consumes: `stripFileTokenQuery(fileName: string): string` from Task 1.
- Produces: no new exports — `downloadFile` behavior changes only for inputs containing `?`.

**Test-first: yes — `downloadFile` with a UUID + `?share_token=…` suffix still routes to `downloadFileStream` with the full URL; a base64-encoded name + `?share_token=…` suffix still routes to `api.get` with the full URL.**

- [ ] **Step 1: Write the failing tests**

Add these two cases to `src/store/__tests__/files.test.ts`, inside the existing `describe('filesStore.downloadFile', ...)` block, after the two existing tests:

```ts
  it('calls downloadFileStream with the full URL when fileId is a UUID with a share_token query', async () => {
    const downloadSpy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)
    const fileUrl = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890?share_token=abc123'

    await filesStore.downloadFile(fileUrl)

    expect(downloadSpy).toHaveBeenCalledWith(`v1/files/${fileUrl}`)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('uses the anchor approach with the full URL when fileId is base64-encoded with a share_token query', async () => {
    const encoded = btoa('application/xlsx_user_report.xlsx')
    const fileUrl = `${encoded}?share_token=abc123`
    vi.mocked(api.get).mockResolvedValueOnce({
      blob: async () => new Blob(['data'], { type: 'application/xlsx' }),
    } as any)
    const downloadSpy = vi.spyOn(api, 'downloadFileStream')

    await filesStore.downloadFile(fileUrl)

    expect(api.get).toHaveBeenCalledWith(`v1/files/${fileUrl}`)
    expect(downloadSpy).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/store/__tests__/files.test.ts --project unit`
Expected: FAIL — the UUID test fails because `UUID_PATTERN.test(fileUrl)` is `false` for a UUID with a trailing query (the `$` anchor no longer matches), so it falls through past the UUID branch and `api.downloadFileStream` is not called as expected. The base64 test fails because `decodeFileName(fileUrl)` (array-returning, from `@/utils/helpers`) throws/returns `[]` for a query-suffixed value, so `originalFileName` is empty and the call falls to the `downloadFileStream` branch instead of `api.get`.

- [ ] **Step 3: Implement the call-site change**

In `src/store/files.ts`, change the import (line 21) from:

```ts
import { hash } from '@/utils/utils'
```

to:

```ts
import { hash, stripFileTokenQuery } from '@/utils/utils'
```

Then change `downloadFile` (lines 87-111) from:

```ts
  async downloadFile(fileUrl) {
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (UUID_PATTERN.test(fileUrl)) {
      // UUID fileId: name comes from Content-Disposition header
      await api.downloadFileStream(`v1/files/${fileUrl}`)
      return
    }

    const [_mimeType, _user, originalFileName] = decodeFileName(fileUrl)

    if (originalFileName) {
      // Legacy base64-encoded fileId: name decoded directly from the id
      const response = await api.get(`v1/files/${fileUrl}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = originalFileName
      a.click()
      window.URL.revokeObjectURL(url)
    } else {
      await api.downloadFileStream(`v1/files/${fileUrl}`)
    }
  },
```

to:

```ts
  async downloadFile(fileUrl) {
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const strippedFileUrl = stripFileTokenQuery(fileUrl)

    if (UUID_PATTERN.test(strippedFileUrl)) {
      // UUID fileId: name comes from Content-Disposition header
      await api.downloadFileStream(`v1/files/${fileUrl}`)
      return
    }

    const [_mimeType, _user, originalFileName] = decodeFileName(strippedFileUrl)

    if (originalFileName) {
      // Legacy base64-encoded fileId: name decoded directly from the id
      const response = await api.get(`v1/files/${fileUrl}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = originalFileName
      a.click()
      window.URL.revokeObjectURL(url)
    } else {
      await api.downloadFileStream(`v1/files/${fileUrl}`)
    }
  },
```

Every `v1/files/${fileUrl}` call keeps using the original `fileUrl` parameter, never `strippedFileUrl`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/store/__tests__/files.test.ts --project unit`
Expected: PASS — all four tests in the file pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/files.ts src/store/__tests__/files.test.ts
git commit -m "EPMCDME-12708: Strip share_token query before routing decisions in downloadFile"
```

---

### Task 4: Full verification pass

**Files:** none (verification only)

**Interfaces:** none

**Test-first: no — this task runs the full gate suite across all files touched by Tasks 1-3; there is no new failing test to write.**

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: exits 0, no type errors in `src/utils/utils.ts`, `src/hooks/useFileUpload.tsx`, or `src/store/files.ts`.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exits 0, no new lint errors.

- [ ] **Step 3: Run the full unit test suite**

Run: `npm run test:unit`
Expected: exits 0; `Test Files` line shows all suites passed, including the three modified suites (`utils.test.ts`, `useFileUpload.test.tsx`, `files.test.ts`).

- [ ] **Step 4: Confirm no unrelated files changed**

Run: `git status --porcelain`
Expected: only `src/utils/utils.ts`, `src/utils/__tests__/utils.test.ts`, `src/hooks/useFileUpload.tsx`, `src/hooks/__tests__/useFileUpload.test.tsx`, `src/store/files.ts`, `src/store/__tests__/files.test.ts` were modified across Tasks 1-3 (all already committed) — nothing else appears as dirty or untracked.
