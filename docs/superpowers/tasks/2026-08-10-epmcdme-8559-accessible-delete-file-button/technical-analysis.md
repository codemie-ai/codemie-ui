# Technical Research

**Task**: accessibility aria delete-file-button FilesDropzone FileListItem icon-button keyboard
**Generated**: 2026-08-10
**Research path**: filesystem (codegraph MCP tools not exposed to this agent; Explore threads used Glob/Grep/Read)

---

## 1. Original Context

EPMCDME-8559 — "[4.1.2, 1.1.1] Delete file button does not have name and role" (Bug, Minor, repo codemie-ui).

Precondition: Screen reader is turned on.
Steps to Reproduce:
1. Open https://codemie.lab.epam.com/#/data-sources as an authorised user.
2. Select "Create Datasource" button
3. In the "Choose Datasource Type:" combobox select "File" option
4. Using arrow keys, navigate to the "X" button near the "Select file" button
5. Listen to the screen reader announcement

Actual result: Screen reader announces "graphic clickable"
Expected result: The button should have an accessible name and role, e.g. "Delete file, button". Also, image "X" should be hidden from assistive technologies.
Notes/Reproduce: For all delete file buttons.

Techniques referenced by the ticket: ARIA14, W3C ARIA APG button pattern, aria-hidden.

IMPORTANT CONTEXT FROM A PRIOR RUN (verify, do not assume): the ticket's repro steps are stale — the old "+Add file" control (src/components/form/File/File.tsx) is dead code, replaced by a drag-and-drop multi-file dropzone. The live delete control is believed to be in src/components/form/FilesDropzone/components/FileList / FileListItem, implemented as a bare `<svg>` with an onClick handler (not a `<button>`, not keyboard reachable, no accessible name). A just-merged sibling ticket EPMCDME-8560 added sr-only `<output aria-live>` live regions to FilesDropzone.tsx and RecordInput.tsx — read those for the established a11y pattern in this repo.

The ticket says "For all delete file buttons" — so ALSO find every other delete/remove control rendered as a bare clickable svg/icon in comparable list rows (e.g. RecordInput row delete, InputArray, uploaded-file lists, attachment chips in chat), and report which ones are in scope for "delete FILE buttons" vs out of scope.

Additionally report:
- the exact current markup of the delete control(s) and their test files;
- whether the repo already has a reusable icon-button component with an accessible name (search for aria-label usage patterns, IconButton, Button variants) that should be reused instead of hand-rolling;
- how the svg icons are imported (`?react` SVGR) and whether they render with focusable/role attributes that need aria-hidden;
- existing unit-test conventions for these components (testing-library queries used, how svg mocks are done in `__tests__`).

---

## 2. Codebase Findings

### Existing Implementations

**The bug site — confirmed.** `src/components/form/FilesDropzone/components/FileListItem.tsx:33-39`:

```tsx
      <XMarkSvg
        className="cursor-pointer size-4 flex-shrink-0 text-text-quaternary hover:text-text-primary"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      />
```

Import at line 18: `import XMarkSvg from '@/assets/icons/cross.svg?react'`.

Defect inventory for this element: no `<button>` wrapper, no `role`, no `aria-label`, no `tabIndex`, no `title`, no keyboard handler. It is a bare SVGR-generated `<svg>` with a click handler — which is exactly why AT announces "graphic clickable". Additionally `FileSvg` at line 30 in the same component is a decorative icon with no `aria-hidden="true"`.

`fileName` is already a prop of `FileListItem` and is rendered at line 31, so a per-row dynamic accessible name (`Remove ${fileName}`) is available with no plumbing.

Supporting files in the feature:
- `src/components/form/FilesDropzone/FilesDropzone.tsx` — container; composes FileDropArea + FileList + InfoBox + FileDropzoneErrors
- `src/components/form/FilesDropzone/components/FileList.tsx` — maps `uploadedFiles` first, then `files`, into `FileListItem`, passing `onRemove`. Owns `removeFile` index logic and `onUploadedFileRemove`. **The two-list ordering matters**: a name-based test query must account for uploaded files rendering before pending ones.
- `src/components/form/FilesDropzone/components/FileDropArea.tsx` — hidden `<input type="file">`, already accessible (`aria-label="Select files to upload"`, `aria-describedby`, `aria-invalid`)
- `src/components/form/FilesDropzone/components/FileDropzoneErrors.tsx` — `role="alert"` error list
- Consumer: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx:60`

**Prior-run claim about dead code — CONFIRMED, with a caveat.** `src/components/form/File/File.tsx` (exports `FileInput`) is orphaned: zero import sites across `src/`, only self-references at `File.tsx:30`, `:69` and its own `index.ts`. Note it contains **no delete control at all** (just a "Select file" Button), so it is irrelevant to this ticket either way — deleting it would be unrelated scope creep.

Do not confuse it with `src/components/File.tsx` (default export `File`), which IS live (ChatUserMessage, ChatPromptFileUpload, WorkflowStartExecutionPopup), is tested at `src/components/__tests__/File.test.tsx`, and is **already accessible**.

### Scope triage — "all delete file buttons"

An exhaustive scan of every `svg?react` consumer for `<XxxSvg … onClick … />` produced this inventory.

In scope (deletes a FILE, currently inaccessible):
- `src/components/form/FilesDropzone/components/FileListItem.tsx:33` — removes a pending or already-uploaded file. **This is the only in-scope defect.**

Already accessible file-delete controls (no change needed; use as templates):
- `src/components/File.tsx:117-126` — `<button type="button" aria-label="Remove attached file">…<BasketSvg /></button>` (chat attachment)
- `src/pages/skills/components/SkillBundleFilesSection.tsx:263-271` — `<Button type="tertiary" buttonType="button" aria-label={`Remove ${getBundleFileName(file.path)}`}><CrossSvg className="size-4" /></Button>` — **best template**: dynamic per-item label via the shared Button

Out of scope — same a11y defect (bare clickable svg) but not a file delete; recommend a follow-up ticket rather than expanding this one:
- `src/components/form/MultiSelect/ChipWrapper.tsx:51` — removes a multiselect chip
- `src/components/Filters/Filters.tsx:307` — clears a filter value
- `src/pages/dataSources/components/IndexProviderForm.tsx:252` — clears a form field
- `src/components/Table/SortIcon.tsx:39` — sort toggle
- `src/pages/chat/components/ChatHistory/ChatHistoryControls.tsx:58,66` — chevron navigation

Out of scope — real `<button>` already, but icon-only with a weak/missing name (borderline; cheap to fix if scope is widened deliberately):
- `src/components/form/RecordInput/RecordInput.tsx:138-145` — `<Button type="secondary"><DeleteSvg /></Button>`, no `aria-label` (deletes a record row, not a file)
- `src/components/form/InputArray/InputArray.tsx:150-157` — real button with `aria-label="Delete"`; its `ActionDeleteSvg` lacks `aria-hidden`
- `src/components/form/LinksArray/LinksArray.tsx:125-132` — real button with visible "Remove" text (fine)

**Recommendation**: keep EPMCDME-8559 to `FileListItem.tsx` only. That is the sole control matching "delete FILE button" that is actually broken. The chip/filter/field clears share the root cause but are different components and different WCAG report items.

### Architecture and Layers Affected

Only the presentational component layer is touched. No API, store, routing, or persistence involvement.

- Component (form): `FilesDropzone/components/FileListItem.tsx` — the single required edit
- Component (shared): `src/components/Button/Button.tsx` — consumed, not modified
- Test: `src/components/form/FilesDropzone/__tests__/` — new or extended spec

Expected change surface: 1 source file + 1 test file (new `__tests__/FileListItem.test.tsx` or a nested describe in the existing suite). Realistically 2-3 files total.

### Integration Points

- `FileList.tsx` passes `onRemove` down; no signature change needed if the fix is contained inside `FileListItem`.
- `src/components/Button/Button.tsx` spreads `...rest` (line 113), so `aria-label` passes through to the real `<button>`. It auto-detects icon-only children via `useIsIconOnly` (lines 21-28) and drops `min-w`. `ButtonType.TERTIARY` gives the borderless icon look closest to the current bare-svg appearance.
- No external services, no network, no env dependency.

### Patterns and Conventions

- **No `IconButton` component exists** anywhere in the repo (zero matches). The canonical accessible icon control is either the shared `Button` with `aria-label` (SkillBundleFilesSection precedent) or a plain `<button type="button" aria-label=…>` (File.tsx precedent). Both are established; the shared `Button` is preferred by `.ai-run/guides/components/reusable-components.md`, which also mandates `ButtonType.TERTIARY` from `@/constants` over the hardcoded string `'tertiary'`.
- **SVGR**: `vite-plugin-svgr` with **default options** — `vite.config.ts:8` (`import svgr from 'vite-plugin-svgr'`) and `:33` (`svgr()`). No `.svgrrc`, no `svgo.config.*`, no `svgrOptions` override. Import form is `import X from '@/assets/icons/cross.svg?react'`. Source SVGs (verified `cross.svg`, `delete.svg`) carry only `width/height/viewBox/fill/xmlns` — **no `role`, no `aria-hidden`, no `focusable`**. SVGR spreads `{...props}`, so the rendered `<svg>` inherits only what JSX passes. Consequence: `aria-hidden="true"` must be added explicitly at each call site; there is no global config lever. Precedent: `src/components/Spinner/Spinner.tsx:37`.
- **Live-region shape** (EPMCDME-8560): `<output aria-live="polite" aria-atomic="true" className="sr-only">` — `<output>` was deliberately chosen over `<div role="status">` (Sonar/eslint prefer the native element). Same convention at `Spinner.tsx:29-38`.
- Component file ordering per `.ai-run/guides/components/component-patterns.md`: imports → props interface → `React.FC<Props>` → hooks → handlers → render helpers → JSX → `export default`.
- Every source file needs the Apache license header (`npm run license-headers:check` is a pre-commit gate).

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists and is rich. Relevant files:

- **`patterns/accessibility-patterns.md` — P0 for this ticket.** Verbatim rules:
  - "Icon-only buttons have `aria-label`"
  - "Decorative SVGs: `aria-hidden='true'`"
  - "Buttons/links have visible focus ring (`focus:ring-2 focus:ring-primary-500`)"
  - Icon Button Pattern: `// Correct — label on button, icon hidden` → `<Button aria-label='Start chat'><ChatSvg aria-hidden='true' /></Button>`
  - Semantic HTML table: "Use `<button>` | Instead of `<div onClick>`"
  - "Use Tailwind `sr-only` for text visible only to screen readers"
  - "Always include focus ring — never `outline-none` without replacement"
  - Caveat: its automated-testing snippet uses `jest-axe`, which is **not installed**. Treat that section as aspirational.
- `quality-gates.md` — all must exit 0 pre-MR: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`. Pre-commit husky also runs `npx lint-staged`, `npm run license-headers:check`, `npm run secrets:check`, `npm run sonar-local`.
- `testing/testing-patterns.md` — co-located `__tests__/`; `*.test.tsx` → unit project, `*.integration.test.tsx` → integration; "Always call `cleanup` in `afterEach`"; "`vi.mock()` must be at module level — never inside `describe` or `it`"; AAA structure.
- `components/reusable-components.md` — shared `Button` from `@/components/Button`; use `ButtonType`/`ButtonSize` constants, not hardcoded strings.
- `components/component-patterns.md`, `styling/styling-guide.md` (icon colors via `text-icon-*`), `standards/git-workflow.md` (branch `EPMCDME-XXXX_short-description`, commit `EPMCDME-XXXX: Capital sentence`, Tekton-enforced).

`AGENTS.md` (imported by the one-line `CLAUDE.md`) is stale/backend-flavoured but its "Check Guides First" rule and its conflict rule apply: "A guide conflicts with source code | Trust current source".

### Architectural Decisions

- `<output>` over `<div role="status">` for live regions (EPMCDME-8560, commit `38f730879` "Use output element for live regions").
- Accessible names are plain English string literals, sentence case, on the element; template literals when dynamic (`aria-label={\`Page ${page + 1}\`}` — `src/components/Pagination/Pagination.tsx:155`).

### Derived Conventions

- Icon-only action = real `<button type="button">` + `aria-label` + `aria-hidden="true"` on the icon. In-repo examples: `src/components/File.tsx:117-124`, `src/components/TooltipButton/TooltipButton.tsx:49-63` (best full example including `aria-hidden`).
- `sr-only` is Tailwind's built-in utility; no custom `visually-hidden` class exists. Usages: `TooltipButton.tsx:64`, `NavigationAssistants.tsx:142`, `ChatListItem.tsx:111`, `Switch.tsx:81`.
- **i18n: none.** No `react-i18next`/`i18next`/`react-intl` in `package.json`; zero `useTranslation`/`t()` in `src/`. The only i18n artifact is the Keycloakify login theme (`src/authentication/keycloak-theme/login/i18n.ts`), unrelated. An accessible name is a hardcoded English literal — do **not** create a translation file.
- **Lint**: `.eslintrc.cjs` (legacy config, no flat `eslint.config.js`). `plugins: ['@stylistic', 'sonarjs', 'react-hooks', 'jsx-a11y']` at line 21, but `extends` does **not** include `plugin:jsx-a11y/recommended` → all jsx-a11y rules are off. The only enabled a11y rule (line 148) is `jsx-a11y/no-redundant-roles`. This is precisely why `<XMarkSvg onClick=…>` passes lint today. Blocking gates that will bite instead: `sonarjs/cognitive-complexity` (max 15), `sonarjs/no-duplicate-string` (threshold 9), `@stylistic/semi: never`, `import/order` alphabetized with newlines between groups, single quotes in TS (double in JSX attrs per Prettier).

### External Documentation Findings

No third-party library surface — the task is pure in-repo JSX. The ticket's referenced standards are informational only:
- **W3C WCAG Technique ARIA14** — using `aria-label` to provide an invisible label where a visible label cannot be used. This is exactly the fix shape the repo's own guide already prescribes.
- **W3C ARIA APG button pattern** — a native `<button>` satisfies role, keyboard (Enter/Space), and focus requirements with no custom handlers; preferring `<button>` over `role="button"` + `tabIndex` + key handlers is the lower-risk path and matches repo precedent.

No `context7`/WebFetch lookup was warranted.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` — the **only** test under `FilesDropzone/**`. One `describe('FilesDropzone') > describe('error association')` block, 4 tests covering `aria-describedby` linkage, absent describedby/invalid when clean, multi-error grouping, and per-instance unique ids. Mocks `@/components/form/DropzoneArea` and `@/components/form/InfoBox`. **It always renders `files={[]}`, so `FileList`/`FileListItem` are never exercised at all.**
- `src/components/form/RecordInput/__tests__/RecordInput.test.tsx` — badge rendering, required asterisk. Mocks `@/components/Button` and `delete.svg?react`. No delete-click or a11y assertions.
- Nearest a11y-shaped precedents: `src/components/form/OrderList/__tests__/OrderListButton.test.tsx`, `src/components/Sidebar/__tests__/SidebarToggle.test.tsx`.

### Testing Framework and Patterns

Vitest + @testing-library/react + jest-dom + user-event, jsdom. Two projects via `vitest.workspace.ts`; unit project matches `**/__tests__/**/*.{test,spec}.*` excluding `*.integration.test.*`. Setup: `src/setupTests.tsx` + `src/setupTests.unit.ts`.

Queries used in the existing FilesDropzone suite (verbatim):
```tsx
const fileInput = screen.getByLabelText('Select files to upload')
const errorText = screen.getByText('File too large')
const errorNodes = screen.getAllByRole('alert')
expect(fileInput).toHaveAttribute('aria-invalid', 'true')
```
No `getByTestId`, no `getByRole('button'` in that file.

**SVG mocking**: there is no global/automatic SVG mock. `vite-plugin-svgr` transforms `*.svg?react` in tests too (both vitest projects `extends: './vite.config.ts'`). Per-test opt-in `vi.mock` at module level is the convention:
```tsx
// src/components/form/RecordInput/__tests__/RecordInput.test.tsx:21
vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <svg data-testid="delete-icon" />,
}))
```
Props-forwarding variant — **required if you want to assert `aria-hidden` actually reaches the svg**:
```tsx
// src/components/Sidebar/__tests__/SidebarToggle.test.tsx:49
vi.mock('@/assets/icons/chevron-left.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-icon" {...props} />,
}))
```

**Render helper**: none for unit tests — `render` from `@testing-library/react` directly (`src/test-utils` has no `index.ts`). Integration only: `src/test-utils/integration.tsx` exports `renderPage(path)` and `mockAPI(...)`. Convention is a local `renderComponent(props)` factory per suite, `user = userEvent.setup()` in `beforeEach`, explicit `import { describe, it, expect, vi, beforeEach } from 'vitest'` despite `globals: true`, and `vi.clearAllMocks()`.

**A11y assertion precedent** (no jest-axe, no `toHaveAccessibleName` anywhere) — closest match, `src/components/form/OrderList/__tests__/OrderListButton.test.tsx:44`:
```tsx
const button = screen.getByRole('button', { name: 'Delete item' })
button.focus()
expect(button).toHaveFocus()
await user.keyboard('{Enter}')
expect(mockOnClick).toHaveBeenCalledTimes(1)
```
`aria-hidden` assertion style: `container.querySelector('[aria-hidden="true"]')` (`ChatResizableSeparator.test.tsx:32`).

### Coverage Gaps

- `FileListItem.tsx` — **the bug site, zero tests**
- `FileList.tsx` — zero tests (owns the uploaded-then-pending ordering and index math)
- `FileDropArea.tsx`, `FileDropzoneErrors.tsx` — only indirect coverage
- `DropzoneArea.tsx` — no tests, and mocked out in the existing FilesDropzone suite
- `form/File/File.tsx`, `InputArray.tsx` — no tests

---

## 5. Configuration and Environment

### Environment Variables

None relevant. This is a static presentational fix with no runtime configuration.

### Configuration Files

- `vite.config.ts` — `svgr()` at line 33, default options. Relevant because it determines that no icon gets `aria-hidden`/`focusable` automatically.
- `.eslintrc.cjs` — jsx-a11y registered but recommended ruleset not extended (line 21 plugins, line 148 the single enabled rule).
- `vitest.workspace.ts` — unit vs integration project split.

### Feature Flags and Deployment Concerns

None. No flags, no migrations, no deployment manifest changes.

---

## 6. Risk Indicators

- **Branch-state risk (highest).** The EPMCDME-8560 `<output aria-live>` live regions are **not on the current branch** `EPMCDME-8559_accessible-delete-file-button` — they live on `origin/EPMCDME-8560_announce-added-file-row` (final form in commit `38f730879`). The prior-run note that 8560 was "just merged" is **not verified against this branch**. `FilesDropzone.tsx` is touched by both tickets, so rebasing onto main after 8560 lands may conflict. Confirm the base branch state before implementing.
- **Zero test coverage at the bug site.** `FileListItem.tsx` and `FileList.tsx` have no tests; the existing FilesDropzone suite never renders a file row (`files={[]}`). New tests must build the render harness from scratch.
- **Lint will not catch the class of bug.** `jsx-a11y/click-events-have-key-events` and `no-noninteractive-element-interactions` are OFF, so regressions of this exact shape pass CI silently. Enabling `plugin:jsx-a11y/recommended` would surface the ~6 other bare-clickable-svg sites listed in Section 2 — that is a legitimate improvement but would balloon this ticket's diff and is better raised as a separate ticket.
- **Scope ambiguity in the ticket.** "For all delete file buttons" reads as broad, but only one control matches both "file" and "broken". The other five bare-clickable-svg controls (chip, filter, field clear, sort, chevrons) share the root cause but are not file deletes. Scope decision needed at spec time; recommendation is to fix one and file a follow-up.
- **Stale repro steps.** The ticket's path (Create Datasource → File → "X" near "Select file") describes the orphaned `form/File/File.tsx` UI. QA verification steps must be rewritten against the current dropzone, or QA will report "cannot reproduce / not fixed".
- **`aria-hidden` cannot be centralised.** Default SVGR config, no svgo override, source SVGs carry no a11y attributes — every icon needs the attribute at its call site. A "fix it globally in the SVGR config" approach will be tempting and is not viable without changing `vite.config.ts` in a way that affects every icon in the app.
- **Test mock shape matters.** The common `vi.mock` variant discards props; asserting `aria-hidden` requires the props-forwarding variant (`SidebarToggle.test.tsx:49`). Easy trap that yields a silently vacuous test.
- **Styling regression risk (minor).** Swapping a bare `<svg className="cursor-pointer size-4 …">` for a `<Button>` introduces the Button's padding/border/focus-ring; the row layout may shift. `ButtonType.TERTIARY` plus a padding override, or a plain `<button>`, both have repo precedent — a visual check is warranted.
- **Sibling icon not covered by the ticket.** `FileSvg` at `FileListItem.tsx:30` is also a decorative svg without `aria-hidden`. Strictly the ticket only names the "X", but leaving it produces a half-fixed row.
- `sonarjs/no-duplicate-string` (threshold 9) and `sonar-local` run pre-commit — a repeated literal label across sites could trip it.

---

## 7. Summary for Complexity Assessment

**Layers and surface.** This is a single-layer, presentational-only change. Exactly one source file requires modification — `src/components/form/FilesDropzone/components/FileListItem.tsx` — where a bare SVGR `<svg onClick>` (lines 33-39) must become a real `<button type="button">` (or the shared `@/components/Button` with `ButtonType.TERTIARY`) carrying a dynamic `aria-label` such as `Remove ${fileName}`, with `aria-hidden="true"` on both the X icon and the sibling decorative `FileSvg` at line 30. No prop-signature change is needed since `fileName` and `onRemove` are already in scope. Add one test file (`FilesDropzone/__tests__/FileListItem.test.tsx`) or a nested describe in the existing suite. Total realistic change surface: **2-3 files, well under 100 lines**.

**Technical novelty: none — this is pattern-following, not pattern-creating.** The repo has an explicit P0 guide (`.ai-run/guides/patterns/accessibility-patterns.md`) prescribing precisely this fix, and two working in-repo templates: `src/pages/skills/components/SkillBundleFilesSection.tsx:263-271` (shared Button + dynamic per-item `aria-label`, the closest analogue) and `src/components/File.tsx:117-126` (plain `<button>` + static label). There is no `IconButton` abstraction to build or reuse; the shared `Button` already spreads `aria-label` through to a real `<button>` and auto-detects icon-only children. There is no i18n layer, so the label is a plain English literal. Using a native `<button>` satisfies the ticket's ARIA APG reference for free, avoiding any custom `role`/`tabIndex`/keydown code.

**Test posture: the affected area is completely untested, which is the main cost driver.** The one existing FilesDropzone suite never renders a file row (`files={[]}`), so the harness — rendering a `FileListItem` with a file and asserting `getByRole('button', { name: /Remove/ })`, keyboard activation via `user.keyboard('{Enter}')`, and `aria-hidden` on the icon — must be written from scratch, including a props-forwarding `vi.mock` for `cross.svg?react` (the common non-forwarding mock variant would make the `aria-hidden` assertion vacuous). Precedent for every one of these assertions exists in `OrderListButton.test.tsx` and `SidebarToggle.test.tsx`, so it is transcription work rather than design work.

**Risk factors for scoring.** Complexity should stay low, but three items deserve weight: (1) `FilesDropzone.tsx` is shared with the in-flight EPMCDME-8560 branch, whose `<output aria-live>` regions were not confirmed present on the current branch — a rebase/conflict check is a prerequisite; (2) the ticket's repro steps point at orphaned code (`form/File/File.tsx`, which has no delete control at all), so QA verification steps must be rewritten or the fix will be reported as not-reproduced; (3) the phrase "for all delete file buttons" needs an explicit scope ruling — five other bare-clickable-svg controls share the root cause but delete chips/filters/fields rather than files, and jsx-a11y's recommended ruleset being disabled means none of them are lint-enforced. Recommended framing: fix the one true file-delete control, file a follow-up for the rest.
