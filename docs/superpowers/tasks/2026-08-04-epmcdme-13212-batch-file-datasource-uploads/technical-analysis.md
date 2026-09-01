# Technical Analysis — EPMCDME-13212

## Context

File-based datasource creation and editing are currently capped at ten files. The ticket requires keeping ten as the default, making the limit configurable per client, and ensuring large selections are uploaded and processed in bounded batches rather than as one very large multipart request.

## Codebase Findings

### Current limit enforcement

- `src/components/form/FilesDropzone/constants.ts` exports `MAX_FILES = 10`.
- `src/components/form/FilesDropzone/components/FileDropArea.tsx` applies that constant before adding selected or dropped files. It calculates `MAX_FILES - files.length - uploadedFilesCount`, rejects overflow with a toast, disables the dropzone at the limit, and displays the selected count. This applies to both creation and editing because `IndexTypeFile` uses the shared dropzone.
- `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts` independently applies `files.max(10, FILES_MAX_COUNT_ERR)` for a new file datasource. The editing schema deliberately has no maximum; it only requires the combined existing (`uploadedFiles`) and new (`files`) count to be at least one. The dropzone therefore provides the edit-time cap today.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx` binds React Hook Form's `files` and `uploadedFiles` fields to `FilesDropzone`. Existing files are removable by name and index, which preserves duplicate filenames.

### Existing upload and processing flow

- `src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts` is the file-datasource submission boundary. `createOrUpdateFilesIndex` calls `dataSourceStore.createKBIndexFiles(...)` for create and `dataSourceStore.updateKBIndexFiles(...)` for edit.
- `src/store/dataSources.ts` sends all new `File` objects in one `FormData` request to `POST v1/index/knowledge_base/file` (create) or `PUT v1/index/knowledge_base/file` (edit). Edit also serializes the retained server-side filenames into the `uploaded_files` query parameter. Neither path batches uploads or exposes progress.
- `src/store/files.ts` has an unrelated generic bulk-file endpoint (`POST v1/files/bulk`), used by image upload. It returns uploaded file URLs, but this datasource form currently expects the index endpoint to receive raw `File` objects. It cannot be substituted without a backend contract that allows a file datasource to be created or updated from those returned identifiers.
- The backend-facing file-datasource API contract is not implemented in this UI repository. The UI must not split the current index create request into several create requests: that could create multiple datasources. Safe batching needs an endpoint/contract that either accepts batches for one datasource transaction or supports staged uploads plus a single final create/update request.

### Configuration conventions

- `appInfoStore.fetchCustomerConfig()` loads `GET v1/config` into `ConfigItem[]`; a config has an `id` and a string-valued `settings.value` (`src/store/appInfo.ts`, `src/types/entity/configuration.ts`). The app-level initial-data hook and datasource `useEditPopup` already ensure customer configuration is available.
- `src/constants/configKeys.ts` contains named non-boolean config keys, while `appInfoStore` reads individual values with `configs.find(...)` and safe defaults. There is no existing file-count configuration key or datasource-specific accessor.
- The form currently snapshots only LLM and embedding data from `appInfoStore`. It will need a small, guarded accessor (or a reusable numeric-config helper) that parses the new configuration value, accepts only positive integers, and falls back to `10` when the setting is absent, malformed, or non-positive.

### Existing tests and conventions

- Unit tests are Vitest + React Testing Library, colocated in `__tests__/`; the repository guide specifies `afterEach(cleanup)` for rendered component tests.
- `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` covers accessibility/error association but not file selection, count limits, dropping, or a configurable limit.
- `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts` covers editing's minimum-one-file rule. It is the natural location for schema tests proving the configured create limit replaces the literal `10` and edit behavior still validates retained-plus-new files.
- `src/store/__tests__/dataSources.test.ts` mocks multipart API calls and validates the edit request's query parameters and `FormData`. It is the natural location for batching request ordering, stable request metadata, error handling, and no-more-batches-after-failure assertions.

### Relevant history

- Commit `d3a0f57bc` (`EPMCDME-11151`) introduced the multi-file dropzone and its original hard-coded ten-file limit.
- Commit `bbbf2d43f` (`EPMCDME-11745`) extended the same component and datasource store for editing, including the combined existing/new-file count. The new work should preserve that edit behavior.

## Proposed Approach

1. Introduce one client-facing configuration key and accessor for the maximum selected files. The backend/customer configuration should provide its value; the UI default remains `10`. Pass the resolved value explicitly from the datasource file field through `FilesDropzone` to `FileDropArea`, replacing every `MAX_FILES` usage in count, truncation, toast, disabled state, and UI text.
2. Make the create schema consume that resolved maximum rather than a module-level `.max(10)`. Keep the business rule in the Yup schema, not only in the dropzone, so form submission cannot bypass the limit. Decide explicitly whether editing's combined total should also be capped by the configured value; current behavior caps it through UI but does not enforce it in the editing schema, so aligning both modes is safest if the product limit applies to a datasource's total files.
3. Add a small batching helper at the datasource transport layer (for example, a pure `chunkFiles(files, batchSize)` utility and an async orchestration method) only after confirming the backend's batching contract. Keep requests sequential unless the API explicitly supports bounded concurrency; sequential batches minimize server load and preserve deterministic partial-failure handling.
4. Preserve the create/edit distinction: creation must result in exactly one datasource, while editing must preserve `uploaded_files`, reindex flags, CSV settings, project rename behavior, embedding model, and guardrail assignments. The final API shape may require staged generic uploads followed by one index request, or an index API that accepts an upload session/batch token.
5. Provide user feedback appropriate to the agreed API: disable duplicate submits while a batch operation runs; show batch/overall progress if the transport exposes it; surface failed filenames and retain enough selected state to retry without silently losing files.
6. Add unit coverage for the configuration fallback and valid override, dropzone behavior at a non-default limit, Yup validation, file chunking (including exact and final partial batches), create/edit request shape, and failed-batch behavior. Do not rely on component-only prevention for the limit.

## Affected Files and Symbols

| Area | Files / symbols | Expected change |
| --- | --- | --- |
| Runtime configuration | `src/constants/configKeys.ts`, `src/store/appInfo.ts`, `src/types/entity/configuration.ts` | Add/read the datasource file-count setting with a safe default of 10. |
| Selection UI | `src/components/form/FilesDropzone/constants.ts`, `FilesDropzone.tsx`, `components/FileDropArea.tsx` | Replace hard-coded count with supplied configured value and preserve accessibility/toast behavior. |
| Form binding and validation | `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx`, `hooks/useEditPopupForm.ts`, `DataSourceForm.tsx` / supporting hook | Pass the resolved limit and enforce it in create and, if product-confirmed, edit schemas. |
| Submit orchestration | `src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts`, `src/store/dataSources.ts` | Route create/edit through the confirmed batching/staging protocol without changing datasource semantics. |
| Tests | `FilesDropzone/__tests__/FilesDropzone.test.tsx`, `hooks/__tests__/useEditPopupForm.validation.test.ts`, `src/store/__tests__/dataSources.test.ts` | Cover override/default, limits, chunking, request ordering, and errors. |

## Assumptions and Open Questions

1. The intended configuration is returned by the existing `GET v1/config` customer-config endpoint, with a positive integer `settings.value`; its exact ID and backend owner are not yet specified.
2. “Unlimited” in the issue description is clarified by the PO as a configurable higher limit, not literally unbounded client selection. The UI should enforce the configured ceiling and retain `10` when no setting is provided.
3. The current index API does not demonstrate a safe way to submit separate file batches for one create operation. Backend confirmation is required for the request contract, idempotency token/session mechanism, partial upload cleanup, and whether processing batches are server-managed after one request.
4. The batch size may be distinct from the configurable maximum selected-file count. It should be a bounded transport concern (potentially backend-configured) rather than inferred from the selection limit.
5. The ticket is scoped to the UI repository. Any required backend endpoint, configuration registration, or processing-worker change must be coordinated rather than invented in this branch.

## Risk Indicators

- **Data integrity / duplicate datasource risk:** naively calling the existing create endpoint once per batch could create multiple datasources or duplicate indexing work.
- **Partial failure risk:** a batch can fail after earlier batches succeeded. The final design needs retry semantics, duplicate-file behavior, cleanup/rollback responsibility, and a user-visible outcome.
- **Configuration mismatch risk:** a UI-only higher limit will still fail if backend request validation or infrastructure limits remain at ten. Conversely, an undefined/malformed config must not remove the current protection.
- **Create/edit parity risk:** creation validates a maximum in Yup, editing currently does not. Updating only the dropzone would leave programmatic form values able to bypass the limit.
- **Performance and UX risk:** rendering hundreds of `FileListItem` rows and retaining many `File` objects can impact responsiveness and memory. Measure the expected selection size; consider a compact or virtualized list only if profiling shows the list itself is a bottleneck.
- **Multipart request risk:** the current single-request implementation can exceed proxy/body/time limits. Batching must retain all existing query parameters and prevent a second submission while the first one is in progress.
- **Regression risk:** `FilesDropzone` is a shared component. Search currently identifies datasource use; preserve its generic API or make the limit prop optional with `10` fallback so existing callers do not change behavior.

## Recommended Validation

- Unit-test the resolved runtime limit for absent, malformed, zero/negative, default, and configured-high values.
- Exercise file selection and dropping with values below, equal to, and above the configured limit; verify existing uploaded files count toward the available capacity in edit mode.
- Validate create and edit schemas independently, including retained files plus newly selected files.
- Mock multipart/staged APIs to verify batches are correctly sized and ordered, request metadata is preserved, errors stop or recover according to the agreed contract, and creation still yields exactly one datasource.
- Manually verify create and edit flows with the default configuration and with a client override greater than ten after the API contract is available.
