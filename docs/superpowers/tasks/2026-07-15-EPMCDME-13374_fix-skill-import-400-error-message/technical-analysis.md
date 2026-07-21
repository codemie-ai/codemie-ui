# Technical Research

**Task**: skill import ZIP bundle error handling toast notification api error
**Generated**: 2026-07-15T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Bug EPMCDME-13374 — Skills import: ZIP bundle with single/multiple Markdown files returns HTTP 400. When a user uploads a ZIP bundle containing Markdown .md files (not named SKILL.md) during skill import, the backend returns HTTP 400 with JSON body: {"message": "Invalid skill bundle", "details": "Skill bundle zip must contain exactly one SKILL.md file", "help": "Add a single SKILL.md file with YAML frontmatter to the root of the bundle"}. The UI currently shows only a generic "HTTP error 400" toast instead of the meaningful error from the backend response body. Fix: the UI should display the user-friendly validation message (message + details fields) from the backend 400 response when the import fails.

---

## 2. Codebase Findings

### Existing Implementations

- `src/store/skills.ts` (line ~301) — `importSkillBundlePreview`: primary bug site. Calls `api.postMultipart()`, catch block reads `error?.parsedError?.message` (always `undefined` for `HttpError`) then falls back to `error?.message` = `"HTTP error 400"`. Never reads the response body.
- `src/utils/api.ts` — API client. `postMultipart` rejects with `new HttpError(response)` (raw `Response` object wrapped, body never parsed). `makeRequest` (used by `api.get/post/put/delete`) DOES parse the body and sets `responseClone.parsedError`. `handleError({ message, details, help })` formats the structured error as HTML (`message<br>details<br><i>help</i>`) and calls `toaster.error` — this is the correct formatter to reuse.
- `src/utils/handleMultipartError.ts` — `HttpError` class (`message = "HTTP error ${status}"`, line 18). `handleMultipartError` utility reads `data.detail` (FastAPI default validation shape) — wrong key name for the skills endpoint which uses `{ message, details, help }`.
- `src/components/CreateSkillPopup.tsx` (line ~154) — `handleImportFile`: calls `importSkillBundlePreview` for `.zip` files. Outer catch calls `toaster.error(message)` directly from the component — secondary issue (violates the guide's "toast from store only" rule; causes double-toast for any error already toasted in the store).
- `src/utils/toaster.ts` — wrapper around `react-hot-toast`; the single shared toast surface.

### Architecture and Layers Affected

| Layer | Component |
|---|---|
| API client | `src/utils/api.ts` — `postMultipart`, `makeRequest`, `handleError` |
| Store / business logic | `src/store/skills.ts` — `importSkillBundlePreview` |
| Component | `src/components/CreateSkillPopup.tsx` — `handleImportFile` |
| Toast/notification | `src/utils/toaster.ts` |

### Integration Points

- `api.postMultipart` → `HttpError` (from `handleMultipartError.ts`) — shared across all multipart endpoints
- `api.handleError` — shared error formatter; already handles `{ message, details, help }` shape correctly
- `handleMultipartError` utility — used by `dataSources.ts` store for a different endpoint with FastAPI's `data.detail` shape; NOT reusable here without modification
- `react-hot-toast` via `toaster.ts` — shared notification surface

### Patterns and Conventions

- Valtio `proxy` stores for state + async API orchestration; `useSnapshot` in components for reads.
- `api.makeRequest` auto-parses error body and attaches it as `parsedError` on the response clone; `api.postMultipart` skips this parsing — `HttpError` carries the raw `Response` only.
- `api.handleError({ error: { message, details, help } })` is the canonical way to display structured backend errors as a toast; it produces HTML-formatted output.
- Guide rule: **toasts belong in stores only**. Component-level `catch` blocks must not call `toaster.error` to avoid double-notification.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/development/error-handling-patterns.md` — directly governs this fix. States that error toasts must originate from stores, not components. Component `catch` blocks should be log-only or empty. Authoritative source for fix approach.

### Architectural Decisions

- "Toast from store only" is an explicit documented convention in `error-handling-patterns.md` — not just inferred from code. Component-level toasting is a violation, not an undocumented pattern.

### Derived Conventions

- `api.handleError` is the single canonical error formatter; all structured backend errors should go through it rather than constructing toast strings manually.
- `HttpError` is the error class for all multipart rejections; callers can use `instanceof HttpError` to detect HTTP failures and access `error.response` for body reading.
- Different backend endpoints use different error body shapes: FastAPI default (`{ detail }`) vs. skills endpoint (`{ message, details, help }`). No single utility handles both today.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/skills/components/__tests__/SkillCard.test.tsx` — covers `SkillCard` UI component only; no coverage of `importSkillBundlePreview` or `handleImportFile`.
- `src/store/__tests__/dataSources.test.ts` — tests `handleMultipartError` for the dataSources flow (different store, different error shape); no analogous test for skills import.

### Testing Framework and Patterns

- Framework: Vitest (workspace config in `vitest.workspace.ts`).
- Patterns: store-level unit tests mock `api.*` methods; component tests use `@testing-library/react`. Mock patterns established in `dataSources.test.ts` are directly transferable to a new skills store test.

### Coverage Gaps

- `importSkillBundlePreview` — no test for success path or any error path.
- `handleImportFile` in `CreateSkillPopup.tsx` — no test for the ZIP branch.
- The `HttpError` body-reading path does not have test coverage anywhere (the fix introduces new async body-read logic that should be tested).

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — backend base URL; read in `api.ts` constructor. No skills-import-specific env vars.

### Configuration Files

- `vite.config.ts` — proxies `/api` to `http://localhost:8080` for local dev.
- `.ai-run/guides/development/error-handling-patterns.md` — authoritative guide for error-handling conventions.

### Feature Flags and Deployment Concerns

No feature flags found for this domain. No deployment-specific concerns identified.

---

## 6. Risk Indicators

- **No tests for `importSkillBundlePreview` or `handleImportFile`** — both changed files have zero test coverage for the affected paths; the fix adds async body-read logic with no safety net.
- **`HttpError` carries `response: Response`** — `Response.json()` is async and can only be consumed once; if anything else reads the body before the catch handler, parsing will throw. This must be handled defensively.
- **Different error shapes across multipart endpoints** — `handleMultipartError` uses `data.detail` (dataSources endpoint); skills endpoint uses `data.message/details/help`. These cannot share a single utility without branching or a shape-check.
- **Pre-existing double-toast in `CreateSkillPopup`** — `handleImportFile` calls `toaster.error` in its catch after the store already surfaces errors. Fixing only the 400 case without removing the component-level toast will produce two notifications. The guide explicitly prohibits this.
- **`api.postMultipart` and `api.putMultipart` share the same body-not-parsed limitation** — any other multipart endpoint will face the same issue; the fix in `skills.ts` is a local workaround, not a systemic fix. Note this as technical debt.
- **`handleError` call signature** — must confirm the exact shape `api.handleError` expects (`{ error: { message, details, help } }` vs. a flat object); calling it with the wrong shape produces a silent no-op toast or a runtime error.

---

## 7. Summary for Complexity Assessment

This is a narrowly scoped bug fix touching three files across four architectural layers (API client, store, component, toast). The root cause is precise and well-understood: `api.postMultipart` rejects with an `HttpError` that wraps the raw `Response` object without reading the body, while `makeRequest` (used by JSON endpoints) does parse the body. The store's catch handler never has access to `parsedError` and falls back to the generic `"HTTP error 400"` string. The primary fix is in `src/store/skills.ts`: detect `instanceof HttpError`, await `error.response.json()`, extract `{ message, details, help }`, and call `api.handleError()` — the existing formatter already handles this shape and produces a properly formatted toast. A secondary cleanup in `src/components/CreateSkillPopup.tsx` removes the component-level `toaster.error` call that violates the project's documented "toast from store only" convention.

The fix follows established patterns — `api.handleError`, `instanceof HttpError`, Valtio store async actions — with no new patterns introduced. Estimated file change surface is 2 files, 10–20 lines total. The main technical novelty is the async `Response.json()` read inside a catch block, which requires defensive handling (body already consumed, non-JSON response). This is a low-complexity change in terms of architecture but requires careful implementation to avoid the double-toast regression and the consumed-body edge case.

Test coverage posture is weak: neither the store action nor the component branch has existing tests. Given the async body-read logic and the double-toast risk, adding at least one store-level unit test (mock `postMultipart` to reject with an `HttpError` carrying a mock `Response` that resolves to the backend JSON) is strongly recommended. The `dataSources.test.ts` pattern provides a direct template.
