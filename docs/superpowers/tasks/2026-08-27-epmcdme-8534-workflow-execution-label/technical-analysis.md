# Technical Research

**Task**: workflows execution dialog accessibility label
**Generated**: 2026-08-27T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8534: [1.3.1] Missing label for input field in New Workflow Execution. Steps to Reproduce: 1. Open /#/workflows/my as an authorised user. 2. Select Start execution button on one of the workflows. 3. Ensure that the Enter a starting prompt field has a label. Actual result: The Enter a starting prompt field does not have a visible label. Expected result: The Enter a starting prompt field should have a visible and accessible label that clearly describes the purpose of the field.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx` — the popup opened when a user hits "Start execution" on a workflow. Renders the `Editor` component at line 137 with `placeholder="Enter a starting prompt"` but no `<label>`, no `aria-label`, and no `aria-labelledby`.
- `src/components/Editor/Editor.tsx` — Quill-based rich text editor wrapping PrimeReact's `Editor`. Renders as `div[contenteditable=true][role=textbox]`. Already applies `quill.root.setAttribute('data-placeholder', ...)` via a `useEffect` when `placeholder` changes (line 129–133). No `aria-label` or `aria-labelledby` is ever written to `quill.root`. Does not accept any label-related prop.
- `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.scss` — CSS only; applies Tailwind utilities to `.workflow-execution-editor` and the inner `.ql-editor`. No structural concern.

### Architecture and Layers Affected

- **Page/popup layer** (`WorkflowStartExecutionPopup.tsx`): must render a visible `<label>` element and wire it to the Editor.
- **Shared component layer** (`Editor.tsx`): must accept a new prop (e.g. `ariaLabelledBy`) and apply it to `quill.root` via a `useEffect`, following the same pattern already used for the `data-placeholder` attribute.

### Integration Points

- `PrimeReact Dialog` (via `Popup`) wraps the popup; the dialog root is already labeled with `aria-labelledby` pointing to the `<h4>` title (Popup.tsx line 164). The field-level label is independent of this.
- `quill.root` is the `div.ql-editor[contenteditable][role=textbox]` inside PrimeReact's Editor. It is the only focusable editing surface; any accessible name must be attached to it, not to wrapper divs.
- Because `contenteditable` divs do not associate with `<label htmlFor>`, the label connection must use `aria-labelledby` on `quill.root`, mirrored by a rendered element with a matching `id`.

### Patterns and Conventions

- The existing placeholder useEffect in `Editor.tsx` (`quill.root.setAttribute('data-placeholder', ...)`) is the direct pattern to follow for setting `aria-labelledby` on the same node.
- The accessibility guide (`.ai-run/guides/patterns/accessibility-patterns.md`) requires: "Form inputs have `<label htmlFor>` or `aria-label`", and shows `sr-only` for visually-hidden labels when no visible label is practical. The ticket requires a **visible** label.
- Other accessibility fixes in this area (e.g. `WorkflowActions.accessibility.test.tsx`, `WorkflowExecutionsListItem.accessibility.test.tsx`) each have a dedicated accessibility test file proving the ARIA wiring.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — directly relevant. States that form inputs require `<label htmlFor>` or `aria-label`, documents `sr-only` for visually-hidden labels, and documents ARIA attribute usage. Includes the pre-delivery checklist item "Form inputs have `<label htmlFor>` or `aria-label`".
- `.ai-run/guides/components/component-patterns.md` — general component construction; no rich-text-editor-specific labeling guidance.

### Architectural Decisions

No ADR or inline decision comment covers rich text editor labeling in particular. The accessibility guide is the authoritative source.

### Derived Conventions

- Accessibility regressions in this codebase get their own focused test file (e.g. `*.accessibility.test.tsx`) rather than inline assertions in main unit tests. Two examples exist under `src/pages/workflows/`.
- Quill-root attribute mutations (beyond what PrimeReact wires at init) are done via `useEffect` in `Editor.tsx` — see the existing `data-placeholder` and `disabled` effects.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.test.tsx` — 9 unit tests covering: render visibility, attach button click, Create button disable/enable states, submit with/without files, and Enter-key guard. No test asserts accessible naming of the Editor field.
- `src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx` — pattern reference: dedicated accessibility file testing ARIA wiring.
- `src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutionsListItem.accessibility.test.tsx` — second reference for the focused accessibility test pattern.

### Testing Framework and Patterns

- Vitest with `@testing-library/react`. Tests use `screen.getByRole`, `screen.getByPlaceholderText`, and attribute assertions (`toHaveAttribute`).
- Mocks: `Editor` is mocked in `WorkflowStartExecutionPopup.test.tsx` as a plain `<textarea>` exposing `placeholder`; any new `ariaLabelledBy` prop passed to the real Editor would not be exercised by the existing mock.

### Coverage Gaps

- No test currently asserts that the `Editor`'s Quill root has an `aria-labelledby` attribute or that a visible label element exists.
- No integration test covers the accessibility of `WorkflowStartExecutionPopup`.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this change.

### Configuration Files

None relevant to this change.

### Feature Flags and Deployment Concerns

None. This is a UI accessibility fix with no runtime toggle or deployment dependency.

---

## 6. Risk Indicators

- **`<label htmlFor>` cannot target a `contenteditable` div.** The Quill editing surface is a `div[role=textbox][contenteditable]`, not an `<input>`. A `<label htmlFor=someId>` with `id=someId` on the Quill root will not create a functional HTML association (browsers associate `<label htmlFor>` only with labelable elements). The correct approach is `aria-labelledby` on `quill.root`, which requires imperatively setting the attribute via a `useEffect` in `Editor.tsx`.
- **`Editor` is mocked as a `<textarea>` in the existing unit test.** Changes to the real `Editor` component (new prop, new useEffect) are not exercised by `WorkflowStartExecutionPopup.test.tsx` unless the mock is updated. A dedicated accessibility test using the real component (or asserting on the rendered label element) is needed to verify the wiring.
- **Two-file change surface.** Both `Editor.tsx` and `WorkflowStartExecutionPopup.tsx` must be modified consistently. If only the popup changes (adds a `<label>`) without the Editor change (adds `aria-labelledby` to `quill.root`), sighted users see a label but screen readers still cannot associate it with the field.
- **No existing test guards this regression.** There is no automated check that would catch removing the label or the `aria-labelledby` attribute after this fix lands. A focused accessibility test file is the convention used elsewhere in the workflows feature.

---

## 7. Summary for Complexity Assessment

The change touches two files in two architectural layers: the popup component (`WorkflowStartExecutionPopup.tsx`) adds a rendered visible `<label>` element, and the shared Editor component (`Editor.tsx`) gains one new optional prop and one short `useEffect` that mirrors the already-present `data-placeholder` effect. The change surface is narrow — fewer than ten lines of production code across both files — and the pattern to follow (Quill root attribute mutation via `useEffect`) is already established within `Editor.tsx` itself.

Technical novelty is low: the only non-obvious aspect is that `<label htmlFor>` does not associate with a `contenteditable` div, requiring `aria-labelledby` instead. This is standard WCAG practice and is documented in the project's own accessibility guide. No new dependencies, no store changes, no routing changes, and no configuration changes are involved.

Test coverage posture requires attention: the existing unit tests mock the `Editor` component, so the real ARIA wiring will not be exercised by them. The codebase convention for accessibility fixes is a dedicated `*.accessibility.test.tsx` file (two examples exist in the same workflows feature area). A small focused test asserting the visible label renders and the Editor mock receives the expected `ariaLabelledBy` prop is the minimum required to prevent regression.

---

## 8. External References

None named by the task.
