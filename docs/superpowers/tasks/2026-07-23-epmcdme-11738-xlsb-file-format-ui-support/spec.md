# Spec — EPMCDME-11738: Add XLSB to Supported-Format Messaging (UI Only)

## Problem

The platform currently omits `.xlsb` from every "Supported formats: …" message, giving users no indication that the format is accepted. File pickers and upload dialogs only mention XLSX, which means users who work with Excel Binary Workbooks (`.xlsb`) don't know to try uploading them.

## Scope

UI-only. Backend ingestion of `.xlsb` is handled in a separate ticket. No client-side file type validation or OS file picker `accept` filtering is added — file pickers already accept all types.

The "OS file picker surfaces `.xlsb` files" acceptance criterion is satisfied by the existing absence of any `accept` filtering on upload inputs; verified, no code change required.

## Solution

Add `XLSB` to two string constants in `src/constants/common.ts`. All downstream consumers update automatically via string interpolation — no other files change.

### Change

**File**: `src/constants/common.ts`

| Constant | Before | After |
|---|---|---|
| `SUPPORTED_FILE_FORMATS_MESSAGE_BASE` | `…, XLSX, PDF, …` | `…, XLSX, XLSB, PDF, …` |
| `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT` | `…, XLSX, PDF, …` | `…, XLSX, XLSB, PDF, …` |

`XLSB` is placed immediately after `XLSX` to keep Excel formats adjacent.

### Downstream impact (automatic)

| Surface | Constant consumed |
|---|---|
| Data Source upload form — FilesDropzone InfoBox | `SUPPORTED_FILE_FORMATS_MESSAGE_BASE` |
| Chat attach-file tooltip (`CHAT_FILE_UPLOAD_MESSAGE`) | `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT` |
| Chat multi-file tooltip (`CHAT_FILE_MULTIUPLOAD_MESSAGE`) | `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT` |
| Workflow file upload tooltip (`WF_FILE_UPLOAD_MESSAGE`) | `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT` |

## Assumptions

1. Backend will accept and ingest `.xlsb` files once the backend ticket is implemented.
2. No `accept` attribute is added to file inputs — this is a backend-coordination concern outside the UI-only scope.
3. No client-side MIME-type or extension validation is added; the existing size/count checks are sufficient.
4. Must not reach an environment before (or without) the corresponding backend `.xlsb` ingestion change — otherwise users are told XLSB is supported while uploads fail silently. Coordinate merge timing with the backend repo.

## Out of Scope

- OS file picker `accept` attribute (no filter exists today; `.xlsb` already appears)
- Client-side `.xlsb` parsing or validation
- Backend ingestion logic
- Azure DevOps integration UI (not present in this frontend codebase)
