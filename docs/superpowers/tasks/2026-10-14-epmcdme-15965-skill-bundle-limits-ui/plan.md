# EPMCDME-15965 Skill Bundle Limits and Preview Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the skill editor use the backend's real bundle limits (100 files / 10 MB per file / 50 MB total) and show the server `bundle_warning` returned by ZIP preview.

**Architecture:** (Final state: Task 4 replaced the aggregate local ceiling check with `buildBundleWarning`, a port of the backend seed rules and wording, so Tasks 1-2 wording below is superseded where noted.) Fix the `SkillConfig` key and fallback constants. `useSkillForm` keeps the preview warning in state (set by `applyBundlePreview`, cleared by any `setCompanionFiles` / `setBundleFolders` call, which covers user edits, `.md` import and popup reset). `NewSkillPage` and `CreateSkillPopup` pass it to `SkillForm` through the existing `savedBundleWarning` prop. `SkillBundleFilesSection` flips its precedence: server warning wins until the user edits in that section, tracked by a local flag that resets when the incoming warning prop changes.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-10-14-epmcdme-15965-skill-bundle-limits-ui/spec.md`
**Research:** `docs/superpowers/tasks/2026-10-14-epmcdme-15965-skill-bundle-limits-ui/technical-analysis.md`

## Global Constraints

- `MAX_SKILL_BUNDLE_SIZE_BYTES = 50 * 1024 * 1024`; `MAX_SKILL_BUNDLE_FILE_COUNT` stays 100; add `MAX_SKILL_BUNDLE_FILE_SIZE_BYTES = 10 * 1024 * 1024`.
- `SkillConfig` keys: `bundle_seed_max_file_count`, `bundle_seed_max_file_size_bytes`, `bundle_seed_max_total_size_bytes`.
- Do not remove or rename existing exports other than the wrong config key `bundle_seed_max_size_bytes`.
- No client-side path-length validation, no backend changes. (Task 4 later added the per-file check, as part of mirroring the backend seed rules.)
- Commit subject format: `EPMCDME-15965: Capital sentence` (no trailing period). Never stage `.codemie/codemie-cli.config.json`.
- Do not run prettier/eslint by hand (PostToolUse hook does it). Run `npm ci` before trusting any gate. Run tests as `npx vitest run --project unit <path>`.

## Review Focus

- ZIP re-import with an identical warning string after the user edited files: warning must show again (pinned in Task 2 and Task 3).
- `.md` import after a ZIP preview: warning cleared (Task 3).
- Edit page: `skill.bundle_warning` shows until the user adds or removes a file, then the local ceiling warning applies (Task 2).
- Config loaded but missing a key (older backend): each limit falls back to its constant independently (Task 1).
- Server warning present while bundle is also over the local ceiling: server text shown, not ceiling text (Task 2).

---

### Task 1: Config type, constants, and total-size limit

**Files:**
- Modify: `src/store/skills.ts:43-48`
- Modify: `src/constants/skills.ts:46-47`
- Modify: `src/pages/skills/components/SkillBundleFilesSection.tsx:62`
- Test: `src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`

**Interfaces:**
- Produces: `SkillConfig` with `bundle_seed_max_file_count: number`, `bundle_seed_max_file_size_bytes: number`, `bundle_seed_max_total_size_bytes: number`; constant `MAX_SKILL_BUNDLE_FILE_SIZE_BYTES`.

> Note: the limit-text expectations in this task (`limit 50.0 MB`, `This bundle is ...`) were superseded by Task 4's wording; the key/fallback changes stand.

Test-first: yes — "uses ceilings from skillConfig" re-keyed to `bundle_seed_max_total_size_bytes` fails against current code (still reads the old key, falls back to 10 MB); new tests "no warning for 11 MB / warns at 51 MB with 'limit 50.0 MB'" and "fallback text is 50.0 MB when config unloaded" fail on the 10 MB fallback.

- [ ] **Step 1: Update tests**

In the `bundle ceiling warning` describe of `SkillBundleFilesSection.test.tsx`:
- Size-exceeded test: use `51 * 1024 * 1024`, expect `/This bundle is 51\.0 MB \(limit 50\.0 MB\)\. Only files up to this limit.*assistant workspace/i`.
- Combined test: files at `51 * 1024 * 1024` each ×101 → total `5151.0 MB`; expect `/This bundle has 101 files \(limit 100\) and is 5151\.0 MB \(limit 50\.0 MB\)\. Only files up to these limits.*assistant workspace/i`.
- Config test: replace the config object with
  ```ts
  ;(skillsStore as any).skillConfig = {
    bundle_seed_max_total_size_bytes: 5 * 1024 * 1024,
    bundle_seed_max_file_size_bytes: 1024 * 1024,
    bundle_seed_max_file_count: 50,
  }
  ```
- Add:
  ```ts
  it('does not warn for an 11 MB bundle under a 50 MB total limit', () => {
    ;(skillsStore as any).skillConfig = {
      bundle_seed_max_file_count: 100,
      bundle_seed_max_file_size_bytes: 10 * 1024 * 1024,
      bundle_seed_max_total_size_bytes: 50 * 1024 * 1024,
    }
    renderSection({ companionFiles: [makeFile('a.md', 11 * 1024 * 1024)] })
    expect(screen.queryByText(/limit/i)).not.toBeInTheDocument()
    ;(skillsStore as any).skillConfig = null
  })

  it('falls back per key when config omits the total-size limit', () => {
    ;(skillsStore as any).skillConfig = { bundle_seed_max_file_count: 100 }
    renderSection({ companionFiles: [makeFile('a.md', 51 * 1024 * 1024)] })
    expect(screen.getByText(/limit 50\.0 MB/i)).toBeInTheDocument()
    ;(skillsStore as any).skillConfig = null
  })
  ```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`
Expected: FAIL (limit text 10.0 MB; config test warns with wrong limit).

- [ ] **Step 3: Implement**

`src/store/skills.ts`:
```ts
export interface SkillConfig {
  max_content_length: number
  min_content_length: number
  bundle_seed_max_file_count: number
  bundle_seed_max_file_size_bytes: number
  bundle_seed_max_total_size_bytes: number
}
```
`src/constants/skills.ts`:
```ts
export const MAX_SKILL_BUNDLE_SIZE_BYTES = 50 * 1024 * 1024
export const MAX_SKILL_BUNDLE_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_SKILL_BUNDLE_FILE_COUNT = 100
```
`SkillBundleFilesSection.tsx:62`:
```ts
const maxBundleSizeBytes =
  skillConfig?.bundle_seed_max_total_size_bytes ?? MAX_SKILL_BUNDLE_SIZE_BYTES
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`
Expected: PASS. Also `npx tsc --noEmit` (grep for other uses of the old key: `grep -rn bundle_seed_max_size_bytes src` must return nothing).

- [ ] **Step 5: Commit**

```bash
git add src/store/skills.ts src/constants/skills.ts src/pages/skills/components/SkillBundleFilesSection.tsx src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx
git commit -m "EPMCDME-15965: Read bundle total-size limit from the real config key"
```

---

### Task 2: Warning precedence in SkillBundleFilesSection

**Files:**
- Modify: `src/pages/skills/components/SkillBundleFilesSection.tsx` (state, `updateFolders`, `handleUploadFiles`, `handleRemoveFile`, warning render ~line 207)
- Test: `src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`

**Interfaces:**
- Consumes: existing prop `savedBundleWarning?: string | null`.
- Produces: no new props. Behaviour: shown warning = `hasUserEdited ? bundleCeilingWarning : (savedBundleWarning ?? bundleCeilingWarning)`.

Test-first: yes — "shows the server warning over the ceiling warning" fails because current order is `ceiling ?? saved`; "hides the server warning after remove" and "after upload" fail because nothing hides it.

- [ ] **Step 1: Write failing tests** (add a `describe('server bundle warning')`; extend `renderSection` overrides type with `savedBundleWarning` and `onCompanionFilesChange`)

```ts
it('shows the server warning when the list is unchanged', () => {
  renderSection({ savedBundleWarning: 'Skipped: big.bin' })
  expect(screen.getByText('Skipped: big.bin')).toBeInTheDocument()
})

it('prefers the server warning over the local ceiling warning', () => {
  renderSection({
    companionFiles: [makeFile('a.md', 51 * 1024 * 1024)],
    savedBundleWarning: 'Skipped: big.bin',
  })
  expect(screen.getByText('Skipped: big.bin')).toBeInTheDocument()
  expect(screen.queryByText(/limit 50\.0 MB/i)).not.toBeInTheDocument()
})

it('hides the server warning after the user removes a file and applies the local warning', async () => {
  renderSection({
    companionFiles: [makeFile('a.md', 51 * 1024 * 1024), makeFile('b.md', 10)],
    savedBundleWarning: 'Skipped: big.bin',
  })
  await userEvent.click(screen.getByRole('button', { name: 'Remove b.md' }))
  expect(screen.queryByText('Skipped: big.bin')).not.toBeInTheDocument()
  expect(screen.getByText(/limit 50\.0 MB/i)).toBeInTheDocument()
})

it('hides the server warning after the user uploads a file', async () => {
  const { container } = renderSection({ savedBundleWarning: 'Skipped: big.bin' })
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  await userEvent.upload(input, new File(['x'], 'x.md', { type: 'text/markdown' }))
  await waitFor(() => expect(screen.queryByText('Skipped: big.bin')).not.toBeInTheDocument())
})

it('shows a new server warning after the prop changes following an edit', async () => {
  const props = { companionFiles: [makeFile('a.md', 10), makeFile('b.md', 10)], folders: [] as string[], onCompanionFilesChange: vi.fn(), onFoldersChange: vi.fn() }
  const { rerender } = render(<SkillBundleFilesSection {...props} savedBundleWarning="A" />)
  await userEvent.click(screen.getByRole('button', { name: 'Remove b.md' }))
  expect(screen.queryByText('A')).not.toBeInTheDocument()
  rerender(<SkillBundleFilesSection {...props} savedBundleWarning={null} />)
  rerender(<SkillBundleFilesSection {...props} savedBundleWarning="A" />)
  expect(screen.getByText('A')).toBeInTheDocument()
})
```
Add imports `userEvent` from `@testing-library/user-event` (check it is already used elsewhere in the repo) and `waitFor`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`
Expected: FAIL on precedence/hide tests.

- [ ] **Step 3: Implement**

After the `useState` declarations:
```ts
const [hasUserEdited, setHasUserEdited] = useState(false)

useEffect(() => {
  setHasUserEdited(false)
}, [savedBundleWarning])
```
In `updateFolders` (before `onFoldersChange`), in `handleUploadFiles` (before `onCompanionFilesChange`) and in `handleRemoveFile`: call `setHasUserEdited(true)`.

Replace the render block:
```tsx
const visibleWarning = hasUserEdited
  ? bundleCeilingWarning
  : savedBundleWarning ?? bundleCeilingWarning
...
{visibleWarning && <InfoWarning type={InfoWarningType.WARNING} message={visibleWarning} />}
```
(`visibleWarning` computed above the `return`.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx src/pages/skills/components/__tests__/EditSkillForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/skills/components/SkillBundleFilesSection.tsx src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx
git commit -m "EPMCDME-15965: Prefer server bundle warning until the user edits files"
```

---

### Task 3: Keep the preview warning and show it on New Skill page and popup

**Files:**
- Modify: `src/types/entity/skill.ts:57-62` (add `bundle_warning?: string | null` to `SkillBundlePreview`)
- Modify: `src/pages/skills/hooks/useSkillForm.tsx` (state, `setCompanionFiles`, `setBundleFolders`, `applyBundlePreview`, return value)
- Modify: `src/pages/skills/NewSkillPage.tsx` (destructure `bundlePreviewWarning`, pass `savedBundleWarning` to `SkillForm`)
- Modify: `src/components/CreateSkillPopup.tsx` (same)
- Test: `src/pages/skills/hooks/__tests__/useSkillForm.test.tsx`, `src/pages/skills/__tests__/NewSkillPage.test.tsx`

**Interfaces:**
- Consumes: `savedBundleWarning` prop on `SkillForm` (already forwards to the section).
- Produces: `useSkillForm()` returns `bundlePreviewWarning: string | null`.

Test-first: yes — hook test "applyBundlePreview exposes bundle_warning" fails (`bundlePreviewWarning` undefined); "setCompanionFiles([]) clears it" and "second applyBundlePreview with identical warning after a clear exposes it again" fail likewise; NewSkillPage test "shows the preview warning after ZIP import" fails because nothing is passed.

- [ ] **Step 1: Write failing tests**

In `useSkillForm.test.tsx` (follow its existing render/`renderHook` setup):
```ts
const preview = { name: 'my-skill', description: 'd', content: 'c', companion_files: [], bundle_warning: 'Skipped: big.bin' }

it('exposes the preview bundle_warning after applyBundlePreview', () => {
  const { result } = renderHook(() => useSkillForm())
  act(() => result.current.applyBundlePreview(preview))
  expect(result.current.bundlePreviewWarning).toBe('Skipped: big.bin')
})

it('clears the warning when the files or folders are changed', () => {
  const { result } = renderHook(() => useSkillForm())
  act(() => result.current.applyBundlePreview(preview))
  act(() => result.current.setCompanionFiles([]))
  expect(result.current.bundlePreviewWarning).toBeNull()
  act(() => result.current.applyBundlePreview(preview))
  act(() => result.current.setBundleFolders([]))
  expect(result.current.bundlePreviewWarning).toBeNull()
})

it('shows an identical warning again for a re-imported ZIP after an edit', () => {
  const { result } = renderHook(() => useSkillForm())
  act(() => result.current.applyBundlePreview(preview))
  act(() => result.current.setCompanionFiles([]))
  act(() => result.current.applyBundlePreview(preview))
  expect(result.current.bundlePreviewWarning).toBe('Skipped: big.bin')
})

it('treats a missing bundle_warning as null', () => {
  const { result } = renderHook(() => useSkillForm())
  act(() => result.current.applyBundlePreview({ ...preview, bundle_warning: undefined }))
  expect(result.current.bundlePreviewWarning).toBeNull()
})
```
In `NewSkillPage.test.tsx`, following its existing mocks for `skillsStore.importSkillBundlePreview` and the hidden file input: import a ZIP whose preview has `bundle_warning: 'X'` and assert `screen.getByText('X')`; then import a `.md` and assert `queryByText('X')` is absent. (Read the file first and reuse its helpers; if `SkillForm` is mocked there, assert the `savedBundleWarning` prop it receives instead.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project unit src/pages/skills/hooks/__tests__/useSkillForm.test.tsx src/pages/skills/__tests__/NewSkillPage.test.tsx`
Expected: FAIL (`bundlePreviewWarning` undefined).

- [ ] **Step 3: Implement**

`skill.ts`:
```ts
export interface SkillBundlePreview {
  name: string
  description: string
  content: string
  companion_files: SkillCompanionFile[]
  bundle_warning?: string | null
}
```
`useSkillForm.tsx`:
```ts
const [bundlePreviewWarning, setBundlePreviewWarning] = useState<string | null>(null)

const setCompanionFiles = useCallback((files: SkillCompanionFile[]) => {
  setCompanionFilesState(files)
  setAreCompanionFilesDirty(true)
  setBundlePreviewWarning(null)
}, [])

const setBundleFolders = useCallback((folders: string[]) => {
  setBundleFoldersState(folders)
  setBundlePreviewWarning(null)
}, [])
```
In `applyBundlePreview`, after `setBundleFoldersState([])`: `setBundlePreviewWarning(bundlePreview.bundle_warning ?? null)`. Add `bundlePreviewWarning` to the returned object.

`NewSkillPage.tsx` and `CreateSkillPopup.tsx`: add `bundlePreviewWarning` to the `useSkillForm()` destructure and `savedBundleWarning={bundlePreviewWarning}` on `<SkillForm>`. No other change: the `.md` branches and the popup's close/reset paths already call `setCompanionFiles([])`, which now clears the warning.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project unit src/pages/skills src/components` then `npx tsc --noEmit` (separately).
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/entity/skill.ts src/pages/skills/hooks/useSkillForm.tsx src/pages/skills/NewSkillPage.tsx src/components/CreateSkillPopup.tsx src/pages/skills/hooks/__tests__/useSkillForm.test.tsx src/pages/skills/__tests__/NewSkillPage.test.tsx
git commit -m "EPMCDME-15965: Show server bundle warning after ZIP preview"
```

---

### Task 4: Compute the local warning with the backend seed rules (done, single commit `cd2ee4373`)

**Files:**
- Modify: `src/pages/skills/utils/skillBundleUtils.ts` (add `BundleSeedLimits`, `formatSeedLimitSize`, `planBundleSeed`, `buildBundleWarning`)
- Modify: `src/pages/skills/components/SkillBundleFilesSection.tsx` (`bundleCeilingWarning` now `buildBundleWarning(companionFiles, {maxCount, maxFileSize, maxTotalSize})`; per-file limit from `bundle_seed_max_file_size_bytes ?? MAX_SKILL_BUNDLE_FILE_SIZE_BYTES`)
- Test: `src/pages/skills/utils/__tests__/skillBundleUtils.test.ts`, `src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`

**Interfaces:**
- Produces: `buildBundleWarning(files: SkillCompanionFile[], limits: BundleSeedLimits): string | null`; `planBundleSeed(files, limits): { path: string; reason: 'too_large' | 'count_exceeded' | 'total_exceeded' }[]`; `formatSeedLimitSize(bytes: number): string` (`10 MB`, `1.5 KB`, `15 bytes`, `1 byte`).
- Rules (copied from the backend): files in plain code-unit path order; skip as `too_large` if over the per-file limit, else `count_exceeded` if the seeded count reached the count limit, else `total_exceeded` if it would push the total over; a skipped file never counts toward the total. Sentences ordered per-file, count, total; at most 5 paths listed then `, ... and N more`; suffix ` These files will not be available in an assistant workspace.`

Test-first: yes — util tests for each reason, path cap, sentence order, code-unit sort and size formatting failed on missing functions; section tests with new wording (single 11 MB file, six 9 MB files, 101 files, config-driven limits, no false total warning when only an oversized file is skipped) failed on the old aggregate logic.

Note: this deliberately goes beyond the original spec's "no local per-file warning" so the local warning after a user edit matches the server `bundle_warning`. Keep in sync with the backend implementation.

## Self-Review

- **Spec coverage:** Req 1 → Task 1. Req 2 → Task 1. Req 3 → Task 1 (constant) + Task 4 (local warning mirrors backend seed rules, including per-file). Req 4 → Task 3. Req 5 → Task 2 (section flag) plus Task 3 (hook clears for new/popup flows). Req 6 → Task 3 (`.md` import and re-import clear/replace the warning). Acceptance: small-file 11 MB bundle / 11 MB single file / six 9 MB files / unloaded fallbacks → Tasks 1 and 4; "X" shown, hidden on edit, cleared on `.md` → Tasks 2-3.
- **Placeholders:** none; the only open item is Task 3's NewSkillPage test, which depends on that file's existing mocks and is told to reuse them.
- **Type consistency:** `bundlePreviewWarning` (hook) → `savedBundleWarning` (SkillForm/section); `MAX_SKILL_BUNDLE_FILE_SIZE_BYTES` and config keys named identically across tasks.
- **Note:** `CreateSkillPopup` has no test file; its behaviour is covered through the shared hook tests.
