# Technical Research

**Task**: agent-workspace workspace-browser file-preview markdown json AgentWorkspaceBrowserPopup
**Generated**: 2026-10-28
**Research path**: filesystem (scoped workspace)

Workspace root: `/private/tmp/claude-501/-Users-yanaasadchaya-Projects-epam-codemie-codemie/71e357cc-a240-4f23-9b4e-c78f02136c93/scratchpad/ws`
- `codemie-ui` → `ws/codemie-ui` @ `1f1613f9b` (detached origin/main)
- `codemie` → `ws/codemie` @ `15e92e1e0`
- CodeGraph: CODEGRAPH_UNAVAILABLE (no index verified for these roots)

---

## 1. Original Context

Existing ticket: EPMCDME-16460.

Title: Agent workspace browser: richer file preview (Markdown, JSON, more text formats, expanded view)

Context: the chat's agent workspace browser (Browse files in the chat header, AgentWorkspaceBrowserPopup in codemie-ui) previews only .txt, .py and .js as plain text plus images. Agents increasingly write specs, plans, reports, configs and logs into the workspace (.md, .json, .yaml, .log, .diff...), and users have to download them to read them. The preview area is also small for long documents.

Scope (UI only, codemie-ui):
1. Text preview for more extensions: ts, tsx, jsx, json, yaml, yml, sh, css, html, log, diff, md, markdown (in addition to txt, py, js).
2. Markdown files (.md, .markdown) are rendered with the chat's existing Markdown component. YAML front matter (a leading --- ... --- block) is shown as a monospace code block above the rendered body, not rendered as Markdown.
3. JSON files are pretty-printed (2-space indent). If the file is not valid JSON, it is shown as plain text unchanged, with no error.
4. Expand the preview: a control in the preview that enlarges it to a near-full-screen view and back, so long documents and wide JSON can be read without downloading. The selected file and scroll position are kept when toggling.
5. The empty-state hint that lists previewable formats is updated to match.

Acceptance criteria:
- Selecting a .md file shows rendered Markdown (headings, lists, tables, code blocks); front matter, if present, appears as a code block above it.
- Selecting a .json file shows it pretty-printed; an invalid .json shows raw text.
- Selecting any of the listed extensions shows its text; unknown/binary files keep the current 'no preview' hint.
- The expand control toggles the enlarged view for text and image previews; Esc or the control returns to the normal view.
- Download keeps working for all files.
- Unit tests cover extension routing, front matter split and the JSON formatting fallback.

Out of scope: editing files; syntax highlighting; links from chat messages to workspace files (separate story).
Labels: ui, agent-workspace

---

## 2. Codebase Findings

### Repository impact
- `codemie-ui`: **affected** — the popup, its preview routing and tests live here.
- `codemie`: **not_affected** — `codemie:src/codemie/rest_api/routers/agent_workspace.py:139-178` already returns full UTF-8 text for any non-binary file; no change indicated.

### Existing Implementations
- `codemie-ui:src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx` (315 lines) — the whole feature:
  - `:33` `TEXT_PREVIEWABLE_EXTENSIONS = ['txt','py','js'] as const`; `:34-59` image extensions + MIME map.
  - `:61` local `getFileExtension(path)` = `path.split('.').pop()?.toLowerCase()`.
  - `:131-145` `isTextPreviewAvailable` requires `!is_binary`, `typeof content === 'string'`, and an extension in the list; `isImagePreviewAvailable` is checked second.
  - `:155-214` `renderPreview()` — spinner, no-selection hint, text `<pre data-testid="workspace-preview-text">` inside `data-testid="workspace-preview"`, image `<img data-testid="workspace-preview-image">` (`max-h-[60vh]`), fallback hint at `:210` ("Preview is currently available for .txt, .py, and .js text files, plus common image formats…").
  - `:216-311` layout: `Popup` (`isFullWidth`, `max-w-[1100px]`), grid `h-[65vh]` with a 320px file list plus preview pane; preview header has the Download button (`:279-288`); scroll container is `:291` `min-h-0 flex-1 overflow-y-auto`, which also holds the error and metadata blocks.
- `codemie-ui:src/pages/chat/components/ChatHeader/ChatHeaderBrowseFilesButton.tsx` — opens the popup; `onHide` calls `agentWorkspaceStore.reset()`.
- `codemie-ui:src/store/agentWorkspace.ts` (valtio) — `selectFile` (`:163-203`) GETs `v1/workspaces/{id}/files/content`; fetches `/files/download` as a blob URL only for images with empty content; `downloadSelectedFile` (`:205-221`) uses `api.downloadFileStream`. It also has its own `getFileExtension` and image list (`:60-73`), so the logic is duplicated with the popup.
- `codemie-ui:src/types/entity/agentWorkspace.ts` — `AgentWorkspaceFileContent { is_binary; content: string | null }`; the backend's `content_encoding` field is not typed in the UI.
- `codemie-ui:src/components/markdown/Markdown.tsx` — the chat's Markdown component, props `{content?, withBlinker?, children?, className?}`. It tokenizes via `getMarkdownTokens` (`Markdown.utils.ts:112`: `marked.lexer(resolveSandboxFileUrls(sanitizeMessage(msg), api.BASE_URL))`) and renders through `MarkdownTokens` (tables via `TableBlock`, Mermaid via `MermaidDiagram`, code via `CodeBlock`). Other consumers include `ThoughtMessage.tsx` and `EditOutputForm.tsx`.

### Architecture and Layers Affected
- UI component layer: `AgentWorkspaceBrowserPopup.tsx` only. The store and API layers are unchanged by the stated scope.

### Integration Points
- `codemie:src/codemie/service/agent_workspace_service.py:417-446` `_is_binary_workspace_content`: text if the MIME starts with `text/` or is in {`application/json`, `application/javascript`, `application/x-sh`, `application/x-yaml`, `application/xml`, `application/x-python-code`}; otherwise the bytes are tried as UTF-8 and treated as text when there is no NUL. The content endpoint has no size cap or truncation. Non-image binaries return `content=None`.
- Shared components: `@/components/Popup` (PrimeReact Dialog, `closeOnEscape` always on at `Popup.tsx:218`; the custom topmost-aware Esc handler only applies when `hideClose`) and `@/components/markdown/Markdown`.

### Patterns and Conventions
- Expand precedents: `src/components/form/ExpandableTextarea/ExpandableTextarea.tsx` (opens a second `Popup` with `expand.svg`) and `src/components/form/MarkdownEditor/MarkdownEditor.tsx:205,405` (`fullscreenPreview` state, `ExpandSvg`, `aria-label="Expand to fullscreen"`). Icons `src/assets/icons/expand.svg` and `collapse.svg` exist.
- Test IDs use `workspace-*` naming; Tailwind design tokens (`border-border-structural`, `text-text-quaternary`); `cn()` from `@/utils/utils`; Apache license header on every file.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `codemie-ui:.ai-run/guides/` has components (`component-patterns.md`, `reusable-components.md`), testing (`testing-patterns.md`, `local-verification.md`) and `quality-gates.md`. None are specific to the workspace browser.

### Architectural Decisions
- `Popup.tsx:94-97` comment: stacked dialogs must close one at a time on Esc (topmost guard via `useTopmostDialog`).

### Derived Conventions
- Pure helpers sit next to the component or in `utils/`; tests go in sibling `__tests__/`.
- Quality gates (`quality-gates.md`): `npm run lint`, `npm run typecheck`, `npm run license-check`, `npm run test:unit:slnt`.

---

## 4. Testing Landscape

### Existing Coverage
- `codemie-ui:src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx` — covers the popup through the button: text preview of `.py`, image previews (mime, extension, blob URL), download enable and call, reset on close.
- `codemie-ui:src/store/__tests__/agentWorkspace.test.ts` — store tests.
- `src/components/Popup/__tests__/Popup.test.tsx` — Esc and stacked-dialog behaviour.
- `src/components/markdown/__tests__/` — Markdown utils, sanitize, plus `*.integration.test.tsx`.

### Testing Framework and Patterns
- Vitest 5.0.2 with the `unit` project (`**/__tests__/**/*.test.*` excluding `*.integration.test.*`) and the `integration` project; RTL 16 and user-event 14.
- The popup test mocks `valtio` (`useSnapshot` returns the store), `@/store/agentWorkspace`, `@/components/Popup` (a plain div, so there is no PrimeReact Esc), and `Spinner`. State is set by mutating `mockAgentWorkspaceStore`.

### Coverage Gaps
- No tests for the fallback hint text, extension routing as a unit, Markdown rendering in the popup, or Esc behaviour inside this popup. The mocked Popup cannot exercise Esc conflicts.

---

## 5. Configuration and Environment

### Environment Variables
- None relevant.

### Configuration Files
- `codemie-ui:vite.config.ts:118-134` defines the vitest projects. Dependencies already present: `marked` (via Markdown), `react-markdown` 10.1.0, `js-yaml` 4.1.1, `prismjs`, `react-syntax-highlighter`.

### Feature Flags and Deployment Concerns
- None.

---

## 6. Risk Indicators

- **Esc conflict**: the popup's PrimeReact Dialog has `closeOnEscape` on (`Popup.tsx:218`). An in-place expanded view would let Esc close the whole browser, and `onHide` then calls `agentWorkspaceStore.reset()`, losing the selection. The AC requires Esc to only collapse. The unit-test Popup mock hides this.
- Speculative: a nested `Popup` for the expanded view (the ExpandableTextarea pattern) gets topmost Esc handling for free, but scroll position would not carry over because it is a different scroll container. An in-place CSS enlarge keeps scroll but needs Esc interception.
- **Front matter vs `marked`**: unsplit `---\nkey: v\n---` lexes as `hr` plus a setext `h2`, so it has to be stripped before `<Markdown>`.
- The Markdown pipeline runs `resolveSandboxFileUrls` and renders Mermaid and images from file content written by agents. The sanitize/allow-list path is shared with chat, so the trust level is the same, but the input is now arbitrary workspace files.
- No size cap on `/files/content`: large `.log` or `.json` files are fully rendered, and `JSON.parse` / `stringify` plus Markdown tokenization run on each render unless memoized.
- `CodeBlock` inside Markdown may apply highlighting to fenced blocks. Syntax highlighting is out of scope only for raw text files.
- Backend binary detection: files whose MIME is not text-like and that contain NUL arrive with `is_binary=true` and `content=null`, so they fall through to the "no preview" hint (consistent with the AC).
- Extension logic is duplicated between the popup and the store (`getFileExtension`, image list).

---

## 7. Summary for Complexity Assessment

The change sits in one UI component, `codemie-ui:src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx` (315 lines), plus its test `ChatHeaderBrowseFilesButton.test.tsx`, and possibly a small helper module for extension routing, front-matter split and JSON formatting. The backend (`codemie`) already serves full text for all listed formats, and no store, API or type change is required by the scope. The existing chat `Markdown` component (`@/components/markdown/Markdown`, `content` prop) and the `expand.svg`/`collapse.svg` icons are ready to reuse.

Novelty is low: extension lists, `JSON.parse` with a try/catch fallback, a regex front-matter split, and an expand toggle with precedents in `MarkdownEditor` (`fullscreenPreview`) and `ExpandableTextarea` (nested Popup). The one non-trivial design point is Esc handling. PrimeReact `closeOnEscape` on the outer Popup closes and resets the whole browser, so an in-place expand must intercept Esc, while a nested Popup must keep the selection and ideally the scroll position.

Test posture is reasonable. There is an established RTL test with store and Popup mocks, but the Popup mock hides Esc behaviour, and there are no unit tests yet for routing helpers. Overall this is a small, single-repo UI change with one interaction risk.

---

## 8. External References

- `/private/tmp/.../scratchpad/jira/s1.txt` — resolved. It is the verbatim requirements, reproduced in Section 1 (its first instruction line is excluded as directed). No other external sources were named.
