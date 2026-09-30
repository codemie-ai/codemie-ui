# Plan — EPMCDME-8539 · Input extra announcement and accessibility refactoring

## Context

See `technical-analysis.md`. The `Input` component renders a root `<label htmlFor={id}>` element which wraps the entire component including help texts, interactive tooltips, buttons, custom content and error messages.
1. All nested text gets recursively concatenated into the input's accessible name under the W3C computation spec.
2. Having interactive descendants (like links, help buttons, password visibility toggles) inside `<label>` violates HTML5 standards and causes improper focus/event bubbling.

## Approach

Refactor `Input.tsx` to:
- Use a root `<div>` instead of `<label>` as the container.
- Use `useId()` from React to generate fallback unique IDs when the `id` prop is not provided.
- Scope the `<label>` element strictly to the text label.
- Link error messages via `aria-describedby` and `aria-invalid`.
- Ensure all interactive nodes (tooltips, buttons, custom label contents) sit outside the `<label>`.

## Tasks

### T1 — Refactor Input component for a11y compliance
- **Test-first: yes — New unit tests verify that the accessible name of the input is clean (only the label text), interactive helper elements do not focus the input, and error messages are correctly linked via aria-describedby.**
- **Impl**:
  - Update `Input.tsx` imports and use `useId()` for unique ID generation fallback.
  - Refactor outer `<label>` container to a `<div>`.
  - Refactor label rendering to scope `<label>` to label text and asterisk only.
  - Wire up `aria-describedby`, `aria-invalid`, `aria-required`, and ID mappings.
  - Add `role="alert"` and ID to the error message div.

### T2 — Create comprehensive unit tests for Input component
- **Test-first: no — This task is for writing the complete test suite itself under `src/components/form/Input/__tests__/Input.test.tsx`.**
- **Impl**:
  - Write test cases verifying:
    - Clean accessible name (only matching label text).
    - `labelContent` isolation (text from labelContent does not pollute accessible name, clicking it doesn't trigger input focus).
    - Hint isolation (tooltip content doesn't pollute accessible name).
    - ID fallback generation using `useId()`.
    - Error message relationship using `aria-describedby` and `aria-invalid`.
    - Event isolation and password visibility toggle behavior.

## Verification

- Run unit test suite: `npm test src/components/form/Input/__tests__/Input.test.tsx`.
- Run associated forms and fields tests to ensure no regressions.
- Verify using TypeScript typecheck: `npm run typecheck`.
- Verify using linter: `npm run lint`.
