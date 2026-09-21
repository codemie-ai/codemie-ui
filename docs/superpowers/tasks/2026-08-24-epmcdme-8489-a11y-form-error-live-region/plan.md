# Plan — EPMCDME-8489 a11y form-error live region

Ticket: [EPMCDME-8489](https://jiraeu.epam.com/browse/EPMCDME-8489)
Branch: `EPMCDME-8489_a11y-form-error-live-region`
Flow: `sdlc-light`

## Requirements

Form validation error messages must be announced by screen readers on the "Generate Assistant with AI" modal, the Create Assistant page, the Generate/Refine System Instructions modals, the Add new data source modal, and the Add new MCP server modal (WCAG SC 4.1.3, SC 3.3.1).

The `Textarea` primitive already implements the correct pattern (`useId`-derived `errorId`, `aria-invalid`, `aria-describedby`, `role="alert"` on a conditionally rendered error node). The three sister primitives — `Input`, `Select`, `MultiSelect` — do not, so any form field that uses them stays silent for a screen-reader user. This plan aligns those three primitives with `Textarea`, adds unit coverage that pins the ARIA wiring, and updates the `form-patterns.md` guide template so the correct contract is documented for future authors.

Reference implementation: `src/components/form/Textarea/Textarea.tsx:77,118-119,135-139`.
Reference test: `src/components/form/Textarea/__tests__/Textarea.test.tsx`.

## Non-goals

- Adding `jest-axe` to the test setup (recommended follow-up, out of scope).
- Migrating "Pattern C" inline error renderers (e.g. `EditOutputForm.tsx`) to a primitive.
- Extracting Yup validation strings into an i18n layer.
- Touching `YamlEditor.tsx` (called out in the analysis but not in the ticket's reproduction list).
- Changing visual styling or copy of any error message.

## Tasks

### T1 — Add ARIA wiring to `Input.tsx`

**Test-first: yes** — write `src/components/form/Input/__tests__/Input.test.tsx` (new file) modelled on `Textarea.test.tsx`. It must fail against the current `Input.tsx`:
- With an `error` prop and an `id`, the `<input>` element carries `aria-invalid="true"` and `aria-describedby` equal to the error node's `id`, and the error node has `role="alert"`.
- Without an `error`, no `aria-describedby` is present, `aria-invalid="false"`, and no error node is in the DOM.
- With no `id` prop, `useId()` fallback still associates the input with the error node.
- A caller-supplied `aria-describedby` / `aria-invalid` on `<Input>` does not override the computed error association (mirror the Textarea test's fourth case).

Implementation in `src/components/form/Input/Input.tsx`:
- Import `useId` from React; compute `const reactId = useId(); const errorId = \`${id ?? reactId}-error\``.
- On the `<input>` element (currently around line 156), add `aria-invalid={!!error}` and `aria-describedby={error ? errorId : undefined}`. If the caller passes `aria-describedby` through `...rest`, the computed value must win (spread `...rest` before the ARIA attributes, matching the way Textarea's props flow).
- Change the error `<div>` (line 188) to `<div id={errorId} role="alert" className={...}>{error}</div>` — keep existing class names; the conditional render pattern (`{error && ...}`) stays as is.

No caller changes.

### T2 — Add ARIA wiring to `Select.tsx`

**Test-first: yes** — add ARIA cases to `src/components/form/Select/__tests__/Select.test.tsx` (create the test file if missing) mirroring T1's four cases against the wrapped PrimeReact `Dropdown` element (query by the `data-testid` the current component exposes, or by role).

Implementation in `src/components/form/Select/Select.tsx`:
- Same `useId` + `errorId` pattern.
- Pass `aria-invalid` and `aria-describedby` through to the underlying `<Dropdown>` (PrimeReact forwards standard ARIA attributes to the trigger element).
- Change the error `<div>` (line 186) to include `id={errorId} role="alert"`.

### T3 — Add ARIA wiring to `MultiSelect.tsx`

**Test-first: yes** — same test cases as T2, adapted for the `MultiSelect` primitive. Create `src/components/form/MultiSelect/__tests__/MultiSelect.test.tsx` if it doesn't exist.

Implementation in `src/components/form/MultiSelect/MultiSelect.tsx`:
- Same `useId` + `errorId` pattern.
- Pass `aria-invalid` and `aria-describedby` through to the underlying PrimeReact `MultiSelect` trigger.
- Change the error `<div>` (line 420) to include `id={errorId} role="alert"`.

### T4 — Verify `FormGenAIPopup` "Prompt is required" path announces

**Test-first: yes** — extend `src/pages/assistants/components/AssistantForm/components/__tests__/FormGenAIPopup.test.tsx` with a case that triggers the "Prompt is required" validation and asserts `getByRole('alert')` contains the message, and that the `<textarea>` gains `aria-invalid="true"` and `aria-describedby` pointing at the alert node.

Implementation:
- No source change is expected — `Textarea` already carries the ARIA plumbing. If the new test fails, investigate whether react-hook-form's error propagation delays the `error` prop past the modal open animation; if so, the fix stays confined to `FormGenAIPopup.tsx` (e.g. keep the modal in the DOM before submit, or pass `mode: "onSubmit"` and let RHF drive rerender). Document the finding either way.

### T5 — Update `form-patterns.md` guide template

**Test-first: no** — documentation change with no runtime behaviour.

Edit `.ai-run/guides/patterns/form-patterns.md`: update the form-primitive template snippet so it names the ARIA contract (`aria-invalid`, `aria-describedby`, `role="alert"` on the error node) and links to `accessibility-patterns.md`. Rationale: the current template shows only `error={errors.name?.message}` and does not describe the contract, which is what let the gap grow.

## Verification

- `npx vitest run --project unit src/components/form/{Input,Select,MultiSelect,Textarea}` — new + existing primitive tests green.
- `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/__tests__/FormGenAIPopup.test.tsx` — updated integration case green.
- `npm run lint` and `npm run type-check` clean.
- Manual screen-reader smoke: open Generate Assistant with AI modal → click Generate without filling → confirm the "Prompt is required" message is announced. Repeat for the Create Assistant `name` field (Input-backed), the MCP server `name` field, and the Data Source `name` field.

## Risks

- `Input.tsx` blast radius: 84 callers. Isolation-first testing (T1's unit test) is the mitigation.
- Duplicate `id` collisions if a caller supplies its own `id` scheme — the `${id ?? reactId}-error` pattern is designed to prevent this; the second test case in T1 pins it.
- `role="alert"` only fires on DOM insertion. The conditional render (`{error && ...}`) is preserved in all three primitives — do not switch to CSS show/hide.
- PrimeReact `Dropdown` / `MultiSelect` may not forward every ARIA attribute directly. Check the rendered DOM in the T2/T3 tests; if they land on a wrapper rather than the interactive trigger, add the attributes via the component's `pt` (passthrough) prop instead.
