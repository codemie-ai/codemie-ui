# Workflow Icon Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload an image for a workflow's icon (not just a URL), hitting the backend's dedicated `POST v1/workflows/icon` endpoint (already implemented in the `codemie` repo, branch `EPMCDME-15605_workflow-allow-uploading-icon-file` — treat as given, do not re-implement) while leaving the assistant icon upload path byte-for-byte unchanged.

**Architecture (revised):** The generic `useFileUpload`/`ImageUpload` widget hardcodes the assistant upload call (`filesStore.uploadFiles` → bulk `{files:[{file_url}]}` shape). Make it accept an optional `uploadFile` function, defaulting to that exact call so assistants are unaffected. Add `filesStore.uploadWorkflowIcon` — a single-file POST to `v1/workflows/icon` that reads `{file_url}` directly (no bulk unwrapping). Thread the new prop through the existing `ImageUploadField`/`LogoUploadPanel` wrappers (smaller diff than a workflow-local wrapper, since `LogoUploadPanel` already provides the upload-or-URL composite the ticket needs) and reuse `LogoUploadPanel` as-is in `WorkflowFormFields`, passing `uploadFile={filesStore.uploadWorkflowIcon}`. Task 1 (schema fix) is unchanged from the prior draft.

**Tech Stack:** React, react-hook-form (`Controller`), Yup, Vitest + RTL.

**Spec:** inline ticket text (EPMCDME-15605) plus the backend contract supplied by the user for this revision — no spec.md for this task.

**Commit per task using the repository's existing convention.**

## Global Constraints

- Do not modify `AssistantSetupSection.tsx`, `LogoUrlInputField.tsx`, or `getFileNameFromUrl.ts` — no reason to touch them.
- `useFileUpload.ts`, `ImageUpload.tsx`, `ImageUploadField.tsx`, `LogoUploadPanel.tsx` may only gain one new **optional** `uploadFile` prop each, forwarded unchanged; no other behavior/prop may change. Every existing caller that omits it must behave exactly as today (AC8).
- No icon cropping/editing UI.
- No new permission/guard check — the icon control lives inside the form already gated by `canEdit` at the page level.
- No change to YAML parsing/serialization — `icon_url` is a plain top-level field.
- Do not change `ImageUploadField`'s `maxSizeMB={0.5}` — it is already stricter than the backend's 2 MB workflow-icon cap, so AC2's "match assistant icon limits" needs no frontend change.
- Do not implement any backend behavior (file-type/magic-byte/size validation, storage namespace) — call the given endpoint and surface its error messages.

## Acceptance criteria

- [ ] AC1: A user can upload an image as a workflow icon during create and edit, and sees a preview before saving.
- [ ] AC2: Allowed file types/max size match assistant icons; invalid files are rejected with a clear message. (Frontend check unchanged at 0.5MB/`image/*`; server-side type/size enforcement is the backend's existing endpoint.)
- [ ] AC3: After saving, the uploaded icon shows wherever `workflow.icon_url` is rendered today (list, workflow page, conversations, recent-workflows sidebar) — no code change needed there.
- [ ] AC4: A user can replace or remove an uploaded icon.
- [ ] AC5: A user can still set a workflow icon via URL.
- [ ] AC6: Existing `icon_url` workflows and YAML `icon_url` config keep working, unmigrated.
- [ ] AC7: Only users who can already edit a workflow can change its icon (existing `canEdit` gate on reaching the form).
- [ ] AC8: Assistant icon upload code/behavior is unchanged — same call (`filesStore.uploadFiles`), same bulk-response parsing, same result, for every existing caller.
- [ ] AC9: No cropping/editing tools.

## Review Focus

- A relative `VITE_API_URL` (same-origin deploy) makes `filesStore.getFileURL` return a non-absolute URL — must not fail `icon_url` validation. Covered by Task 1.
- `uploadWorkflowIcon` must read `file_url` straight off the single-object `WriteFileResponse`, not run it through `getFileURL`/bulk-array unwrapping — that shape belongs only to `filesStore.uploadFiles`. Covered by Task 3.
- Every assistant call site (`AssistantSetupSection.tsx` via `LogoUploadPanel`/`ImageUploadField`) omits the new `uploadFile` prop, so it must take the default branch and produce the exact same request/response handling as before. Covered by Task 2's default-path test.
- Removing an uploaded icon must leave `icon_url` empty, not stuck on the last uploaded URL — covered by Task 4.
- Switching from an uploaded file back to a typed URL (and vice versa) must not throw a validation error mid-edit — covered by Task 1's cases plus the existing `.url()` removal.

---

### Task 1: Accept backend file URLs in workflow icon_url validation

**Files:**
- Modify: `src/pages/workflows/components/workflowSchema.ts:32-35`
- Test: `src/pages/workflows/components/__tests__/workflowSchema.test.ts`

**Interfaces:**
- Consumes: `isBackendFileUrl` from `@/pages/assistants/components/AssistantForm/components/AssistantSetup/utils/getFileNameFromUrl` (existing, unmodified).
- Produces: `baseWorkflowSchema`'s `icon_url` field keeps its existing shape (`string | null`).

Test-first: yes — new case: `baseWorkflowSchema.validate({ ...base, icon_url: <backend file URL> })` must resolve (currently throws because of the strict `.url()` test).

- [ ] **Step 1:** Add two cases to `workflowSchema.test.ts` (mocking `decodeFileName` the way `getFileNameFromUrl.test.ts` does): `icon_url: '/v1/files/abc123'` resolves; `icon_url: 'not-a-url'` rejects.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/workflows/components/__tests__/workflowSchema.test.ts` — expect the backend-URL case to FAIL on the current `.url()` rule.
- [ ] **Step 3:** Replace the `icon_url` field at `workflowSchema.ts:32-35` with the same custom `.test()` pattern already used at `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:123-129`: accept when `isBackendFileUrl(value)` or `/^https?:\/\/.+/.test(value)`. Add the `isBackendFileUrl` import.
- [ ] **Step 4:** Re-run — both new cases PASS, existing cases unaffected.
- [ ] **Step 5:** Commit.

---

### Task 2: Make the shared upload widget accept an injectable upload function

**Files:**
- Modify: `src/components/form/ImageUpload/hooks/useFileUpload.ts`, `src/components/form/ImageUpload/ImageUpload.tsx`, `src/pages/assistants/components/AssistantForm/components/AssistantSetup/ImageUploadField.tsx`, `.../LogoUploadPanel.tsx`
- Test: `src/components/form/ImageUpload/hooks/__tests__/useFileUpload.test.ts` (new file — none exists today)

**Interfaces:**
- `UseFileUploadProps` gains `uploadFile?: (file: File) => Promise<string>`.
- Internal default (not exported): `defaultUploadFile = async (file) => { const r = await filesStore.uploadFiles([file]); return r.files?.[0] ? filesStore.getFileURL(r.files[0].file_url) : '' }` — this is today's inline logic, extracted verbatim.
- `handleFileUpload` calls `const fileUrl = await (uploadFile ?? defaultUploadFile)(file); if (fileUrl) onChange?.(fileUrl)`.
- `ImageUpload`, `ImageUploadField`, `LogoUploadPanel` each gain the same optional `uploadFile` prop, forwarded one level down unchanged (no other line in these three files changes).

Test-first: yes — `useFileUpload.test.ts`: (a) given a custom `uploadFile` mock, `handleFileUpload` calls it instead of `filesStore.uploadFiles` and passes its resolved value straight to `onChange`; (b) given no `uploadFile`, it calls `filesStore.uploadFiles` + `filesStore.getFileURL` exactly as today (spy both, assert `onChange` receives `getFileURL`'s return value) — this second case is the AC8 regression guard.

- [ ] **Step 1:** Write both `useFileUpload.test.ts` cases above. Run `npx vitest run --project unit src/components/form/ImageUpload/hooks/__tests__/useFileUpload.test.ts` — expect FAIL (no `uploadFile` param exists yet).
- [ ] **Step 2:** Implement the `uploadFile` param/default in `useFileUpload.ts` as specified, then thread the prop through `ImageUpload.tsx` → `ImageUploadField.tsx` → `LogoUploadPanel.tsx` (one added prop + one forwarded call each, no other change).
- [ ] **Step 3:** Re-run the test — both cases PASS.
- [ ] **Step 4:** Commit.

---

### Task 3: Add `filesStore.uploadWorkflowIcon`

**Files:**
- Modify: `src/store/files.ts` (`FilesStoreType` + `filesStore`)
- Test: append to `src/store/__tests__/files.test.ts`

**Interfaces:**
- `uploadWorkflowIcon(file: File): Promise<string>` — `POST v1/workflows/icon` via `api.postMultipart`, body field name `file` (singular — not `files`), returns `(await response.json()).file_url` directly (no `getFileURL` call: the backend's `WriteFileResponse` is a single object, not the bulk `{files:[...]}` shape). On failure, reuse `uploadFiles`'s existing `UPLOAD_ERROR`/`toaster.error` pattern so backend messages ("Unsupported icon file size"/"Unsupported icon file type"/"Invalid workflow icon") surface to the user.

Test-first: yes — new cases spying on `api.postMultipart` (same pattern as the existing `downloadFile` tests in this file): (a) posts a `FormData` with key `file` (not `files`) to `v1/workflows/icon` and resolves to the response's `file_url` unmodified; (b) on a rejected call whose error exposes `.json()` with `{detail: 'Unsupported icon file type'}`, calls `toaster.error` with a message containing that detail and rethrows.

- [ ] **Step 1:** Write both cases in `files.test.ts`. Run `npx vitest run --project unit src/store/__tests__/files.test.ts` — expect FAIL (`uploadWorkflowIcon` doesn't exist).
- [ ] **Step 2:** Add `uploadWorkflowIcon` to `FilesStoreType` and `filesStore` as specified.
- [ ] **Step 3:** Re-run — both new cases PASS, existing `files.test.ts` cases unaffected.
- [ ] **Step 4:** Commit.

---

### Task 4: Wire the workflow-specific upload into `WorkflowFormFields`

**Files:**
- Modify: `src/pages/workflows/components/WorkflowFormFields.tsx:272-284` (the `icon_url` `Controller`), import block
- Test: `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx`

**Interfaces:**
- Consumes: `LogoUploadPanel` (default export, now accepting `uploadFile`) from `@/pages/assistants/.../AssistantSetup/LogoUploadPanel` — same cross-feature import style already used in this file for `MarketplaceCategories` (line 33); `filesStore.uploadWorkflowIcon` from Task 3; `baseWorkflowSchema`'s updated `icon_url` validation from Task 1.
- Produces: nothing consumed by a later task — this is the plan's last task.

Test-first: yes — three cases in `WorkflowFormFields.test.tsx`:
1. Mocking `LogoUploadPanel` (shallow, as the prior draft did): the field initializes from `workflow.icon_url`.
2. Mocking `LogoUploadPanel`: clicking its "remove" affordance clears `ref.current.getValues().icon_url`.
3. **Not** mocking `LogoUploadPanel` (render the real `LogoUploadPanel → ImageUploadField → ImageUpload` chain) — spy `filesStore.uploadWorkflowIcon` (mockResolvedValue a URL) and spy `filesStore.uploadFiles`; fire a `change` event on the hidden `input[type=file]` with a small image `File`; assert `ref.current.getValues().icon_url` eventually equals the mocked URL AND `filesStore.uploadFiles` was never called. This is the test that proves the workflow path hits the dedicated endpoint, not the bulk one.

- [ ] **Step 1:** Write the three tests above. Run `npx vitest run --project unit src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` — expect FAIL (current field is a plain `Input`; no `LogoUploadPanel`, no `uploadWorkflowIcon` call).
- [ ] **Step 2:** Add the `LogoUploadPanel` and `filesStore` imports. Replace the `Controller name="icon_url"` block (`:272-284`) so its `render` returns `<LogoUploadPanel value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} name={field.name} uploadFile={filesStore.uploadWorkflowIcon} />`, matching `AssistantSetupSection.tsx:94-108`'s wiring style (no `className`/`isCompactView` — the workflow form has no compact mode).
- [ ] **Step 3:** Re-run — all three cases PASS; confirm no pre-existing `WorkflowFormFields.test.tsx` case broke.
- [ ] **Step 4:** Commit.

---

## Negative-constraints pass

- AC8 (assistant behavior unchanged): satisfied by construction — Task 2's default `uploadFile` path is the extracted original logic verbatim, exercised by its own regression test, and no assistant call site (`AssistantSetupSection.tsx`) passes the new prop, so it stays on that default path. `filesStore.uploadFiles` itself is never modified (Task 3 only adds a sibling method).
- "Do not re-implement the backend" (user instruction): satisfied — every task is frontend-only (schema, hook/component props, one store method, one form wiring); no file under `../codemie` is touched, and `uploadWorkflowIcon` only calls the given endpoint and relays its errors, it does not duplicate its validation.
- AC9 (no cropping/editing): satisfied — no task adds a crop step; `LogoUploadPanel`/`ImageUpload` keep their existing capability set.
- AC7 (no new guard): satisfied — Task 4 adds no permission check.
- AC6 (YAML/no migration): satisfied — no task touches `yaml_config` parsing/serialization or adds a migration path.
- "Prefer the smaller diff" (user instruction) for the LogoUploadPanel-vs-workflow-local-wrapper decision: resolved by reusing `LogoUploadPanel`/`ImageUploadField` generically (Task 2 threads one optional prop through 3 small, already-existing files) rather than duplicating their upload-or-URL/filename-display logic in a new workflow-local component.
- "No whole-suite gate / review / commit-bundling task": satisfied — each task's steps run only that task's own test file(s), and commit happens per task.
