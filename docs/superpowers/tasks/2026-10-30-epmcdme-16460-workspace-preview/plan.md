# Workspace Browser Rich Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Preview Markdown, JSON and more text formats in the agent workspace browser, with an expand toggle that Esc collapses without closing the browser.

**Architecture:** Pure helpers pick the preview kind per extension, split front matter and format JSON. The popup renders by kind. Expand is in place (same element, no remount, so scroll and selection survive); Esc is captured while expanded. Shared `Popup`, store, API, backend are untouched.

**Tech Stack:** React, TypeScript, Vitest + RTL, existing `@/components/markdown/Markdown`, `expand.svg` / `collapse.svg`.

**Spec:** `docs/superpowers/tasks/2026-10-30-epmcdme-16460-workspace-preview/spec.md`

Commit per task using the repository's existing convention (ticket EPMCDME-16460 in the message). Apache license header on new files.

## Global Constraints

- Text extensions: ts, tsx, jsx, yaml, yml, sh, css, html, log, diff, txt, py, js. Markdown: md, markdown. JSON: json. `html` is text only.
- JSON indent 2; invalid JSON shown unchanged, no error. No syntax highlighting, no truncation, no new `dangerouslySetInnerHTML`/iframe.
- Do not change `src/components/Popup`. New test ids use `workspace-*`.
- negative-constraints: honored by Task 2 (no raw HTML, no highlighting, no size cap) and Task 3 (no Popup change, no `reset()` on Esc-collapse).

## Review Focus

- Front matter without a closing `---` is plain body (Task 1 test).
- `---` mid-file is not front matter (Task 1 test).
- CRLF line endings in front matter and JSON (Task 1 test).
- Empty file content `""` still previews, not "no preview" (Task 2 test).
- Extension case (`README.MD`) and no extension / dotfile (Task 1 test).

---

### Task 1: Preview helpers

**Files:**
- Create: `src/pages/chat/components/ChatHeader/workspacePreview.ts`
- Test: `src/pages/chat/components/ChatHeader/__tests__/workspacePreview.test.ts`

**Interfaces:**
- Produces: `type PreviewKind = 'markdown' | 'json' | 'text'`; `getPreviewKind(path: string): PreviewKind | null`; `splitFrontMatter(text: string): { frontMatter: string | null; body: string }`; `formatJson(text: string): string`.
- Reuse the popup's local `getFileExtension` by exporting it from this module (`export const getFileExtension`) and importing it in the popup; do not touch the store.

Test-first: yes — `getPreviewKind('a.MD')` is `'markdown'`, `'x.tsx'` is `'text'`, `'a.bin'`/`'Makefile'`/`'.gitignore'` are `null` (fails: module missing); `splitFrontMatter('---\nk: v\n---\n# T')` returns `{frontMatter:'k: v', body:'# T'}`, unclosed `---` and mid-file `---` return `frontMatter: null` with the body unchanged, CRLF input splits; `formatJson('{"a":1}')` equals `'{\n  "a": 1\n}'` and `formatJson('{bad')` returns `'{bad'`.

- [ ] **Step 1:** Write the tests above.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/chat/components/ChatHeader/__tests__/workspacePreview.test.ts`; expect FAIL.
- [ ] **Step 3:** Implement the module; front matter regex anchored at string start, tolerating `\r\n`; `formatJson` is `JSON.parse`/`JSON.stringify(_, null, 2)` in try/catch.
- [ ] **Step 4:** Rerun; expect PASS.

### Task 2: Render by preview kind and update the hint

**Files:**
- Modify: `src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx:33` (replace `TEXT_PREVIEWABLE_EXTENSIONS`), `:61` (import `getFileExtension`), `:131-145` (text availability uses `getPreviewKind`; keep `!is_binary` and `typeof content === 'string'`; images still checked second), `:155-214` (`renderPreview`), `:210` (hint).
- Test: `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `data-testid="workspace-preview-markdown"` wrapper around `<Markdown content={body} />`; `data-testid="workspace-preview-frontmatter"` `<pre>` shown above it only when front matter exists; JSON and text keep `workspace-preview-text`.

Test-first: yes — selecting `a.md` with front matter renders a heading in `workspace-preview-markdown` and the front matter text in `workspace-preview-frontmatter` (fails: `.md` shows no preview); `a.json` shows 2-space output, invalid `.json` shows raw text; `a.yaml` shows text; `a.bin` shows the hint containing "Markdown" and "JSON"; empty-string `.txt` previews. Mock `@/components/markdown/Markdown` as a simple div in the test file.

- [ ] **Step 1:** Add the tests to the existing file, following its store/Popup mock pattern.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx`; expect new tests FAIL.
- [ ] **Step 3:** Implement. Compute `{kind, display}` with `useMemo` keyed on `selectedFile` path and content (markdown: `splitFrontMatter`; json: `formatJson`). Front matter `<pre>` uses the same monospace classes as the text `<pre>`. Hint text lists Markdown, JSON, the text extensions and common images.
- [ ] **Step 4:** Rerun the file; expect PASS (existing `.py` and image tests included).

### Task 3: Expand toggle with Esc captured

**Mechanism (decided):** In-place. `isExpanded` local state. When true: pass `className` to `Popup` overriding the width (`!max-w-[96vw] xl:!max-w-[96vw]`), change grid height `h-[65vh]` to `h-[90vh]`, hide the 320px file list with `hidden`, and let the preview pane take the full width. The preview scroll container (`:291`) is the same element in both modes, so selection and scroll position are kept. Esc: while `isExpanded`, a `useEffect` registers `window.addEventListener('keydown', h, true)` (capture, removed on cleanup). On `Escape` the handler calls `e.stopPropagation()` and `setIsExpanded(false)`. A window capture listener runs before PrimeReact's document-level Escape handler, so the outer Dialog's `onHide` (and `agentWorkspaceStore.reset()`) never fires. When collapsed there is no listener, so Esc closes the browser as today. Also reset `isExpanded` to false when the selected file changes to none or the popup hides.

**Files:**
- Modify: `src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx` (preview header near `:279-288`, grid `:216-311`, the `Popup` props)
- Test: `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderBrowseFilesButton.test.tsx`

**Interfaces:**
- Consumes: Task 2 render. Produces: button `data-testid="workspace-preview-expand"` with `aria-label` "Expand preview" / "Collapse preview" (`expand.svg` / `collapse.svg`), rendered only when a preview (text, Markdown, JSON or image) is shown; `aria-pressed` mirrors state.

Test-first: yes — the toggle is absent with no selection and for an unknown file, present for `.md`, `.json`, `.py` and an image; clicking flips the label and hides the file list (fails: no button). Esc test that does not depend on the Popup mock: register a spy `keydown` listener on `document` (stand-in for PrimeReact's outer handler), expand, dispatch `new KeyboardEvent('keydown', {key:'Escape', bubbles:true})` on `document.body`; assert the document spy was not called, the label is back to "Expand preview", `selectedFile` and `agentWorkspaceStore.reset` unchanged/not called. A second case: collapsed, Esc reaches the document spy.

- [ ] **Step 1:** Write the tests.
- [ ] **Step 2:** Run the test file; expect new tests FAIL.
- [ ] **Step 3:** Implement per the mechanism above, using `cn()` for the conditional classes.
- [ ] **Step 4:** Rerun the test file; expect PASS.
