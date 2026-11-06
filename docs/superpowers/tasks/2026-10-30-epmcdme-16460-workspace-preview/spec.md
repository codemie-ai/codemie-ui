# EPMCDME-16460 Workspace browser: readable preview of documents, data and logs

Repo: codemie-ui only. Size S (11). No backend, store or API change.

## Why

Agents write specs, plans, reports, configs and logs into the chat workspace. The "Browse files" dialog
(`src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx`) previews only txt, py, js and images
(`:33`, `:131-145`, `:155-214`), so users download each file to read it. The backend already returns full text for
non-binary files (`codemie:.../agent_workspace.py:139-178`).

## Behavior

Preview kind is chosen by lowercase file extension, only when the file is non-binary with string content
(images keep the existing path):

- **Markdown** (`md`, `markdown`): rendered with the chat component `@/components/markdown/Markdown`, so sanitizing
  is identical to chat replies. A leading front matter block (`---` line, content, closing `---` line, at the very
  start of the file) is split off and shown in a monospace block above the body. The body alone goes to Markdown.
  A file starting with `---` without a closing delimiter is treated as plain body.
- **JSON** (`json`): `JSON.parse` then `JSON.stringify(_, null, 2)`, shown in the shared `CodeBlock`. On parse
  failure the original text is shown unchanged, with no error message.
- **Text** (every extension in the shared `FILE_EXTENSIONS` map, which includes `log` and `diff`; names without an
  extension and dotfiles such as `Dockerfile` or `.env` are matched by their whole name): shown in the shared
  `CodeBlock` with its syntax highlighting (as for chat code blocks) and Copy. Its own Download is hidden (`hideDownload`); the browser's Download
  fetches the real file. `html` is shown as highlighted text; `CodeBlock`'s sandboxed HTML Preview is available
  as for chat code blocks (D1 revised).
- **Anything else**, or binary: the "no preview" hint, naming the supported kinds (Markdown, JSON, text and source
  code, common images).
- Download behaves as today for every file.
- Large files render in full (D4). Parsing/splitting results should be memoized per selected file so unrelated
  re-renders do not redo them.

### Expanded view

- Every previewed kind can be expanded, through the existing expand popup (`ExpandedYamlShell`): text and JSON
  through `CodeBlock`'s own Expand, Markdown and images through an Expand button in the preview header styled like
  `CodeBlock`'s. The popup is titled with the file path and has a Collapse button. No Expand when there is no
  preview.
- **Esc while expanded closes only the expanded popup.** The browser stays open and `selectedFile` is unchanged,
  so the store's `reset()` (called from `onHide` in `ChatHeaderBrowseFilesButton.tsx`) must not run. Esc with
  nothing expanded keeps today's behavior (closes the browser). No extra Esc handling is needed: the expand popup
  (`hideClose`) closes through `Popup`'s topmost-only Esc handler (`Popup.tsx:101-115`), and PrimeReact's own Esc
  handling on the browser dialog acts only on the topmost dialog. Verified in a browser, since unit tests mock
  `Popup`.
- Keeping scroll position is not required (D3); the popup opens at the top. Selected file must be kept.
- Do not change the shared `Popup` behavior for other consumers.

### Security

HTML and scripts are never executed in the app. HTML files are shown as text; `CodeBlock`'s optional HTML Preview
renders them only in its existing sandboxed iframe (`HtmlPreviewPopup`, as for chat code blocks). Markdown goes
through the existing chat sanitize path (`Markdown.utils.ts` `sanitizeMessage`). No new `dangerouslySetInnerHTML`.

## Structure

- Pure helpers next to the component (or `utils/`): extension-to-preview-kind routing, front matter split, JSON
  format with fallback. Reuse or share the existing duplicated `getFileExtension`; do not refactor the store.
- Apache license header on new files; Tailwind tokens and `cn()` as in the surrounding code; `workspace-*`
  test ids for new elements.

## Acceptance criteria

1. `.md`/`.markdown` render as formatted Markdown.
2. Front matter appears as a monospace block above the formatted body, not as a rule or heading.
3. Valid `.json` is pretty-printed with 2-space indent.
4. Invalid `.json` shows its text unchanged, no error.
5. Every `FILE_EXTENSIONS` extension (including log and diff), plus `Dockerfile`, `Makefile` and dotfiles listed
   there, shows its text in the shared `CodeBlock`, highlighted as `CodeBlock` does.
6. Unknown or binary files show the "no preview" hint naming the supported kinds.
7. Any previewed file (text, Markdown, JSON, image) can be expanded to nearly full screen in the shared expand
   popup; Collapse restores.
8. In the expanded popup Esc closes only that popup; browser stays open, same file selected.
9. Download works as today.
10. HTML and Markdown-embedded HTML/scripts are never executed.

## Non-goals

- Editing files.
- PDF, Office or other binary formats.
- Links from chat messages to workspace files (EPMCDME-16458).
- Any change to how the workspace stores or serves files; backend, store and API-type changes.
- Rendering HTML in the app (only `CodeBlock`'s existing sandboxed preview); file size limits or truncation.
- Changing shared `Popup` behavior for other dialogs.

## Test strategy (for the plan)

Unit tests for the three helpers (routing, front matter split, JSON fallback) and extension of
`ChatHeaderBrowseFilesButton.test.tsx` for Markdown, JSON, new extensions, hint text and the expand toggle. The
existing test mocks `Popup` as a plain div, so Esc behavior needs a test that does not rely on that mock (or
manual verification per `local-verification.md`).

## Revised after MR review (2026-11-05)

Review comments on MR !2230 replaced parts of the original design:

- Text extensions come from the shared `FILE_EXTENSIONS` map instead of a local list (`log` and `diff` added to it),
  including whole-name matches such as `Dockerfile` and `.env`.
- Text and JSON render in the shared `CodeBlock`: syntax highlighting (previously a non-goal), Copy, and its
  existing Expand. A new optional `hideDownload` prop on `CodeBlock` hides its Download, which would save the shown
  text as `code.<ext>` rather than the real file.
- The in-place enlarge of the browser and its capture-phase Esc listener are replaced by the existing expand popup
  (`ExpandedYamlShell`) for every kind. D3 (scroll position) is no longer met: the popup opens at the top.
- `.html` gets `CodeBlock`'s sandboxed HTML Preview, accepted as an extra (D1 revised).
