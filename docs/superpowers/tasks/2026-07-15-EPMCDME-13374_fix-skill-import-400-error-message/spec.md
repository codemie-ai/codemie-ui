# Spec: Fix skill import ZIP bundle HTTP 400 error display

**Ticket**: EPMCDME-13374  
**Date**: 2026-07-15

---

## Problem

When a user uploads a ZIP bundle that fails backend validation, the backend returns HTTP 400:

```json
{ "message": "Invalid skill bundle",
  "details": "Skill bundle zip must contain exactly one SKILL.md file",
  "help": "Add a single SKILL.md file with YAML frontmatter to the root of the bundle" }
```

The UI shows **"HTTP error 400"** — twice. Users have no idea what is wrong or how to fix it.

---

## Root cause

`makeRequest` already handles errors correctly: `parseErrorBody` reads the body, `handleError` formats and toasts it, and `parsedError` is attached to the rejected value. `postMultipart` / `putMultipart` skip all of this — they reject with `new HttpError(response)` whose `.message` is just `"HTTP error ${status}"`. The body is never read.

`importSkillBundlePreview` tries `error?.parsedError?.message` (never set for multipart errors), falls back to `"HTTP error 400"`, and toasts it. Then `CreateSkillPopup.handleImportFile` catches the rethrown error and toasts again.

Rendering `message` alone would not be enough anyway — all the actionable content for this error is in `details` and `help`.

---

## Solution

Converge the multipart path with the JSON path by populating `parsedError` on `HttpError`. Extract a pure `formatErrorMessage` function so callers can format without toasting. Let the component own the toast; the store throws a pre-formatted error.

### Change 1 — `src/utils/handleMultipartError.ts`

Add a `parsedError` field to `HttpError` so callers can read the parsed triple without re-parsing:

```ts
export class HttpError extends Error {
  parsedError?: ErrorBody['error']   // ← add
  constructor(public readonly response: Response) {
    super(`HTTP error ${response.status}`)
    this.name = 'HttpError'
  }
}
```

(`ErrorBody` is imported from `src/utils/api.ts`.)

### Change 2 — `src/utils/api.ts`

**Extract `formatErrorMessage`** from `handleError`. The existing logic handles four non-obvious cases (object `details` → `JSON.stringify`, strip pre-existing `<br>` from details, gate `help` behind `includeHelp`, malformed `body.error` fallback). Do not reimplement at call sites — two copies will drift.

The try/catch moves inside the extracted function and returns the fallback string rather than rethrowing, preserving the existing behaviour of both `makeRequest` and `downloadFileStream` callers.

```ts
export function formatErrorMessage(body: ErrorBody, includeHelp = true): string {
  try {
    const { message, details, help } = body.error
    let strDetails = typeof details === 'object' ? JSON.stringify(details) : (details ?? '')
    let formatted = message
    if (strDetails) {
      formatted += `<br> ${strDetails.replaceAll('<br>', '').trim()}`  // @ts-expect-error replaceAll
    }
    if (includeHelp && help) formatted += `<br><i>${help}</i>`
    return formatted
  } catch (error) {
    console.error('Error handling issue:', error)
    return DEFAULT_ERROR_MESSAGE
  }
}

handleError(body: ErrorBody, includeHelp = true): void {
  toaster.error(formatErrorMessage(body, includeHelp))
}
```

**Populate `parsedError` in `postMultipart` and `putMultipart`** — both share the same structure; apply identically to each:

```ts
.then(async (response) => {          // was: .then((response) => {
  if (!response.ok) {
    const errorData = await this.parseErrorBody(response)
    const err = new HttpError(response)
    err.parsedError = errorData.error
    reject(err)
  } else {
    resolve(response)
  }
})
```

Do **not** call `this.handleError()` here — it would double-toast every existing multipart caller that already toasts in its own catch.

### Change 3 — `src/store/skills.ts`

`importSkillBundlePreview` stops toasting. It throws a pre-formatted `Error` whose `.message` is the full `message + details + help` string. The component's existing catch (`toaster.error(error.message)`) fires once and renders it correctly — the toaster already runs `escapeMarkup: false` + DOMPurify.

```ts
import { formatErrorMessage } from '@/utils/api'
import { HttpError } from '@/utils/handleMultipartError'

// inside importSkillBundlePreview:
catch (error: any) {
  const body: ErrorBody = error instanceof HttpError && error.parsedError
    ? { error: error.parsedError }
    : { error: { message: error?.message ?? 'Failed to import bundle' } }
  throw new Error(formatErrorMessage(body))
}
```

### Change 4 — `src/components/CreateSkillPopup.tsx`

No logic changes. The existing catch already does `toaster.error(error.message)` — now `error.message` carries the formatted triple for bundle errors. The `.md` parse path is unaffected.

Remove the `toaster` import only if it becomes unused after this change (it is also used for the file-type guard on line 159 — check before removing).

### Change 5 — `src/utils/__tests__/api.test.ts`

Unit-test `formatErrorMessage`. The function is now pure and testable without asserting on toast side effects.

Required cases:
- string `details` appended after `<br>`
- object `details` → `JSON.stringify`
- `details` containing `<br>` → stripped
- `includeHelp: false` → `help` omitted
- malformed body with no `error` key → returns `DEFAULT_ERROR_MESSAGE`, does not throw

---

## Behaviour after fix

| Scenario | Before | After |
|---|---|---|
| ZIP rejected by backend (400) | "HTTP error 400" ×2 | "Invalid skill bundle\<br\> …zip must contain…\<br\>\<i\>Add a single SKILL.md…\</i\>" ×1 |
| Non-JSON error (HTML 502 proxy) | "HTTP error 502" ×2 | `DEFAULT_ERROR_MESSAGE` ×1 (via `parseErrorBody` fallback) |
| `.md` parse error (client-side) | message ×1 | message ×1 — unchanged |
| ZIP success | nothing | nothing — unchanged |
| Other multipart callers | unchanged | unchanged — `parsedError` added but callers that read `error.message` still get the same string; `handleError` not called inside transport |

---

## Blast radius

`postMultipart`/`putMultipart` are the only methods that construct `HttpError`. With `handleError` not called inside them, only callers that explicitly read `parsedError` change behaviour — currently only `importSkillBundlePreview`.

`handleMultipartError` (`dataSources.ts`) reads `data.detail` — unaffected, leave it alone.

`formatErrorMessage` extraction: `handleError` is reduced to a one-line wrapper. Both existing callers (`makeRequest:359`, `downloadFileStream`) call `handleError` and continue to work identically — the try/catch semantics are preserved by moving the fallback inside the extracted function.

---

## Out of scope

- `putMultipart` callers — `parsedError` is populated but no caller reads it yet; separate task.
- `handleMultipartError` — leave `data.detail` logic unchanged; the `dataSources` silent-swallow bug is a separate ticket.
- Backend acceptance of alternate ZIP layouts — see the BE ticket.
