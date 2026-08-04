# EPMCDME-11738: Add XLSB to Supported-Format Messaging (UI Only) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert `XLSB` after `XLSX` in two string constants in `src/constants/common.ts` so every upload surface in the app advertises `.xlsb` support.

**Architecture:** Single-file change. Two string constants act as the single source of truth for all "Supported formats: …" messages; updating them propagates automatically to the Data Source upload InfoBox, the chat single/multi-file tooltips, and the workflow file upload tooltip via string interpolation.

**Tech Stack:** TypeScript, React (Vite).

## Global Constraints

- `XLSB` must appear immediately after `XLSX` in both constants (keeps Excel formats adjacent).
- No `accept` attribute is added to any file input — file pickers already accept all types.
- No client-side MIME/extension validation is added.
- This UI change must not be deployed before the corresponding backend `.xlsb` ingestion ticket lands.

---

### Task 1: Add XLSB to supported-format string constants

**Test-first:** no — pure string constants with no testable logic. Correctness is verified by grep after the edit (Step 2).

**Files:**
- Modify: `src/constants/common.ts:47-48`

**Interfaces:**
- Consumes: nothing new
- Produces: updated `SUPPORTED_FILE_FORMATS_MESSAGE_BASE` and `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT` consumed by `FilesDropzone`, `CHAT_FILE_UPLOAD_MESSAGE`, `CHAT_FILE_MULTIUPLOAD_MESSAGE`, `WF_FILE_UPLOAD_MESSAGE`

- [ ] **Step 1: Edit `src/constants/common.ts`**

  Current lines 47–48:
  ```typescript
  export const SUPPORTED_FILE_FORMATS_MESSAGE_BASE = `Supported formats: PPTX, DOCX, XLSX, PDF, CSV, ZIP, ${SUPPORTED_IMAGE_FORMATS} (ZIP contents are indexed as separate documents after upload; other unrecognized formats as plain text).`
  export const SUPPORTED_FILE_FORMATS_MESSAGE_CHAT = `Supported formats: PPTX, DOCX, XLSX, PDF, CSV, ${SUPPORTED_IMAGE_FORMATS} (others as plain text).`
  ```

  Replace with:
  ```typescript
  export const SUPPORTED_FILE_FORMATS_MESSAGE_BASE = `Supported formats: PPTX, DOCX, XLSX, XLSB, PDF, CSV, ZIP, ${SUPPORTED_IMAGE_FORMATS} (ZIP contents are indexed as separate documents after upload; other unrecognized formats as plain text).`
  export const SUPPORTED_FILE_FORMATS_MESSAGE_CHAT = `Supported formats: PPTX, DOCX, XLSX, XLSB, PDF, CSV, ${SUPPORTED_IMAGE_FORMATS} (others as plain text).`
  ```

- [ ] **Step 2: Verify the change**

  ```bash
  grep -n "XLSB" src/constants/common.ts
  ```

  Expected output (two lines, both containing `XLSX, XLSB, PDF`):
  ```
  47:export const SUPPORTED_FILE_FORMATS_MESSAGE_BASE = `Supported formats: PPTX, DOCX, XLSX, XLSB, PDF, ...`
  48:export const SUPPORTED_FILE_FORMATS_MESSAGE_CHAT = `Supported formats: PPTX, DOCX, XLSX, XLSB, PDF, ...`
  ```

- [ ] **Step 3: Confirm TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/constants/common.ts
  git commit -m "EPMCDME-11738: Add XLSB to supported-format messaging strings"
  ```
