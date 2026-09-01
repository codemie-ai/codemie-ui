# EPMCDME-13212 — Configurable File Datasource Upload Limit

## Summary

Allow clients to configure the maximum number of files that may be selected for a File-type datasource. The default remains **10**. The backend exposes its effective configured maximum through the existing `GET /v1/info` response; the UI reads that value at startup and applies it consistently to File Datasource create and edit flows.

This is intentionally the option-1 scope: a File Datasource upload remains one multipart request containing all selected files. The backend's current bounded internal file-write concurrency remains unchanged.

## Goals

- Preserve the existing default of 10 files when configuration is absent or invalid.
- Let a backend deployment advertise a higher positive limit using `FILE_DATASOURCE_MAX_UPLOAD_COUNT`.
- Apply one effective limit to file selection, drag-and-drop feedback, an always-visible maximum-files helper, displayed counts, and form validation for both creating and editing File Datasources.
- Keep old-backend/new-UI deployments safe through a UI fallback of 10.
- Preserve the backend as the authority that enforces the limit.

## Non-goals

- Request-level file chunking, staged uploads, resumable uploads, or retrying individual chunks.
- A new endpoint or an additional startup request.
- Changing the one-request create/update API contract.
- Treating “unlimited” as a literal unbounded client selection.

## Backend API Contract

The backend extends the already-consumed `GET /v1/info` `InfoResponse` with an optional numeric field:

```json
{
  "file_datasource_max_upload_count": 10
}
```

The backend value is read from `config.FILE_DATASOURCE_MAX_UPLOAD_COUNT`, whose default remains `10`.

```python
return InfoResponse(
    message="Codemie",
    version=config.APP_VERSION,
    description=APP_DESCRIPTION,
    file_datasource_max_upload_count=config.FILE_DATASOURCE_MAX_UPLOAD_COUNT,
)
```

The backend must continue validating the count on both the create endpoint (`index_knowledge_base_files`) and the update path (`upload_and_prepare_files` / `FileDatasourceService`). This UI repository does not contain that backend implementation; its availability is an external delivery dependency.

## UI Design

### App information

Extend the UI model and `appInfoStore.loadAppInfo()` path to retain the optional advertised maximum alongside the current version and description fields. Define one resolved accessor/value for File Datasource forms:

- use a finite positive integer from `file_datasource_max_upload_count` when present;
- otherwise use `10`.

The fallback covers responses from an older backend and malformed/unsupported values without relaxing the existing protection.

### File selection and editing

Replace the hard-coded `MAX_FILES = 10` behavior in the shared File Datasource dropzone path with the resolved maximum. The effective limit controls:

- the always-visible helper text that identifies the maximum before file selection;
- selecting and dropping new files;
- remaining-capacity calculation;
- overflow toast/error text;
- disabled state at capacity; and
- selected-file count text.

For edit, retained uploaded files count toward the same capacity as newly chosen files. Removing a retained file restores capacity. Existing duplicate-filename behavior remains unchanged.

### Form validation and submission

Create and edit validation must enforce the same resolved limit, rather than relying only on UI controls. A submitted edit's combined retained and new file count must not exceed the effective maximum. Existing minimum-one-file and file-type validation stay in force.

The create and update submission paths remain single multipart requests. No client-side loop or split request is introduced, because repeating the current create endpoint would risk creating duplicate datasources.

## Error Handling and Compatibility

- If `GET /v1/info` lacks the field, use 10 without presenting an error.
- If the value is non-numeric, non-finite, non-integer, zero, or negative, use 10.
- The server remains the final validation layer; surface its existing error if deployment configuration and runtime validation disagree.
- Retain existing form state and validation semantics when a selection exceeds the limit.

## Testing

- Backend: verify `GET /v1/info` exposes the configured `FILE_DATASOURCE_MAX_UPLOAD_COUNT`.
- UI store: verify a valid advertised value is retained and absent/invalid values resolve to 10.
- Dropzone: verify the configured maximum is visible before selection, selecting and dropping files respects a configured value above 10, displays remaining capacity correctly, and counts existing uploaded files during edit.
- Form schemas: verify both create and edit reject combined totals above the resolved maximum and retain existing minimum-one-file validation.
- Compatibility: verify an old `/v1/info` response that omits the field preserves the 10-file UI limit.
- Regression: verify the existing multipart create/update request shape and edit query parameters are unchanged.

## Acceptance Criteria

1. A backend configured with `FILE_DATASOURCE_MAX_UPLOAD_COUNT=N` exposes `N` from `GET /v1/info`.
2. The UI uses and displays an advertised positive integer `N` instead of the hard-coded ten-file limit in File Datasource create and edit workflows.
3. When the API field is absent or invalid, the UI limits File Datasource selection to 10 files.
4. Retained and newly selected files together cannot exceed the effective limit in edit mode.
5. Existing backend validation still rejects over-limit requests.
6. The UI continues using exactly one create or update multipart request; this ticket does not implement request-level batching.

## Risks and Follow-up

Raising the limit does not prevent large multipart bodies, request timeouts, or high browser memory use for very large selections. A future staged-upload or index-scoped batching API is required before client request chunking can be implemented safely. That future capability must define transaction ownership, idempotency, partial-failure cleanup, retry semantics, and progress reporting.
