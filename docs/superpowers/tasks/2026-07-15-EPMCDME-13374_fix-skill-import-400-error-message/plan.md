# EPMCDME-13374: Fix Skill Import ZIP Bundle Error Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic "HTTP error 400" double-toast on failed skill bundle import with the structured `message + details + help` from the backend response, shown exactly once.

**Architecture:** Add a `parsedError` field to `HttpError` and populate it via the existing `parseErrorBody` method inside `postMultipart`/`putMultipart` (mirroring what `makeRequest` already does). Extract a pure `formatErrorMessage` function from `handleError` so call sites can format without toasting. Update `importSkillBundlePreview` to throw a pre-formatted `Error`; the component's existing catch fires once with the full message.

**Tech Stack:** TypeScript, Vitest, Valtio store, fetch API.

## Global Constraints

- Commit format: `EPMCDME-13374: Capital sentence` — enforced by CI (no period, first word after colon uppercase).
- No `--no-verify` flag on commits; fix hook failures instead.
- All test assertions use exact strings — no `toBeTruthy()` or partial matches for error text.
- Do not touch `src/components/CreateSkillPopup.tsx` — its catch block works correctly after these changes.
- Do not modify `handleMultipartError` export beyond adding the `parsedError` field.
- `ErrorBody` must be exported from `api.ts` (it is currently internal); export it alongside `formatErrorMessage`.

---

## File Map

| File | Change |
|---|---|
| `src/utils/api.ts` | Export `ErrorBody`; add `formatErrorMessage`; reduce `handleError` to wrapper; make `postMultipart`/`putMultipart` async, call `parseErrorBody`, set `parsedError` |
| `src/utils/handleMultipartError.ts` | Add `parsedError?` field to `HttpError` (inline type, not imported — avoids circular dep) |
| `src/store/skills.ts` | Add imports; rewrite `importSkillBundlePreview` catch to use `formatErrorMessage` and throw |
| `src/utils/__tests__/api.test.ts` | Add `formatErrorMessage` describe block (5 tests) |

---

### Task 1: Extract `formatErrorMessage` and add unit tests

**Test-first: yes** — add failing tests, then extract the function.

**Files:**
- Modify: `src/utils/api.ts:408-435` (the `handleError` method)
- Modify: `src/utils/__tests__/api.test.ts` (add new describe block)

**Interfaces:**
- Produces: `export function formatErrorMessage(body: ErrorBody, includeHelp?: boolean): string` exported from `src/utils/api.ts`
- Produces: `export interface ErrorBody` exported from `src/utils/api.ts`

---

- [ ] **Step 1: Add failing tests for `formatErrorMessage`**

Append to `src/utils/__tests__/api.test.ts` after the existing `describe('handleError', ...)` block. Add `formatErrorMessage` to the existing import on line 20:

```ts
import api, { parseContentDispositionFilename, sanitizeFileName, formatErrorMessage } from '@/utils/api'
```

Then append:

```ts
describe('formatErrorMessage', () => {
  it('formats message with string details and help', () => {
    const result = formatErrorMessage({
      error: {
        message: 'Invalid skill bundle',
        details: 'Skill bundle zip must contain exactly one SKILL.md file',
        help: 'Add a single SKILL.md file with YAML frontmatter to the root of the bundle',
      },
    })
    expect(result).toBe(
      'Invalid skill bundle<br> Skill bundle zip must contain exactly one SKILL.md file<br><i>Add a single SKILL.md file with YAML frontmatter to the root of the bundle</i>'
    )
  })

  it('stringifies object details', () => {
    const result = formatErrorMessage({
      error: { message: 'Validation error', details: { field: 'name', issue: 'required' } },
    })
    expect(result).toBe('Validation error<br> {"field":"name","issue":"required"}')
  })

  it('strips existing <br> tags from details', () => {
    const result = formatErrorMessage({
      error: { message: 'Error', details: 'line one<br>line two' },
    })
    expect(result).toBe('Error<br> line oneline two')
  })

  it('omits help when includeHelp is false', () => {
    const result = formatErrorMessage(
      { error: { message: 'Error', details: 'some detail', help: 'help text' } },
      false
    )
    expect(result).toBe('Error<br> some detail')
  })

  it('returns DEFAULT_ERROR_MESSAGE for malformed body', () => {
    const result = formatErrorMessage({} as any)
    expect(result).toBe('Oops! Something went wrong')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/utils/__tests__/api.test.ts
```

Expected: 5 failures under `formatErrorMessage` — `formatErrorMessage is not a function` (named export does not exist yet). The existing `handleError` tests should still pass.

- [ ] **Step 3: Export `ErrorBody` interface from `api.ts`**

In `src/utils/api.ts`, change line 72 from:

```ts
interface ErrorBody {
```

to:

```ts
export interface ErrorBody {
```

- [ ] **Step 4: Extract `formatErrorMessage` and reduce `handleError` to a wrapper**

In `src/utils/api.ts`, insert the following function immediately **before** the `class API {` declaration (line 88):

```ts
export function formatErrorMessage(body: ErrorBody, includeHelp = true): string {
  try {
    const { message, details, help } = body.error
    let strDetails: string

    if (typeof details === 'object') {
      strDetails = JSON.stringify(details)
    } else {
      strDetails = details ?? ''
    }

    let formattedError = message

    if (strDetails) {
      // @ts-expect-error: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later
      formattedError += `<br> ${strDetails.replaceAll('<br>', '').trim()}`
    }

    if (includeHelp && help) {
      formattedError += `<br><i>${help}</i>`
    }

    return formattedError
  } catch (error) {
    console.error('Error handling issue:', error)
    return DEFAULT_ERROR_MESSAGE
  }
}
```

Then replace the `handleError` method body (lines 408–435) with:

```ts
  handleError(body: ErrorBody, includeHelp = true): void {
    toaster.error(formatErrorMessage(body, includeHelp))
  }
```

- [ ] **Step 5: Run tests to confirm all pass**

```bash
npx vitest run src/utils/__tests__/api.test.ts
```

Expected: all tests pass, including the existing `handleError` describe block (it still delegates correctly through `formatErrorMessage`).

- [ ] **Step 6: Commit**

```bash
git add src/utils/api.ts src/utils/__tests__/api.test.ts
git commit -m "EPMCDME-13374: Extract formatErrorMessage from handleError and add unit tests"
```

---

### Task 2: Attach `parsedError` to `HttpError` in multipart transport methods

**Test-first: no** — structural data change; regression coverage via `dataSources.test.ts`.

**Files:**
- Modify: `src/utils/handleMultipartError.ts`
- Modify: `src/utils/api.ts:123-173` (`postMultipart` and `putMultipart`)

**Interfaces:**
- Consumes: `parseErrorBody` (existing private method on `API` class, returns `Promise<ErrorBody>`)
- Produces: `HttpError.parsedError?: { message: string; details?: string | object; help?: string }` — the inner triple, consistent with how `makeRequest` sets `responseClone.parsedError = errorData.error`

---

- [ ] **Step 1: Add `parsedError` field to `HttpError`**

In `src/utils/handleMultipartError.ts`, replace the class body:

```ts
export class HttpError extends Error {
  parsedError?: {
    message: string
    details?: string | object
    help?: string
  }

  constructor(public readonly response: Response) {
    super(`HTTP error ${response.status}`)
    this.name = 'HttpError'
  }
}
```

Note: the type is inlined rather than imported from `api.ts` to avoid a circular dependency (`api.ts` already imports `HttpError` from this file).

- [ ] **Step 2: Update `postMultipart` to populate `parsedError`**

In `src/utils/api.ts`, replace the `postMultipart` method (lines 123–147):

```ts
  postMultipart(url: string, body: FormData): Promise<Response> {
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
      },
      body,
      redirect: 'manual',
      ...(getIsLocalAuth() && { credentials: 'include' as RequestCredentials }),
    }

    return new Promise((resolve, reject) => {
      fetch(`${this.BASE_URL}/${url}`, requestOptions)
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await this.parseErrorBody(response)
            const err = new HttpError(response)
            err.parsedError = errorData.error
            reject(err)
          } else {
            resolve(response)
          }
        })
        .catch((error) => {
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })
  }
```

- [ ] **Step 3: Update `putMultipart` to populate `parsedError`**

In `src/utils/api.ts`, replace the `putMultipart` method (lines 149–173) with the same pattern — only the `method` field differs:

```ts
  putMultipart(url: string, body: FormData): Promise<Response> {
    const requestOptions: RequestInit = {
      method: 'PUT',
      headers: {
        ...this.authHeaders(),
      },
      body,
      redirect: 'manual',
      ...(getIsLocalAuth() && { credentials: 'include' as RequestCredentials }),
    }

    return new Promise((resolve, reject) => {
      fetch(`${this.BASE_URL}/${url}`, requestOptions)
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await this.parseErrorBody(response)
            const err = new HttpError(response)
            err.parsedError = errorData.error
            reject(err)
          } else {
            resolve(response)
          }
        })
        .catch((error) => {
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })
  }
```

- [ ] **Step 4: Run regression tests**

```bash
npx vitest run src/store/__tests__/dataSources.test.ts src/utils/__tests__/api.test.ts
```

Expected: all pass. The `dataSources` tests mock `putMultipart` directly (`mockPutMultipart`) so the transport change does not affect them.

- [ ] **Step 5: Commit**

```bash
git add src/utils/handleMultipartError.ts src/utils/api.ts
git commit -m "EPMCDME-13374: Populate parsedError on HttpError in multipart transport methods"
```

---

### Task 3: Update `importSkillBundlePreview` to throw pre-formatted errors

**Test-first: no** — `formatErrorMessage` is already tested; this wires the existing pieces together.

**Files:**
- Modify: `src/store/skills.ts`

**Interfaces:**
- Consumes: `HttpError` from `@/utils/handleMultipartError` (the `parsedError` field from Task 2)
- Consumes: `formatErrorMessage`, `ErrorBody` from `@/utils/api` (the pure formatter from Task 1)

---

- [ ] **Step 1: Add imports to `skills.ts`**

At the top of `src/store/skills.ts`, alongside the existing `import api from '@/utils/api'`, add:

```ts
import api, { formatErrorMessage, type ErrorBody } from '@/utils/api'
import { HttpError } from '@/utils/handleMultipartError'
```

(Replace the existing `import api from '@/utils/api'` line — just add the named imports to it.)

- [ ] **Step 2: Rewrite `importSkillBundlePreview` catch block**

In `src/store/skills.ts`, replace the `importSkillBundlePreview` catch block (currently lines 310–315):

```ts
  // Before:
  } catch (error: any) {
    const errorMessage =
      error?.parsedError?.message ?? error?.message ?? 'Failed to import bundle'
    toaster.error(errorMessage)
    throw error
  }
```

With:

```ts
  } catch (error: any) {
    const body: ErrorBody =
      error instanceof HttpError && error.parsedError
        ? { error: error.parsedError }
        : { error: { message: error?.message ?? 'Failed to import bundle' } }
    throw new Error(formatErrorMessage(body))
  }
```

The thrown `Error.message` now contains the fully-formatted `message + details + help` HTML string. `CreateSkillPopup.handleImportFile`'s existing catch (`toaster.error(error.message)`) fires once and renders it — the toaster runs `escapeMarkup: false` + DOMPurify.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass. TypeScript compilation must also pass — run the type check if the test runner does not surface TS errors:

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/store/skills.ts
git commit -m "EPMCDME-13374: Fix skill bundle import to show structured error message"
```

---

## Self-Review

**Spec coverage:**
- ✅ `parsedError` added to `HttpError` (Task 2, Step 1)
- ✅ `parseErrorBody` called in `postMultipart`/`putMultipart` (Task 2, Steps 2–3)
- ✅ `formatErrorMessage` extracted and exported (Task 1, Steps 3–4)
- ✅ `handleError` reduced to wrapper (Task 1, Step 4)
- ✅ `importSkillBundlePreview` throws pre-formatted error, no toast (Task 3, Step 2)
- ✅ `CreateSkillPopup.tsx` untouched — catch unchanged, `toaster` import stays (line 159 still uses it)
- ✅ Unit tests for `formatErrorMessage`: 5 cases covering all spec-required scenarios (Task 1, Step 1)
- ✅ Circular dependency avoided — `parsedError` type inlined in `handleMultipartError.ts`

**Type consistency:** `formatErrorMessage` accepts `ErrorBody` (exported interface); `error.parsedError` matches `ErrorBody['error']` (same shape, inlined in `HttpError`). `skills.ts` imports `ErrorBody` from `api.ts` and wraps `error.parsedError` in `{ error: ... }` before passing to `formatErrorMessage` — correct.
