# Technical Research

**Task**: html preview iframe sandbox security chat
**Generated**: 2026-09-16
**Research path**: filesystem

---

## 1. Original Context

[Security] Isolate Chat HTML Preview from the application origin and browser session (EPMCDME-15059)

The active Chat HTML Preview renders user- or assistant-generated HTML through an unsandboxed
`srcDoc` iframe. Because the preview content must be treated as untrusted, the iframe should be
isolated from the Codemie UI application origin and browser session while still allowing
JavaScript required by the preview feature.

Current issue: `src/components/CodeBlock/HtmlPreviewPopup.tsx` renders an iframe with `srcDoc`
and no `sandbox` attribute at all — full inheritance of the parent app origin, meaning preview
JS could reach parent DOM, cookies, localStorage/sessionStorage.

A second, unrelated preview implementation exists at
`src/components/HTMLPreviewPopup/HTMLPreviewPopup.tsx` which already has a `sandbox` attribute,
but it's set to an empty string, which blocks JavaScript entirely (unsuitable, since chat preview
must support JS execution).

Required fix:
- Add `sandbox="allow-scripts"` (JS allowed) to the chat preview iframe, explicitly WITHOUT
  `allow-same-origin` (combining the two would defeat the isolation), and without
  allow-top-navigation, allow-top-navigation-by-user-activation, allow-popups,
  allow-popups-to-escape-sandbox, allow-forms, allow-modals, allow-downloads.
- Consolidate the two separate HTML preview iframe implementations into one shared, secure iframe
  component/util so the sandbox configuration cannot diverge again.
- Preview JS must not be able to reach parent.document/top.document, cookies, storage, navigate
  the top window, or open unsandboxed popups.
- Existing HTML/JS preview functionality (rendering + script execution) must keep working.
- Automated tests should assert the iframe's sandbox attribute value and that it excludes unsafe
  tokens.

Affected files named in the ticket:
- src/components/CodeBlock/HtmlPreviewPopup.tsx
- src/components/CodeBlock/CodeBlock.tsx
- src/components/HTMLPreviewPopup/HTMLPreviewPopup.tsx

---

## 2. Codebase Findings

### Existing Implementations

**`src/components/CodeBlock/HtmlPreviewPopup.tsx`** (the live chat preview, imported by `CodeBlock.tsx`):
- Props: `isVisible: boolean`, `html: string`, `onHide: () => void`.
- Holds an `iframeRef = useRef<HTMLIFrameElement>(null)`.
- `reloadIframe()` sets `iframeRef.current.srcdoc = html` directly on the DOM node (the "refresh"
  button's `onClick`), bypassing the React `srcDoc` prop.
- Renders `<iframe title="HTML Preview" ref={iframeRef} srcDoc={html} className="size-full pb-4" />`
  — **no `sandbox` attribute is present at all.**
- Wrapped in the shared `Popup` component (`src/components/Popup/` — resolved via `../Popup`),
  with a header containing a refresh button (`RefreshSvg`, class `refresh-btn close-btn`) and a
  close button (`CloseSvg`).

**`src/components/HTMLPreviewPopup/HTMLPreviewPopup.tsx`** (a second implementation, **not
imported anywhere in `src/`** — only re-exported by its own sibling `index.ts`; no `grep` hit
found for any consumer):
- Props: `visible: boolean`, `html: string`, `onClose: () => void` (different prop names from the
  CodeBlock variant — `isVisible`/`onHide` vs `visible`/`onClose`).
- Same `iframeRef` + `reloadIframe()` pattern, same direct `.srcdoc` mutation.
- Renders `<iframe ref={iframeRef} className="w-full h-full" sandbox="" srcDoc={html} title="HTML Preview" />`
  — `sandbox=""` present but empty, which per the HTML spec applies **all** restrictions including
  blocking script execution.
- Also wrapped in `Popup`, with its own header markup (extra `aria-label="Reload preview"` on the
  refresh button, and slightly different container classes: `html-preview-popup`,
  `bodyClassName="show-scroll"`).

**Neither component sanitizes the `html` string itself.** Both take `html: string` as an opaque
prop and pass it straight to `srcDoc`; sanitization (if any) must happen upstream in the caller.

**`src/components/CodeBlock/CodeBlock.tsx`** — the only caller found for either preview component:
- Imports `HtmlPreviewPopup from './HtmlPreviewPopup'` (line 30).
- Computes `isHTML` via `language === 'html' || HTML_REGEX.exec(text)` where
  `HTML_REGEX = /^(<!DOCTYPE html>|<html>)/`.
- Computes `outputText = unSanitizeMessage(text).trim()` (memoized) — this is the string handed to
  `<HtmlPreviewPopup html={outputText} isVisible={isHtmlPopupVisible} onHide={...} />` (line 185).
- `unSanitizeMessage` (see below) does **not** sanitize in the security sense — it *reverses* an
  earlier escaping step, converting `&lt;`/`&gt;` back into literal `<`/`>`. It is a decode step,
  not a DOMPurify pass.
- `isHtmlPopupVisible` state gates the popup; a "Preview" button (`EyeSvg`) toggles it, shown only
  when `isHTML` is true.

### unSanitizeMessage / sanitizeMessage (`src/components/markdown/Markdown.utils.ts`, lines 73-86)
- `sanitizeMessage(message)` escapes `<`/`>` to `&lt;`/`&gt;` (preserving literal `<br>` tags) —
  used when a message is first rendered as markdown, to stop raw HTML from being interpreted by
  the markdown renderer.
- `unSanitizeMessage(message = '')` does the inverse: `&lt;` → `<`, `&gt;` → `>`. It exists so that
  code blocks tagged `html` can show/preview the original HTML source rather than the escaped
  form. **No DOMPurify or other HTML sanitizer runs on this path** — `outputText` fed to the
  preview iframe is the raw (unescaped) HTML/JS text as authored by the user or model, decoded but
  not cleaned.
- Also reused in `src/components/markdown/tokens/MermaidDiagram.tsx` (diagram source cleanup,
  unrelated to iframes).

### Architecture and Layers Affected
- **Component layer** (`src/components/`): both preview popups live here as leaf/presentational
  components; `CodeBlock` is also a shared component consumed across chat and elsewhere.
- **Shared UI primitive**: `Popup` (`src/components/Popup/`) — wraps both preview implementations;
  it is not itself security-relevant to this task (it renders headers/footers/backdrop, no HTML
  sink).
- No store, API, or router layer is involved — this is a pure rendering/DOM-attribute change
  local to two leaf components and their shared parent, `CodeBlock.tsx`.

### Integration Points
- `CodeBlock.tsx` is the sole entry point that renders `HtmlPreviewPopup` (chat HTML/JS code
  blocks). No other file imports `HtmlPreviewPopup` or `HTMLPreviewPopup`.
- `src/components/HTMLPreviewPopup/HTMLPreviewPopup.tsx` currently has zero call sites in `src/` —
  it is dead/unused code with its own `index.ts` re-export, but nothing imports that index either.
- A structurally distinct iframe exists at `src/pages/applications/ApplicationIframePage.tsx`
  (renders a federated/remote application's own URL via `<iframe src={iframeURL} ... />`, no
  `sandbox` attribute, no `srcDoc`). This is a different trust model (a registered application
  entry URL, not arbitrary chat-generated HTML) and is not named by the ticket; it is out of scope
  but worth flagging as a separate, pre-existing unsandboxed iframe if scope ever expands.
- No hook, hoc, or hosting page wraps either preview popup beyond `CodeBlock.tsx`.

### Patterns and Conventions
- Both popups follow an identical structural pattern: `useRef<HTMLIFrameElement>` + a
  `reloadIframe` closure that mutates `.srcdoc` directly (rather than relying on React re-render of
  the `srcDoc` prop) + wrap in `Popup` with a `refresh-btn close-btn` icon button and a
  `close-btn` icon button.
- No shared iframe/preview utility, hook, or constants module exists anywhere under `src/utils/`,
  `src/components/shared`, or elsewhere. `grep -rn "sandbox"` across `src/` returns only the two
  ticket-named files (plus an unrelated string literal `'sandbox:/v1/files/'` used as a URL-path
  placeholder in `Markdown.utils.ts`, unrelated to the iframe attribute).
- No factory, registry, or base-class pattern is used for iframes in this codebase; consolidation
  would be a net-new shared component/util, not an extension of an existing one.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/development/security-patterns.md` covers HTML sinks (`dangerouslySetInnerHTML`,
  `DOMPurify` usage table), navigation-from-untrusted-input, cross-window `postMessage` origin
  checks, and public build/runtime configuration — but **contains no guidance on `<iframe
  sandbox>` at all**. This ticket's concern (isolating an iframe's script execution context) is a
  new category for this guide, not an existing documented pattern.
- `.ai-run/guides/architecture/architecture.md` mentions `iframe` only in the context of
  `ApplicationIframePage.tsx` as the "Iframe fallback" for federated micro-frontend applications —
  an unrelated feature (registered app URLs, not user-generated HTML).
- `.ai-run/guides/testing/testing-patterns.md` has no mention of `iframe` or `sandbox`.

### Architectural Decisions
- No ADR or recorded decision anywhere in the guides addresses iframe sandboxing. The
  `security-patterns.md` HTML-sinks table (three shapes: sanitize-inline, sanitize-at-producer,
  render-a-constant) is the closest existing precedent for "trusting sink" components, and
  explicitly states: "The same holds for any component you add with an HTML-typed prop — if the
  component cannot sanitize, its type is a contract that the caller does, and that contract must
  be stated where the prop is declared." Both `HtmlPreviewPopup` and `HTMLPreviewPopup` are exactly
  this shape (`html: string` prop, no sanitization inside), and neither currently states that
  contract in a comment or prop doc.

### Derived Conventions
- File-header Apache license banner is present verbatim at the top of every source file inspected
  (`CodeBlock.tsx`, both preview popups, `Markdown.utils.ts`, `ApplicationIframePage.tsx`) — any
  new shared file should carry the same banner.
- Icon buttons use `.svg?react` imports from `@/assets/icons/` (`CloseSvg`, `RefreshSvg`) and share
  CSS classes `close-btn` / `refresh-btn close-btn` — a consolidated component should keep these
  class names if it wants to inherit existing popup-header styling untouched.
- `Popup` component (`src/components/Popup/`) is the standard modal wrapper for both existing
  implementations; a consolidated shared iframe should likely stay agnostic of `Popup` (so it is
  usable in non-popup embeddings too) — but this is a design decision, not a discovered constraint.

---

## 4. Testing Landscape

### Existing Coverage
- `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx` is the only test file found
  in `src/components/CodeBlock/`. It covers font-CSS-variable wiring, Prism syntax highlighting
  structure, and the `stickyHeader` prop. **It contains no test that opens the HTML preview popup,
  no reference to `HtmlPreviewPopup`, and no assertion on any `iframe` or `sandbox` attribute.**
- `src/components/HTMLPreviewPopup/` has **no `__tests__` directory at all**.
- Repo-wide `grep` for test files referencing `iframe`, `HtmlPreviewPopup`, or `HTMLPreviewPopup`
  returned no matches — there is currently zero automated test coverage of either preview
  component's rendering, its sandbox attribute, or its refresh behavior.

### Testing Framework and Patterns
- Vitest with `@testing-library/react`, split into two projects per `vitest.workspace.ts`:
  - `unit` — files matching `**/__tests__/**/*.{test,spec}.*`, excluding
    `*.integration.test.*`; mocks Valtio/stores.
  - `integration` — files matching `**/__tests__/**/*.integration.test.*`; real Valtio + real
    stores + mocked API.
- The existing `CodeBlock.integration.test.tsx` uses `render`/`cleanup` from
  `@testing-library/react`, `describe`/`it`/`expect`/`beforeEach`/`beforeAll`/`afterEach` from
  `vitest`, and reads a `.scss` file directly with `fs.readFileSync` to assert on stylesheet
  content — a pattern for asserting on non-DOM artifacts that could be echoed for a
  constants/util module if consolidation extracts sandbox tokens into a shared constant.
  Since it is named `.integration.test.tsx` it runs under the `integration` project despite not
  exercising a store — the split appears to be file-suffix-driven rather than strictly
  store-usage-driven.

### Coverage Gaps
- No test asserts the `sandbox` attribute value on either existing iframe today — this is the
  central gap the ticket's AC (assert sandbox value, assert exclusion of unsafe tokens) must fill.
- No test exercises the `reloadIframe`/refresh button behavior on either popup.
- No test covers `CodeBlock`'s `isHTML` detection logic or the show/hide toggle for the preview
  button.
- No test exists for a consolidated/shared iframe component, since one does not yet exist.

---

## 5. Configuration and Environment

### Environment Variables
- No environment variable, `import.meta.env.VITE_*`, or `window._env_.*` reference was found in
  either preview component, `CodeBlock.tsx`, or `Markdown.utils.ts`. This feature is not
  configuration-driven today.

### Configuration Files
- No config file (`config.js`, `.env`, feature-flag store) references HTML preview, iframe, or
  sandbox behavior.

### Feature Flags and Deployment Concerns
- No feature flag toggles this feature. `nginx.conf` sets no `Content-Security-Policy`,
  `X-Frame-Options`, or `frame-src` directive (confirmed via
  `.ai-run/guides/development/security-patterns.md` § Response headers, which states this is the
  current, unchanged state and that a header change is its own ticket). This means the isolation
  for this ticket must come entirely from the `sandbox` attribute on the iframe element itself —
  there is no CSP-level backstop in the served app today.

---

## 6. Risk Indicators

- **Two structurally similar but independently-authored components exist, and one of them
  (`HTMLPreviewPopup`) has zero current callers.** Consolidation must decide whether to delete the
  unused component outright or fold it into the new shared component for future use — leaving it
  unconsolidated after this ticket would let the sandbox configuration diverge again, which is
  exactly what the ticket says must not happen.
- **No existing test pins down iframe behavior for either component**, so the "keep existing
  functionality working" requirement (JS execution, refresh behavior) has no regression harness to
  build from — new tests are pure greenfield for this area.
- **`unSanitizeMessage` is a decode step, not a sanitizer.** The HTML fed to `srcDoc` is
  effectively raw user/model text with no DOMPurify pass; the sandbox attribute is the only
  containment layer this ticket is scoped to add (no CSP, no additional sanitization requested by
  the ticket, and none present upstream).
- **The `reloadIframe` pattern mutates `iframeRef.current.srcdoc` directly**, bypassing React's
  `srcDoc` prop reconciliation. Speculative: a consolidated component/util will need to decide
  whether to keep this imperative mutation (and thus needs to expose a ref or an imperative handle
  for "refresh") or replace it with a key-based re-render — this is a design choice for the spec
  stage, not something discovered in code.
- **No project guide documents `sandbox` attribute conventions.**
  `.ai-run/guides/development/security-patterns.md` will likely need a new subsection once this
  ticket lands, but that update is out of scope for research and belongs to whoever authors the
  fix.
- **No CSP or `X-Frame-Options` response header exists in `nginx.conf`.** The sandbox attribute is
  the sole isolation mechanism available to this fix; there is no complementary server-side control
  already in place to lean on or that could mask a mistake.
- **Prop-name mismatch between the two existing components** (`isVisible`/`onHide` vs
  `visible`/`onClose`) means consolidation touches at least one call site's prop names regardless
  of which component's API "wins."

---

## 7. Summary for Complexity Assessment

This task touches a single architectural layer — shared/presentational components under
`src/components/` — with a narrow, well-bounded file surface: two existing iframe-rendering popups
(`src/components/CodeBlock/HtmlPreviewPopup.tsx`, currently live with one caller,
`src/components/CodeBlock/CodeBlock.tsx`; and `src/components/HTMLPreviewPopup/HTMLPreviewPopup.tsx`,
currently dead code with zero callers) plus whatever new shared component or util file the
consolidation introduces. No store, router, or backend/API layer is involved, and no environment
variable, feature flag, or CSP/header configuration currently touches this feature — the fix is
self-contained to component code and its tests.

Technical novelty is moderate rather than low: the codebase has no existing `sandbox`-attribute
convention, shared iframe utility, or documented guidance to extend (confirmed absent from
`.ai-run/guides/development/security-patterns.md`), so the shared component is a new pattern for
this repo, not an extension of an established one. The two components to merge differ slightly in
prop names and container markup, so consolidation is a real merge, not a pure copy. Offsetting that,
the required attribute value (`sandbox="allow-scripts"`, explicitly excluding a specific list of
tokens) is fully specified by the ticket, leaving little open design space for the sandbox value
itself.

Test coverage posture is the primary risk: zero existing tests reference either preview component,
`iframe`, or `sandbox` anywhere in the repository, so both the consolidation and its regression
tests are greenfield. Key risk factors are (1) the dead `HTMLPreviewPopup` component needing an
explicit removal-or-merge decision so the two implementations cannot silently diverge again, (2)
the imperative `.srcdoc` mutation pattern used for "refresh" in both components, which a shared
component/util must preserve or deliberately replace, and (3) the absence of any CSP/header
backstop in `nginx.conf`, meaning the `sandbox` attribute is the sole containment layer for this
fix with no server-side safety net.

---

## 8. External References

None named by the task. The ticket's "Affected files" list points at in-repo paths
(`src/components/CodeBlock/HtmlPreviewPopup.tsx`, `src/components/CodeBlock/CodeBlock.tsx`,
`src/components/HTMLPreviewPopup/HTMLPreviewPopup.tsx`), all of which were read directly as part of
Section 2 above rather than treated as an external source.
