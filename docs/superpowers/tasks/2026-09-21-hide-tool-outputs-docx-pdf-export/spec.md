# Spec: Concise-by-default DOCX/PDF conversation export (codemie-ui)

**Ticket**: EPMCDME-14774
**Repo scope**: `codemie-ui` only. The actual DOCX/PDF document generation, tool-output filtering,
and formatting preservation are owned by the separate `codemie` backend and are covered by a
follow-up backend task. This spec covers only what the frontend can deliver: which export variant
the UI requests, the menu surface and labels, and in-progress/duplicate-click/success-failure UX.

## Problem

`ChatHeaderDownloadConversationButton` (`src/pages/chat/components/ChatHeader/ChatHeaderDownloadConversationButton.tsx:148-163`)
offers JSON/DOCX/PDF export, each mapping 1:1 to `chatsStore.exportChat(format)`
(`src/store/chats.ts:466-475`), which always requests the same `export_format` variant from the
backend. There is no way to request a concise (no tool outputs) vs. full (with tool outputs)
DOCX/PDF, and no loading/duplicate-click/feedback state exists around the export action at all.

## Design

### Request contract (external dependency — stated as an assumption)

The backend is assumed to accept an additional boolean query parameter on the existing export
endpoints, alongside `export_format`:

```
GET v1/conversations/{id}/export?export_format={docx|pdf|json}&include_tool_outputs={true|false}
```

- Omitted or `false` → concise variant (user prompts + assistant responses only) — the new
  default for `docx`/`pdf`.
- `true` → full variant (current/legacy behavior, includes tool outputs).
- For `export_format=json`, the parameter is not sent; JSON keeps its current, unconditional
  tool-output-inclusive behavior unchanged.

The exact parameter name/shape is not this repo's to finalize — it is the interface the follow-up
backend task must honor. If the backend lands on a different contract, only `chatsStore.exportChat`'s
URL construction needs to change.

### Store layer (`src/store/chats.ts`)

Extend `exportChat`'s signature to `exportChat: (format: ChatExportFormat, includeToolOutputs?: boolean) => ...`.
When `includeToolOutputs` is `true` and `format` is `'docx'` or `'pdf'`, append
`&include_tool_outputs=true` to the URL built at `src/store/chats.ts:471`; otherwise the URL is
unchanged from today. `api.downloadFileStream`'s signature and the other five call sites
(`dataSources`, `files`, `workflowExecutions`, `agentWorkspace`) are untouched.

### Component layer (`ChatHeaderDownloadConversationButton.tsx`)

Extend the existing flat `OverlayPanel` menu (`ButtonOverlay` list at lines 148-163) with two more
items, keeping the current icon/style pattern. Final menu, in order:

1. Export to JSON
2. Export to DOCX
3. Export to DOCX (with tool outputs)
4. Export to PDF
5. Export to PDF (with tool outputs)

Each new item calls `handleExport('docx', true)` / `handleExport('pdf', true)`; the two
existing DOCX/PDF items call `handleExport(format)` (equivalent to `includeToolOutputs: false`).
Labels must make the distinction unambiguous in both the visible text and the per-item
`aria-label` (currently derived from the last word of `label` at line 35 — that derivation needs
to keep producing a sensible, distinct `aria-label` for the two new "with tool outputs" items,
e.g. by passing an explicit `ariaLabel` prop instead of deriving it from `label.split(' ').pop()`).

### Loading / duplicate-click / feedback state

Add a single `isExporting` boolean (`useState`, default `false`) to
`ChatHeaderDownloadConversationButton`. `handleExport` sets it `true` before calling
`chatsStore.exportChat`, and resets it to `false` in a `finally` once the promise settles,
following the existing `exporting`-boolean-plus-`finally` precedent used in
`SkillDetailsPage.tsx`/`BasicSettings.tsx`. The trigger `Button` (line 121) receives
`isLoading={isExporting}` — this both shows a visible in-progress state and disables the button
(existing `Button` behavior: `disabled={disabled || isLoading}`), which also prevents reopening
the menu or firing a second export while one is in flight. The panel is already closed
(`ref.current?.hide()`, line 108) on any item click, so only the trigger button needs the guard.

On resolution: keep the existing `toaster.info(...)` success message (line 112-114), extending its
text to name the variant, e.g. "...exported as DOCX (with tool outputs)." when applicable. Failure
feedback already exists via `api.downloadFileStream`'s internal `toaster.error`/`handleError`
path (`src/utils/api.ts:258` area) — no new failure-path plumbing is needed; only the loading-state
reset in `finally` must run regardless of success or failure.

### Type

No new type is introduced. `ChatExportFormat` (`src/types/chats.ts`) stays
`'docx' | 'pdf' | 'pptx' | 'json'`; the variant is carried by the new `includeToolOutputs`
parameter, not by a new format value.

## Acceptance criteria

- Clicking "Export to DOCX" or "Export to PDF" sends the request with `include_tool_outputs`
  omitted or `false`.
- Clicking "Export to DOCX (with tool outputs)" or "Export to PDF (with tool outputs)" sends
  `include_tool_outputs=true`.
- Clicking "Export to JSON" sends no `include_tool_outputs` parameter and behavior/URL is
  byte-for-byte unchanged from today.
- All five menu items have distinct, accurate visible labels and `aria-label`s.
- While any export request is in flight, the trigger button shows a loading state and is
  disabled; a second click on it or any menu item is not possible until the request settles.
- A success toast names the exported format and variant; failure surfaces the existing
  `toaster.error` path; the loading state clears in both cases.
- `api.downloadFileStream`'s exported signature is unchanged; the other five call sites
  (`dataSources.ts`, `files.ts`, `workflowExecutions.ts`, `agentWorkspace.ts`) are unaffected.
- `exportConversationAIMessage` and its call site in `ChatAiMessageActions.tsx` are unchanged.

## Non-goals

- Any backend DOCX/PDF generation, tool-output filtering, or formatting-preservation work
  (headings/lists/tables/links/code blocks) — owned by the follow-up `codemie` backend task.
- Per-message export (`chatsStore.exportConversationAIMessage`, `ChatAiMessageActions.tsx`) —
  not mentioned in the ticket; left untouched.
- Changing `api.downloadFileStream`'s signature or adding a progress callback — the export
  variant is carried entirely in the URL built by the caller.
- The unrelated `hideToolOutputs` live-transcript display toggle
  (`useChatConfiguration.tsx`, `ChatConfigHideToolOutputs.tsx`) — a different, on-screen feature;
  not read, written, or reused by this change.
- Any new feature flag or environment variable — none is needed.
- Export permission/authorization logic — unchanged.

## Testing notes (for Stage 4 planning, not prescriptive here)

- `src/store/__tests__/chats.export.test.ts`: extend `exportChat` cases to assert the URL with and
  without `include_tool_outputs=true`; assert `json` requests remain unparameterized.
- `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderDownloadConversationButton.test.tsx`:
  add coverage for opening the menu, clicking each of the five items and asserting the store call
  args/labels, the loading-disabled state during an in-flight promise, and the success toast text
  per variant.

## Open risks

- The backend's actual parameter name/shape is unconfirmed; if it lands on a different contract
  (e.g. a new `export_format` value instead of a boolean flag), only the URL-building line in
  `chatsStore.exportChat` needs to change, but the follow-up backend task must be coordinated
  before this frontend change is functionally complete end-to-end.
- `aria-label` derivation in `ButtonOverlay` (`label.split(' ').pop()`) will need adjustment to
  stay correct for the two new "(with tool outputs)" labels — flagged above, to be handled during
  implementation.
