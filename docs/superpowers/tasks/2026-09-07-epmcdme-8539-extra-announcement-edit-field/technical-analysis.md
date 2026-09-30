# Technical Research

**Task**: input accessible name extra announcements html5 label living standard
**Generated**: 2026-09-07
**Research path**: filesystem (using codebase-memory-mcp graph search and trace)

---

## 1. Original Context

EPMCDME-8539: Input field error message and interactive descendants inside `<label>` are announced recursively as part of the field's accessible name and violate HTML5 living standard focus/event bubbling.
Root cause (already verified in DOM and code, confirm and build on it):
In `src/components/form/Input/Input.tsx`, the root container is rendered as an HTML `<label htmlFor={id}>` element.
1. W3C Accessible Name Computation (§4.3.2): All textual descendants within `<label>` are recursively concatenated to compute the accessible name of the associated `<input>`. Consequently, screen readers announce `labelContent` (e.g., "Need help?"), hint buttons, and error messages as part of the field label.
2. HTML5 Living Standard (§4.10.4): Interactive descendants (such as `<a>` links and `<button>` toggles) are not permitted inside `<label>`. This causes improper focus/event bubbling when clicking links, tooltips, or the password visibility toggle.

Required fix:
- Restructure the `Input` component's HTML hierarchy. Change the root container from `<label>` to `<div>`.
- Render a separate `<label>` only wrapping the actual text label, with a matching `htmlFor` attribute linking to the `<input>`.
- Use React's `useId` hook to generate a stable, unique fallback ID if the caller does not pass an explicit `id` prop (consistent with Checkbox, Textarea, and other form components).
- Associate the error message with the `<input>` element programmatically via a matching `id`/`aria-describedby` link, and set `aria-invalid={!!error}` on the input.
- Keep styling completely identical using the existing CSS/Tailwind classes, ensuring no visual or behavioral regressions.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/form/Input/Input.tsx` (confirmed root cause file):
  - Root element (lines 98-101) renders as `<label htmlFor={id} className={cn('flex flex-col gap-y-2 w-full min-w-0 input-field-wrapper', rootClass)}>` which wraps the entire component tree, including the label text, hint tooltips, input container, password toggle (if any), and the error message container.
  - Interactive descendants like `TooltipButton` (line 117) and custom `labelContent` (line 119) are currently nested within this root `<label>`, which violates HTML5 Living Standard (§4.10.4).
  - The inner label container (lines 111-116) renders a bare `<div>` with `className="... input-label"` rather than a semantic `<label htmlFor={id}>`.
  - The `<input>` element (lines 156-173) lacks programmatic association with the error container: it does not have `aria-describedby` or `aria-invalid` attributes.
  - The error container (lines 182-186) renders as:
    ```tsx
    {error && (
      <div className={cn('text-sm text-failed-secondary input-error-message', errorClassName)}>
        {error}
      </div>
    )}
    ```
    It has no `id`, no `role="alert"`, and no direct programmatic connection to the `<input>`.
- **Consumers of `Input`**:
  - Codebase-wide trace confirms that `Input` is imported/used in **80+ files** across almost all pages and features in the application (including `ChatPage`, `ProjectModal`, `DataSourceForm`, `SignUpForm`, `SignInForm`, `WorkflowFormFields`, `AssistantSetupSection`, `BasicSettings`, etc.).
  - This extremely high fan-out indicates that any regression to the shared `Input` component has a vast blast radius. However, since the change is purely structural and additive (changing root element tag and mapping accessibility attributes), it is non-visual and low-risk if existing styling classes are preserved.

### Architecture and Layers Affected

- **Shared UI Component Layer** (`src/components/form/`): `Input.tsx` — primary fix target.
- **Form Integration Layer**: React Hook Form integrations across 80+ consumer components. The fix must be purely presentational/markup-level and backward-compatible with all existing props and usage patterns.
- No backend, API, or state-management layers are affected.

### Integration Points

- `Input` is heavily integrated with React Hook Form's `Controller` pattern (`fieldState.error?.message` passed to `error`), as well as native uncontrolled/controlled usage.
- Uses the `cn` utility from `@/utils/utils` for merging classNames.

### Patterns and Conventions

- **`useId()` Fallback Pattern**: Found across multiple shared form controls like `Checkbox.tsx`, `Textarea.tsx`, `RadioGroup.tsx`, and `SearchableCombobox.tsx`.
  ```tsx
  const reactId = useId()
  const inputId = id ?? reactId
  const errorId = `${inputId}-error`
  ```
- **`aria-describedby` + `aria-invalid` Error Association Pattern**: Confirmed in `Textarea.tsx`:
  ```tsx
  aria-describedby={error ? errorId : undefined}
  aria-invalid={!!error}
  ```
  And the error `div` has `id={errorId}` and `role="alert"`. Our new `Input` implementation should align perfectly with this convention.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` contains an exact "Form Field Accessibility" blueprint documenting how input errors and labels should be associated via `aria-describedby` and `aria-invalid` (as seen in Section 3 of the guide).
- The accessibility-patterns guide explicitly highlights the importance of WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value) compliance.

### Architectural Decisions

- Aligning `Input.tsx`'s accessibility pattern with `Textarea.tsx` ensures consistency across the design system.

### Derived Conventions

- Tailwind and CSS styling classes are co-located in the components. For `Input`, the core identifier classes (`input-field-wrapper`, `input-label-container`, `input-label`, `input-block-container`, `input-element`, `input-error-message`) are referenced in Tailwind and are not targeted in external `.scss` files, making the refactor tag-independent.

---

## 4. Testing Landscape

### Existing Coverage

- Currently, there are **no existing unit tests** for `Input.tsx` under `src/components/form/Input/`.
- Sibling components like `Textarea` have rich coverage under `Textarea.test.tsx` that asserts accessible descriptions and attributes:
  - Links the element to the error message via `aria-describedby`.
  - Asserts `aria-invalid="true"`.
  - Fallback unique ID association using `useId`.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library + `@testing-library/jest-dom` matchers.
- We should create a new test file: `src/components/form/Input/__tests__/Input.test.tsx` following the AAA (Arrange, Act, Assert) pattern.
- The tests should verify:
  1. Root element is rendered as a `div` (not a `label`).
  2. Input element is associated with the `<label htmlFor={inputId}>` for clicking/focus.
  3. The error message is programmatically linked via `aria-describedby` when an error is present.
  4. `aria-invalid="true"` is set when an error is present, and `aria-invalid="false"` or undefined when absent.
  5. Correct fallback of unique `id` when no `id` prop is supplied by the caller.
  6. Custom caller-passed `aria-describedby` is respected if no error is present.

### Coverage Gaps

- Complete lack of unit tests for `Input.tsx` inside the codebase. The development/pipeline test runs will gain valuable coverage from the new `Input.test.tsx` file.

---

## 5. Configuration and Environment

### Environment Variables

- None. This is a purely client-side rendering accessibility fix.

### Configuration Files

- None. Testing configuration is governed by existing Vitest workspace setups.

### Feature Flags and Deployment Concerns

- No feature flags or deployment gating applies to this shared component.

---

## 6. Risk Indicators

- **Blast Radius**: The 80+ consumer files create a high regression footprint. This risk is fully mitigated by preserving all existing CSS/Tailwind classes (`input-field-wrapper`, etc.) and props, and keeping the layout completely identical.
- **Refactoring of the Root Element**: Changing from `<label>` to `<div>` is extremely safe because there are no `.scss` selectors targeting `<label>` in `Input` context, and Tailwind classes are tag-agnostic.
- **Event Bubbling / Focus Issues**: Previously, clicking any padding/elements inside the label would focus the input. By changing the root to `div` and the label to a small separate element, clicks on interactive descendants (like `TooltipButton` or password toggles) will no longer bubble up to focus the input field, which is the desired compliant behavior.

---

## 7. Summary for Complexity Assessment

This task is scored as **low complexity**.
- **Change Surface**: 1 source file (`Input.tsx`) and 1 new test file (`Input.test.tsx`).
- **Technical Novelty**: Extremely low. The required `useId` fallback and `aria-describedby` pattern are already fully realized in `Textarea.tsx` and documented in `accessibility-patterns.md`.
- **Test Coverage**: We will create `Input.test.tsx` to establish 100% robust test coverage for this behavior, ensuring zero regression and precise compliance validation.
