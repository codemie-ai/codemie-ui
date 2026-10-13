# Skill Bundle Ceiling Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a non-blocking warning in the skill editor's bundle files section when the
currently-edited bundle exceeds the backend seeding ceilings (10 MB total size, 100 files),
without ever blocking save.

**Architecture:** Pure client-side derived state. A new aggregation helper in
`skillBundleUtils.ts` computes `{ totalSizeBytes, fileCount }` from the in-memory
`companionFiles` array; `SkillBundleFilesSection.tsx` compares the totals against two new
constants and renders an `InfoWarning` banner when either is exceeded. No store, API, or
validation-schema changes.

**Tech Stack:** React 18, TypeScript 5, Vitest + React Testing Library (`unit` project).

**Spec:** `docs/superpowers/tasks/2026-10-06-skill-bundle-ceiling-warning/spec.md`

## Global Constraints

- Ceiling values: `MAX_SKILL_BUNDLE_SIZE_BYTES = 10 * 1024 * 1024` (10 MB),
  `MAX_SKILL_BUNDLE_FILE_COUNT = 100`.
- Warning must never block save — do not touch `skillValidation.ts` or `useSkillForm.tsx`
  submit logic.
- Missing `size_bytes` on a `SkillCompanionFile` counts as `0` in the size total.
- Use the existing `InfoWarning` component (`type: InfoWarningType.WARNING`) — no hand-rolled
  warning markup.
- Message wording (exact, per approved spec):
  - Both exceeded: `` `This bundle has ${fileCount} files (limit ${MAX_SKILL_BUNDLE_FILE_COUNT}) and is ${formatFileSize(totalSizeBytes)} (limit 10 MB). Only files up to these limits will be copied into a new workspace.` ``
  - Count only: `` `This bundle has ${fileCount} files (limit ${MAX_SKILL_BUNDLE_FILE_COUNT}). Only files up to this limit will be copied into a new workspace.` ``
  - Size only: `` `This bundle is ${formatFileSize(totalSizeBytes)} (limit 10 MB). Only files up to this limit will be copied into a new workspace.` ``

---

### Task 1: Add bundle ceiling constants

**Files:**
- Modify: `src/constants/skills.ts`
- Test: none (plain constant literals; covered indirectly by Task 2/3 tests)

**Interfaces:**
- Produces: `MAX_SKILL_BUNDLE_SIZE_BYTES: number`, `MAX_SKILL_BUNDLE_FILE_COUNT: number` —
  exported named constants consumed by Task 2 and Task 3.

Test-first: no — plain constant declarations, nothing to assert in isolation; behavior is
covered by the aggregation and component tests in Tasks 2–3.

- [ ] **Step 1: Add the constants**

Append to `src/constants/skills.ts` (after the existing `MAX_CONTENT_LENGTH` line):

```ts
export const MAX_SKILL_BUNDLE_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_SKILL_BUNDLE_FILE_COUNT = 100
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/skills.ts
git commit -m "EPMCDME-15558: Add skill bundle ceiling constants"
```

---

### Task 2: Add `getBundleTotals` and export `formatFileSize` from `skillBundleUtils.ts`

**Files:**
- Modify: `src/pages/skills/utils/skillBundleUtils.ts`
- Modify: `src/pages/skills/components/SkillBundleFilesSection.tsx` (remove the local
  `formatFileSize`, import the shared one instead)
- Test: `src/pages/skills/utils/__tests__/skillBundleUtils.test.ts`

**Interfaces:**
- Consumes: `SkillCompanionFile` type from `@/types/entity/skill` (fields `path`, `size_bytes?`).
- Produces:
  - `formatFileSize(sizeBytes?: number): string` — moved here verbatim from
    `SkillBundleFilesSection.tsx`, now exported.
  - `getBundleTotals(companionFiles: SkillCompanionFile[]): { totalSizeBytes: number; fileCount: number }`
    — consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

Add to `src/pages/skills/utils/__tests__/skillBundleUtils.test.ts` (new `describe` blocks
alongside the existing `normalizeBundleFolderPath` tests; add the import at the top):

```ts
import { formatFileSize, getBundleTotals } from '../skillBundleUtils'
import { SkillCompanionFile } from '@/types/entity/skill'

const makeFile = (path: string, size_bytes?: number): SkillCompanionFile => ({
  path,
  content: '',
  encoding: 'text',
  size_bytes,
})

describe('getBundleTotals', () => {
  it('returns zero totals for an empty bundle', () => {
    expect(getBundleTotals([])).toEqual({ totalSizeBytes: 0, fileCount: 0 })
  })

  it('sums size_bytes across files and counts files', () => {
    const files = [makeFile('a.md', 1000), makeFile('b.md', 2000)]
    expect(getBundleTotals(files)).toEqual({ totalSizeBytes: 3000, fileCount: 2 })
  })

  it('treats a missing size_bytes as 0', () => {
    const files = [makeFile('a.md', 1000), makeFile('b.md', undefined)]
    expect(getBundleTotals(files)).toEqual({ totalSizeBytes: 1000, fileCount: 2 })
  })
})

describe('formatFileSize', () => {
  it('returns "Unknown size" when sizeBytes is undefined', () => {
    expect(formatFileSize(undefined)).toBe('Unknown size')
  })

  it('formats bytes under 1024 as B', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats sizes under 1MB as KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats sizes at or above 1MB as MB', () => {
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/skills/utils/__tests__/skillBundleUtils.test.ts`
Expected: FAIL — `getBundleTotals` and `formatFileSize` are not exported from
`../skillBundleUtils`.

- [ ] **Step 3: Implement `getBundleTotals` and move+export `formatFileSize`**

In `src/pages/skills/utils/skillBundleUtils.ts`, add near the top (after the existing imports,
before `TEXT_FILE_EXTENSIONS`):

```ts
export const formatFileSize = (sizeBytes?: number): string => {
  if (sizeBytes == null) return 'Unknown size'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}
```

And add near the end of the file (after `fileToSkillCompanionFile`):

```ts
export const getBundleTotals = (
  companionFiles: SkillCompanionFile[]
): { totalSizeBytes: number; fileCount: number } => {
  const totalSizeBytes = companionFiles.reduce((sum, file) => sum + (file.size_bytes ?? 0), 0)

  return { totalSizeBytes, fileCount: companionFiles.length }
}
```

In `src/pages/skills/components/SkillBundleFilesSection.tsx`:
- Remove the local `formatFileSize` function definition (currently lines 37–42).
- Change the import from `../utils/skillBundleUtils` to include `formatFileSize`:

```ts
import {
  collectBundleFolders,
  fileToSkillCompanionFile,
  formatFileSize,
  getBundleFileName,
  getBundleFolderPath,
  normalizeBundleFolderPath,
} from '../utils/skillBundleUtils'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/skills/utils/__tests__/skillBundleUtils.test.ts`
Expected: PASS (all tests, including the pre-existing `normalizeBundleFolderPath` ones).

Also run the existing component test to confirm the `formatFileSize` relocation didn't break it:
Run: `npx vitest run --project unit src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/skills/utils/skillBundleUtils.ts src/pages/skills/utils/__tests__/skillBundleUtils.test.ts src/pages/skills/components/SkillBundleFilesSection.tsx
git commit -m "EPMCDME-15558: Add bundle totals helper and share formatFileSize"
```

---

### Task 3: Render the ceiling warning in `SkillBundleFilesSection.tsx`

**Files:**
- Modify: `src/pages/skills/components/SkillBundleFilesSection.tsx`
- Test: `src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`

**Interfaces:**
- Consumes: `getBundleTotals` and `formatFileSize` from `../utils/skillBundleUtils` (Task 2);
  `MAX_SKILL_BUNDLE_SIZE_BYTES`, `MAX_SKILL_BUNDLE_FILE_COUNT` from `@/constants/skills` (Task 1);
  `InfoWarning` from `@/components/InfoWarning`; `InfoWarningType` from `@/constants`.
- Produces: no new exports — this is the leaf UI change.

Test-first: yes — write the four warning-visibility tests below before adding the
`useMemo`/`InfoWarning` render block; they fail (banner absent) until the implementation lands.

- [ ] **Step 1: Write the failing tests**

Add to `src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx` (check the
existing file's import/render helper first and reuse it; the shape below assumes a
`renderComponent(props)` helper already exists per the file's current 2 tests — if it does not,
inline `render(<SkillBundleFilesSection companionFiles={[]} folders={[]} onCompanionFilesChange={vi.fn()} onFoldersChange={vi.fn()} {...overrides} />)` instead):

```ts
describe('bundle ceiling warning', () => {
  const makeFile = (path: string, size_bytes: number) => ({
    path,
    content: '',
    encoding: 'text' as const,
    size_bytes,
  })

  it('shows no warning when under both ceilings', () => {
    renderComponent({ companionFiles: [makeFile('a.md', 1000)] })
    expect(screen.queryByText(/limit/i)).not.toBeInTheDocument()
  })

  it('shows a size-specific warning when the size ceiling is exceeded', () => {
    renderComponent({ companionFiles: [makeFile('a.md', 11 * 1024 * 1024)] })
    expect(
      screen.getByText(/This bundle is 11\.0 MB \(limit 10 MB\)\. Only files up to this limit/i)
    ).toBeInTheDocument()
  })

  it('shows a count-specific warning when the file-count ceiling is exceeded', () => {
    const files = Array.from({ length: 101 }, (_, i) => makeFile(`f${i}.md`, 10))
    renderComponent({ companionFiles: files })
    expect(
      screen.getByText(/This bundle has 101 files \(limit 100\)\. Only files up to this limit/i)
    ).toBeInTheDocument()
  })

  it('shows a combined warning when both ceilings are exceeded', () => {
    const files = Array.from({ length: 101 }, (_, i) => makeFile(`f${i}.md`, 11 * 1024 * 1024))
    renderComponent({ companionFiles: files })
    expect(
      screen.getByText(
        /This bundle has 101 files \(limit 100\) and is .* \(limit 10 MB\)\. Only files up to these limits/i
      )
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`
Expected: FAIL on all four new tests — no warning text is rendered yet.

- [ ] **Step 3: Implement the warning**

In `src/pages/skills/components/SkillBundleFilesSection.tsx`:

Add imports:

```ts
import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import { MAX_SKILL_BUNDLE_FILE_COUNT, MAX_SKILL_BUNDLE_SIZE_BYTES } from '@/constants/skills'
```

(keep the existing `getBundleTotals`/`formatFileSize` import from Task 2 as-is)

Inside the component body, after the existing `groupedFiles` `useMemo` and before the
`updateFolders` function, add:

```ts
const bundleTotals = useMemo(() => getBundleTotals(companionFiles), [companionFiles])

const exceedsSize = bundleTotals.totalSizeBytes > MAX_SKILL_BUNDLE_SIZE_BYTES
const exceedsCount = bundleTotals.fileCount > MAX_SKILL_BUNDLE_FILE_COUNT

const bundleCeilingWarning = useMemo(() => {
  if (!exceedsSize && !exceedsCount) return null

  if (exceedsSize && exceedsCount) {
    return `This bundle has ${bundleTotals.fileCount} files (limit ${MAX_SKILL_BUNDLE_FILE_COUNT}) and is ${formatFileSize(bundleTotals.totalSizeBytes)} (limit 10 MB). Only files up to these limits will be copied into a new workspace.`
  }

  if (exceedsCount) {
    return `This bundle has ${bundleTotals.fileCount} files (limit ${MAX_SKILL_BUNDLE_FILE_COUNT}). Only files up to this limit will be copied into a new workspace.`
  }

  return `This bundle is ${formatFileSize(bundleTotals.totalSizeBytes)} (limit 10 MB). Only files up to this limit will be copied into a new workspace.`
}, [exceedsSize, exceedsCount, bundleTotals])
```

In the JSX returned by the component, render the warning immediately above the
`<div className="flex flex-col gap-3">` wrapper that holds `groupedFiles.map(...)`:

```tsx
{bundleCeilingWarning && (
  <InfoWarning type={InfoWarningType.WARNING} message={bundleCeilingWarning} />
)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`
Expected: PASS (all tests, including the 2 pre-existing ones and the 4 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/pages/skills/components/SkillBundleFilesSection.tsx src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx
git commit -m "EPMCDME-15558: Show non-blocking warning when skill bundle exceeds ceilings"
```

---

### Task 4: Full-suite regression check for the touched area

**Files:**
- No new files. Verification task only.

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: nothing — confirms no regression in `useSkillForm`, `EditSkillForm`, and
  `skillValidation` tests (none of which should need changes per spec).

Test-first: no — this task runs existing suites to confirm the save/validation contract is
untouched; it adds no new test.

- [ ] **Step 1: Run the full skills-area test suite**

Run: `npx vitest run --project unit src/pages/skills`
Expected: PASS — all existing and new tests green, including
`useSkillForm.test.tsx`, `EditSkillForm.test.tsx`, and `skillValidation.test.ts` unchanged.

- [ ] **Step 2: Type-check**

Run the repo's type-check script per `.ai-run/guides/quality-gates.md` (e.g.
`npm run type-check` — confirm exact script name in `package.json` before running).
Expected: no new errors introduced by this change.

- [ ] **Step 3: Commit (only if any fixups were needed)**

```bash
git add -A
git commit -m "EPMCDME-15558: Fix regressions from bundle ceiling warning"
```

If Step 1 and Step 2 pass with no changes needed, skip this commit — there is nothing to commit.
