# Technical Analysis — EPMCDME-11738 (UI Only)

**Task**: Add `.xlsb` file format to supported-format messaging across all upload surfaces.
**Generated**: 2026-07-23
**Research path**: Performed via codegraph_explore + grep in orchestrating agent.

---

## 1. Original Context

EPMCDME-11738: Support for .xlsb File Format for PnL Report Assistant and Simulation (UI ONLY — backend covered separately). The frontend must: (1) Add .xlsb to supported-format messaging in every upload dialog where .xlsx is listed; (2) Update chat-attachment upload messaging to include .xlsb; (3) Update Data Source management UI to show .xlsb as a supported format; (4) Ensure file picker OS filter surfaces .xlsb files. Backend parsing/ingestion is out of scope.

---

## 2. Codebase Findings

### Existing Implementations

**`src/constants/common.ts` (lines 46–48)** — central source of all "Supported formats: ..." strings:

```ts
const SUPPORTED_IMAGE_FORMATS = 'JPEG, PNG, JPG, GIF'
export const SUPPORTED_FILE_FORMATS_MESSAGE_BASE = `Supported formats: PPTX, DOCX, XLSX, PDF, CSV, ZIP, ${SUPPORTED_IMAGE_FORMATS} (...).`
export const SUPPORTED_FILE_FORMATS_MESSAGE_CHAT = `Supported formats: PPTX, DOCX, XLSX, PDF, CSV, ${SUPPORTED_IMAGE_FORMATS} (others as plain text).`
```

Consumers verified:
- `SUPPORTED_FILE_FORMATS_MESSAGE_BASE` → `FilesDropzone.tsx` InfoBox → Data Source upload form
- `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT` → `constants/chats.ts`: `CHAT_FILE_UPLOAD_MESSAGE`, `CHAT_FILE_MULTIUPLOAD_MESSAGE`, `WF_FILE_UPLOAD_MESSAGE` → chat prompt and workflow file upload tooltips

### OS File Picker (`accept` attribute)

All relevant upload controls were checked:

- `FileDropArea.tsx` (data source form, line 84): `<input type="file" multiple>` — **no `accept` attribute**
- `useFileUpload.tsx` (chat/workflow, line 256): `inputProps` — **no `accept` attribute**
- `DropzoneArea.tsx`: no file type filtering, passes all dropped files through

**Conclusion**: Both file pickers already accept all file types. `.xlsb` files are already surfaced by the OS file picker. No `accept` attribute change needed.

### Client-Side File Validation

The `addFiles` function in both `useFileUpload.tsx` and `FileDropArea.tsx` only validates:
- File **size** (rejects if > 100MB)
- File **count** (rejects if > MAX_FILES)

No MIME-type or extension rejection exists on the frontend. `.xlsb` files pass through as-is.

---

## 3. Architecture and Layers Affected

- **Constants layer only** (`src/constants/`): single file, two string values.
- No component logic, hooks, store, or API layer changes required.

---

## 4. Testing Landscape

- No existing tests cover `SUPPORTED_FILE_FORMATS_MESSAGE_BASE` or `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT` (verified via blast-radius analysis).
- No new tests needed — these are pure string constants with no logic to exercise.

---

## 5. Risk Indicators

- **Very low risk**: One file, two string values, no logic, no tests.
- Downstream strings (`CHAT_FILE_MULTIUPLOAD_MESSAGE` etc.) derive from the base constants — updating `common.ts` propagates automatically.
- No OS file picker `accept` filtering exists to update.

---

## 6. Summary for Complexity Assessment

Extremely narrow scope. All required UI changes reduce to adding `XLSB` to two string constants in `src/constants/common.ts`. All other surfaces (file picker accept filter, client-side validation) already support arbitrary file types with no change needed.

**Affected files**: 1 (`src/constants/common.ts`)
**Change type**: String update only
**Risk**: Very low
