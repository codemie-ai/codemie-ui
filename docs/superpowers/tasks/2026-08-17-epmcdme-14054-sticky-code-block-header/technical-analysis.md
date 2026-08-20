# Technical Research

**Task**: code-block markdown sticky header copy download chat message renderer
**Generated**: 2026-08-17T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

For ticket EPMCDME-14054, we need to implement a sticky header for code blocks in the chat UI. The decision has been made to go with "Approach C — Sticky header (Codex Application style)": the existing code block header (which contains language label, copy button, and download button) should pin/stick to the top of the viewport as the user scrolls through a long code block. No new buttons are added. The header just becomes sticky/fixed when scrolling so buttons are always reachable. This is how Codex Desktop and Claude Desktop handle long code blocks.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/CodeBlock/CodeBlock.tsx` — The target component. Self-contained FC, ~183 lines. The header `div` (line 90–150) contains: language label `<p>`, optional Expand button, optional HTML Preview button, Copy button (`copyToClipboard`), Download button (`downloadCodeAsFile`). Accepts a `headerClassName?: string` prop that is already merged via `cn()` into the header `div`'s class list. No sticky behavior, no `useRef`, no scroll logic currently.
- `src/components/CodeBlock/CodeBlock.scss` — Defines `.code-block-header` with `container-type: inline-size` and `@container` queries to hide button text labels at small widths (300px / 360px breakpoints). No positioning rules.
- `src/components/CodeBlock/CodeBlockExpandPopup.tsx` — Re-renders a `CodeBlock` in a modal popup; also has no sticky logic.
- `src/components/CodeBlock/HtmlPreviewPopup.tsx` — HTML preview modal; not involved in sticky.
- `src/components/CodeBlock/fileExtensions.ts` — `FileExtension` type and `downloadCodeAsFile` helper.
- `src/components/CodeBlock/index.ts` — Barrel re-export.
- `src/components/markdown/Markdown.tsx` — Wraps `MarkdownTokens` in a `<div className="markdown ...">`. Accepts `className?` prop.
- `src/components/markdown/MarkdownTokens.tsx` — Token-type dispatcher; renders `<CodeBlock key={i} text={token.text ?? ''} language={token.lang} />` for `code`-type tokens (line 104). Does **not** pass `isInChat`, `headerClassName`, or any scroll context.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — Renders `<Markdown content={...} />` for AI responses. Uses `messageElementRef` for message-height measurement only.
- `src/pages/chat/components/ChatHistory/ChatHistory.tsx` — The outer scroll container: `<div ref={scrollContainerRefSetter} className="h-full w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter-edge">`. The `overflow-y-auto` element is the scrollable ancestor that `position: sticky` children will stick relative to.

### Architecture and Layers Affected

| Layer | Component | Change scope |
|---|---|---|
| Presentational UI | `CodeBlock` (`src/components/CodeBlock/CodeBlock.tsx`) | Add `sticky top-0 z-10` to header `div` class list. Optionally gated by a new `stickyHeader?: boolean` prop (for non-chat callers that should not be sticky). |
| Markdown renderer | `MarkdownTokens` (`src/components/markdown/MarkdownTokens.tsx`) | If the sticky behavior is opt-in via prop, pass `stickyHeader` (or `headerClassName="sticky top-0 z-10"`) when rendering in chat context. Alternatively, always sticky — no change needed here. |
| SCSS | `CodeBlock.scss` | `container-type: inline-size` on `.code-block-header` **must be verified** for compatibility with `position: sticky`. CSS `container-type` establishes a containing block that can interact with stacking context; testing is needed. |

The scroll container (`ChatHistory`'s `overflow-y-auto` div) is the natural sticky ancestor — no changes required to it.

### Integration Points

- `MarkdownTokens` → `CodeBlock`: the call site where a `headerClassName` or `stickyHeader` prop would need to be threaded if the behavior is opt-in for chat only.
- `CodeBlock` is also used in:
  - `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/` (workflow code blocks — may not want sticky)
  - `src/pages/settings/components/CustomAppearance/sections/` (settings page — sticky irrelevant)
  - `src/pages/workflows/editor/ConfigPanel.tsx` (passes custom `headerClassName` already — would need `stickyHeader` gating or a wrapping sticky div)
  - `CodeBlockExpandPopup.tsx` (modal — sticky would have no effect inside a fixed overlay, so no regression)
- `useChatScroll` hook manages stick-to-bottom behavior independently; the sticky header does not interact with it.

### Patterns and Conventions

- **Sticky pattern**: Established across the codebase. Canonical examples:
  - `src/components/Table/Table.tsx` — `sticky top-0 z-20` on `<thead>` (simplest, direct class).
  - `src/pages/workflows/editor/ConfigPanel.tsx` — `sticky top-0 bg-surface-base-chat z-10` passed as a prop string.
  - `src/pages/assistants/components/FormSection/FormSection.tsx` — Conditional `sticky top-0 bg-surface-base-sidebar/80 z-30`.
- **`headerClassName` prop**: Already present on `CodeBlockProps`. Passing `"sticky top-0 z-10"` from `MarkdownTokens` would require zero changes to `CodeBlock` itself. However, if the sticky behavior should be the default for all chat code blocks, adding it directly to the header's base classes or behind a `stickyHeader` boolean prop is cleaner.
- **`cn()` utility**: All conditional class composition uses `cn()` from `@/utils/utils`. Any conditional `sticky` logic should follow this pattern.
- **`container-type: inline-size`** on `.code-block-header`: This is a non-trivial interaction. In some browsers, a `container-type` element may not correctly propagate `position: sticky` up its stacking context. The existing `.code-block-header` SCSS class sets this. If sticky is applied to the same element that has `container-type`, it must be tested cross-browser. An alternative is to wrap the header in an additional `sticky` outer div and keep the container element inside.
- **Z-index convention**: `z-10` for panel-level headers; `z-20` for table headers; `z-30` for sidebar/form sections. Code block header in chat → `z-10`.
- **Background token**: `bg-surface-base-tertiary` is already on the header div and is sufficient to obscure scrolled content behind a sticky header.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` — Stack details: React 18.3.1, TypeScript 5.8.3, Vite 5.4.21, Valtio, PrimeReact 10.9.x, Tailwind CSS 3.4.17. Hard rule: "Use Tailwind classes for all styling — no custom CSS or inline styles."
- `.ai-run/guides/components/component-patterns.md` — `useRef` placement: after `useState`, before custom hooks. 300-line component limit. Always `className?: string` on presentational components. `useEffect` must return cleanup for listeners/timers.
- `.ai-run/guides/styling/styling-guide.md` — Tailwind only. No `style={{}}`, no arbitrary values. Standard sticky utilities available: `sticky`, `top-0`, `z-10`, `z-20`, `z-30`.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest + RTL. Two workspace projects: `unit` (`*.test.tsx`) and `integration` (`*.integration.test.tsx`). Always `afterEach(cleanup)`. Prefer `getByRole`. For class-presence assertions: `container.firstChild` + `.classList.contains(...)`.

### Architectural Decisions

- No ADR or inline `DECISION:` comment found for the code block sticky behavior — this is a new pattern for code blocks specifically.
- The decision to use Approach C (sticky header, no new buttons) is documented in `task_context` and does not conflict with any guide.
- `container-type: inline-size` on `.code-block-header` was a deliberate responsive design decision (button label hiding at small widths). Any sticky implementation must not break this behavior.

### Derived Conventions

- Sticky headers in this codebase are always implemented with Tailwind classes directly on the element (not JavaScript scroll listeners or `IntersectionObserver`). `position: sticky` CSS is the standard approach.
- Background color is always explicitly set on the sticky element to prevent content bleed-through — `bg-surface-base-tertiary` is already present on the CodeBlock header.
- The scroll container (`overflow-y-auto`) is never modified to support child sticky behavior — children manage their own `sticky top-0` classes.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx` — Covers: basic render, CSS variable for font-family, `pre[class*="language-"]` presence, code content text, SCSS font-family binding. All tests use `container.querySelector` against class selectors and text content. No tests for header class names, header behavior, or scroll interactions.
- `src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx` — Precedent for class-presence assertions on scroll containers.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx` — Covers AI message rendering; does not test code block header behavior.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 + React Testing Library 16.3.0 + `@testing-library/jest-dom` 6.6.3.
- **File naming**: `*.integration.test.tsx` for integration, `*.test.tsx` for unit.
- **Query priority**: `getByRole` / `findByRole` first; `container.querySelector` for DOM-structural assertions.
- **Class-presence pattern**: `container.querySelector('.code-block-header')?.classList.contains('sticky')` — this is the established pattern for verifying CSS class application.
- **Mocking**: `vi.mock()` at module top level; `afterEach(cleanup)` always present.
- **Note**: JSDOM (used by Vitest/RTL) does not implement `position: sticky` layout — tests can assert the class is present but cannot verify visual sticky behavior. Visual/manual testing in a browser is required for scroll behavior validation.

### Coverage Gaps

- No test for `headerClassName` prop propagation to the header `div`.
- No test verifying that the header `div` receives `sticky top-0 z-10` (or that `headerClassName` merges correctly).
- No test for the `stickyHeader` prop if one is introduced.
- Visual/scroll sticky behavior cannot be tested in JSDOM — only class presence can be asserted.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables or feature flags are used in `CodeBlock`, `Markdown`, `MarkdownTokens`, or `ChatHistory`. The sticky header feature requires no env var gating.

### Configuration Files

- `tailwind.config.ts` — Defines custom layout tokens (`h-layout-header: 56px`, `h-navbar: 72px`) that can be referenced as `top-layout-header` or `top-navbar` if the sticky header needs to sit below a fixed app header. The chat scroll container does not have a fixed header obscuring `top-0`, so `top-0` should be sufficient.
- `vite.config.ts` — Not relevant to this feature (has uncommitted changes per git status, unrelated).

### Feature Flags and Deployment Concerns

- None. No feature flags are in place for code block rendering.
- The change is frontend-only with no backend or deployment dependencies.
- The `CodeBlockExpandPopup` modal renders `CodeBlock` in an isolated overlay; `sticky` positioning inside a fixed modal has no visible effect — no regression risk.

---

## 6. Risk Indicators

- **`container-type: inline-size` interaction with `position: sticky`**: The `.code-block-header` CSS class in `CodeBlock.scss` sets `container-type: inline-size`. Applying `sticky` to the same element requires cross-browser verification — some browser/rendering engine combinations handle this differently. The safest mitigation is wrapping the sticky behavior in an outer div rather than applying it to the element that carries `container-type`.
- **`headerClassName` call sites in non-chat contexts**: `CodeBlock` is used in workflow editor (`ConfigPanel.tsx`) and settings pages. If `stickyHeader` is added as a prop defaulting to `false`, callers in these contexts are unaffected. If sticky is added directly to base classes, non-chat uses (e.g., inside a non-scrolling panel) will acquire sticky positioning that may be visually incorrect.
- **`MarkdownTokens` does not pass `isInChat` to `CodeBlock`**: The `isInChat` prop on `CodeBlockProps` exists but `MarkdownTokens` never passes it (line 104 of `MarkdownTokens.tsx`). If the sticky behavior is gated on `isInChat`, this call site must be updated. If sticky is unconditional, no change is needed here.
- **No test for `headerClassName` prop**: The existing test suite does not cover the `headerClassName` prop at all. New tests will need to be written from scratch.
- **JSDOM sticky layout limitation**: Automated tests can only verify class presence, not actual sticky behavior. Browser regression testing is essential.
- **z-index layering**: Chat messages may overlap when scrolling. If multiple code blocks are visible simultaneously, each with `z-10`, there is no conflict since `z-index` within the same stacking context resolves correctly. No risk.
- **`rounded-t-lg` on sticky header**: When the header sticks at `top-0`, the `rounded-t-lg` class gives the sticky header rounded top corners. This may look visually incorrect when sticking (header detaches from rounded card appearance). This is a UX/visual decision that should be confirmed — consider removing `rounded-t-lg` dynamically when sticky, or accepting it as the design.

---

## 7. Summary for Complexity Assessment

The task touches a single presentational component (`CodeBlock`) and one optional call-site update (`MarkdownTokens`). The architectural layer is pure UI/presentational — no stores, no API calls, no routing changes, and no new dependencies. The file change surface is minimal: `CodeBlock.tsx` (1–3 line change to add classes or a new prop), optionally `MarkdownTokens.tsx` (1-line change to pass a prop), and `CodeBlock.integration.test.tsx` (new test cases for class presence). The `CodeBlock.scss` file may require a minor adjustment if `container-type` conflicts with `position: sticky`.

The task follows a well-established pattern in this codebase — `sticky top-0 z-10` with a background surface token is used identically in at least six other locations (Table thead, PageHeader, ConfigPanel, AssistantForm, FormSection, SharedChatPage). No novel patterns are introduced. The main technical nuance is the `container-type: inline-size` CSS property on `.code-block-header`, which requires cross-browser verification when combined with `position: sticky`. This is a known CSS interaction edge case, not a novel architecture decision.

Test coverage for `CodeBlock` is sparse (only font-family CSS variable tests exist) and no test exercises `headerClassName` propagation. New unit tests asserting class presence on the header div are straightforward to write using the `container.querySelector('.code-block-header')?.classList.contains('sticky')` pattern, but they cannot verify actual scroll behavior due to JSDOM limitations. Manual browser testing is required to validate the sticky effect, making this task slightly higher-effort in QA than the code change size would suggest. Overall complexity is LOW, with a single-digit file change surface and no integration, state, or API risk.
