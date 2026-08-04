# Technical Research

**Task**: form accessibility textarea aria-describedby data-source
**Generated**: 2026-07-22
**Research path**: filesystem (mcp__codegraph__search tool not found — fallback used)

---

## 1. Original Context

EPMCDME-8550: Data Source form Description field error message is not programmatically associated with the textarea, failing WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value). Root cause (already verified in DOM and code, confirm and build on it, do not re-derive from scratch): src/components/form/Textarea/Textarea.tsx renders its error as a bare sibling div `{error && <div className="text-text-error text-sm">{error}</div>}` with no id, and the <textarea> has no aria-describedby pointing to it; the <textarea> is also not wrapped by the <label> (the label only wraps the title text), so screen readers never announce the error. Contrast: src/components/form/Input/Input.tsx happens to work only as a side-effect because it wraps the WHOLE field (including the error text) inside a single <label>, folding the error into the input's accessible name — this is NOT a clean pattern and should not be copied into Textarea. Required fix: add a stable error id (derive a fallback via React's useId() since the component's optional `id` prop isn't always passed by callers), link it via aria-describedby on the <textarea> (aria-describedby={error ? errorId : undefined}), add aria-invalid={!!error} to the <textarea>, and id={errorId} on the error div. Labelling-only change, no visual/behavioural changes. Scope: the ticket lists 3 affected UI locations — Data Source Create form Description field, an 'Add file' error message, and Data Source Edit form Description field. Fixing the shared Textarea component should cover the two Description fields automatically, but the 'Add file' error needs to be checked: does it render through the same shared Textarea component, or through a different control (e.g. a file input)? If different, the same aria-describedby/aria-invalid/id pattern needs to be documented as required there too. Also need to confirm the existing aria-describedby convention already used in src/authentication/components/SignUpForm.tsx so the fix follows established repo style, and locate the existing Textarea component's test file (if any) and testing conventions for this component's directory to ground TDD test placement.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/form/Textarea/Textarea.tsx` (root cause file, confirmed):
  - `label` (lines 96-100) wraps only the label text, `htmlFor={id}` — never wraps the `<textarea>` or the error.
  - `<textarea>` (lines 107-126) has no `aria-describedby`, no `aria-invalid`.
  - Error render (line 128): `{error && <div className="text-text-error text-sm">{error}</div>}` — no `id`, no `role="alert"`.
  - `id` prop is optional (`TextareaProps.id?: string`, line 32) and is **not always passed** by callers (see below) — confirms the ticket's reasoning for a `useId()` fallback.
- `src/components/form/Input/Input.tsx` — confirmed contrast case: the entire field, including the error `<div>` (lines 188-192), is nested inside a single `<label htmlFor={id}>` (lines 98-193), which folds the error text into the input's accessible name as a side effect. Ticket explicitly says do not copy this into Textarea.
- Consumers of `Textarea` — 38 files across the codebase import it (`src/pages/dataSources/...`, `settings/administration/...`, `pages/chat/...`, `pages/assistants/...`, `pages/workflows/...`, `pages/skills/...`, `pages/integrations/...`, `pages/katas/...`, `pages/analytics/...`). The fix is confined to the single shared component and is purely additive (new `id`/`aria-*` attributes), so the wide fan-out is low risk but worth noting for review — it will affect the accessible tree of every one of these 38 call sites.
- **Data Source Create/Edit Description field**: `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` lines 367-383 — a single `DataSourceForm` component renders the Description field via `Controller` → `<Textarea id="description" name="description" label="Description" error={fieldState.error?.message} .../>`. This same form is used for both create and edit (toggled via the `isEditing`/`index` prop), so **fixing the shared `Textarea` component automatically covers both of the ticket's Description-field locations** — no separate code change needed for Create vs Edit.
- **"Add file" error message** — confirmed this is a **different control**, not the shared `Textarea`:
  - `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx` renders `FilesDropzone` (lines 56-76), passing `errors={fileListErrors}` and `showErrors={isSubmitted}`.
  - `src/components/form/FilesDropzone/FilesDropzone.tsx` composes `FileDropArea` (the actual upload control) and `FileDropzoneErrors` (the error rendering), plus an `InfoBox`.
  - `src/components/form/FilesDropzone/components/FileDropArea.tsx`: the interactive control is a **hidden native `<input type="file" id={name}>`** (line 84-92) triggered by a clickable `DropzoneArea` div, with a separate `<label htmlFor={name}>Files</label>` (line 81-83). The `<input>` has `aria-label="Select files to upload"` but no `aria-describedby`/`aria-invalid`.
  - `src/components/form/FilesDropzone/components/FileDropzoneErrors.tsx` (lines 37-45): renders each error message in its own `<div role="alert">`, deduplicated, but **no `id`** on any error div, so nothing links them to the file input. `role="alert"` gives some dynamic announcement but not static programmatic association (WCAG 1.3.1 / 4.1.2 still fails on initial render / when read via `aria-describedby` semantics).
  - **Conclusion**: the "Add file" error is a structurally separate component tree from `Textarea`. Fixing shared `Textarea` does **not** cover this location. The same `useId()`-derived id + `aria-describedby` + `aria-invalid` pattern needs to be applied here too, most likely by generating an id in `FileDropArea`/`FilesDropzone` and passing it down to both the file `<input>` and `FileDropzoneErrors`, since errors can be multiple (an array) unlike Textarea's single error string — plumbing needs a small design decision (e.g. join ids or wrap all error divs in one describedby-able group with a shared container id).

### Architecture and Layers Affected

- **Shared UI component layer** (`src/components/form/`): `Textarea.tsx` — primary fix target.
- **Shared UI component layer, file-upload subtree** (`src/components/form/FilesDropzone/`): `FileDropArea.tsx` + `FileDropzoneErrors.tsx` — secondary fix target (different control, same defect class).
- **Feature/page layer** (`src/pages/dataSources/components/DataSourceForm/`): `DataSourceForm.tsx` (Description field, Controller-based) and `IndexTypeField/IndexTypeFile.tsx` (file upload wiring) — no changes expected here since the fix lives in the shared components they consume, but they are the concrete manifestation locations named in the ticket.
- No API, service, repository, or backend layer is touched — this is a pure frontend/accessibility (labelling) fix.

### Integration Points

- `Textarea` is consumed via `react-hook-form`'s `Controller` pattern almost everywhere (`fieldState.error?.message` passed as `error` prop) — this is the dominant convention across the 38 consumers, including `DataSourceForm.tsx`.
- `FilesDropzone` is consumed once, in `IndexTypeFile.tsx`, with an array of `{ message: string } | undefined` errors from `react-hook-form`'s array-field error state (`errors.files`).
- No external service or third-party a11y library integration exists in these components; this is native ARIA/DOM markup only.

### Patterns and Conventions

- **`useId()` fallback-when-`id`-not-passed pattern already exists in the codebase** and matches exactly what the ticket asks for. `src/components/form/Checkbox.tsx` (lines 62-63):
  ```tsx
  const reactId = useId()
  const idKey = id ?? reactId
  ```
  Other components using the same `useId()` idiom: `RadioGroup.tsx`, `RadioButton.tsx`, `SearchableCombobox.tsx`, `TooltipButton.tsx`, `Pagination.tsx`, `Popup.tsx`. This is the established convention to follow for the Textarea `errorId` fallback — do not invent a new id-generation approach.
- **`aria-describedby` + `role="alert"` + `aria-invalid` convention already documented and demonstrated** in `.ai-run/guides/patterns/accessibility-patterns.md` under "Form Field Accessibility" (see Section 3) and used ad hoc in `src/authentication/components/SignUpForm.tsx` (line 150: `aria-describedby="password-requirements"` on the password `Input`, pointing to a static id `password-requirements` on a tooltip, not an error — this is a *different* use of `aria-describedby`, for a hint/tooltip, not for inline validation error text). The canonical validation-error pattern is the one in the guide file, not SignUpForm's static-hint usage.
- `FileDropzoneErrors.tsx` already uses `role="alert"` per error div — a partial a11y pattern (dynamic announcement) but missing the static `id`/`aria-describedby` link, which is exactly the gap the ticket describes for Textarea.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — dedicated, current guide, directly applicable. Contains an exact "Form Field Accessibility" recipe:
  ```tsx
  <Controller name='email' control={control}
    render={({ field }) => (
      <Input
        {...field}
        id='email'
        label='Email'
        aria-required='true'
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'email-error' : undefined}
        error={errors.email?.message}
      />
    )} />
  {errors.email && (
    <span id='email-error' className='text-text-error text-sm' role='alert'>
      {errors.email.message}
    </span>
  )}
  ```
  This is effectively the same shape the ticket asks for on Textarea (aria-describedby conditional on error presence, aria-invalid, error element with matching id, role="alert" for the live-region behavior). The guide's ARIA quick-reference table also explicitly lists `aria-describedby` → "Input linked to hint or error text" → example `'email-error'`, and `aria-invalid` → "Field with validation error" → example `{!!errors.field}`.
- `.ai-run/guides/testing/testing-patterns.md` — governs test file location/naming/framework (see Section 4).
- No dedicated ADR or design doc specifically about Textarea/FilesDropzone a11y found beyond the accessibility-patterns guide.

### Architectural Decisions

- No inline `NOTE:`/`HACK:`/`ADR:`/`DECISION:` comments found in `Textarea.tsx`, `Input.tsx`, `FileDropArea.tsx`, or `FileDropzoneErrors.tsx`.
- The accessibility-patterns guide functions as the de facto ADR for how form-field errors should be wired to ARIA attributes across the app; the Textarea fix should conform to it rather than to Input's incidental label-wrapping behavior.

### Derived Conventions

- Error text styling convention: `className="text-text-error text-sm"` is consistent across `Textarea`, `Input`, and `FileDropzoneErrors` — the fix should preserve this className unchanged (labelling-only change, per ticket).
- `useId()` + `id ?? reactId` fallback is the established idiom (Checkbox, RadioGroup, RadioButton, SearchableCombobox, TooltipButton, Pagination, Popup) — Textarea's `errorId` should follow the same `const reactId = useId(); const errorId = \`${id ?? reactId}-error\`` (or equivalent) shape rather than a bespoke scheme.

---

## 4. Testing Landscape

### Existing Coverage

- **No test file exists for `Textarea`** — `ls` of `src/components/form/Textarea/` shows only `Textarea.tsx` and `index.ts`, no `__tests__/` directory. This is a coverage gap that predates this ticket.
- **No test file exists for `FileDropArea`/`FileDropzoneErrors`/`FilesDropzone`** — `src/components/form/FilesDropzone/` has no `__tests__/` subfolder.
- Sibling form components under `src/components/form/` that do have tests: `Autocomplete/__tests__/Autocomplete.test.tsx`, `OrderList/__tests__/*.test.tsx` (3 files), `RecordInput/__tests__/RecordInput.test.tsx`, `MultiSelect/__tests__/MultiSelect.test.tsx` — these establish the co-located `__tests__/` convention and are useful models for structuring new Textarea/FilesDropzone tests.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library, per `.ai-run/guides/testing/testing-patterns.md`.
- Convention: tests live in `__tests__/` co-located with the source file, e.g. `src/components/form/Textarea/__tests__/Textarea.test.tsx` (does not yet exist — needs to be created for TDD on this ticket) and `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` or a more targeted `FileDropArea.test.tsx`/`FileDropzoneErrors.test.tsx`.
- Naming: `*.test.tsx` → `unit` workspace project (single-component isolation) — appropriate for this ticket since the change is confined to presentational/markup logic, not store/API integration. `*.integration.test.tsx` is not needed here.
- AAA pattern (Arrange/Act/Assert), `afterEach(cleanup)` mandatory, `vi.mock()` at module level only (per `RecordInput.test.tsx` example: SVG icon and child component mocks declared at top of file).
- Query priority per guide: prefer `getByRole`, but for this specific a11y fix the most direct assertions will be on the DOM attribute relationship itself — e.g. `screen.getByRole('textbox')` then asserting `getAttribute('aria-describedby')` equals the error element's `id`, and using `screen.getByText(errorMessage)` / `getByRole('alert')` to obtain the error node. `jest-axe`'s `axe()` (documented in accessibility-patterns.md "Automated Testing" section) is available and idiomatic for a no-violations assertion but not currently used anywhere else in the repo's test suite (no existing `jest-axe` usage found in `src/`) — worth confirming during planning whether to introduce it here or keep to plain attribute assertions consistent with existing tests.

### Coverage Gaps

- `Textarea` component: zero existing tests — new test file needed to cover (a) error id/aria-describedby wiring, (b) aria-invalid toggling, (c) `useId()` fallback when `id` prop is omitted, (d) no regression to existing label/htmlFor behavior when there's no error.
- `FilesDropzone`/`FileDropArea`/`FileDropzoneErrors`: zero existing tests — if the "Add file" location is fixed as part of this ticket, equivalent new tests are needed there, complicated slightly by the fact `FileDropzoneErrors` renders an array of error divs (not a single error string like Textarea), so the id-association design (e.g., one id per message vs. a single group container id) needs to be decided before tests can be written.
- `DataSourceForm.tsx` itself has no dedicated new coverage needed if the fix is fully contained in `Textarea` — but a quick existing/new integration test asserting the Description field's rendered `<textarea>` has `aria-describedby` pointing at the visible error text would directly validate the ticket's acceptance criteria end-to-end.

---

## 5. Configuration and Environment

### Environment Variables

- None relevant. This is a pure client-side rendering/markup fix; no env vars, feature flags, or config gate this behavior.

### Configuration Files

- None relevant beyond `vitest.workspace.ts` (test project routing) already covered in Section 4.

### Feature Flags and Deployment Concerns

- No feature flag wraps `Textarea`, `FilesDropzone`, or the Data Source form. No deployment/manifest concerns — this ships as a normal frontend bundle change.

---

## 6. Risk Indicators

- codegraph MCP tool (`mcp__codegraph__search`) not found — repo research relied entirely on filesystem tools (Glob/Grep/Read); no code-graph cross-reference data (call graphs, symbol references) was available to double check the 38-consumer fan-out list is exhaustive.
- `Textarea` component has zero existing test coverage — new tests must be authored from scratch (TDD), with no existing test file to extend or pattern-match against for this specific component (only sibling components in the same directory tree provide a structural model).
- `FilesDropzone`/`FileDropArea`/`FileDropzoneErrors` also has zero existing test coverage, compounding the risk if the "Add file" location is in scope for the same PR.
- The "Add file" error path handles an **array** of error messages (`FileDropzoneErrors` renders one `<div role="alert">` per message, deduplicated), unlike Textarea's single error string — the aria-describedby/id design used for Textarea cannot be copy-pasted 1:1; it needs a small adaptation (e.g., a single container id enumerating multiple messages, or joining multiple ids in `aria-describedby`, which is valid per the ARIA spec as a space-separated id list).
- `Textarea` is imported by 38 different feature files across the app (data sources, chat, assistants, workflows, skills, settings/administration, integrations, katas, analytics). Although the change is additive/non-visual, this breadth means any regression in the shared component has a wide, cross-feature blast radius — warrants running the full existing test suite, not just new Textarea-specific tests, after the change.
- `SignUpForm.tsx`'s existing `aria-describedby="password-requirements"` is a **static hint reference**, not a validation-error pattern — it should not be mistaken for prior art on the error-association pattern; the actual prior art for the error pattern is the accessibility-patterns.md guide recipe and the Checkbox `useId()` idiom (two different files, neither is Textarea-specific), so implementers must synthesize from two separate conventions rather than copy one existing working example verbatim.
- No `jest-axe` usage precedent exists in the repo despite being documented in the accessibility-patterns guide as the recommended automated check — if the plan includes an axe assertion, it will be the first such test in the codebase (minor tooling/setup risk, e.g., confirming `jest-axe` is an installed devDependency).

---

## 7. Summary for Complexity Assessment

This task touches the **shared UI component layer** only (`src/components/form/`), not any API/service/repository/backend layer. The primary fix is a small, self-contained, additive change to a single file, `Textarea.tsx` (add `useId()`-derived `errorId`, `aria-describedby`, `aria-invalid`, and `id` on the error div) — this single change automatically satisfies 2 of the 3 locations named in the ticket (Data Source Create and Edit Description fields both route through the same `DataSourceForm.tsx` → shared `Textarea`). The third location, the "Add file" error message, was confirmed during this research to render through a **structurally different control** (`FileDropArea`'s hidden native file `<input>` + `FileDropzoneErrors`' array-based error rendering in `src/components/form/FilesDropzone/`), so it requires a second, separate but pattern-consistent code change — not a re-derivation from scratch, but an adaptation because it must handle multiple simultaneous error messages rather than Textarea's single error string. Estimated file change surface for implementation is small: 1-2 source files (`Textarea.tsx`, and `FileDropArea.tsx`/`FileDropzoneErrors.tsx` if in scope) plus 1-2 new test files, since no test files currently exist for either component.

Technical novelty is low: both the `useId()` fallback idiom (already used in `Checkbox.tsx`, `RadioGroup.tsx`, and others) and the `aria-describedby`/`aria-invalid`/error-id association pattern (already documented verbatim in `.ai-run/guides/patterns/accessibility-patterns.md` and structurally present, if incomplete, in `Input.tsx` and `FileDropzoneErrors.tsx`'s `role="alert"` usage) are established conventions in this codebase. No new architectural pattern needs to be invented; the work is applying two already-proven idioms to a component that currently lacks them.

Test coverage posture is a clear risk factor: both `Textarea` and the `FilesDropzone` subtree have **zero existing tests**, so all verification must be written net-new under TDD, following the `__tests__/` co-location convention and Vitest/RTL AAA pattern demonstrated in sibling components (`RecordInput`, `Autocomplete`, `MultiSelect`). Combined with `Textarea`'s 38-consumer fan-out (raising regression-risk breadth despite the change itself being additive/non-visual) and the array-vs-single-error design nuance in the FilesDropzone path, this should be scored as low-to-moderate complexity: small code diff and well-precedented patterns, offset by the need to build test coverage from scratch and to correctly scope whether the "Add file" location is included in this same change or ticketed/documented separately.
