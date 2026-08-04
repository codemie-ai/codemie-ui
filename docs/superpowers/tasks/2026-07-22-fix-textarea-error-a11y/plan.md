# Textarea & FilesDropzone Error A11y Association Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix EPMCDME-8550 — screen readers never announce validation errors on the Data Source form's Description field (WCAG 1.3.1 / 4.1.2) because the error text is a bare, id-less sibling `<div>` with no `aria-describedby` link. Fix the shared `Textarea` component (covers both Create and Edit Description fields) and the structurally separate "Add file" error path (`FilesDropzone`).

**Architecture:** Two independent, additive, labelling-only fixes in shared form components. Each derives a stable error element `id` and links it to its control via `aria-describedby` + `aria-invalid`, following the `useId()` fallback idiom already established in `Checkbox.tsx` and the `aria-describedby`/`aria-invalid`/error-id recipe already documented in `.ai-run/guides/patterns/accessibility-patterns.md`. No visual or behavioural changes.

**Tech Stack:** React 18, TypeScript, Vitest 1.6.1, React Testing Library 16.3.0, `@testing-library/jest-dom` 6.6.3 (already globally registered in `src/setupTests.tsx` / `src/setupTests.unit.ts`).

## Global Constraints

- Labelling-only change: no new visual styling, no behavioural change to validation logic itself.
- Follow the existing `useId()` fallback idiom (`const reactId = useId(); const idKey = id ?? reactId`) from `src/components/form/Checkbox.tsx:62-63` — do not invent a new id-generation approach.
- Follow the canonical `aria-describedby` / `aria-invalid` / error-`id` recipe from `.ai-run/guides/patterns/accessibility-patterns.md` "Form Field Accessibility" section — including `role='alert'` on the error node.
- Do NOT wrap the `<textarea>` (or the file `<input>`) in the `<label>` the way `src/components/form/Input/Input.tsx` does — that is an incidental pattern for `Input`, not something to replicate.
- Tests: Vitest + RTL, `__tests__/` co-located with source, AAA pattern, `afterEach(cleanup)`, `vi.mock()` at module top level only — model on `src/components/form/RecordInput/__tests__/RecordInput.test.tsx`. Do NOT introduce `jest-axe` (no existing precedent in this repo's suite) — use plain attribute/RTL assertions, `toHaveAccessibleDescription` is fine since `jest-dom` is already globally set up.
- After all tasks: run lint, typecheck, and the two new test files (not the full suite).

---

### Task 1: Textarea component — associate error with the textarea

**Files:**
- Modify: `src/components/form/Textarea/Textarea.tsx`
- Test: `src/components/form/Textarea/__tests__/Textarea.test.tsx` (new file)

**Interfaces:**
- Consumes: nothing new — existing `TextareaProps` (`error?: string`, `id?: string`, ...).
- Produces: no public API change. `Textarea` continues to accept the same props; internally it now derives `errorId` and renders `aria-describedby`/`aria-invalid` on the `<textarea>` and `id`/`role="alert"` on the error `<div>`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/form/Textarea/__tests__/Textarea.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Textarea from '../Textarea'

const noop = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
})

describe('Textarea', () => {
  describe('error association', () => {
    it('links the textarea to the error message via aria-describedby', () => {
      render(
        <Textarea
          id="description"
          name="description"
          value=""
          onChange={noop}
          error="This field is required"
        />
      )

      const textarea = screen.getByRole('textbox')
      const errorNode = screen.getByText('This field is required')

      expect(errorNode).toHaveAttribute('id', textarea.getAttribute('aria-describedby'))
      expect(textarea).toHaveAttribute('aria-invalid', 'true')
      expect(textarea).toHaveAccessibleDescription('This field is required')
    })

    it('does not render aria-describedby or an error node when there is no error', () => {
      render(<Textarea id="description" name="description" value="" onChange={noop} />)

      const textarea = screen.getByRole('textbox')

      expect(textarea).not.toHaveAttribute('aria-describedby')
      expect(textarea).toHaveAttribute('aria-invalid', 'false')
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument()
    })

    it('still associates the error when no id prop is passed (useId fallback)', () => {
      render(<Textarea name="description" value="" onChange={noop} error="Required" />)

      const textarea = screen.getByRole('textbox')
      const errorNode = screen.getByText('Required')
      const describedBy = textarea.getAttribute('aria-describedby')

      expect(describedBy).toBeTruthy()
      expect(errorNode).toHaveAttribute('id', describedBy)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/form/Textarea/__tests__/Textarea.test.tsx`
Expected: FAIL — `aria-describedby`/`id` assertions fail because `Textarea.tsx` does not yet set these attributes (error `<div>` has no `id`, `<textarea>` has no `aria-describedby`/`aria-invalid`).

- [ ] **Step 3: Implement the minimal fix**

Edit `src/components/form/Textarea/Textarea.tsx`:

Add `useId` to the React import (line 16-22):

```tsx
import React, {
  forwardRef,
  ReactNode,
  TextareaHTMLAttributes,
  useId,
  useImperativeHandle,
  useRef,
} from 'react'
```

Inside the component body, right after `const textareaRef = useRef<HTMLTextAreaElement>(null)` (line 72), add:

```tsx
    const reactId = useId()
    const errorId = `${id ?? reactId}-error`
```

Update the `<textarea>` element (lines 107-126) to add `aria-describedby` and `aria-invalid`:

```tsx
        <textarea
          id={id}
          ref={textareaRef}
          name={name}
          value={value}
          onChange={onChange}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className={cn(
            'rounded-lg border border-border-primary p-2 py-2.5 px-3 max-h-96 min-h-12 text-sm transition',
            'bg-surface-base-content placeholder:text-text-specific-input-placeholder focus:outline-none !text-text-primary show-scroll w-auto [scrollbar-width:auto]',
            error && 'border-border-error',
            !error && 'focus:border-border-secondary hover:border-border-secondary',
            className,
            disabled && 'bg-surface-base-chat !text-text-secondary hover:border-border-primary'
          )}
          readOnly={readonly}
          autoComplete={sensitive ? 'off' : undefined}
          required={required}
          disabled={disabled}
          {...rest}
        />
```

Update the error render (line 128):

```tsx
        {error && (
          <div id={errorId} role="alert" className="text-text-error text-sm">
            {error}
          </div>
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/form/Textarea/__tests__/Textarea.test.tsx`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/Textarea/Textarea.tsx src/components/form/Textarea/__tests__/Textarea.test.tsx
git commit -m "EPMCDME-8550: Associate Textarea error message with textarea via aria-describedby"
```

---

### Task 2: FilesDropzone — associate "Add file" errors with the file input

**Files:**
- Modify: `src/components/form/FilesDropzone/FilesDropzone.tsx`
- Modify: `src/components/form/FilesDropzone/components/FileDropArea.tsx`
- Modify: `src/components/form/FilesDropzone/components/FileDropzoneErrors.tsx`
- Test: `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` (new file)

**Interfaces:**
- Consumes: Task 1's `useId`-fallback idiom (same shape, no shared code — each component derives its own id).
- Produces:
  - `FileDropArea` gains an optional prop `errorId?: string`, rendered as `aria-describedby={errorId}` / `aria-invalid={!!errorId}` on the file `<input>`.
  - `FileDropzoneErrors` props change from `{ filesCount: number; errors: Array<{ message: string } | undefined>; showErrors: boolean }` to `{ messages: string[]; errorId: string }` — it now only renders the already-filtered/deduped message list inside one wrapper `<div id={errorId}>`, and returns `null` when `messages.length === 0`. The filtering/dedup logic (previously inside `FileDropzoneErrors`) moves up into `FilesDropzone`.
  - `FilesDropzone` (the only consumer of both) computes `errorId = \`${name}-errors\`` and the deduped `errorsMessages` list, and wires both children together.

- [ ] **Step 1: Write the failing tests**

Create `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FilesDropzone from '../FilesDropzone'

vi.mock('@/components/form/DropzoneArea', () => ({
  default: ({ children, onClick }: any) => (
    <div onClick={onClick}>{children(false)}</div>
  ),
}))

vi.mock('@/components/form/InfoBox', () => ({
  default: () => <div />,
}))

const noop = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
})

describe('FilesDropzone', () => {
  describe('error association', () => {
    it('links the file input to a single error wrapper via aria-describedby', () => {
      render(
        <FilesDropzone
          name="files"
          files={[]}
          onChange={noop}
          errors={[{ message: 'File too large' }]}
          showErrors
        />
      )

      const fileInput = screen.getByLabelText('Select files to upload')
      const errorText = screen.getByText('File too large')
      const wrapper = errorText.parentElement as HTMLElement

      expect(wrapper).toHaveAttribute('id', fileInput.getAttribute('aria-describedby'))
      expect(fileInput).toHaveAttribute('aria-invalid', 'true')
    })

    it('does not render aria-describedby or a wrapper when there are no errors', () => {
      render(<FilesDropzone name="files" files={[]} onChange={noop} />)

      const fileInput = screen.getByLabelText('Select files to upload')

      expect(fileInput).not.toHaveAttribute('aria-describedby')
      expect(fileInput).not.toHaveAttribute('aria-invalid')
    })

    it('groups multiple simultaneous error messages inside the same single wrapper id', () => {
      render(
        <FilesDropzone
          name="files"
          files={[]}
          onChange={noop}
          errors={[{ message: 'File too large' }, { message: 'Unsupported format' }]}
          showErrors
        />
      )

      const fileInput = screen.getByLabelText('Select files to upload')
      const describedBy = fileInput.getAttribute('aria-describedby')

      const firstError = screen.getByText('File too large')
      const secondError = screen.getByText('Unsupported format')

      expect(firstError.parentElement).toHaveAttribute('id', describedBy)
      expect(secondError.parentElement).toBe(firstError.parentElement)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`
Expected: FAIL — the file input has no `aria-describedby`/`aria-invalid`, and `FileDropzoneErrors` renders bare sibling `<div>`s with no shared wrapper `id`.

- [ ] **Step 3: Implement the minimal fix**

Edit `src/components/form/FilesDropzone/components/FileDropzoneErrors.tsx` — replace the whole file body with a simpler renderer that takes pre-computed messages and a shared id:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { FC } from 'react'

type Props = {
  messages: string[]
  errorId: string
}

export const FileDropzoneErrors: FC<Props> = ({ messages, errorId }) => {
  if (messages.length === 0) return null

  return (
    <div id={errorId}>
      {messages.map((errorMessage) => (
        <div className="text-text-error text-sm" key={errorMessage} role="alert">
          {errorMessage}
        </div>
      ))}
    </div>
  )
}
```

Edit `src/components/form/FilesDropzone/components/FileDropArea.tsx` — add `errorId` to the props type (after `onChange`, line 27-32) and wire it to the `<input>` (lines 84-92):

```tsx
type FileDropArea = {
  name: string
  uploadedFilesCount: number
  files: File[]
  onChange: (updatedFiles: File[]) => void
  errorId?: string
}
export const FileDropArea: FC<FileDropArea> = ({
  name,
  files,
  uploadedFilesCount,
  onChange,
  errorId,
}) => {
```

```tsx
      <input
        ref={fileInputRef}
        id={name}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
        aria-label="Select files to upload"
        aria-describedby={errorId}
        aria-invalid={!!errorId}
      />
```

Edit `src/components/form/FilesDropzone/FilesDropzone.tsx` — move the filtering/dedup logic up from `FileDropzoneErrors`, derive `errorId`, and pass both down:

```tsx
import { FC, useMemo } from 'react'

import { FileDropArea } from '@/components/form/FilesDropzone/components/FileDropArea'
import { FileDropzoneErrors } from '@/components/form/FilesDropzone/components/FileDropzoneErrors'
import { FileList } from '@/components/form/FilesDropzone/components/FileList'
import InfoBox from '@/components/form/InfoBox'
import { SUPPORTED_FILE_FORMATS_MESSAGE_BASE } from '@/constants/common'

const MAX_FILE_SIZE_MB = 100
const MAX_IMAGE_FILE_SIZE_MB = 10

type Props = {
  name: string
  files: File[]
  onChange: (updatedFiles: File[]) => void
  errors?: Array<{ message: string } | undefined>
  showErrors?: boolean
  uploadedFiles?: string[]
  onUploadedFileRemove?: (name: string, itemIndex: number) => void
}

const FilesDropzone: FC<Props> = ({
  name,
  files,
  onChange,
  errors = [],
  showErrors = false,
  uploadedFiles = [],
  onUploadedFileRemove,
}) => {
  const errorId = `${name}-errors`

  const errorsMessages = useMemo(
    () =>
      Array.from(
        new Set(
          (errors ?? [])
            .filter((e): e is { message: string } => !!e?.message && (showErrors || files.length > 0))
            .map((e) => e.message)
        )
      ),
    [errors, files.length, showErrors]
  )

  const hasErrors = errorsMessages.length > 0

  return (
    <div className="flex flex-col gap-3">
      <FileDropArea
        name={name}
        files={files}
        uploadedFilesCount={uploadedFiles.length}
        onChange={onChange}
        errorId={hasErrors ? errorId : undefined}
      />
      <FileList
        files={files}
        onChange={onChange}
        uploadedFiles={uploadedFiles}
        onUploadedFileRemove={onUploadedFileRemove}
      />
      <InfoBox
        text={`${SUPPORTED_FILE_FORMATS_MESSAGE_BASE} Max file size: ${MAX_FILE_SIZE_MB}Mb (images: ${MAX_IMAGE_FILE_SIZE_MB}Mb).`}
      />
      <FileDropzoneErrors errorId={errorId} messages={errorsMessages} />
    </div>
  )
}

export default FilesDropzone
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/FilesDropzone/FilesDropzone.tsx \
  src/components/form/FilesDropzone/components/FileDropArea.tsx \
  src/components/form/FilesDropzone/components/FileDropzoneErrors.tsx \
  src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx
git commit -m "EPMCDME-8550: Associate FilesDropzone error messages with the file input"
```

---

### Task 3: Verification pass

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: no new errors from the changed files.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck` (or the repo's exact tsc script per `.ai-run/guides/quality-gates.md`)
Expected: no type errors — `FileDropzoneErrors`'s new `Props` type and `FileDropArea`'s new `errorId?: string` prop must type-check cleanly with all call sites (only `FilesDropzone.tsx` calls either).

- [ ] **Step 3: Run the two new/relevant test files together**

Run: `npx vitest run src/components/form/Textarea/__tests__/Textarea.test.tsx src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`
Expected: PASS — 6 tests total, all green.

- [ ] **Step 4: No commit needed** (verification-only task; if lint/typecheck required fixes, amend the relevant Task 1/2 commit content into a new fix commit instead of amending history)

---

## Test-first summary

- Task 1 — Test-first: yes — failing tests assert `Textarea`'s `<textarea>` has `aria-describedby` pointing at the error `<div>`'s `id`, `aria-invalid="true"` when there's an error (and `"false"` / no `aria-describedby` when there isn't), and that the association still works when no `id` prop is passed (useId fallback).
- Task 2 — Test-first: yes — failing tests assert the `FilesDropzone` file `<input>` has `aria-describedby` pointing at a single wrapper `<div>`'s `id` around all `FileDropzoneErrors` messages, `aria-invalid` toggles with error presence, and multiple simultaneous error messages share the same single wrapper id (not per-message ids).
- Task 3 — no new tests (verification of lint/typecheck/test-run only).
