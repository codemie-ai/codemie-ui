# Technical Research

**Task**: table output copy button clipboard frontend rendering
**Generated**: 2026-07-10T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Add a dedicated copy button for table outputs generated in the AI/Run CodeMie UI. Users currently need to manually select wide and long tables with the mouse, which is inconvenient and error-prone. A copy action should allow users to quickly copy the full table content to the clipboard. The button should be placed in the upper-right area of the generated table output, follow existing CodeMie UI style, work for wide and long tables (copying full content not just visible), provide user feedback after successful copying, be accessible via keyboard navigation, and have an accessible name "Copy table". Existing message-level copy functionality must not be broken.

---

## 2. Codebase Findings

### Existing Implementations

**Table rendering pipeline (primary area of change):**
- `/src/components/markdown/MarkdownTokens.tsx` — iterates markdown tokens; `table` is in the `blockTokens` array (line 44) and falls into the generic branch at line 71: `<div key={i} {...getBlockProps(token)} />`. This renders tables as raw HTML via `dangerouslySetInnerHTML`. There is no dedicated React component for tables — this is the primary integration point.
- `/src/components/markdown/Markdown.utils.ts` — defines `getMarkdownRenderer()` which overrides the marked.js table renderer (line 133) to wrap every table in `<div class="overflow-x-auto">...</div>` for horizontal scroll. Also defines `MarkdownToken` type (line 56) including the `raw: string` field which holds the original markdown source. `TOKEN_TYPES.table` is defined at line 34.
- `/src/components/markdown/Markdown.tsx` — entry point; tokenizes content via `getMarkdownTokens()`, passes to `<MarkdownTokens />`.
- `/src/components/markdown/Markdown.scss` — table CSS scoped to `.markdown` parent (lines 80–118): styles `table`, `th`, `td`, `thead tr`, zebra rows, and hover rows.

**Existing copy button implementations (reference patterns):**
- `/src/components/CodeBlock/CodeBlock.tsx` (lines 127–135) — the closest reference: uses `Button` with `variant="secondary"` and `className="!px-2"`, `CopySvg` icon, visible `Copy` label, `data-tooltip-id="react-tooltip"`, `data-tooltip-content="Copy to buffer"`, calls `copyToClipboard(outputText, 'Copied to clipboard')`.
- `/src/components/markdown/tokens/MermaidDiagram.tsx` (lines 256–298) — the structural reference: demonstrates how a React component wrapper with action buttons is added to a token type that was previously rendered as raw HTML. The wrapper uses `relative` positioning on the outer div and `absolute top-0 right-0 z-10` on the button container.
- `/src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessageActions.tsx` — message-level copy using `copyRichTextToClipboard`. This must not be broken; it is entirely separate from the table rendering path.
- `/src/pages/chat/components/ChatHistory/ChatMessageAction.tsx` — canonical icon-only action button pattern with `aria-label`, `data-tooltip-id`, `data-tooltip-content`.

**Token components (sibling pattern):**
- `/src/components/markdown/tokens/MermaidDiagram.tsx` — complex token extracted to its own React component with interactive buttons.
- `/src/components/markdown/tokens/ListToken.tsx` — simpler token component.

**Copy utilities:**
- `/src/utils/utils.ts` — `copyToClipboard(message, notification)` (plain text, `navigator.clipboard.writeText`) and `copyRichTextToClipboard(htmlContent, plainTextFallback, notification?)` (HTML + plain text via `ClipboardItem`). The rich-text variant is used by the message-level copy action.
- `/src/utils/helpers.ts` — second implementation of `copyToClipboard` (plain text only); used by some components.
- `/src/utils/toaster.ts` — `toaster.info()` for feedback; called internally by both copy utilities.
- `/src/assets/icons/copy.svg` — the copy icon, imported as a React component via `import CopySvg from '@/assets/icons/copy.svg?react'`.

### Architecture and Layers Affected

| Layer | Components Affected |
|---|---|
| **Rendering / Markdown** | `MarkdownTokens.tsx` — table branch must be extracted from `blockTokens` to a dedicated component |
| **New Token Component** | New `TableBlock.tsx` in `src/components/markdown/tokens/` — wraps table HTML and adds copy button overlay |
| **Utilities** | `utils.ts` — existing `copyToClipboard` or `copyRichTextToClipboard` called, no changes needed |
| **Styling** | `Markdown.scss` — no changes required; positional CSS for the button overlay is Tailwind-only |

No API, store, router, service, or backend layer is involved.

### Integration Points

**Internal dependencies of the new `TableBlock` component:**
- `DOMPurify` + `Parser` from `marked` — same usage as `getBlockProps` in `MarkdownTokens.tsx`
- `getMarkdownRenderer` and `markedOptions` from `Markdown.utils.ts` — for HTML generation
- `copyToClipboard` from `@/utils/utils` — for clipboard write (or `copyRichTextToClipboard` for rich copy)
- `Button` from `@/components/Button/Button` — for the copy button UI
- `CopySvg` from `@/assets/icons/copy.svg?react` — icon
- Global react-tooltip (`data-tooltip-id="react-tooltip"`) — no import needed, active app-wide

**What must not change:**
- `ChatAiMessageActions.tsx` — message-level copy path (`copyRichTextToClipboard`) is completely independent; no changes needed.
- `Markdown.utils.ts` `getMarkdownRenderer()` — the `overflow-x-auto` wrapper will remain; the new component wraps both the `overflow-x-auto` div and overlays a button. The renderer output is still used as `dangerouslySetInnerHTML` content inside `TableBlock`.

**DOMPurify constraint:** Injecting `<button>` elements into the HTML string passed through `DOMPurify.sanitize()` would strip event handlers, making them non-functional. This is why the button must be a React component sibling, not injected into the HTML string.

### Patterns and Conventions

- **Component extraction pattern**: Follow `MermaidDiagram.tsx` — pull `table` out of `blockTokens` in `MarkdownTokens.tsx` and route it to a new `<TableBlock token={token} />` component.
- **Button style**: `variant={ButtonType.SECONDARY}` + `className="!px-2"` (from `CodeBlock.tsx`) or `variant={ButtonType.TERTIARY}` + `className="bg-surface-base-primary hover:bg-surface-specific-dropdown-hover"` (from `MermaidDiagram.tsx`). The Mermaid pattern is more appropriate since it appears over rendered content.
- **Tooltip**: `data-tooltip-id="react-tooltip"` + `data-tooltip-content="Copy table"` on the button element.
- **Accessibility**: `aria-label="Copy table"` on the button; `aria-hidden="true"` on the SVG icon (per `.ai-run/guides/patterns/accessibility-patterns.md`).
- **Positioning**: Outer container `relative`; button container `absolute top-0 right-0 z-10 flex items-center`.
- **Handler naming**: `handleCopyTable` (follows `handle<Event>` convention per component guide).
- **Notification**: `toaster.info('Table copied to clipboard')` — called internally by the copy utility, no direct call needed in the component.
- **Copy content**: `token.raw` holds the full original markdown table source (works for all table sizes, not just visible portion). For rich copy, the HTML output of `Parser.parse([token], options)` can be used as `htmlContent` and `token.raw` as `plainTextFallback`.
- **Import order**: Types → external libs → internal utils → assets (per component guide).
- **300-line file limit**: `TableBlock.tsx` will be well under this limit.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The `.ai-run/guides/` directory contains frontend-specific guides:

- `.ai-run/guides/components/component-patterns.md` — mandatory component structure, props typing, `handle<Event>` naming, 300-line file limit.
- `.ai-run/guides/components/component-organization.md` — determines component placement; new token component belongs at `src/components/markdown/tokens/`.
- `.ai-run/guides/components/reusable-components.md` — catalogs shared components; no `TableCopyButton` or `TableBlock` exists.
- `.ai-run/guides/patterns/accessibility-patterns.md` — icon-only buttons require `aria-label`; focus ring `focus:ring-2 focus:ring-primary-500`; decorative SVGs need `aria-hidden="true"`.
- `.ai-run/guides/styling/styling-guide.md` — Tailwind-only, semantic tokens, `cn()` for conditional classes, no arbitrary values.
- `.ai-run/guides/architecture/architecture.md` — layering rules; no API calls in components; clipboard via utility functions is correct.
- `.ai-run/guides/testing/testing-patterns.md` — unit tests co-located in `__tests__/` beside the new component.

### Architectural Decisions

- **`Markdown.utils.ts` line 133** — explicit decision to wrap tables in `overflow-x-auto` for horizontal scroll (comment: "Wrap table element to have horizontal scroll for tables"). The new component must preserve or re-implement this wrapper in its own JSX.
- **`MarkdownTokens.tsx` lines 44, 71** — tables are rendered via `dangerouslySetInnerHTML`, not as React sub-trees. The existing decision to use raw HTML injection is unchanged; the new component adds a React overlay on top.
- **`MermaidDiagram.tsx`** — established precedent for extracting complex tokens from the `blockTokens` path to dedicated components with interactive buttons. This is the direct architectural precedent for `TableBlock`.
- **`CodeBlock.tsx`** — established precedent for copy button UI pattern (`Button secondary`, `CopySvg`, tooltip, `copyToClipboard`).

### Derived Conventions

- Token components live in `src/components/markdown/tokens/` and are imported directly into `MarkdownTokens.tsx`.
- No barrel `index.ts` exists in the `tokens/` folder — components are imported by direct file path.
- The `MarkdownToken` type's `raw` field is used in token components (e.g., `MermaidDiagram` uses `token.text`; for tables, `token.raw` is the appropriate source since there is no separate `text` field for the table body).

---

## 4. Testing Landscape

### Existing Coverage

**Tests directly relevant to copy/clipboard functionality:**
- `/src/pages/chat/components/ChatHeader/__tests__/ShareChatPopup.test.tsx` — full copy button lifecycle: render, click, `Copied!` state, 2s timer revert; uses `vi.useFakeTimers()`.
- `/src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx` — mocks `copyToClipboard` from `@/utils/utils` (partial mock); asserts call args.
- `/src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigAssistantCard.test.tsx` — full `@/utils/utils` replacement mock including `copyToClipboard`.

**No tests for the markdown rendering pipeline:**
- `src/components/markdown/Markdown.tsx` — zero tests.
- `src/components/markdown/MarkdownTokens.tsx` — zero tests.
- `src/components/markdown/tokens/MermaidDiagram.tsx` — zero tests.
- `src/components/CodeBlock/CodeBlock.tsx` — zero tests (existing copy button on code blocks is untested).

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1, `jsdom` environment, `globals: true`.
- **Component library**: `@testing-library/react` 16.3.0 + `@testing-library/jest-dom` 6.6.3 + `@testing-library/user-event` 14.6.1.
- **Coverage**: `@vitest/coverage-istanbul`.
- **Setup**: `/src/setupTests.tsx` (shared) + `/src/setupTests.unit.ts` (unit-only).
- **Test location**: `__tests__/` subdirectories co-located with source files.
- **Clipboard mock pattern** (Pattern B — recommended for new tests):
  ```ts
  vi.mock('@/utils/utils', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...(actual as object), copyToClipboard: vi.fn() }
  })
  ```
- `navigator.clipboard` is never directly mocked in tests — always mock the utility function wrapper.

### Coverage Gaps

The entire markdown token rendering pipeline has no tests. New tests for `TableBlock.tsx` would be the first tests in this area. Required coverage for the new component:

1. Renders the table HTML via `dangerouslySetInnerHTML` (snapshot or content assertion).
2. Renders a button with accessible name `"Copy table"`.
3. Clicking the button calls `copyToClipboard` (or `copyRichTextToClipboard`) with the expected content.
4. Button is keyboard-focusable (tab order).
5. SVG icon has `aria-hidden="true"`.

New test file location: `/src/components/markdown/tokens/__tests__/TableBlock.test.tsx`.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables or feature flags gate copy functionality or table rendering. No new env vars are needed for this feature.

Relevant existing vars (for context only):
- `VITE_API_URL`, `VITE_ENV`, `VITE_SUFFIX` (base path), `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED`.

### Configuration Files

- `/vite.config.ts` — Vite 5.4.21 build; `vite-plugin-svgr` enables `?react` SVG imports; `@` alias maps to `./src`. No changes needed.
- `/tsconfig.json` — `lib: ["DOM", "DOM.Iterable"]` — Clipboard API (`navigator.clipboard`, `ClipboardItem`) is in scope without polyfilling.
- `/package.json` — all required dependencies already present: `marked` 4.3.0, `dompurify` 3.2.5, `toastify-js` 1.12.0, `react-tooltip` 5.29.1, `clsx` + `tailwind-merge`, Tailwind CSS 3.4.17.

### Feature Flags and Deployment Concerns

- No feature flag needed. No existing copy feature in the codebase is gated. The `useFeatureFlags` hook exists but is not relevant to this feature.
- No deployment changes required. This is a pure frontend component addition.
- The Clipboard API (`navigator.clipboard`) requires a secure context (HTTPS or localhost); this is already satisfied by the existing copy functionality in the app.

---

## 6. Risk Indicators

- **DOMPurify strips event handlers from injected HTML** — a button injected into the `renderer.table` HTML string would be non-functional after sanitization. Implementation MUST use React component extraction (the `MermaidDiagram.tsx` pattern), not string injection into the marked renderer.
- **Duplicate `renderer.table` override in `messageHelpers.ts`** — `/src/utils/messageHelpers.ts` contains an identical `overflow-x-auto` wrapper for `renderer.table`. This second renderer is used by `markdown2html()` for the whole-message copy action, not for rendering. No change is needed there, but the duplication is a latent maintenance risk if table rendering logic diverges.
- **No existing tests for the entire markdown token rendering pipeline** — `Markdown.tsx`, `MarkdownTokens.tsx`, `MermaidDiagram.tsx`, and `CodeBlock.tsx` all have zero tests. New `TableBlock.tsx` would be the first tested component in this area; test infrastructure must be established from scratch.
- **`copyRichTextToClipboard` uses `ClipboardItem` API** — never mocked or tested anywhere. If choosing rich-text copy for tables, the test will need to handle the `ClipboardItem` constructor (requires either a global mock or sticking to `copyToClipboard` which only uses `writeText`).
- **Two implementations of `copyToClipboard`** — `src/utils/utils.ts` and `src/utils/helpers.ts` both export the same function name. The new component must import from `@/utils/utils` (consistent with `CodeBlock.tsx` and the mock patterns used in most tests).
- **Token `raw` field for table** — the `MarkdownToken` type's `raw` field contains the original markdown including the trailing newline; this is safe for clipboard but should be `.trim()`-ed before copying.
- **`token.raw` vs parsed TSV** — `token.raw` copies markdown pipe-table syntax to the clipboard, not TSV. For users pasting into spreadsheets, this may be less convenient. The ticket does not specify the copy format — this is an open requirement question.
- **Horizontal scroll and button overlay interaction** — the `overflow-x-auto` wrapper causes the table to scroll horizontally while the copy button must remain fixed in the upper-right corner of the scroll container (not scroll with the table). The button must be positioned relative to the outer `relative` wrapper, not inside the scrolling content area. This CSS relationship needs careful implementation.
- **`MermaidDiagram.tsx` uses `unSanitizeMessage` from `@/utils/messageHelpers`** — the new `TableBlock` must import from `@/components/markdown/Markdown.utils.ts` (where `unSanitizeMessage` is also defined), not `@/utils/messageHelpers`, to stay within the markdown component boundary.

---

## 7. Summary for Complexity Assessment

This task touches a narrow set of files within a single architectural layer: the Markdown token rendering pipeline in `src/components/markdown/`. The primary implementation involves two file modifications (`MarkdownTokens.tsx` to route `table` tokens to a new component, and optionally `Markdown.utils.ts` to remove the now-redundant renderer string injection) and one new file (`src/components/markdown/tokens/TableBlock.tsx`). All required utilities — clipboard functions, toast notification, button component, copy icon, tooltip infrastructure — already exist and require no changes. The message-level copy functionality (`ChatAiMessageActions.tsx`) operates on a completely independent code path and is not at risk.

The task follows an established pattern in the codebase: `MermaidDiagram.tsx` is a direct architectural precedent for extracting a token type from `dangerouslySetInnerHTML` rendering to a React component with an interactive button overlay. The CSS positioning challenge (keeping the copy button fixed while the table scrolls horizontally) is the primary technical novelty; the Mermaid component's `absolute top-0 right-0 z-10` pattern provides the solution. There is one unresolved requirement question — whether to copy markdown pipe-table syntax (`token.raw`) or convert to TSV for spreadsheet compatibility — which will affect the implementation of the copy handler.

Test coverage for the affected area is zero: no tests exist for `MarkdownTokens.tsx`, `MermaidDiagram.tsx`, or `CodeBlock.tsx`. New tests for `TableBlock.tsx` will establish the first test infrastructure in this area. The clipboard mock patterns are well-established in other parts of the codebase (mock `@/utils/utils` with `vi.fn()` for `copyToClipboard`), so test implementation is straightforward. Overall complexity is low-to-medium: the implementation surface is small and well-understood, but the absence of any existing test coverage in the target area adds a small overhead.
