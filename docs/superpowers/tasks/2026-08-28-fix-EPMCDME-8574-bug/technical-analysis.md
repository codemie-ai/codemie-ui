# Technical Research

**Task**: help faq accessibility keyboard
**Generated**: 2026-08-28T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-8574: The hidden text in the 'AI/Run FAQ' section at #/help is not keyboard accessible. The keyboard user can see only text till '...'. Keyboard focus does not make hidden text visible. Expected: keyboard user should have the possibility to read all text as mouse user. The sections affected are: AI/Run Feedback, AI/Run Chatbot, Release Notes, Video Portal, User Guide - all items in the FAQ section on the Help page. Steps to reproduce: 1. Open #/help as authorized user. 2. Navigate using Tab key to the AI/Run FAQ and observe behavior.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/help/components/HelpItem.tsx` — Renders a single Help page card as a `<Link>`. Description text uses `className="text-xs-1 text-text-quaternary line-clamp-2"` on a `<p>` element, truncating it to 2 lines. Truncation detection is done via `useIsTruncated(descriptionRef)`. When truncated, `data-tooltip-id="react-tooltip"`, `data-tooltip-place="bottom"`, and `data-tooltip-content={isTruncated ? description : ''}` are set on the `<p>` element to show the full description in a tooltip.
- `src/pages/help/HelpPage.tsx` — Assembles sections (AI Help, Learning Resources, Platform Policies, Platform, Product Updates, Share experience) and renders them via `<HelpSection>`. The items displayed correspond to the bug-named entries (assistants for AI/Run Feedback/Chatbot, config-driven items for Release Notes, Video Portal, User Guide).
- `src/pages/help/components/HelpSection.tsx` — Renders a titled `<section>` containing one `<HelpItem>` per entry in the `items` array.
- `src/hooks/useIsTruncated.ts` — Hook that attaches a `ResizeObserver` to a ref and returns `true` when `element.scrollHeight > element.clientHeight` or `element.scrollWidth > element.clientWidth`.
- `src/utils/tooltip.ts` — Bootstraps the single global `react-tooltip` instance with `openEvents: { mouseover: true }` only (hover-triggered, no focus event). This is the root cause of the keyboard inaccessibility.
- `src/components/Tooltip/Tooltip.tsx` — Shared wrapper around `primereact/tooltip`. Accepts `target` (CSS selector), `position`, `showDelay`. PrimeReact Tooltip responds to both `mouseenter` and `focus` events by default.

### Architecture and Layers Affected

- **Page layer** (`src/pages/help/`): `HelpItem.tsx` is the only component requiring change. `HelpPage.tsx` and `HelpSection.tsx` do not need modification.
- **Shared hooks** (`src/hooks/useIsTruncated.ts`): consumed by `HelpItem` and several other components; no change needed.
- **Global tooltip infrastructure** (`src/utils/tooltip.ts`): the global `react-tooltip` is intentionally hover-only; the fix avoids modifying it.

### Integration Points

- `HelpItem.tsx` currently couples to the global react-tooltip by writing `data-tooltip-id="react-tooltip"` on its `<p>` element. The `<p>` element is not focusable, so focus events never reach it even if the global tooltip were reconfigured.
- The `<Link>` (react-router) wrapping the entire card IS the focusable element that keyboard Tab reaches. Any tooltip that must respond to keyboard focus must be anchored to the `<Link>` element.
- PrimeReact `Tooltip` (via `src/components/Tooltip/Tooltip.tsx`) is used this way in `src/components/Card/Card.tsx`, `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx`, `src/pages/workflows/components/WorkflowCard.tsx`, and others — all follow the pattern: render `<Tooltip target={'.' + tooltipClass} />`, add the CSS class + `data-pr-tooltip` to the target element.

### Patterns and Conventions

- **Tooltip target via CSS class + `useId()`**: `Card.tsx` and `AssistantCard.tsx` compute `tooltipClass = 'tooltip-target-' + id`. `HelpItem` uses `help-item-${uid.replace(/:/g, '')}` — the `help-item-` prefix guarantees a valid CSS identifier regardless of `useId()` output. `useId()` (React 18) is the correct way to generate a collision-safe class, consistent with `Checkbox.tsx`, `RadioGroup.tsx`, `Popup.tsx`, and `FilesDropzone.tsx`.
- **Skip tooltip when not truncated**: omit `data-pr-tooltip` entirely (do not write an empty string) when not truncated — use a conditional spread `{...(isTruncated ? { 'data-pr-tooltip': description } : {})}`. An empty string can cause PrimeReact to render a spurious empty tooltip frame.
- **Attach tooltip attribute to the focusable ancestor**: the `<Link>` element is the natural focus target; the tooltip attribute and CSS target class should go on `<Link>`, not on the `<p>` child.
- **`event="both"` for keyboard accessibility**: pass `event="both"` explicitly to the PrimeReact `<Tooltip>` so it fires on both hover and keyboard focus. This is the direct mechanism that makes truncated descriptions readable by keyboard users.
- **Tooltip placement — sibling not child**: render `<Tooltip>` as a DOM sibling outside `<Link>` using a React fragment, not as a child inside it. This avoids potential overflow clipping from ancestor containers without needing `appendTo={document.body}`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — covers WCAG 2.1 AA requirements, keyboard navigation rules, and the ARIA attribute quick-reference. Confirms all interactive elements must be reachable by Tab and that keyboard navigation must produce the same information as mouse navigation.
- `.ai-run/guides/components/component-patterns.md` — component construction conventions.

### Architectural Decisions

- The global `react-tooltip` (`src/utils/tooltip.ts`) was deliberately restricted to `openEvents: { mouseover: true }` with an explicit comment: chat history tooltips must not be dismissed by scroll events. The comment explains that `focus` was not added to `openEvents` for the global instance. The fix must therefore bypass the global instance entirely.

### Derived Conventions

- When a component needs a keyboard-accessible tooltip on a truncated text element, the pattern in use across the codebase is: local `<Tooltip target>` from `@/components/Tooltip` + `data-pr-tooltip` on the focusable element, not a global react-tooltip attribute on the non-focusable text node.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/help/components/__tests__/HelpItem.test.tsx` — 13 unit tests covering rendering, icon display, link href, internal/external link attributes, and button text. All tests mock `useIsTruncated` to return `false` (never truncated), so no test exercises the tooltip path.
- `src/pages/help/components/__tests__/HelpSection.test.tsx` — 10 unit tests for section-level rendering; mocks `useIsTruncated` the same way.
- `src/pages/help/__tests__/HelpPage.test.tsx` — integration-style unit tests covering section visibility and config-gating. Does not touch tooltip behavior.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library (`@testing-library/react`). Unit tests in `__tests__/*.test.tsx`.
- `useIsTruncated` is mocked at the `vi.mock` module level in all help test files. A test for the truncated path must override the mock to return `true` for the specific case.
- Router wrapped with `BrowserRouter` via a local `renderWithRouter` helper.
- Framework: `describe` / `it` / `expect` / `vi.mock` / `vi.fn()` / `beforeEach(vi.clearAllMocks)`.

### Coverage Gaps

- No test verifies the tooltip attribute is set when `useIsTruncated` returns `true`.
- No test verifies the tooltip attribute is absent (or empty) when `useIsTruncated` returns `false`.
- No test verifies the tooltip is anchored to the `<Link>` element (keyboard-focusable) rather than the `<p>` element.
- No test verifies `<Tooltip>` is rendered when description is truncated.

---

## 5. Configuration and Environment

### Environment Variables

None — the Help page is rendered from runtime config (`window._env_` via Valtio `appInfoStore`) for feature flags on sections, but tooltip behavior has no env var dependency.

### Configuration Files

No config file governs tooltip behavior. The global tooltip is initialized in `src/utils/tooltip.ts` and mounted in `src/main.tsx`.

### Feature Flags and Deployment Concerns

None for this fix. The change is entirely within `HelpItem.tsx` component code and its test file.

---

## 6. Risk Indicators

- **Global react-tooltip bypass required**: the global `react-tooltip` instance (`src/utils/tooltip.ts`) has `openEvents: { mouseover: true }` intentionally. Any attempt to add `focus` to the global instance to fix this bug risks breaking the chat history tooltip dismissal behavior documented in the same file. The fix must use a local PrimeReact `<Tooltip>` instance scoped to `HelpItem`.
- **Non-focusable target element**: the `<p>` that currently carries `data-tooltip-*` is not keyboard-reachable. Moving `data-pr-tooltip` to the `<p>` with PrimeReact Tooltip would still fail because PrimeReact Tooltip also requires a focusable target for focus events. The attribute must move to the `<Link>`.
- **CSS selector collision risk**: the tooltip target selector must be unique per `HelpItem` instance. Using a fixed class string like `'help-item-tooltip'` would cause all visible `HelpItem` components to show the same tooltip content. `useId()` resolves this — it is already established in the codebase for exactly this purpose.
- **PrimeReact Tooltip overflow clipping**: the Tooltip wrapper defaults to `appendTo='self'`. When targeting an element inside a stacking context, the rendered tooltip can be clipped. This was resolved by rendering `<Tooltip>` as a fragment sibling outside `<Link>`, so it is not a descendant of any potentially clipping ancestor within the card.
- **Test mock update required**: all three help test files mock `useIsTruncated` globally. A new test case for the truncated path will need `vi.mocked(useIsTruncated).mockReturnValueOnce(true)` or a separate `describe` block with a different mock return.
- **No `aria-label` on the `<Link>`**: the existing `<Link>` has no accessible label; the link text is built from child elements. Adding `aria-describedby` linking to a visually hidden description span is an alternative approach that avoids tooltip infrastructure entirely and is robust for screen readers. However, the task specifically mentions keyboard users reading truncated text (tooltip reveal on focus), not screen reader announcement, so the tooltip approach is appropriate.

---

## 7. Summary for Complexity Assessment

The fix is confined to a single component file (`src/pages/help/components/HelpItem.tsx`) and its co-located test file. The root cause is well-understood: the global react-tooltip is hover-only by deliberate design, and the tooltip attribute sits on a non-focusable `<p>` element. The repair involves removing three `data-tooltip-*` attributes from `<p>`, adding a local `<Tooltip>` component (via fragment sibling outside `<Link>`) from `@/components/Tooltip` with `event="both"`, generating a unique CSS selector with `useId()`, and moving `data-pr-tooltip` (conditionally spread, not an empty string) plus the CSS class to the focusable `<Link>` element. `event="both"` is the direct mechanism that fires the tooltip on keyboard focus. No new dependencies, no store changes, no routing changes.

Test coverage for the tooltip path is absent in all three help test files. New cases in `HelpItem.test.tsx` are needed: one verifying the tooltip attribute is populated when truncated, one verifying it is omitted (not empty) when not truncated, and one verifying the `<Tooltip>` component is rendered. These are straightforward unit tests using the existing `vi.mock` override pattern already present in the file. The risk of regression to other help-page behavior is low.

---

## 8. External References

None named by the task.
