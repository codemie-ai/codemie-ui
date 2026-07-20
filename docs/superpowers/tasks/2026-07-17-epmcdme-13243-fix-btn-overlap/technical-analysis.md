# Technical Research

**Task**: table button hover visibility css tailwind
**Generated**: 2026-07-17T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

We have a glitch for the solution for EPMCDME-13243. The button presented in scope of that ticket sometimes overlaps with table heading labels. The proposed solution is to hide this button by default showing only on mouseover event on the table.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/markdown/tokens/TableBlock.tsx` — The component under fix. A pure functional component (no state, no hooks). Renders a `<div className="relative my-1">` wrapper, an inner `<div dangerouslySetInnerHTML>` for the table HTML, and an absolutely-positioned button container `<div className="absolute top-0 right-0 z-10 flex items-center h-9">` holding a single `<Button>` for copy-to-clipboard. The button is always visible, causing overlap with `<th>` cells.
- `src/components/markdown/tokens/MermaidDiagram.tsx` — A stateful sibling component. Its button overlay also uses `<div className="absolute top-0 right-0 z-10 flex items-center">` and is always visible (no hover-hide pattern applied). Not a reference implementation for the hover-show pattern, but confirms the same positioning approach is reused in the same module.
- `src/components/Navigation/NavigationPinnedSection/PinnedRow.tsx` — The canonical hover-show button pattern in this codebase. The parent `<div>` carries `className="relative group"` and the hidden button carries `opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none transition-colors`. No `duration-*` modifier — `transition-colors` implicitly uses the project default duration.
- `src/components/Navigation/NavigationPinnedSection/PinnedAssistantsOverflowDropdown.tsx` — Second reference. Parent row has `className="group ..."`. Hidden element uses `opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none` with a separate `transition-colors` class.
- `src/components/Card/Card.tsx` — Uses `opacity-0 group-hover:opacity-100 transition duration-300` on an absolutely-positioned overlay inside a `group` parent.
- `src/pages/workflows/components/WorkflowCard.tsx` — Same pattern as `Card.tsx`: `opacity-0 group-hover:opacity-100 transition duration-300`.
- `src/components/form/OrderList/OrderListTemplate.tsx` — Uses the named-group variant: parent has `group/item`, child uses `group-hover/item:opacity-100 transition duration-75`.

### Architecture and Layers Affected

- **UI Component layer only.** The change is entirely within `src/components/markdown/tokens/TableBlock.tsx`. No service, store, API, or routing layer is involved.
- The component is a leaf, presentational component. Introducing `group`/`group-hover` requires adding `group` to the outermost `<div>` and `opacity-0 group-hover:opacity-100` to the button container. No state (no `useState` for hover) is required — this is a pure CSS Tailwind approach, consistent with all existing references in the codebase.

### Integration Points

- `TableBlock` is consumed by the markdown renderer. No direct parent component changes are required — the fix is self-contained.
- `copyToClipboard` from `@/utils/utils` and `Button` from `@/components/Button` are the only imports; both are unchanged by the fix.

### Patterns and Conventions

The codebase has a single established pattern for hover-reveal of absolutely-positioned buttons:

1. Add `group` to the nearest positioned ancestor (`relative` + `group` on the wrapper `<div>`).
2. Apply `opacity-0 group-hover:opacity-100` to the element to hide/show.
3. Add `focus:opacity-100 focus:outline-none` for keyboard accessibility (present in both `PinnedRow` and `PinnedAssistantsOverflowDropdown`).
4. Add `transition-colors` (for color-only transitions) or `transition duration-300` (for opacity-targeted transitions, as in `Card` and `WorkflowCard`). For a simple opacity reveal, `transition` (bare, which covers opacity) or `transition-opacity` is appropriate.

The `MermaidDiagram` component uses the same absolute positioning but does NOT currently use `group-hover` — it is not a reference for this pattern.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found specifically covering Tailwind hover-show patterns. The `.ai-run/guides/` directory exists with general architecture guides. Conventions derived from code exploration.

### Architectural Decisions

No recorded ADRs or inline decision comments for hover-show UI patterns were found. The pattern is consistent enough across `PinnedRow`, `PinnedAssistantsOverflowDropdown`, `Card`, and `WorkflowCard` to treat it as an established convention.

### Derived Conventions

- Named groups (`group/item`, `group/header`) are used when nested groups would conflict. For `TableBlock`, where there is only one group boundary, the default `group` / `group-hover` (without a name) is sufficient.
- `focus:opacity-100` accompanies `group-hover:opacity-100` in every action-button hover-reveal usage. This ensures keyboard-navigable accessibility without adding `focus-within` on the parent.
- `transition-colors` is used in `PinnedRow` for the button's opacity reveal. `Card` uses `transition duration-300`. Either is acceptable; `transition-colors` is the lightest and most commonly paired with this pattern in button contexts.

---

## 4. Testing Landscape

### Existing Coverage

`src/components/markdown/tokens/__tests__/TableBlock.test.tsx` — three tests:

1. `renders the provided table HTML` — checks DOM structure of the rendered table.
2. `renders a copy button with accessible label "Copy table"` — verifies the button is in the document via `getByRole('button', { name: 'Copy table' })`.
3. `calls copyToClipboard with raw markdown and correct notification when button is clicked` — verifies the click handler fires with the correct arguments.

### Testing Framework and Patterns

- **Vitest** with `@testing-library/react`.
- Mocks via `vi.hoisted` + `vi.mock` for utilities and SVG assets.
- `fireEvent.click` for interaction testing.
- No use of `userEvent` in this file.

### Coverage Gaps

After the fix, test 2 (`renders a copy button`) will still pass because `getByRole` finds elements regardless of their CSS visibility/opacity — Tailwind classes are not applied in jsdom. No new test is strictly required for the CSS change to pass the existing suite.

However, a recommended addition is a test that asserts the button container starts with the `opacity-0` class and the `group-hover:opacity-100` class, verifying the correct Tailwind tokens are present in the DOM. Example approach:

```ts
it('button container is hidden by default and carries group-hover reveal classes', () => {
  const { container } = render(<TableBlock html="<table></table>" raw="| a |\n|---|" />)
  const buttonContainer = container.querySelector('.opacity-0')
  expect(buttonContainer).toBeInTheDocument()
  expect(buttonContainer).toHaveClass('group-hover:opacity-100')
})
```

This pattern is already used in `src/components/form/OrderList/__tests__/OrderListTemplate.test.tsx` (line 146: `expect(nameElement).toHaveClass('group-hover/item:text-text-primary')`), confirming it is an accepted test approach for Tailwind class assertions in this codebase.

---

## 5. Configuration and Environment

### Environment Variables

None. This change is purely presentational.

### Configuration Files

- `tailwind.config.ts` — Tailwind v3 config. The `group` and `group-hover` utilities are built-in and require no additional plugin or safelist entry. Named groups (`group/{name}`) are also built-in since Tailwind v3.2.

### Feature Flags and Deployment Concerns

None. No feature flag needed for this purely visual fix.

---

## 6. Risk Indicators

- `TableBlock.tsx` is a pure functional component with no state. Adding `group` to the wrapper and `opacity-0 group-hover:opacity-100` to the button container requires zero state changes and zero additional hooks — the risk is minimal.
- `MermaidDiagram.tsx` has the same positioning issue (always-visible absolute button overlay). This ticket covers `TableBlock` only; `MermaidDiagram` is out of scope but flagged as a candidate for the same fix.
- Existing test 2 (`renders a copy button with accessible label "Copy table"`) will continue to pass after the change because jsdom does not evaluate Tailwind CSS at test time. No test breakage is expected.
- No `transition` class is currently on the button container div. A `transition` or `transition-opacity` class should be added alongside `opacity-0 group-hover:opacity-100` to match codebase conventions (all reference examples pair the opacity toggle with a transition).
- `focus:opacity-100 focus:outline-none` must be added to the button container for keyboard accessibility, consistent with `PinnedRow` and `PinnedAssistantsOverflowDropdown`. Omitting it would leave the button inaccessible to keyboard-only users when the table is not hovered.
- The outermost `<div className="relative my-1">` must gain the `group` class. This is a single-character addition and has no visual side-effect.

---

## 7. Summary for Complexity Assessment

The fix touches a single leaf UI component (`src/components/markdown/tokens/TableBlock.tsx`, 47 lines) and its companion test file. The change surface is two files, approximately 3–5 lines of Tailwind class additions. No architectural layers beyond the UI component layer are involved; no state, store, API, or routing changes are needed.

The task follows a well-established pattern in this codebase: `relative group` on the wrapper, `opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none transition` on the hidden element. This exact pattern is used in `PinnedRow.tsx`, `PinnedAssistantsOverflowDropdown.tsx`, `Card.tsx`, and `WorkflowCard.tsx`. There is no technical novelty.

The affected area has three existing tests; none will break. One optional new test asserting the presence of the `opacity-0` and `group-hover:opacity-100` Tailwind classes is recommended to lock the behavior, following the existing precedent in `OrderListTemplate.test.tsx`. Overall risk is minimal and the implementation path is fully prescribed by existing codebase patterns.
