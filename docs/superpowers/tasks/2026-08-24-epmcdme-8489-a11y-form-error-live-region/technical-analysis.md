# Technical Research

**Task**: accessibility form-validation error-announcement aria-live assistants modal
**Generated**: 2026-08-24T00:00:00Z
**Research path**: codegraph + filesystem

---

## 1. Original Context

EPMCDME-8489 [4.1.3] The "Prompt is required" error message is not announced by screen reader.

Precondition: Screen reader is turned on.
Steps to reproduce:
1. Open https://codemie.lab.epam.com/#/assistants.
2. Navigate using Tab key to the "Create Assistant" button and activate it. The "Generate Assistant with AI" modal dialog opens.
3. Navigate using Tab key to the "Generate with AI" button and activate it.
4. Listen to the screen reader announcement.

Actual result: The "Prompt is required" error message appears visually, but screen reader does not announce it.
Expected result: The "Prompt is required" error message should be announced by screen reader when it appears.

Also reproduces:
1. All error messages in the "Create assistant" page.
2. All error messages in the "Generate System Instructions with AI" modal dialog.
3. All error messages in the "Refine System Instructions with AI" modal dialog.
4. All error messages in the "Add new data source" modal dialog.
5. All error messages in the "Add new MCP server" modal dialog.

---

## 2. Codebase Findings

### Existing Implementations

**Form library stack:**
- react-hook-form 7.56.4 + @hookform/resolvers 5.0.1 (Yup). All affected forms use `useForm` with `resolver: yupResolver(schema)` and `Controller` to connect fields. Error strings are accessed as `fieldState.error?.message` inside the `Controller` render prop and passed as an `error: string | undefined` prop to the form-primitive component.
- UI primitives: project-owned Tailwind-based components (`Input`, `Textarea`, `Select`, `MultiSelect`). PrimeReact `Dropdown`/`MultiSelect` are wrapped but PrimeReact's `p-invalid` / `p-error` CSS class pattern is not used — all error display is handled by the wrapper.

**Form primitives — accessibility status:**

| Component | File | `aria-invalid` | `aria-describedby` | `role="alert"` on error div | Announces? |
|---|---|---|---|---|---|
| `Textarea` | `src/components/form/Textarea/Textarea.tsx` | YES (line 119) | YES (line 118) | YES (line 136) | YES |
| `FilesDropzone` | `src/components/form/FilesDropzone/components/FileDropzoneErrors.tsx` | YES | YES | YES (line 29) | YES |
| `Input` | `src/components/form/Input/Input.tsx` | NO | NO | NO | **NO** |
| `Select` | `src/components/form/Select/Select.tsx` | NO | NO | NO | **NO** |
| `MultiSelect` | `src/components/form/MultiSelect/MultiSelect.tsx` | NO | NO | NO | **NO** |
| `YamlEditor` | `src/components/form/YamlEditor/YamlEditor.tsx` | NO | NO | NO | **NO** |

**`Input.tsx` — primary fix target, 84 callers:**
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/form/Input/Input.tsx:188–191`
- Current error JSX: `<div className={cn('text-sm text-failed-secondary input-error-message', errorClassName)}>{error}</div>`
- The `<input>` element carries no `aria-invalid`, no `aria-describedby`. The error `<div>` carries no `id`, no `role`, no `aria-live`. Error text is purely visual.

**`Textarea.tsx` — reference implementation (already correct):**
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/form/Textarea/Textarea.tsx:77,118–119,135–139`
- `errorId = \`${id ?? reactId}-error\`` generated via `useId()` (line 77).
- `<textarea aria-describedby={error ? errorId : undefined} aria-invalid={!!error} ...>` (lines 118–119).
- `<div id={errorId} role="alert" className="text-text-error text-sm">{error}</div>` (lines 135–139).
- This component is the reference implementation to follow for all three broken primitives.

**`Select.tsx` — missing ARIA:**
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/form/Select/Select.tsx:186–188`
- Error JSX: `<div className={cn('text-failed-secondary text-sm mt-1', errorClassName)}>{error}</div>`
- The wrapped PrimeReact `<Dropdown>` has no `aria-invalid` or `aria-describedby`.

**`MultiSelect.tsx` — missing ARIA:**
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/form/MultiSelect/MultiSelect.tsx:420–424`
- Error JSX: `<div className={cn('text-sm text-failed-secondary input-error-message mt-2', errorClassName)}>{error}</div>`

**Shared live-region utility (for page-level, non-field announcements):**
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/Announcement/Announcement.tsx:26–29`
- Renders `<output aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</output>`.
- Driven by `src/hooks/useAnnouncementQueue.ts`. Currently used only by `FilesDropzone` and `RecordInput` for count announcements.
- This component is NOT the right mechanism for inline field validation errors. The `role="alert"` pattern (as in `Textarea`) is the correct WCAG approach for field errors and the existing project precedent.

**Workflow-editor-scoped `ValidationError` (not a shared component):**
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/workflows/editor/configPanels/components/ValidationError.tsx:20–33`
- Has `role="alert"` but is scoped only to the workflow editor config panels — not usable for inline field errors in modals or the assistant creation page.

**Inline Pattern C (caller renders raw error — no component):**
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/EditOutputForm/EditOutputForm.tsx:119`: `<p className="text-text-error text-sm mt-2">{errors.output.message}</p>` — no ARIA.
- Other forms use similar raw `<div>` / `<p>` elements without `role="alert"` where no primitive handles the error display.

**Affected surface per modal / page:**

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/FormGenAIPopup.tsx` — "Generate Assistant with AI" modal. `prompt` field: `Yup.string().trim().required('Prompt is required')`. Uses `<Textarea error={fieldState.error?.message}/>` — **Textarea is already ARIA-correct**, so this specific "Prompt is required" path should announce. The reproduction in the ticket may indicate a subtle timing issue with `role="alert"` on first DOM insertion in a modal context, or another Input-backed field in the same form is the true trigger.

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/AssistantForm.tsx` + `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx` — Create Assistant page. Fields `name`, `slug`, `icon_url` use `<Input>` — **NOT announced**. Field `description` uses `<Textarea>` — announced. Field `system_prompt` via `SystemPrompt.tsx` uses `<Textarea>` — announced.

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptGenAIPopup.tsx` — Generate / Refine System Instructions modals (both modes). `prompt` field is optional (no required validation). Uses `<Textarea>` — announced when errors appear.

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPBasicFields.tsx` — MCP server modal. `name` field: `<Input>` — **NOT announced**. `description` field: `<Textarea>` — announced. `tokensSizeLimit`: `<Input>` — **NOT announced**.

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` — Add data source modal. `name` field (line 362): `<Input>` — **NOT announced**. `description`: `<Textarea>` — announced. Other fields using `<Input>` at line 647 — **NOT announced**.

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/SystemPrompt/ManageVariablesPopup/EditVariableFormRow.tsx` — Manage prompt variables popup. `Input`-backed fields (password) — NOT announced. `Textarea`-backed fields — announced.

**Validation message strings — no i18n:**
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/constants/validation.ts` — centralized `VALIDATION_MESSAGES` object (primarily auth forms).
- All assistant / modal error strings are inline English literals in Yup schemas: `'Prompt is required'`, `'Name is required'`, `'Description is required'`, `'System instructions are required'`, `'Please enter a valid URL'`.
- No i18n library (`react-i18next`, `i18next`) is used for form validation messages anywhere in the app.

### Architecture and Layers Affected

| Layer | Component / Files |
|---|---|
| Shared UI — form primitives (fix targets) | `src/components/form/Input/Input.tsx`, `src/components/form/Select/Select.tsx`, `src/components/form/MultiSelect/MultiSelect.tsx` |
| Shared UI — already correct (reference) | `src/components/form/Textarea/Textarea.tsx`, `src/components/form/FilesDropzone/` |
| Shared UI — live region (not the fix path) | `src/components/Announcement/Announcement.tsx`, `src/hooks/useAnnouncementQueue.ts` |
| Feature — assistants | `src/pages/assistants/components/AssistantForm/` subtree |
| Feature — workflow editor | `src/pages/workflows/editor/configPanels/VirtualAssistantForm.tsx` |
| Feature — data sources | `src/pages/dataSources/components/DataSourceForm/` |
| Feature — MCP toolkit | `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/` |

The fix is a shared-UI-layer change only. No API, store, routing, or service layer is involved.

### Integration Points

- **react-hook-form `Controller`** pattern is universal: all affected forms pass `error={fieldState.error?.message}` as a string prop to the form primitive. No change to calling forms is needed — fixing the primitives propagates automatically.
- **`useId()` (React 19.2.8)** is already in use in `Textarea.tsx` to generate stable `errorId` values. `Input`, `Select`, and `MultiSelect` must adopt the same approach — derive `errorId` from the `id` prop or from `useId()`, conditionally attach `aria-describedby` only when `error` is truthy to avoid orphaned ID references.
- **84 call sites** of `Input`, plus all `Select` and `MultiSelect` usages, receive the fix automatically after the component-level change.

### Patterns and Conventions

- **Correct pattern (Textarea reference)**:
  1. `const errorId = \`${id ?? reactId}-error\`` using `useId()`.
  2. Native input/textarea: `aria-invalid={!!error}`, `aria-describedby={error ? errorId : undefined}`.
  3. Error container: `<div id={errorId} role="alert">{error}</div>`, conditionally rendered (not hidden/shown — conditionally inserted so `role="alert"` fires on DOM insertion).
- **Project guide mandates** (from `accessibility-patterns.md`): `role='alert'` or `aria-live='assertive'` for errors, `aria-invalid` + `aria-describedby` for the field, `aria-required` where applicable. Also documents a `focusOnError` pattern (`useEffect(() => { if (error) errorRef.current?.focus() }, [error])`) for high-urgency scenarios — this is optional for the minimal fix but documented in the guide.
- `sr-only` Tailwind utility is available and in use (in `Announcement.tsx`, `Switch.tsx`, `TooltipButton.tsx`). Not needed for inline field errors.

---

## 3. Documentation Findings

### Guides and Architecture Docs

Guides exist at `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/`:

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/patterns/accessibility-patterns.md` — primary accessibility guide. **Directly relevant**: specifies `role='alert'` + `aria-live='assertive'` for error announcement, `aria-describedby` + `aria-invalid` pattern for form fields, `Announcement` + `useAnnouncementQueue` for live regions, and an axe testing pattern. Contains working code examples.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/patterns/form-patterns.md` — form construction guide using react-hook-form + Controller. Shows `error={errors.name?.message}` passed to `<Input>` in the template but does not mandate `aria-invalid`/`aria-describedby` on the component — this is the documentation inconsistency that allowed the gap to grow.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/patterns/modal-patterns.md` — relevant for modal-based forms.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/testing/testing-patterns.md` — relevant if adding accessibility regression tests (axe pattern).

### Architectural Decisions

No ADR files found. The `Textarea` component is the sole in-code evidence of an intentional WCAG-compliant pattern, and functions as the implicit decision for how form field errors should be annotated. The `accessibility-patterns.md` guide codifies this intent but it was not applied to `Input`, `Select`, or `MultiSelect` when those components were written.

### Derived Conventions

- All `Input` / `Select` / `MultiSelect` components need to match the `Textarea` ARIA pattern: `useId`-generated `errorId`, `aria-invalid` + `aria-describedby` on the native element, `id` + `role="alert"` on the error container.
- Inline Pattern C callers (raw `<p>` / `<div>` with `errors.x.message` rendered directly in JSX) should be migrated to the form primitive or have `role="alert"` added locally.
- `Announcement` + `useAnnouncementQueue` are for page-level polite announcements (file counts, etc.), not for inline field validation errors.
- `PostToolUse` hooks in `.claude/settings.json` auto-run prettier and eslint after any `src/` file edit — no manual formatting needed.

### External Documentation Findings

Not applicable. No third-party or external API surface is involved in this fix.

---

## 4. Testing Landscape

### Existing Coverage

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/form/Textarea/__tests__/Textarea.test.tsx` — covers `aria-describedby`, `aria-invalid`, `toHaveAccessibleDescription` for the Textarea. Reference test to model Input's new test on.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` — covers `aria-describedby`, `aria-invalid`, `role="alert"` for file drop area errors.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/components/Announcement/__tests__/Announcement.test.tsx` — asserts `aria-live="polite"`, `aria-atomic="true"`, `sr-only` class, text content.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` — integration tests for assistant creation form. Asserts that error text is present in the DOM but does NOT assert `role="alert"`, `aria-invalid`, or `aria-describedby`.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx` — same pattern, no ARIA assertions.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/__tests__/FormGenAIPopup.test.tsx` — covers "Prompt is required" validation path but contains no `getByRole('alert')` assertion.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerConfigStep.test.tsx` — MCP config form; no a11y assertions.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx` — existing a11y test in assistants area (aria-labelledby). Pattern to follow for new a11y tests.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerDetail.accessibility.test.tsx` — dedicated a11y test for MCP detail view. Second existing pattern.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts` — validation logic unit test (hook level); no ARIA assertions.

### Testing Framework and Patterns

- **Vitest 1.6.1** with two projects: `unit` (jsdom) and `integration` (custom env, 30 s timeout).
- **@testing-library/react 16.3.0**, **@testing-library/jest-dom 6.6.3**, **@testing-library/user-event 14.6.1**.
- Test file convention: `src/**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)`.
- Existing a11y tests use `getByRole`, `toHaveAttribute`, `toHaveAccessibleDescription` — no automated scanner.
- No snapshot tests (`toMatchSnapshot` not present anywhere).
- No Playwright / e2e tests. No Storybook.

### Coverage Gaps

1. **`Input.tsx` has no unit test at all.** No `Input.test.tsx` exists. The fix to `Input` cannot be caught by the test suite without adding a new test.
2. **`NewAssistantPage`, `EditAssistantPage`, `FormGenAIPopup` integration tests do not assert ARIA error announcement.** All three exercise error-display code paths but verify only DOM text content, not screen-reader semantics.
3. **No automated WCAG scanner.** `jest-axe` is absent. Structural violations on future form components will not be detected automatically.
4. **`Select` and `MultiSelect` have no ARIA error assertions in their existing tests.**
5. **`Textarea.tsx` test does not verify that `aria-describedby` on the `<textarea>` points at the rendered error div's `id`.** The wiring exists in source but is not asserted — the model test to follow should close this gap.

---

## 5. Configuration and Environment

### Environment Variables

No feature-flag env vars govern form validation display or accessibility behaviour. The `useFeatureFlag` hook is used in `AssistantForm.tsx` for unrelated features (hedging, etc.).

### Configuration Files

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/vitest.workspace.ts` — `unit` and `integration` project configs.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/tailwind.config.ts` — `sr-only` Tailwind utility is available via default preflight.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/src/constants/validation.ts` — centralized validation message strings (partial; most are inline in Yup schemas).
- `.claude/settings.json` — `PostToolUse` hook auto-runs prettier + eslint on `src/` edits. No manual format step needed after file changes.

### Feature Flags and Deployment Concerns

None. Pure UI correctness change with no feature-flag gate or deployment dependency.

---

## 6. Risk Indicators

- **`Input.tsx` blast radius: 84 call sites.** Fixing `Input` propagates automatically to all 84 consumers. If the `errorId` generation or `aria-describedby` logic has a defect, it affects all 84 locations simultaneously. Test the component in isolation first.

- **Duplicate-ID risk when `id` prop is supplied by caller.** `useId()` generates a stable React ID; the `errorId` must be derived from the same `id` used on the `<input>` element. If a caller also constructs an `id` based on a field name, verify there is no collision. The `Textarea` pattern resolves this by deriving `errorId` from `id ?? reactId` — follow that exactly.

- **`role="alert"` on DOM insertion vs. content update.** `role="alert"` fires when the element is inserted into the DOM, not when its text content changes. The current `{error && <div ...>}` conditional-render pattern (as in `Textarea`) is correct — the element is inserted/removed, not toggled visible/hidden. Verify that the fix does not accidentally switch to CSS-based show/hide (which would break the announcement).

- **`FormGenAIPopup.tsx` uses `Textarea` and should already announce.** The ticket says "Prompt is required" is not announced, but the component uses `Textarea` which has `role="alert"`. The actual bug path may be on the Create Assistant page's `name`/`slug` Input fields rather than the GenAI popup's prompt field — or there is a subtle modal-context timing issue where `role="alert"` insertion during a dialog open is missed by some screen readers. Investigation during implementation is needed.

- **`Select` and `MultiSelect` need fixes too.** Fixing only `Input.tsx` is insufficient to resolve all cases in the "Also reproduces" list. `Select` is used in assistant form dropdowns; `MultiSelect` in category and toolkit selection. Both must be updated.

- **`Input.tsx` has no existing unit test.** A new `Input.test.tsx` must be written alongside the fix. Without it there is no CI guard on the ARIA wiring.

- **`form-patterns.md` guide inconsistency.** The guide template shows `error={errors.name?.message}` passed to `<Input>` but does not describe the ARIA attributes. After the fix, `form-patterns.md` should be updated to show the correct component-level contract so future form authors do not add Pattern C inline errors.

- **Hardcoded English error strings.** No i18n layer exists for validation messages. If the project adds i18n later, every Yup schema inline string will need extraction. Not a risk for this ticket, but worth noting as technical debt.

- **No automated a11y scanner.** `jest-axe` is absent. Future form components can repeat this mistake without detection. Adding `jest-axe` to the test setup is a recommended follow-up, out of scope for this ticket.

---

## 7. Summary for Complexity Assessment

The root cause is inconsistency across three of the project's five shared form primitives. `Input.tsx`, `Select.tsx`, and `MultiSelect.tsx` render validation errors as plain `<div>` elements with no ARIA semantics, while `Textarea.tsx` and `FilesDropzone` already implement the correct WCAG SC 4.1.3 pattern (`role="alert"` on the error container, `aria-invalid` + `aria-describedby` on the native input element, `errorId` via `useId()`). Fixing the three broken primitives propagates the fix to all 84+ call sites — including the Create Assistant page, MCP server modal, DataSource modal, and any other form that uses these components — without touching any individual form file. The change is confined entirely to the shared UI layer; no store, API, routing, or service layer is involved. The `accessibility-patterns.md` guide already prescribes the correct pattern, so no architectural decision is needed — only implementation alignment.

The task follows a well-established in-codebase pattern and is low in technical novelty. The only non-trivial judgment call is verifying that `errorId` is derived correctly (from `id ?? useId()`) to avoid duplicate IDs, and confirming that `role="alert"` fires on DOM insertion (which the conditional-render pattern guarantees). One additional investigation item during implementation: `FormGenAIPopup.tsx` uses `Textarea` for the "Prompt is required" field and should already announce — the exact reproduction path for the ticket's primary step should be verified during implementation to confirm whether the Textarea has a subtle modal-context timing issue or the true reproduction is on the `Input`-backed Create Assistant page fields.

Test coverage posture is poor for the affected primitives. `Input.tsx` has no unit test; integration tests for all affected pages assert DOM text but not ARIA semantics. The fix must be accompanied by: (1) a new `Input.test.tsx` (modeled on the existing `Textarea.test.tsx`) asserting `aria-invalid`, `aria-describedby`, and `role="alert"` when an `error` prop is supplied; (2) equivalent coverage for `Select` and `MultiSelect`; and (3) ARIA assertion additions to `FormGenAIPopup.test.tsx`, `NewAssistantPage.integration.test.tsx`, and `MCPServerConfigStep.test.tsx`. The two existing `*.accessibility.test.tsx` files in the assistants directory establish the correct testing pattern to follow.
