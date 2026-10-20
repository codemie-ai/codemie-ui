# Technical Research

**Task**: data-sources file upload, create datasource dialog/form, accessibility live region announcements, file input component
**Generated**: 2026-09-03
**Research path**: filesystem (no `.codegraph/` index at repo root — CodeGraph skipped per project rule)

---

## 1. Original Context

Ticket EPMCDME-8561 — https://jiraeu.epam.com/browse/EPMCDME-8561

"[4.1.3] Added file is not announced" — Bug, Minor, labels: Data, Sources, Frontend, accessibility_issue, codemie_contribute.

Precondition: Screen reader is turned on.
Steps to Reproduce:
1. Open https://codemie.lab.epam.com/#/data-sources as an authorised user.
2. Select "Create Datasourse" button
3. In the "Choose Datasource Type:" combobox select "File" option
4. Select "Select file" button and upload the file
5. Listen to the screen reader announcement

Actual result: Screen reader announces "EPAM AI/Run CodeMie - Google Chrome window, EPAM AI/Run CodeMie - document, unknown, EPAM AI/Run CodeMie - document, button Select file"
Expected result: Screen reader should announce that file "*****" was uploaded

This is WCAG 2.1 SC 4.1.3 Status Messages: after the user picks a file, the newly displayed file name / upload status must be conveyed to assistive technology without moving focus (i.e. a live region or role="status"/aria-live announcement).

Branch: `EPMCDME-8561_announce-uploaded-file`, based on main `1bf0010d7`.

---

## 2. Codebase Findings

### Existing Implementations

**Route and page (the Create Datasource flow is a PAGE, not a modal, on the primary entry point):**

- `src/router.tsx:295-300` — route `data-sources/create` → `DataSourceCreatePage`. List route at `:281-282`, edit at `:292`.
- `src/pages/dataSources/DataSourceCreatePage.tsx:27,59-73` — page shell: `<Sidebar>` + `<PageLayout>` + `<DataSourceForm>`. No `Popup`, no `Dialog`, no portal.
- `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` — the form itself.
- `src/pages/dataSources/components/DataSourceForm/EditIndexPopup.tsx:56-83` — **secondary entry point**: the same `DataSourceForm` wrapped in a PrimeReact `Popup` modal, opened from `src/pages/assistants/components/AssistantForm/components/ContextSelector.tsx:33,123`. Both variants must work.

**Datasource-type combobox and the File branch:**

- `src/pages/dataSources/components/DataSourceTypeSelector.tsx:37` — wraps `Autocomplete`; options from `INDEX_TYPES` in `src/constants/dataSources.ts`.
- `DataSourceForm.tsx:408-427` — `Controller name="indexType"` → `<DataSourceTypeSelector />`.
- `DataSourceForm.tsx:497-508` — the File branch:
  ```tsx
  {field.value === INDEX_TYPES.FILE && (
    <IndexTypeField.File
      {...{ errors, control, register, csvPresent, embeddingModels,
            isSubmitted: formState.isSubmitted }}
    />
  )}
  ```
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx:59-80` — `Controller name="files"` → `<FilesDropzone>`; `maxFiles` from `appInfoStore.fileDatasourceMaxUploadCount` (`:50`).

**IMPORTANT — the ticket's "Select file" button no longer exists in this flow.** It was replaced by a dropzone (release note: "Convert 'Select file' control into Dropzone", `configs/releaseNotes.json:2287`). The legacy button survives as dead code at `src/components/form/File/File.tsx:54-63` (the literal `Select file` is at `:60`); grep found **no importer** — only the barrel re-export `src/components/form/File/index.ts:16`. The ticket's reproduction text is therefore stale; the live control is the dropzone.

**The live file control:**

- `src/components/form/FilesDropzone/FilesDropzone.tsx:41` — props `{ name, files: File[], onChange(File[]), errors?, showErrors?, uploadedFiles?: string[], onUploadedFileRemove?, maxFiles? }`.
- `src/components/form/FilesDropzone/components/FileDropArea.tsx:89-99` — the hidden native input:
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
    aria-invalid={errorId ? true : undefined}
  />
  ```
  Triggered via `DropzoneArea` at `FileDropArea.tsx:100-104` (`onClick={() => fileInputRef.current?.click()}`); visible label text `Upload or drop files` at `:108-110`.
- `src/components/form/DropzoneArea/DropzoneArea.tsx` — plain `<div>` with click/drag handlers, no `role`/`tabIndex` (the input is still focusable because it uses `className="hidden"`, not the `hidden` attribute).

### How the file name is rendered today

- Count text, `FileDropArea.tsx:111-115` — plain span, conditionally mounted, no live region:
  ```tsx
  {(files.length > 0 || Boolean(uploadedFilesCount)) && (
    <span className="text-xs text-text-quaternary">
      {files.length + uploadedFilesCount} / {maxFiles} files selected
    </span>
  )}
  ```
- File name list, `src/components/form/FilesDropzone/components/FileList.tsx:57-79` — conditionally mounted `<div>`, no `role="list"`, no live region. Each row at `FileListItem.tsx:28-44`:
  ```tsx
  <span className="text-sm text-text-primary truncate">{fileName}</span>
  …
  <button type="button" aria-label={`Remove file ${fileName}`} …>
  ```
- **Focus does not move** on selection — `handleInputChange` (`FileDropArea.tsx:74-80`) only resets `input.value = ''`.
- **A live region already exists but announces COUNTS ONLY, not file names** — `FilesDropzone.tsx:70-87`:
  ```tsx
  if (previousFilesCount.current !== filesCount) {
    previousFilesCount.current = filesCount
    announce(filesCount === 0 ? 'No files selected' : `${filesCount} of ${maxFiles} files selected`)
  }
  ```
  rendered at `FilesDropzone.tsx:109` as `<Announcement announcement={announcement} />`.

This is the precise gap EPMCDME-8561 targets: the count changes are spoken, the **file name** is never spoken.

### Architecture and Layers Affected

- **Presentation / shared form component** — `src/components/form/FilesDropzone/*` (the single place to change).
- **Feature page** — `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx` (sole consumer, likely untouched).
- **Shared a11y primitives** — `src/components/Announcement/`, `src/hooks/useAnnouncementQueue.ts` (reuse only; changing them has cross-app radius).
- **App-level announcer infrastructure** — `src/components/appLevel/ToasterAnnouncer/*` (relevant to the modal variant; likely untouched).
- No API, store, or persistence layer involved.

### Integration Points

- `FilesDropzone` has exactly **one** consumer: `IndexTypeFile.tsx:63`. Blast radius of a change is the datasource File flow only (create + edit both render `DataSourceForm`).
- `Announcement` / `useAnnouncementQueue` are shared with `src/components/form/RecordInput/RecordInput.tsx` and `ToasterAnnouncer.tsx` — adding a message *inside* `FilesDropzone` is zero-radius; modifying the hook is not.
- State: react-hook-form. `useEditPopupForm` (`src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts:348`), defaults `files: []` / `uploadedFiles` at `:364-365,:418-419`, Yup rules for `files` at `:143,:245-266`.
- Selection handler chain: `FileDropArea.handleInputChange` (`:74`) → `addFiles` (`:40`) → `onChange([...files, ...filesToAdd])` (`:68`) → `FilesDropzone.onChange` → `IndexTypeFile.tsx:65` `filesField.onChange` (RHF Controller).
- Rejections (oversize / over-limit) go to `toaster` only (`FileDropArea.tsx:46-65`); toasts are separately announced through `ToasterAnnouncer`.

### Patterns and Conventions

**The established announcer stack (already shipped — MUST be reused, not re-created):**

- `src/components/Announcement/Announcement.tsx:18-32` — the visually-hidden polite region:
  ```tsx
  type AnnouncementProps = { announcement: string }
  const Announcement: FC<AnnouncementProps> = ({ announcement }) => (
    <output aria-live="polite" aria-atomic="true" className="sr-only">
  ```
  `<output>` maps to `role="status"`, hence the `getByRole('status')` test idiom.
- `src/hooks/useAnnouncementQueue.ts:18-81`:
  ```ts
  const DEFAULT_GAP_MS = 1000
  const DEFAULT_MAX_QUEUE_SIZE = 5
  type UseAnnouncementQueueOptions = { gapMs?: number; maxQueueSize?: number }
  export function useAnnouncementQueue({ gapMs = DEFAULT_GAP_MS, maxQueueSize = DEFAULT_MAX_QUEUE_SIZE }: UseAnnouncementQueueOptions = {})
  // returns { announcement, announce: (message: string) => void }
  ```
  Polite only (no politeness option). FIFO queue capped at 5, keeping the **last** 5 (`.slice(-maxQueueSize)`, `:70`). One message per 1000 ms. Writes `''` then re-sets on `requestAnimationFrame` so identical repeats re-announce (`:61-63`). `announce('')` is a no-op (`:68`). Timers cleared on unmount (`:44-50`). No clear/reset API.
- `src/components/appLevel/ToasterAnnouncer/ToasterAnnouncer.tsx:44-78` — app-global instance, `createPortal` into `host ?? document.body` (`:55-64,:75`); mounted in `src/main.tsx:41-51` above the router inside `<AnnouncerHostProvider>`.
- `src/components/appLevel/ToasterAnnouncer/AnnouncerHostContext.tsx:31-66` — stack-based host registry; topmost host wins, `null` = `<body>`.
- `src/components/appLevel/ToasterAnnouncer/ModalAnnouncerHost.tsx:20-43` — `{ active?: boolean }`; rendered inside a `role="dialog"` node. Adopters: `src/components/Popup/Popup.tsx:198` (`active={visible}`) and `src/components/Navigation/NavigationProfile.tsx:191`.
- `src/utils/toaster.ts:109-115,141-164` — every `toaster.info/success/error` also fires the global announcer with HTML stripped.

**Local in-component precedent to copy** (exactly the shape the fix needs):
`FilesDropzone.tsx:72,74-87,109` and `src/components/form/RecordInput/RecordInput.tsx:69-86,163` (`Row added. N rows total.`).

**Build-time guard**: `src/components/appLevel/ToasterAnnouncer/__tests__/modalSurfaces.guard.test.ts:35,53-64` — any `.tsx` matching `/aria-modal=["'{]/`, `/from ['"]primereact\/dialog['"]/`, or `/<dialog[\s>]/` must contain `ModalAnnouncerHost` or the suite fails.

**House style** (`.ai-run/guides/components/component-patterns.md`): single quotes, no semicolons, `React.FC<Props>` with explicit interface, 8-step ESLint import order, files under 300 lines.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists and is rich. Directly relevant:

- `.ai-run/guides/patterns/accessibility-patterns.md` — target "WCAG 2.1 Level AA". Live-region section:
  ```tsx
  // Status — non-urgent update
  <div aria-live='polite' aria-atomic='true'>{statusMessage}</div>
  // Error — interrupts immediately
  <div role='alert' aria-live='assertive'>{errorMessage}</div>
  ```
  "Use Tailwind `sr-only` for text visible only to screen readers". Checklist has an item for errors but **no item for dynamic non-error status content** — a gap flagged by the 8560 run.
- `.ai-run/guides/testing/testing-patterns.md`, `.ai-run/guides/testing/qa-strategy.md`, `.ai-run/guides/patterns/form-patterns.md`, `.ai-run/guides/patterns/modal-patterns.md`, `.ai-run/guides/quality-gates.md`.
- No i18n guide, because the app has **no i18n layer** at all.

`AGENTS.md` (with `CLAUDE.md` a one-line `@AGENTS.md` include) binds this work:
- "Check Guides First … load that P0 guide before searching the codebase."
- "Reinstall Before Trusting A Gate … Run `npm ci` first."
- "Gates Run Individually … Never chain them into one `&&` string."
- "Formatting Is Automatic … A `PostToolUse` hook … runs prettier and eslint --fix. Do not re-run them."
- "Ticket Required | Any branch, commit, or MR."
- Never: "Skip the pre-commit hook, or write a summary or validation-report document."
- Conflict rule: "A guide disagrees with the source | Trust the source."

Quality gates (`.ai-run/guides/quality-gates.md:111-114`): `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`.

### Architectural Decisions

Three prior runs built the announcer stack; their recorded decisions constrain this fix.

**a) EPMCDME-8560 — `docs/superpowers/tasks/2026-08-07-epmcdme-8560-announce-added-file-row/`** — the direct predecessor; it added the live region to the very component 8561 touches. Its plan opened with a "No shared announcer" constraint, but the implementation **superseded that mid-run** (commits `fada6bbf5` "Extract announcements into a reusable hook and component", `31ee184d2` "Use output element for live regions"), creating `useAnnouncementQueue` + `Announcement`. **The plan text is stale; the shipped code is the convention.** Still-binding constraints from it:
- "**Do NOT introduce `jest-axe`** — no precedent in this suite … Assertions are plain RTL: `getByRole('status')` + `toHaveTextContent`."
- "**No visual change.** Live regions are `className=\"sr-only\"`."
- "Tests live in the component's `__tests__/` folder and run in the **unit** vitest project."

**b) EPMCDME-8489 — `docs/superpowers/tasks/2026-08-24-epmcdme-8489-a11y-form-error-live-region/`** — form error announcements (`role=alert` re-mount on error change).

**c) EPMCDME-8584 — `docs/superpowers/tasks/2026-09-01-epmcdme-8584-announcer-modal-barrier/`** — the architectural constraint on where a region may live:
- "**Barrier 1 — `aria-hidden` on the app root** … Chrome drops it (`ignoredReasons: [\"ariaHiddenSubtree\"]`)."
- "**Barrier 2 — the modal boundary itself** … While a dialog with `aria-modal=\"true\"` is open, assistive tech restricts itself to that dialog … w3c/aria#1854."
- "So `ignored: false` in the AX tree is necessary but not sufficient; only a region *inside* the active dialog is spoken."
- False-green warning: "The 2026-08-25 verification asserted on `element.textContent`. That is a false green: the DOM node updates regardless of whether assistive tech can see it."
- "Re-parenting a live region resets it for assistive tech, so the container must move only on an actual change of host, and must move at modal-open time."

Also `docs/superpowers/tasks/2026-08-07-remove-cross-file-aria-id-magic-strings/`: "Never write a generic `entityNameId(scope, id)` helper."

The current run dir `docs/superpowers/tasks/2026-09-03-epmcdme-8561-announce-uploaded-file/` was already scaffolded with `.state.json` (flow `sdlc-light`, branch `EPMCDME-8561_announce-uploaded-file`).

### The `#app` aria-hidden gotcha — VERIFIED

- App root: `index.html:24` `<div id="app"></div>`; React mounts at `src/main.tsx:41,46-51`, with `ToasterAnnouncer` rendered inside `#app` but immediately portalling itself out to `host ?? document.body`.
- **PrimeReact `Dialog` does NOT set `aria-hidden` or `inert` on `#app` or on siblings.** The only `aria-hidden` occurrences in `node_modules/primereact/dialog/dialog.esm.js` are on its own internals (`:233` focus guard, `:810` close icon). A repo-wide search for `setAttribute('aria-hidden'` across `node_modules/primereact/` returns zero hits. The dialog only calls `DomHandler.blockBodyScroll()` (`:674`) and toggles `p-unselectable-text`.
- The **one** place that hides the app root is `src/components/Navigation/NavigationProfile.tsx:142,150,164`:
  ```tsx
  document.getElementById('app')?.setAttribute('aria-hidden', 'true')
  ```
- Consequently the in-repo comments generalising this (`ToasterAnnouncer.tsx:36-37`, `AnnouncerHostContext.tsx:23`) are accurate for `NavigationProfile` but **not** for the 113 `Popup` call sites. `Popup` is instead covered by Barrier 2 (`aria-modal="true"`, `Popup.tsx:158` + `dialog.esm.js:956-959`), which does apply.
- PrimeReact portals to `document.body` (no `appendTo` passed; `portal.esm.js:101-108`), a sibling of `#app`.
- **Verdict for this ticket**: the primary Create Datasource route is a plain page — no modal, nothing aria-hidden, so an inline `<Announcement>` inside `FilesDropzone` is spoken normally. In the secondary `EditIndexPopup` modal variant, the inline region is rendered *inside* the dialog subtree (React tree → PrimeReact portal), so it satisfies Barrier 2 as well. **No new portal or host wiring is required** — this is why extending the existing inline region is the correct fix shape.

### Derived Conventions

- No i18n: no `i18next`/`react-i18next` dependency, no `src/locales` or `src/i18n` (the only `i18n.ts` is under `src/authentication/keycloak-theme/login/`). All UI strings are hardcoded English literals. An announcement string is a plain template literal in `FilesDropzone.tsx` (near `:83-85`) or a constant in `src/components/form/FilesDropzone/constants.ts`. **No translation key needed.**
- No accessibility `TODO`/`HACK`/`FIXME` comments in `src/` — the a11y rationale lives in JSDoc blocks on `ToasterAnnouncer.tsx`, `AnnouncerHostContext.tsx`, `ModalAnnouncerHost.tsx`, `useAnnouncementQueue.ts`, `modalSurfaces.guard.test.ts`.
- Commit style: `EPMCDME-XXXX: Capital sentence`. Typical a11y footprint = component + sibling `__tests__` + `docs/superpowers/tasks/<date>-<slug>/` artifacts in the same commit (e.g. `ff0ff3fb1` for 8560, `ddd874fb4` for 8584).

### External Documentation Findings

Not applicable — no third-party SDK or external API surface. The only external dependency touched conceptually is PrimeReact `Dialog`, whose behaviour was verified directly from `node_modules/primereact/dialog/dialog.esm.js` rather than from vendor docs.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` — **the closest and most relevant suite**: max-files limits, `aria-describedby`/`aria-invalid` association, and a `describe('file count announcements')` block. This is where the new tests belong.
- `src/components/Announcement/__tests__/Announcement.test.tsx`
- `src/hooks/__tests__/useAnnouncementQueue.test.ts`
- `src/components/appLevel/ToasterAnnouncer/__tests__/ToasterAnnouncer.test.tsx` and `__tests__/modalSurfaces.guard.test.ts`
- `src/utils/__tests__/toaster.test.ts`
- Data-sources domain: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` (Google Docs section, Confluence refresh, unsaved-changes guard — **does not touch the File index type**), `DataSourcesPagination.integration.test.tsx`, `src/pages/dataSources/components/__tests__/*` (incl. `DataSourceActions.accessibility.test.tsx`), `.../DataSourceForm/hooks/__tests__/useEditPopupForm*.test.ts`, `src/store/__tests__/dataSources.test.ts`, `src/store/__tests__/files.test.ts`, `src/hooks/__tests__/useFileUpload.test.tsx`, `src/components/__tests__/File.test.tsx`.
- 13 `*.accessibility.test.tsx` suites exist across the app, all hand-rolled role/ARIA assertions.

### Testing Framework and Patterns

- **Vitest 1.6.1** (no Jest), jsdom 24.1.3, `@vitest/coverage-istanbul` 1.6.1. `@testing-library/react` 16.3.0, `jest-dom` 6.6.3, `user-event` 14.6.1. **No MSW, no axe/jest-axe.**
- `vitest.workspace.ts` — two projects: `unit` (`**/__tests__/**/*.{test,spec}.*`, excludes `*.integration.test.*`, setup `./src/setupTests` + `./src/setupTests.unit`) and `integration` (`*.integration.test.*`, env `./vitest-env-integration.ts`, setup `./src/setupTests` + `./src/setupTests.integration`, timeout 30 s). Both extend the `test` block in `vite.config.ts` (globals, `retry: 1`, shuffled file order).
- `src/setupTests.tsx` — jest-dom, `cleanup()`, console filters, `localStorage`/`ResizeObserver`/`IntersectionObserver`/`matchMedia`/`URL.createObjectURL` stubs, a global `fetch` mock with fixtures, and global mocks for `file-saver`, `@/hooks/useVueRouter`, `@/utils/toaster` (incl. `setToasterAnnouncer: vi.fn()` at `:153-156`), `SettingsLayout`, `react-router`'s `useNavigate`.
- `src/setupTests.unit.ts` — mocks `@/utils/api`, `@/utils/storage`, and **valtio** (`useSnapshot` returns the store as-is).
- `src/setupTests.integration.ts:25-29` — **load-bearing**: `configure({ asyncUtilTimeout: 15000, defaultIgnore: 'script, style, .sr-only' })`. `.sr-only` nodes are excluded from text queries in integration tests, so the live region must be asserted via `getByRole('status')` + `toHaveTextContent`, never `getByText`.
- Scripts: `test` (`vitest run`), `test:unit` (`--project unit`), `test:integration` (`--project integration`), `test:coverage`, `lint`, `typecheck`, `check:pre-commit`.
- Integration helpers: `src/test-utils/integration.tsx` — `renderPage(path)` mounts the real route config in a `createMemoryRouter`; `mockAPI(...)`; shared `navigate` spy. Interaction helpers in `src/test-utils/component-interactions/`.
- File-upload simulation, both idioms present: `user.upload(input, file)` (`src/pages/settings/administration/projectsManagement/__tests__/ImportUsersModal.test.tsx`) and `fireEvent.change(screen.getByLabelText('Select files to upload'), { target: { files: [...] } })` (`FilesDropzone.test.tsx`). Files built as `new File(['file content'], 'name.txt', { type: 'text/plain' })`.
- House style for live-region assertions, from `FilesDropzone.test.tsx` — the exact pattern to extend:
  ```ts
  // The live region is written one animation frame after the file count changes.
  const expectAnnouncement = (expected: string) =>
    waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(expected))

  it('announces the new total when a file is added', async () => {
    const { rerender } = render(<FilesDropzone name="files" files={[]} onChange={noop} />)
    rerender(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)
    await expectAnnouncement('1 of 10 files selected')
  })
  ```

### Coverage Gaps

- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx` — **no test file at all**; owns the `files`/`uploadedFiles` RHF controllers.
- `src/components/form/FilesDropzone/components/FileDropArea.tsx` — no direct test (exercised only indirectly); owns the file input and the visible count text.
- `src/components/form/FilesDropzone/components/FileList.tsx`, `FileListItem.tsx`, `FileDropzoneErrors.tsx` — no direct tests.
- `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` and `hooks/useCreateIndex.ts` — no tests.
- Behavioural gap: no test asserts a **file name** in the live region; only counts.

### Lint / a11y tooling

- `.eslintrc.cjs` — `plugins: ['@stylistic', 'sonarjs', 'react-hooks', 'jsx-a11y']`, but `jsx-a11y/recommended` is **not extended**; only one rule is enabled:
  ```js
  'jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'], a: ['link'] }],
  ```
  The plugin is not in `devDependencies` either (resolved transitively).
- **No axe/jest-axe, no Playwright/e2e setup** (no `playwright.config.*`, no `e2e/`). The nearest external check is `npm run test-harness` (`uvx codemie-test-harness --sanity-ui`).

---

## 5. Configuration and Environment

### Environment Variables

`.env` holds only `VITE_API_URL`, `VITE_ENV`, assistant slugs, `VITE_SUFFIX`, and Keycloak SSO placeholders. Runtime config arrives via `window._env_` from `config.js`. **No upload-related env var or feature flag exists.**

### Configuration Files

- `src/components/form/FilesDropzone/constants.ts` — `MAX_FILES = 10`, `MAX_FILE_SIZE_MB = 100`, `MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024`.
- `src/constants/dataSources.ts:80-88` — `MAX_FILE_SIZE = 104_857_600`, `DEFAULT_FILE_DATASOURCE_MAX_UPLOAD_COUNT = 10`, `getFileDatasourceMaxUploadCount(value)`, `FILE_SIZE_ERR = 'File size is too big, max 100MB allowed'`.
- `src/store/appInfo.ts:232` — `fileDatasourceMaxUploadCount` from the backend app-info response; consumed via `useSnapshot(appInfoStore)` in `IndexTypeFile.tsx:50,69` and passed as `maxFiles`.
- `src/constants/common.ts:47` — `SUPPORTED_FILE_FORMATS_MESSAGE_BASE` (PPTX, DOCX, XLSX, XLSB, PDF, CSV, ZIP, images), used at `FilesDropzone.tsx:106`.
- Yup validation and max-count error strings: `useEditPopupForm.ts:54-57,148,241-288`.

### Feature Flags and Deployment Concerns

None. `maxFiles` is backend-driven but is not a toggle. No deployment change is implied by this fix.

---

## 6. Risk Indicators

- **The ticket text is stale.** The described "Select file" button was replaced by a dropzone; `src/components/form/File/File.tsx` is unimported dead code. QA reproduction steps and any acceptance evidence must be written against the dropzone (`Upload or drop files` / `aria-label="Select files to upload"`), or the fix will look unverified. Decide explicitly whether the dead `File.tsx` is in scope (recommend: out of scope, note only).
- **A live region already exists in the target component.** `FilesDropzone.tsx:109` already renders `<Announcement>`. Adding a second `<Announcement>` sibling would create two competing `role="status"` nodes and break the existing `getByRole('status')` tests (which use `getBy`, not `getAllBy`). The fix must **extend the existing message**, not add a region.
- **Message-collision / queue timing.** `useAnnouncementQueue` emits at most one message per 1000 ms with a max queue of 5, keeping only the last 5. Announcing per file on a multi-file selection could either flood the queue or drop messages. A single aggregate message (name(s) + count) is safer; multi-select behaviour must be decided deliberately.
- **Count-only diffing misses real changes.** The effect keys on `previousFilesCount` (`FilesDropzone.tsx:70-87`); a replacement that leaves the count unchanged (one rejected, one accepted) announces nothing today, and will continue to unless the diff key changes to include names.
- **False-green verification risk (documented precedent).** EPMCDME-8584 recorded that asserting `element.textContent` is a false green. Screen-reader verification must use the AX tree, not the DOM. Do not accept `textContent` as evidence.
- **`#app` aria-hidden generalisation in code comments is inaccurate.** `ToasterAnnouncer.tsx:36-37` and `AnnouncerHostContext.tsx:23` say "modals hide `#app`", but only `NavigationProfile.tsx:142` actually does. Do not reason from those comments; PrimeReact `Dialog` relies on `aria-modal` instead. Low risk for this fix (the primary flow is a page), but it can misdirect planning.
- **Two entry points to the same form.** Create Datasource is a page (`router.tsx:295-300`) *and* a modal (`EditIndexPopup.tsx:56-83` via `ContextSelector.tsx`). Both must be considered; the modal variant is the one exposed to the `aria-modal` barrier.
- **Build-time guard.** `modalSurfaces.guard.test.ts:35` fails the suite if any new file matching `aria-modal=`, `primereact/dialog`, or `<dialog` omits `ModalAnnouncerHost`. Only a risk if the fix introduces dialog-shaped markup (it should not).
- **`.sr-only` is filtered from integration-test queries** (`setupTests.integration.ts:25-29`). Integration-level assertions on the announcement must use `getByRole('status')`.
- **No test coverage on the surrounding surfaces**: `IndexTypeFile.tsx`, `FileDropArea.tsx`, `FileList.tsx`, `FileListItem.tsx`, `DataSourceForm.tsx` are all untested. Regressions in the datasource File branch would not be caught outside the `FilesDropzone` suite.
- **Weak automated a11y net**: `jsx-a11y` recommended rules are off, no axe, no e2e. Regressions are caught only by hand-written assertions.
- **Prior-plan text contradicts shipped code.** The 8560 plan's "No shared announcer" constraint was superseded by its own implementation. A planner reading that doc without the source will wrongly avoid `useAnnouncementQueue`. Trust the source (per `AGENTS.md`).
- Adjacent a11y smell, out of scope but worth noting: `DropzoneArea.tsx` is a `<div>` with click/drag handlers and no `role`/`tabIndex`.

---

## 7. Summary for Complexity Assessment

**Layers and change surface.** This is a single-layer, presentation-only fix confined to one shared form component. The realistic edit is one file — `src/components/form/FilesDropzone/FilesDropzone.tsx`, specifically the `useEffect` at lines 70-87 that currently announces only a count — plus its sibling test file `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx`, and optionally a message constant in `src/components/form/FilesDropzone/constants.ts`. `FilesDropzone` has exactly one consumer (`IndexTypeFile.tsx:63`), so the blast radius is the datasource File flow only. Expect 2-3 source/test files changed plus the run's `docs/superpowers/tasks/` artifacts, matching the footprint of prior a11y commits (`ff0ff3fb1`, `ddd874fb4`). No API, store, routing, migration, config, or i18n work is involved — the app has no i18n layer, so the string is a plain English literal.

**Technical novelty: very low; the infrastructure already exists.** The repo shipped a complete announcer stack in EPMCDME-8560/8584: `useAnnouncementQueue` (`src/hooks/useAnnouncementQueue.ts:18-81`, polite, 1000 ms gap, queue of 5, rAF blank-and-reset so repeats re-announce) feeding `<Announcement>` (`src/components/Announcement/Announcement.tsx:18-32`, an `sr-only` `<output aria-live="polite" aria-atomic="true">`), with `ToasterAnnouncer`/`AnnouncerHostContext`/`ModalAnnouncerHost` handling the modal-boundary case app-wide. Crucially, `FilesDropzone` **already renders this region** — it simply announces `"N of M files selected"` instead of the file name. The fix is to enrich an existing message, not to build anything. The `#app` aria-hidden gotcha does not bite here: the primary Create Datasource entry is a full page/route (`router.tsx:295-300`, `DataSourceCreatePage.tsx`) with no modal and nothing aria-hidden, and in the secondary `EditIndexPopup` modal variant the inline region already sits inside the dialog subtree. No new portal or host wiring is needed. The genuine design decisions are narrow: what the message says, whether multi-file selection produces one aggregate message or several (queue throttling makes per-file risky), and whether the effect's diff key moves from count to file identity so that same-count replacements are announced.

**Test posture: mixed, but favourable at the exact point of change.** `FilesDropzone.test.tsx` already has a `describe('file count announcements')` block with the established idiom (`waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(...))`), so a test-first fix is straightforward and needs no new tooling — and must not add any, since `jest-axe` is explicitly precluded by prior-run decisions and no axe/Playwright setup exists. Everything around the component, however, is untested: `IndexTypeFile.tsx`, `FileDropArea.tsx`, `FileList.tsx`, `FileListItem.tsx`, and `DataSourceForm.tsx` have no direct suites, and the existing datasource integration test never exercises the File index type. Key risk factors for scoring: the stale ticket text (the "Select file" button no longer exists — QA steps must be rewritten against the dropzone), the danger of adding a second `role="status"` node and breaking the existing `getBy` queries, announcement-queue throttling on multi-file selection, and the documented false-green trap where asserting DOM `textContent` proves nothing about what assistive tech hears. Overall this reads as a low-complexity, well-precedented fix whose main cost is careful message design and honest screen-reader verification rather than engineering effort.
