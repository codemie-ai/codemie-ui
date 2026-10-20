# EPMCDME-8561 — Announce the added file by name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user adds or removes a file in the Data Sources file dropzone, the existing live region must announce *which file* changed, not only the new count — satisfying WCAG 2.1 SC 4.1.3 (Status Messages).

**Architecture:** `FilesDropzone` already owns a polite live region (`useAnnouncementQueue` + `Announcement`). It currently diffs on `files.length + uploadedFiles.length` and announces a count-only message. We keep that single region and change two things: (1) the diff key moves from *count* to *file identity* (the multiset of names), so a same-count replacement is still announced; (2) the message text is produced by a new pure module, `announcements.ts`, which turns a previous/next name list into the queued messages. Message building is pure and unit-tested in isolation; the component keeps only the effect wiring.

**Tech Stack:** React 18 + TypeScript, Vitest 1.6.1 + @testing-library/react, Tailwind (`sr-only`).

## Global Constraints

- Repo: `codemie-ui`. Branch: `EPMCDME-8561_announce-uploaded-file`, based on `main` @ `1bf0010d7`.
- Commit format enforced by Tekton CI: `EPMCDME-8561: Capital sentence` (first word after the colon must be capitalised).
- Every new source file must start with the repo's Apache-2.0 license header (`// Copyright 2026 EPAM Systems, Inc. ("EPAM")` … block) — enforced by lint-staged.
- Exactly **one** `role="status"` region may exist per `FilesDropzone` instance. Do **not** add a second `<Announcement>`; existing tests use `screen.getByRole('status')` (singular) and would break.
- Reuse `useAnnouncementQueue`/`Announcement`. Do not introduce a new announcer, portal, or `ModalAnnouncerHost`.
- Announcements are serialised 1000 ms apart by the queue (max 5 queued). Never emit one message per file in a multi-file selection — aggregate.
- Existing announcement assertions use `toHaveTextContent`, which is a **substring** match; the new messages must keep the existing count phrases (`N of M files selected`, `No files selected`) verbatim as a suffix so current tests stay green.
- Verification of the live region must read the accessibility tree / `role="status"`, never raw DOM `textContent` of an arbitrary node.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/form/FilesDropzone/announcements.ts` (create) | Pure functions: multiset diff of file-name lists → ordered live-region messages. No React. |
| `src/components/form/FilesDropzone/__tests__/announcements.test.ts` (create) | Unit tests for the pure builder — grammar, truncation, multiset behaviour. |
| `src/components/form/FilesDropzone/FilesDropzone.tsx` (modify, lines 70–87) | Swap the count-based diff ref for a name-based one; feed the builder's messages to `announce`. |
| `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` (modify, `file count announcements` block) | Component-level tests that the name reaches the `role="status"` region. |

---

### Task 1: Pure announcement builder

**Files:**
- Create: `src/components/form/FilesDropzone/announcements.ts`
- Test: `src/components/form/FilesDropzone/__tests__/announcements.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `MAX_ANNOUNCED_FILE_NAMES: number` (= 3)
  - `buildFileAnnouncements(previousNames: string[], currentNames: string[], maxFiles: number): string[]`
    Returns `[]` when the multisets are equal; otherwise the added message first, then the removed message.

- [ ] **Step 1: Write the failing test**

Create `src/components/form/FilesDropzone/__tests__/announcements.test.ts` (with the license header):

```ts
import { describe, expect, it } from 'vitest'

import { buildFileAnnouncements } from '../announcements'

describe('buildFileAnnouncements', () => {
  it('returns nothing when the file list is unchanged', () => {
    expect(buildFileAnnouncements(['a.txt'], ['a.txt'], 10)).toEqual([])
  })

  it('names the single added file and keeps the running total', () => {
    expect(buildFileAnnouncements([], ['report.pdf'], 10)).toEqual([
      'report.pdf added. 1 of 10 files selected',
    ])
  })

  it('aggregates several added files into one message', () => {
    expect(buildFileAnnouncements([], ['a.txt', 'b.txt'], 10)).toEqual([
      '2 files added: a.txt, b.txt. 2 of 10 files selected',
    ])
  })

  it('truncates long lists of added files', () => {
    expect(buildFileAnnouncements([], ['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt'], 10)).toEqual([
      '5 files added: a.txt, b.txt, c.txt and 2 more. 5 of 10 files selected',
    ])
  })

  it('names the removed file', () => {
    expect(buildFileAnnouncements(['a.txt', 'b.txt'], ['a.txt'], 10)).toEqual([
      'b.txt removed. 1 of 10 files selected',
    ])
  })

  it('reports an empty selection when the last file is removed', () => {
    expect(buildFileAnnouncements(['a.txt'], [], 10)).toEqual(['a.txt removed. No files selected'])
  })

  it('announces a replacement that keeps the count unchanged', () => {
    expect(buildFileAnnouncements(['a.txt'], ['b.txt'], 10)).toEqual([
      'b.txt added. 1 of 10 files selected',
      'a.txt removed. 1 of 10 files selected',
    ])
  })

  it('treats repeated names as distinct entries', () => {
    expect(buildFileAnnouncements(['a.txt'], ['a.txt', 'a.txt'], 10)).toEqual([
      'a.txt added. 2 of 10 files selected',
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/form/FilesDropzone/__tests__/announcements.test.ts`
Expected: FAIL — `Failed to resolve import "../announcements"`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/form/FilesDropzone/announcements.ts` (license header first, then):

```ts
export const MAX_ANNOUNCED_FILE_NAMES = 3

const namesOnlyIn = (source: string[], other: string[]): string[] => {
  const remaining = new Map<string, number>()

  other.forEach((name) => remaining.set(name, (remaining.get(name) ?? 0) + 1))

  return source.filter((name) => {
    const left = remaining.get(name) ?? 0

    if (left === 0) return true

    remaining.set(name, left - 1)

    return false
  })
}

const describeNames = (names: string[], verb: 'added' | 'removed'): string => {
  if (names.length === 1) return `${names[0]} ${verb}`

  const shown = names.slice(0, MAX_ANNOUNCED_FILE_NAMES)
  const rest = names.length - shown.length
  const list = rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ')

  return `${names.length} files ${verb}: ${list}`
}

export const buildFileAnnouncements = (
  previousNames: string[],
  currentNames: string[],
  maxFiles: number
): string[] => {
  const added = namesOnlyIn(currentNames, previousNames)
  const removed = namesOnlyIn(previousNames, currentNames)

  if (added.length === 0 && removed.length === 0) return []

  const total =
    currentNames.length === 0
      ? 'No files selected'
      : `${currentNames.length} of ${maxFiles} files selected`

  return [
    ...(added.length > 0 ? [`${describeNames(added, 'added')}. ${total}`] : []),
    ...(removed.length > 0 ? [`${describeNames(removed, 'removed')}. ${total}`] : []),
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/form/FilesDropzone/__tests__/announcements.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/FilesDropzone/announcements.ts \
        src/components/form/FilesDropzone/__tests__/announcements.test.ts
git commit -m "EPMCDME-8561: Add file announcement message builder"
```

---

### Task 2: Announce by name from FilesDropzone

**Files:**
- Modify: `src/components/form/FilesDropzone/FilesDropzone.tsx:70-87` (diff ref + effect) and its import block
- Test: `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` (extend the `file count announcements` block)

**Interfaces:**
- Consumes: `buildFileAnnouncements(previousNames, currentNames, maxFiles)` from Task 1.
- Produces: no new exports; `FilesDropzone`'s props are unchanged.

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('file count announcements', ...)` block of
`src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`:

```tsx
    it('announces the name of the added file', async () => {
      const { rerender } = render(<FilesDropzone name="files" files={[]} onChange={noop} />)

      rerender(<FilesDropzone name="files" files={[makeFile('report.pdf')]} onChange={noop} />)

      await expectAnnouncement('report.pdf added. 1 of 10 files selected')
    })

    it('announces the name of the removed file', async () => {
      const { rerender } = render(
        <FilesDropzone name="files" files={[makeFile('a.txt'), makeFile('b.txt')]} onChange={noop} />
      )

      rerender(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)

      await expectAnnouncement('b.txt removed. 1 of 10 files selected')
    })

    it('announces a replacement that leaves the count unchanged', async () => {
      const { rerender } = render(
        <FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />
      )

      rerender(<FilesDropzone name="files" files={[makeFile('b.txt')]} onChange={noop} />)

      await expectAnnouncement('b.txt added. 1 of 10 files selected')
    })

    it('names an already uploaded file that is removed', async () => {
      const { rerender } = render(
        <FilesDropzone name="files" files={[]} onChange={noop} uploadedFiles={['old.txt']} />
      )

      rerender(<FilesDropzone name="files" files={[]} onChange={noop} uploadedFiles={[]} />)

      await expectAnnouncement('old.txt removed. No files selected')
    })

    it('stays silent when the same files are re-rendered as new objects', async () => {
      const { rerender } = render(
        <FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />
      )

      rerender(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(screen.getByRole('status')).toHaveTextContent('')
    })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`
Expected: FAIL — the four name assertions time out in `waitFor` because the region still reads
`1 of 10 files selected` with no file name, and the replacement case announces nothing at all.

- [ ] **Step 3: Write the minimal implementation**

In `src/components/form/FilesDropzone/FilesDropzone.tsx`, add the import next to the other local
imports:

```tsx
import { buildFileAnnouncements } from '@/components/form/FilesDropzone/announcements'
```

Replace lines 70–87 (the `filesCount` / `previousFilesCount` / `useEffect` block) with:

```tsx
  const fileNames = useMemo(
    () => [...uploadedFiles, ...files.map((file) => file.name)],
    [files, uploadedFiles]
  )
  const previousFileNames = useRef<string[] | null>(null)
  const { announcement, announce } = useAnnouncementQueue()

  useEffect(() => {
    const previousNames = previousFileNames.current

    previousFileNames.current = fileNames

    if (previousNames === null) return

    buildFileAnnouncements(previousNames, fileNames, maxFiles).forEach(announce)
  }, [announce, fileNames, maxFiles])
```

`filesCount` is not used anywhere else in the file (verify with
`grep -n filesCount src/components/form/FilesDropzone/FilesDropzone.tsx` — the only hits are the
lines being replaced); `useMemo` and `useRef` are already imported at line 16.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/form/FilesDropzone`
Expected: PASS — the whole `FilesDropzone` suite, including the four pre-existing count
assertions (`1 of 10 files selected`, `2 of 10 files selected`, `No files selected`), which still
match as substrings of the new messages.

- [ ] **Step 5: Run the repo gates**

Run: `npm run typecheck && npx eslint src/components/form/FilesDropzone --ext .ts,.tsx`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/form/FilesDropzone/FilesDropzone.tsx \
        src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx
git commit -m "EPMCDME-8561: Announce added and removed files by name"
```

---

## Out of scope

- `src/components/form/File/File.tsx` — holds the literal `Select file` from the ticket text but has
  no importer (dead code). Deleting it is a separate cleanup, not part of this bug fix.
- Any change to `useAnnouncementQueue` timing, to `Announcement`, or to where the region is mounted.
  The `#app`/`aria-hidden` trap was verified not to apply on this surface.
