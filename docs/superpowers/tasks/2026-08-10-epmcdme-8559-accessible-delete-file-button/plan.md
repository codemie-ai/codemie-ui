# EPMCDME-8559 — Accessible delete-file button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the remove-file control in the file-dropzone list a real, keyboard-reachable button with a per-file accessible name, and hide the decorative icons from assistive technologies.

**Architecture:** `FileListItem` currently renders a bare SVGR `<XMarkSvg onClick={...}>`. Replace it with the repo's existing `@/components/Button` (which renders a real `<button type="button">` and spreads `aria-label` onto it), keeping the icon as a purely decorative child marked `aria-hidden`. No new component, no new dependency — this mirrors the established icon-button pattern in `src/pages/skills/components/SkillBundleFilesSection.tsx:263-271` and the repo guide `.ai-run/guides/patterns/accessibility-patterns.md` ("Icon Button Pattern"). `FileListItem` and `FileList` have zero tests today, so both tasks start by creating the test file.

**Tech Stack:** React 18 + TypeScript, Tailwind, Vitest + @testing-library/react + @testing-library/user-event, `vite-plugin-svgr` (`*.svg?react`).

## Global Constraints

- WCAG 2.1 AA. The ticket cites **4.1.2 (Name, Role, Value)** and **1.1.1 (Non-text Content)**.
- Expected screen-reader output per the ticket: role `button` + an accessible name along the lines of `"Delete file, button"`. The decorative `X` image must be hidden from assistive technologies.
- Reuse `@/components/Button`; do **not** hand-roll a `<div role="button">` or add `tabIndex` to an `<svg>`.
- Vitest runs through `vite.config.ts`, so `vite-plugin-svgr` is active in tests: `*.svg?react` imports render a **real** `<svg>` and forward props. Therefore do **not** `vi.mock` the icon modules in these tests — mocking them would make the `aria-hidden` assertion vacuous.
- Every source file in this repo carries the Apache-2.0 header comment (see any existing file); new files must copy it verbatim.
- Visual parity: the control sits in a tight flex row (`size-4` icon, `text-text-quaternary hover:text-text-primary`). Use `type="tertiary"` (`bg-none border-none`) + `size="small"` so no border/background is introduced.
- Out of scope (report as follow-ups, do not implement): the five other bare-clickable-svg controls found by the research pass (multiselect chip remove, filter clear, field clear, sort icon, chat chevrons) — none of them delete files; and enabling the `jsx-a11y` recommended ruleset in `.eslintrc.cjs`.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/components/form/FilesDropzone/components/FileListItem.tsx` | One row of the file list: icon, name, remove control | Modify — swap bare svg for `Button` |
| `src/components/form/FilesDropzone/components/__tests__/FileListItem.test.tsx` | Unit tests for the row | Create |
| `src/components/form/FilesDropzone/components/__tests__/FileList.test.tsx` | Unit tests for the list wiring (per-row names, correct row removed) | Create |

---

### Task 1: Accessible remove control in `FileListItem`

**Files:**
- Modify: `src/components/form/FilesDropzone/components/FileListItem.tsx:26-42`
- Test: `src/components/form/FilesDropzone/components/__tests__/FileListItem.test.tsx` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks. Existing props are unchanged — `type Props = { fileName: string; onRemove: () => void }`. `fileName` is already available, so the accessible name needs no new plumbing.
- Produces: a row whose remove control is queryable as `screen.getByRole('button', { name: \`Delete file ${fileName}\` })`. Task 2 relies on that exact accessible-name shape.

**Test-first: yes** — `renders the remove control as a button with a per-file accessible name` fails on the current bare-`<svg>` markup with "Unable to find an accessible element with the role 'button'".

- [ ] **Step 1: Write the failing test**

Create `src/components/form/FilesDropzone/components/__tests__/FileListItem.test.tsx`:

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
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import FileListItem from '../FileListItem'

describe('FileListItem', () => {
  it('renders the remove control as a button with a per-file accessible name', () => {
    render(<FileListItem fileName="report.pdf" onRemove={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Delete file report.pdf' })).toBeInTheDocument()
  })

  it('exposes the remove control as a real button element of type button', () => {
    render(<FileListItem fileName="report.pdf" onRemove={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Delete file report.pdf' })

    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('calls onRemove when the remove button is activated with the keyboard', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<FileListItem fileName="report.pdf" onRemove={onRemove} />)

    await user.tab()

    expect(screen.getByRole('button', { name: 'Delete file report.pdf' })).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('calls onRemove on click', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<FileListItem fileName="report.pdf" onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: 'Delete file report.pdf' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('hides the decorative icons from assistive technologies', () => {
    const { container } = render(<FileListItem fileName="report.pdf" onRemove={vi.fn()} />)

    const svgs = container.querySelectorAll('svg')

    expect(svgs.length).toBeGreaterThan(0)
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/form/FilesDropzone/components/__tests__/FileListItem.test.tsx`
Expected: FAIL — `TestingLibraryElementError: Unable to find an accessible element with the role "button"` on the first four tests, and the icon test failing because neither `<svg>` carries `aria-hidden`.

- [ ] **Step 3: Write the minimal implementation**

Rewrite the component body of `src/components/form/FilesDropzone/components/FileListItem.tsx` (keep the existing licence header and the `Props` type as-is):

```tsx
import { FC } from 'react'

import XMarkSvg from '@/assets/icons/cross.svg?react'
import FileSvg from '@/assets/icons/file.svg?react'
import Button from '@/components/Button'
import { ButtonSize, ButtonType } from '@/constants'

type Props = {
  fileName: string
  onRemove: () => void
}

const FileListItem: FC<Props> = ({ fileName, onRemove }) => {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-base-content rounded-lg border border-border-primary">
      <div className="flex items-center gap-2 min-w-0">
        <FileSvg aria-hidden="true" className="size-4 flex-shrink-0 text-text-quaternary" />
        <span className="text-sm text-text-primary truncate">{fileName}</span>
      </div>
      <Button
        type={ButtonType.TERTIARY}
        size={ButtonSize.SMALL}
        aria-label={`Delete file ${fileName}`}
        className="flex-shrink-0 text-text-quaternary hover:text-text-primary"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <XMarkSvg aria-hidden="true" className="size-4" />
      </Button>
    </div>
  )
}

export default FileListItem
```

Notes for the implementer:
- `Button` defaults `buttonType` to `'button'`, so `type="button"` lands on the DOM element automatically; the `type` prop on `Button` is the **visual variant**, not the HTML type.
- `Button` spreads unknown props (`...rest`) onto the `<button>`, which is how `aria-label` and `onClick` reach the DOM.
- Verify the import style for `Button` and the constants against a neighbouring file (`src/pages/skills/components/SkillBundleFilesSection.tsx`) — use whatever that file uses (default vs named import) so lint stays quiet.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/form/FilesDropzone/components/__tests__/FileListItem.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the neighbouring suite for regressions**

Run: `npx vitest run src/components/form/FilesDropzone`
Expected: PASS — existing `FilesDropzone.test.tsx` untouched.

- [ ] **Step 6: Commit**

```bash
git add src/components/form/FilesDropzone/components/FileListItem.tsx \
        src/components/form/FilesDropzone/components/__tests__/FileListItem.test.tsx
git commit -m "EPMCDME-8559: Make delete file control an accessible button"
```

---

### Task 2: Per-row wiring is correct in `FileList`

Task 1 guarantees one row is accessible. This task guarantees the list renders **one uniquely-named button per row** (uploaded files and newly-added files alike) and that activating a given row's button removes **that** row — the property a screen-reader user depends on when the only thing distinguishing the buttons is their accessible name.

**Files:**
- Test: `src/components/form/FilesDropzone/components/__tests__/FileList.test.tsx` (create)
- Modify: none expected. `src/components/form/FilesDropzone/components/FileList.tsx` is only touched if a test genuinely fails.

**Interfaces:**
- Consumes: the accessible-name shape produced by Task 1 — `Delete file ${fileName}`.
- Produces: nothing consumed by later tasks.

**Test-first: yes** — `gives every row its own uniquely named delete button` is written before running anything; if `FileList` already satisfies it, that is a genuine GREEN-on-arrival case (see Step 2) and the task becomes pure characterization coverage of previously untested code.

- [ ] **Step 1: Write the test**

Create `src/components/form/FilesDropzone/components/__tests__/FileList.test.tsx`:

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
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FileList } from '../FileList'

const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

describe('FileList', () => {
  it('renders nothing when there are no files at all', () => {
    render(<FileList files={[]} uploadedFiles={[]} onChange={vi.fn()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('gives every row its own uniquely named delete button', () => {
    render(
      <FileList
        files={[makeFile('new.txt')]}
        uploadedFiles={['old.pdf']}
        onChange={vi.fn()}
        onUploadedFileRemove={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Delete file old.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete file new.txt' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('removes the file whose delete button was activated', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const first = makeFile('a.txt')
    const second = makeFile('b.txt')

    render(<FileList files={[first, second]} uploadedFiles={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Delete file a.txt' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toEqual([second])
  })

  it('reports the uploaded file name and index when an uploaded row is removed', async () => {
    const user = userEvent.setup()
    const onUploadedFileRemove = vi.fn()

    render(
      <FileList
        files={[]}
        uploadedFiles={['first.pdf', 'second.pdf']}
        onChange={vi.fn()}
        onUploadedFileRemove={onUploadedFileRemove}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Delete file second.pdf' }))

    expect(onUploadedFileRemove).toHaveBeenCalledWith('second.pdf', 1)
  })
})
```

- [ ] **Step 2: Run the tests and record the result honestly**

Run: `npx vitest run src/components/form/FilesDropzone/components/__tests__/FileList.test.tsx`

Two legitimate outcomes:
- **All PASS** — `FileList` was already wired correctly; this task adds the first coverage for it. Record in the commit message that no production change was needed. **Do not invent a change to manufacture a RED.**
- **Any FAIL** — fix `FileList.tsx` minimally to satisfy the failing assertion, then re-run until green.

- [ ] **Step 3: Run the whole dropzone suite**

Run: `npx vitest run src/components/form/FilesDropzone`
Expected: PASS (FileListItem + FileList + FilesDropzone).

- [ ] **Step 4: Commit**

```bash
git add src/components/form/FilesDropzone/components/__tests__/FileList.test.tsx
git commit -m "EPMCDME-8559: Cover per-row delete button wiring in FileList"
```

---

### Task 3: Full local gates

**Files:** none — verification only.

**Test-first: n/a** — this task runs the project's existing gates; it writes no new tests.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: PASS, no new violations in the two touched/created files.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Watch for `aria-label` / `ButtonSize` typing on `Button` — `ButtonProps` extends `ButtonHTMLAttributes<HTMLButtonElement>`, so `aria-label` is valid.

- [ ] **Step 3: Unit + integration suites**

Run: `npm run test:unit` then `npm run test:integration`
Expected: PASS, with the unit count up by the new tests.

- [ ] **Step 4: Commit any fix-ups**

```bash
git add -A
git commit -m "EPMCDME-8559: Fix lint and typecheck findings"
```

(Skip if the gates were clean — do not create an empty commit.)

---

## Manual verification (for the MR description and the ticket)

With a screen reader on, at Data Sources → Create Datasource → type **File**:

1. Add a file to the dropzone.
2. Press `Tab` until focus reaches the row's remove control — it must be reachable, which it was not before.
3. The screen reader must announce something of the form **"Delete file report.pdf, button"** — not "graphic clickable".
4. Press `Enter` (and, separately, `Space`) — the row is removed.
5. Neither the file icon nor the X icon is announced separately.

## Follow-ups discovered during research (do not implement here)

- Five other bare-clickable-`svg` controls share this root cause but do not delete files: multiselect chip remove, filter clear, field clear, sort icon, chat chevrons.
- `jsx-a11y` is registered as an ESLint plugin in `.eslintrc.cjs` but its recommended ruleset is not extended, which is why none of these defects fail lint.
