# EPMCDME-13212 Configurable File Datasource Upload Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume the optional File Datasource maximum advertised by `GET v1/info`, retaining 10 as fallback and enforcing that limit in File Datasource create and edit forms.

**Architecture:** `appInfoStore` retains the optional API field and provides one positive-integer resolver with a default of 10. The shared FilesDropzone displays and enforces the same resolved value, and the form-schema factories validate it; the existing single multipart create/update requests remain unchanged.

**Tech Stack:** React, TypeScript, Valtio, React Hook Form, Yup, Vitest, React Testing Library.

## Global Constraints

- The backend supplies `GET v1/info.file_datasource_max_upload_count` from `FILE_DATASOURCE_MAX_UPLOAD_COUNT`; deployment of that backend field is an external prerequisite.
- Undefined, non-finite, non-integer, zero, or negative values resolve to exactly 10.
- In edit mode, the maximum covers both retained server files and new `File` objects.
- Do not add API calls, request-level batching, staged uploads, or changes to existing multipart request shapes.
- Preserve file-size validation, accessibility error linkage, duplicate filenames, and existing create/update metadata.
- Use commit subjects in the form `EPMCDME-13212: Capital sentence`.

## File Structure

- `src/store/appInfo.ts` — API field storage and guarded maximum resolver.
- `src/store/__tests__/appInfo.test.ts` — app-info response and fallback tests.
- `src/components/form/FilesDropzone/constants.ts` — named default of 10.
- `src/components/form/FilesDropzone/FilesDropzone.tsx` — optional maximum prop, forwarded to the drop area.
- `src/components/form/FilesDropzone/components/FileDropArea.tsx` — capacity, feedback, and presentation driven by the prop.
- `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` — non-default and retained-file capacity tests.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx` — resolves store state and passes the maximum to the dropzone.
- `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts` — create/edit Yup schema factories using the maximum.
- `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts` — validation parity tests.

---

### Task 1: Store and resolve the backend-advertised maximum

**Files:**

- Modify: `src/store/appInfo.ts:54-84, 129-219`
- Create: `src/store/__tests__/appInfo.test.ts`

**Interfaces:**

- Consumes: the optional JSON field `file_datasource_max_upload_count?: unknown` in `GET v1/info`.
- Produces: `appInfoStore.fileDatasourceMaxUploadCount: unknown` and `getFileDatasourceMaxUploadCount(value: unknown): number`.
- Contract: `getFileDatasourceMaxUploadCount(25)` returns `25`; `undefined`, `'25'`, `10.5`, `0`, `-1`, and `Infinity` return `10`.

Test-first: yes — a store test must fail before the API field and resolver exist.

- [ ] **Step 1: Write the failing store tests**

Create `src/store/__tests__/appInfo.test.ts`, mock `@/utils/api`, and test both value retention and normalization:

```ts
it('stores the optional maximum returned by v1/info', async () => {
  mockApiGet.mockResolvedValueOnce({
    json: async () => ({ version: '1.2.3', description: 'Codemie', file_datasource_max_upload_count: 25 }),
  })
  await appInfoStore.loadAppInfo()
  expect(appInfoStore.fileDatasourceMaxUploadCount).toBe(25)
  expect(getFileDatasourceMaxUploadCount(appInfoStore.fileDatasourceMaxUploadCount)).toBe(25)
})

it.each([undefined, '25', 10.5, 0, -1, Number.POSITIVE_INFINITY])(
  'falls back to 10 for %p',
  (value) => expect(getFileDatasourceMaxUploadCount(value)).toBe(10)
)
```

- [ ] **Step 2: Run RED**

Run: `npm run test:unit -- src/store/__tests__/appInfo.test.ts`

Expected: FAIL because the new store property and resolver are absent.

- [ ] **Step 3: Implement the smallest API-state change**

In `appInfo.ts`, add `DEFAULT_FILE_DATASOURCE_MAX_UPLOAD_COUNT = 10`, add the optional field to `AppInfoStoreType` and initial proxy state, and export this resolver:

```ts
export const getFileDatasourceMaxUploadCount = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_FILE_DATASOURCE_MAX_UPLOAD_COUNT
```

Within `loadAppInfo()`, retain `data.file_datasource_max_upload_count` after parsing the existing response. Do not add a request or change `apiVersion` or `description` handling.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:unit -- src/store/__tests__/appInfo.test.ts`

Expected: PASS; the request remains `v1/info`, valid values are preserved, and every invalid/missing value resolves to 10.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/store/appInfo.ts src/store/__tests__/appInfo.test.ts
git commit -m "EPMCDME-13212: Read file datasource upload limit"
```

### Task 2: Apply the effective maximum to the shared dropzone

**Files:**

- Modify: `src/components/form/FilesDropzone/constants.ts`
- Modify: `src/components/form/FilesDropzone/FilesDropzone.tsx:27-83`
- Modify: `src/components/form/FilesDropzone/components/FileDropArea.tsx:27-120`
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx:16-75`
- Modify: `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`

**Interfaces:**

- Consumes: `FilesDropzone` prop `maxFiles?: number` and `appInfoStore.fileDatasourceMaxUploadCount`.
- Produces: capacity calculation `maxFiles - files.length - uploadedFiles.length` and a disabled input at zero capacity.
- Contract: `maxFiles` defaults to 10; the always-visible helper text identifies the effective maximum before selection; a retained edit file uses one slot; an over-limit selection is truncated and shows the actual maximum.

Test-first: yes — component tests must fail while the component only supports a hard-coded maximum of 10.

- [ ] **Step 1: Write the failing component tests**

Extend `FilesDropzone.test.tsx` with a `createFile` helper. Render with `maxFiles={12}` and assert the always-visible helper text contains `Maximum files: 12.`. Select 13 valid files through the labelled input, and assert `onChange` receives exactly 12 files and overflow feedback includes `Max 12 files allowed`. Add an edit-capacity assertion:

```tsx
render(
  <FilesDropzone
    name="files"
    files={[createFile('new-a.pdf'), createFile('new-b.pdf')]}
    uploadedFiles={Array.from({ length: 10 }, (_, index) => `stored-${index}.pdf`)}
    maxFiles={12}
    onChange={onChange}
  />
)
expect(screen.getByText('12 / 12 files selected')).toBeInTheDocument()
expect(screen.getByLabelText('Select files to upload')).toBeDisabled()
```

- [ ] **Step 2: Run RED**

Run: `npm run test:unit -- src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`

Expected: FAIL because `maxFiles` is not a prop and the UI still reports 10.

- [ ] **Step 3: Implement the prop flow**

Keep the default in `constants.ts`. Add `maxFiles?: number` to `FilesDropzone` and `FileDropArea`, default it to the named constant, and replace `MAX_FILES` in the `remaining`, overflow text, `isAtLimit`, and selected-count expressions. Add `maxFiles` to `FileDropArea`'s `useCallback` dependency list.

In `IndexTypeFile.tsx`, use `useSnapshot(appInfoStore)` and the Task-1 resolver, then pass the value through:

```tsx
const appInfo = useSnapshot(appInfoStore)
const maxFiles = getFileDatasourceMaxUploadCount(appInfo.fileDatasourceMaxUploadCount)

<FilesDropzone maxFiles={maxFiles} {...dropzoneProps} />
```

Do not alter size checks, error IDs, or the existing `onUploadedFileRemove` filtering logic.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:unit -- src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`

Expected: PASS; configured capacity controls the always-visible helper, selection, error text, display, and edit retained-file capacity.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/components/form/FilesDropzone/constants.ts src/components/form/FilesDropzone/FilesDropzone.tsx src/components/form/FilesDropzone/components/FileDropArea.tsx src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx
git commit -m "EPMCDME-13212: Apply configurable file selection limit"
```

### Task 3: Enforce the same maximum in create and edit schemas

**Files:**

- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts:50-315`
- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts`

**Interfaces:**

- Consumes: a normalized `maxFiles: number` from Task 1.
- Produces: create/edit validation-schema factories used by `useEditPopupForm`.
- Contract: create caps new files at `maxFiles`; edit caps `uploadedFiles.length + files.length` at `maxFiles` and retains its minimum-one-file rule.
- Type contract: retain the exported `FormValues` name and its inferred shape with `Yup.InferType<ReturnType<typeof makeBaseValidationSchema>>`; do not change any of its six importer files.

Test-first: yes — write validation tests before replacing the literal `.max(10)` and adding edit-total validation.

- [ ] **Step 1: Write the failing schema tests**

Create or extend `useEditPopupForm.validation.test.ts` using `new File(['x'], 'file.txt', { type: 'text/plain' })`. Test a configured create maximum, a combined edit total, and old-backend fallback:

```ts
await expect(validateCreateFiles({ maxFiles: 12, files: makeFiles(13) }))
  .rejects.toMatchObject({ errors: expect.any(Array) })

await expect(validateEditFiles({
  maxFiles: 12,
  uploadedFiles: Array.from({ length: 10 }, (_, index) => `stored-${index}.txt`),
  files: makeFiles(3),
})).rejects.toMatchObject({ errors: expect.any(Array) })

await expect(validateCreateFiles({ maxFiles: 10, files: makeFiles(11) }))
  .rejects.toMatchObject({ errors: expect.any(Array) })
```

- [ ] **Step 2: Run RED**

Run: `npm run test:unit -- src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts`

Expected: FAIL because create has a literal 10-file maximum and edit does not cap the combined total.

- [ ] **Step 3: Implement parity-safe schema factories**

Refactor module-level `baseValidationSchema` and `editingSchema` into factories accepting `maxFiles`. Preserve the exported type without changing its importers:

```ts
export type FormValues = Yup.InferType<ReturnType<typeof makeBaseValidationSchema>>
```

In `useEditPopupForm`, subscribe to `appInfoStore`, normalize the store field with Task-1's helper, and memoize the schema selected by `isEditing`. Keep the existing dynamic `fieldSchema.test(...)` extensions inside that hook and ensure the factory return type continues to support its `.shape(providerValidations)` call; do not move, remove, or weaken provider-field validation.

Use `.max(maxFiles, filesMaxCountError(maxFiles))` for create. In the edit `uploadedFiles` test, preserve the existing minimum check and add this exact total rule:

```ts
.test('max-total-files', filesMaxCountError(maxFiles), function (uploadedFiles) {
  const files = this.parent.files as File[] | undefined
  return (uploadedFiles?.length ?? 0) + (files?.length ?? 0) <= maxFiles
})
```

Keep provider, CSV, SharePoint, guardrail, file-type, and file-size validation unchanged.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:unit -- src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts`

Expected: PASS; configured create and combined edit limits work, while absent backend data retains the 10-file limit.

- [ ] **Step 5: Run affected regression coverage**

Run:

```bash
npm run test:unit -- src/store/__tests__/appInfo.test.ts src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.test.ts src/store/__tests__/dataSources.test.ts
```

Expected: PASS; the existing hook suite confirms the schema-factory refactor retains current form behavior, and multipart tests confirm no create/update request or query-parameter regression.

- [ ] **Step 6: Run the complete unit suite before committing**

Run: `npm run test:unit`

Expected: PASS; no existing unit suite relies on the former module-level schema instance or its literal ten-file message.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts
git commit -m "EPMCDME-13212: Validate configurable file upload limit"
```

## Plan Self-Review

- **Spec coverage:** Task 1 covers `/v1/info` and compatibility fallback; Task 2 covers selection, feedback, and retained-file capacity; Task 3 covers create/edit validation parity and verifies unchanged multipart submission. The backend `InfoResponse` extension is explicitly an external prerequisite because it is outside this repository.
- **Placeholder scan:** No implementation placeholders remain. Request-level batching is named only as an intentional non-goal.
- **Type consistency:** Task 1 defines `fileDatasourceMaxUploadCount` and `getFileDatasourceMaxUploadCount`; Tasks 2 and 3 consume those exact names. Task 2 defines `maxFiles`, which Task 3 receives as a normalized number. Task 3 preserves `FormValues` via `ReturnType<typeof makeBaseValidationSchema>`, so the existing six consumers keep the same exported type name and shape.
