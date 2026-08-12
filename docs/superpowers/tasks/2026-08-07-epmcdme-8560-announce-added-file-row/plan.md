# EPMCDME-8560 — Announce dynamically added/removed rows (WCAG 4.1.3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a screen-reader status announcement when a row is added to or removed from the two dynamic row lists named in the ticket — the datasource file dropzone list and the Integrations → MCP "Environment Variables" key/value list.

**Architecture:** Each of the two components renders its own always-mounted `sr-only` live region (`role="status"`) and drives its text from local `useState`. `RecordInput` sets the text from its add/remove handlers (its two auto-seed effects make a count-derived trigger announce spuriously on mount); `FilesDropzone` derives the text from the total file count in an effect that skips the first render (its add and remove handlers live in two different child components, so the container is the only shared vantage point). No shared announcer primitive is introduced — see Global Constraints.

**Tech Stack:** React 18 + TypeScript, Tailwind (`sr-only`), vitest 1.6.1 + @testing-library/react (unit project), react-hook-form (datasource side, untouched by this change).

## Global Constraints

- **The ticket's repro steps are stale.** It describes a "+Add file" button producing a "Select file" row. That UI no longer exists — `src/components/form/File/File.tsx` is dead code, replaced by a multi-file dropzone in `d3a0f57bc EPMCDME-11151`. The fix targets `FilesDropzone`. Record this deviation in the MR description so the reporter re-tests the right control.
- **Scope is exactly the two flows named in the ticket:** `src/components/form/FilesDropzone/FilesDropzone.tsx` and `src/components/form/RecordInput/RecordInput.tsx`. `src/components/form/InputArray/InputArray.tsx` has the identical defect and is deliberately **out of scope** (follow-up ticket). `MCPServerModal` (admin-side, separate implementation) and `MCPServerEnvVars` (fixed schema-driven list, no add/remove) are also out of scope.
- **No shared announcer.** `.ai-run/guides/patterns/accessibility-patterns.md` mandates inline JSX live regions, and precedent `docs/superpowers/tasks/2026-07-22-epmcdme-8527-fix-screenreader-workflow-status/` deleted an imperative announcer singleton as over-engineering. Two inline regions, no new hook, no new component, no timers, no `blur()` hacks.
- **Do NOT introduce `jest-axe`** — no precedent in this suite (per `docs/superpowers/tasks/2026-07-22-fix-textarea-error-a11y/`). Assertions are plain RTL: `getByRole('status')` + `toHaveTextContent`.
- **No visual change.** Live regions are `className="sr-only"`. No existing markup, layout, or behaviour changes.
- **Adjacent defects are not fixed here**: `FileListItem`'s delete `XMarkSvg` is not a `<button>` and has no accessible name; `RecordInput`'s delete `Button` contains only an SVG with no accessible name; `RecordInput.removeItem` filters by key and so removes all rows sharing a key. All pre-existing, all out of scope.
- **House style** (`.ai-run/guides/components/component-patterns.md`): single quotes, no semicolons, `React.FC<Props>` with an explicit interface, 8-step ESLint import order, files under 300 lines. No new files are created, so no new license headers are needed.
- **Commit format** (Tekton-enforced): `EPMCDME-8560: Capital sentence`. Branch is `EPMCDME-8560_announce-added-file-row`.
- Tests live in the component's `__tests__/` folder and run in the **unit** vitest project (`npm run test:unit`).

---

### Task 1: Announce add/remove in `RecordInput` (MCP Environment Variables)

**Files:**
- Modify: `src/components/form/RecordInput/RecordInput.tsx` (add state + set text in `addEmptyItem`:67 and `removeItem`:72; render region before the closing `</div>`:151)
- Test: `src/components/form/RecordInput/__tests__/RecordInput.test.tsx` (append a new `describe`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks rely on. `RecordInput`'s public props are unchanged — no new prop, no signature change. Consumers (`SettingsForm.tsx:506-520`, `HedgingConfig.tsx`) need no edits.

**Why handler-driven and not count-driven:** `RecordInput.tsx:61-65` auto-inserts an empty row on mount when `value` is empty, and `:74` re-seeds one when the list empties. An effect watching `value.length` would announce on every form open. Setting the message inside the two user-initiated handlers avoids both traps.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/form/RecordInput/__tests__/RecordInput.test.tsx`. Add `useState` to the React import at the top of the file (`import { useState } from 'react'`) and `userEvent` (`import userEvent from '@testing-library/user-event'`), keeping the existing 8-step import order (external packages first, alphabetical).

```tsx
const ControlledRecordInput = ({ initial }: { initial: RecordItem[] }) => {
  const [items, setItems] = useState<RecordItem[]>(initial)

  return (
    <RecordInput
      name="test"
      value={items}
      onChange={setItems}
      addText="Add Environment Variable"
    />
  )
}

const getDeleteButtons = () =>
  screen
    .getAllByRole('button')
    .filter((button) => button.querySelector('[data-testid="delete-icon"]'))

describe('row announcements', () => {
  it('renders an empty status region on mount so the auto-seeded row is not announced', () => {
    render(<ControlledRecordInput initial={[]} />)

    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('announces the new row count when a row is added', async () => {
    const user = userEvent.setup()
    render(<ControlledRecordInput initial={[{ key: 'FOO', value: 'bar' }]} />)

    await user.click(screen.getByRole('button', { name: 'Add Environment Variable' }))

    expect(screen.getByRole('status')).toHaveTextContent('Row added. 2 rows total.')
  })

  it('announces the remaining row count when a row is removed', async () => {
    const user = userEvent.setup()
    render(
      <ControlledRecordInput
        initial={[
          { key: 'FOO', value: 'bar' },
          { key: 'BAZ', value: 'qux' },
        ]}
      />
    )

    await user.click(getDeleteButtons()[0])

    expect(screen.getByRole('status')).toHaveTextContent('Row removed. 1 row total.')
  })

  it('announces one remaining row when the last row is removed and re-seeded', async () => {
    const user = userEvent.setup()
    render(<ControlledRecordInput initial={[{ key: 'FOO', value: 'bar' }]} />)

    await user.click(getDeleteButtons()[0])

    expect(screen.getByRole('status')).toHaveTextContent('Row removed. 1 row total.')
  })
})
```

`RecordItem` is exported from `../RecordInput`; extend the existing import to `import RecordInput, { type RecordItem } from '../RecordInput'`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/components/form/RecordInput/__tests__/RecordInput.test.tsx`
Expected: all four new tests FAIL with `Unable to find an accessible element with the role "status"`.

- [ ] **Step 3: Write the minimal implementation**

In `src/components/form/RecordInput/RecordInput.tsx`:

Change the React import to include `useState`:

```tsx
import React, { useEffect, useState } from 'react'
```

Add the state and a message helper just above `addEmptyItem` (after the `useEffect` at `:61-65`):

```tsx
  const [announcement, setAnnouncement] = useState('')

  const rowCountMessage = (action: string, count: number) =>
    `${action}. ${count} row${count === 1 ? '' : 's'} total.`
```

Set the message in both handlers:

```tsx
  const addEmptyItem = () => {
    if (disabled) return
    const newItems = [...(value || []), { key: '', value: '' }]
    onChange(newItems)
    setAnnouncement(rowCountMessage('Row added', newItems.length))
  }

  const removeItem = (keyToRemove: string) => {
    const filtered = (value || []).filter((item) => item.key !== keyToRemove)
    const newItems = filtered.length ? filtered : [{ key: '', value: '' }]
    onChange(newItems)
    setAnnouncement(rowCountMessage('Row removed', newItems.length))
  }
```

Render the live region as the last child of the outermost `<div>`, immediately after the `{error && ...}` line at `:150`:

```tsx
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/components/form/RecordInput/__tests__/RecordInput.test.tsx`
Expected: PASS — 13 tests (9 pre-existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/form/RecordInput/RecordInput.tsx src/components/form/RecordInput/__tests__/RecordInput.test.tsx
git commit -m "EPMCDME-8560: Announce added and removed rows in RecordInput"
```

---

### Task 2: Announce file add/remove in `FilesDropzone` (datasource File type)

**Files:**
- Modify: `src/components/form/FilesDropzone/FilesDropzone.tsx` (add state + effect after the `errorsMessages` memo at `:49-61`; render region inside the outer `<div>` at `:66-84`)
- Test: `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` (append a new `describe`)

**Interfaces:**
- Consumes: nothing from Task 1 — the two live regions are independent by design (no shared helper).
- Produces: nothing. `FilesDropzone`'s props are unchanged; `IndexTypeFile.tsx`, `FileDropArea.tsx`, `FileList.tsx`, and `FileListItem.tsx` are **not** modified.

**Why count-derived and not handler-driven:** files are added in `FileDropArea.addFiles` (`:42`) and removed in `FileList.removeFile` (`:32`) plus an inline uploaded-file handler in `IndexTypeFile.tsx:67-73` — three call sites in three files. `FilesDropzone` is the single parent that sees every change, and unlike `RecordInput` it has no auto-seed effect, so a count-derived trigger is safe. The first render is skipped so that opening an existing datasource with already-uploaded files announces nothing.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`:

```tsx
const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

describe('file count announcements', () => {
  it('renders an empty status region on the initial render', () => {
    render(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)

    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('announces the new total when a file is added', () => {
    const { rerender } = render(<FilesDropzone name="files" files={[]} onChange={noop} />)

    rerender(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)

    expect(screen.getByRole('status')).toHaveTextContent('1 of 10 files selected')
  })

  it('announces the remaining total when a file is removed', () => {
    const { rerender } = render(
      <FilesDropzone name="files" files={[makeFile('a.txt'), makeFile('b.txt')]} onChange={noop} />
    )

    rerender(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)

    expect(screen.getByRole('status')).toHaveTextContent('1 of 10 files selected')
  })

  it('announces that no files are selected when the last file is removed', () => {
    const { rerender } = render(
      <FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />
    )

    rerender(<FilesDropzone name="files" files={[]} onChange={noop} />)

    expect(screen.getByRole('status')).toHaveTextContent('No files selected')
  })

  it('counts already uploaded files towards the announced total', () => {
    const { rerender } = render(
      <FilesDropzone name="files" files={[]} onChange={noop} uploadedFiles={['old.txt']} />
    )

    rerender(
      <FilesDropzone
        name="files"
        files={[makeFile('a.txt')]}
        onChange={noop}
        uploadedFiles={['old.txt']}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('2 of 10 files selected')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`
Expected: all five new tests FAIL with `Unable to find an accessible element with the role "status"`.

- [ ] **Step 3: Write the minimal implementation**

In `src/components/form/FilesDropzone/FilesDropzone.tsx`:

Extend the React import and add the `MAX_FILES` import (ESLint import order: `@/components/form/FilesDropzone/constants` sorts after `.../components/FileList` and before `@/components/form/InfoBox`):

```tsx
import { FC, useEffect, useId, useMemo, useRef, useState } from 'react'
```

```tsx
import { MAX_FILES } from '@/components/form/FilesDropzone/constants'
```

Add below `const hasErrors = errorsMessages.length > 0` (`:63`):

```tsx
  const filesCount = files.length + uploadedFiles.length
  const previousFilesCount = useRef<number | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (previousFilesCount.current === null) {
      previousFilesCount.current = filesCount

      return
    }

    if (previousFilesCount.current !== filesCount) {
      previousFilesCount.current = filesCount
      setAnnouncement(
        filesCount === 0 ? 'No files selected' : `${filesCount} of ${MAX_FILES} files selected`
      )
    }
  }, [filesCount])
```

Render the live region as the last child of the outer `<div>`, after `<FileDropzoneErrors ... />` (`:83`):

```tsx
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`
Expected: PASS — 9 tests (4 pre-existing + 5 new).

- [ ] **Step 5: Verify no regression in the two consumer suites and commit**

Run: `npx vitest run --project unit src/components/form src/components/StatusBadge`
Expected: PASS.

```bash
git add src/components/form/FilesDropzone/FilesDropzone.tsx src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx
git commit -m "EPMCDME-8560: Announce file list changes in FilesDropzone"
```

---

## Verification (after both tasks)

Mandatory pre-MR gates from `.ai-run/guides/quality-gates.md` — all four must exit 0:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
```

Manual screen-reader check (NVDA or VoiceOver), documented in the MR description:

1. Data Sources → Create Datasource → type **File** → add a file → SR announces "1 of 10 files selected"; remove it → "No files selected".
2. Integrations → create/edit an integration with **Credential Type: MCP** → "Add Environment Variable" → SR announces "Row added. 2 rows total."; delete a row → "Row removed. N row(s) total."
3. Opening either form fresh announces **nothing** (no spurious mount-time announcement).

## Follow-ups (not in this MR)

- `src/components/form/InputArray/InputArray.tsx` has the same WCAG 4.1.3 defect (consumers: `DynamicFieldsForm`, `ConversationStartersField`, `KataFormFields`).
- `FileListItem`'s remove control is a bare SVG with an `onClick` — not keyboard reachable and has no accessible name (WCAG 2.1.1 / 4.1.2).
- `RecordInput.removeItem` filters by `key`, so duplicate keys are all removed at once.
- `.ai-run/guides/patterns/accessibility-patterns.md`'s Pre-Delivery Checklist covers error announcements only; it has no item for dynamic non-error content, which is why this class of bug slips through.
