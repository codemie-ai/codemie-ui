# Post-review addendum — 2026-10-05

**Source**: UI lead (Oleksii Dubachynskyi) design approval, requested directly by the user — not
part of the `spec.approved` / `plan.approved` / `code-review.*` verdict chain recorded in
`decisions.jsonl` above. That chain approved and shipped the five-menu-item design described in
`spec.md`'s "Component layer" section and `plan.md`'s Task 2.

**Request**: replace the five-menu-item dropdown (`Export to JSON` / `Export to DOCX` /
`Export to DOCX (with tool outputs)` / `Export to PDF` / `Export to PDF (with tool outputs)`) with
a single export dialog, because format and "include tool outputs" are two independent settings and
representing every combination as its own menu item duplicates them unnecessarily. The lead's
exact requirements:

- Format: JSON / DOCX / PDF.
- A single "Include tool outputs" checkbox, unchecked by default for DOCX/PDF.
- For JSON, tool outputs are always included, so the checkbox is checked and disabled with a short
  explanation.
- The Export button shows a loading state and prevents duplicate clicks while generation is in
  progress.

**Change made**: the menu-item dropdown in the single file
`ChatHeaderDownloadConversationButton.tsx` was replaced with a new
`ChatHeaderDownloadConversationButton/` directory:

- `ChatHeaderDownloadConversationButton.tsx` — trigger button that opens the dialog.
- `ExportConversationPopup.tsx` — the dialog: a `format` radio group (`FORMAT_OPTIONS`:
  json/docx/pdf) plus one "Include tool outputs" `Checkbox`. Switching to JSON forces the checkbox
  to display as checked and disabled, with a `hint` tooltip ("Tool outputs are always included in
  JSON exports."); the actual export call still gates on
  `canIncludeToolOutputs && includeToolOutputs`, so the displayed checked state for JSON never
  leaks into the request. The Export button is `disabled`/`isLoading` while `isExporting`, and
  `handleClose` no-ops mid-export, satisfying the loading/duplicate-click requirement without the
  old file's ref-based guard (only one Export button exists now, so a simple `disabled` suffices).
- `ExportFormatOption.tsx` — one radio row per format (icon, label, description).
- `constants.ts` — `FORMAT_OPTIONS` (label + description per format).

Store layer (`chatsStore.exportChat`) and its `include_tool_outputs` query-param contract from the
original spec are unchanged — only the UI surface requesting them changed.

**Tests**: `ChatHeaderDownloadConversationButton.test.tsx` was trimmed of the old dropdown/menu-item
assertions; a new `ExportConversationPopup.test.tsx` covers the format radios, the checkbox's
default/disabled/checked states per format (including the JSON checked+disabled+hint case and its
absence for DOCX/PDF), the loading/duplicate-click guard, and that JSON exports never carry
`includeToolOutputs: true` regardless of the checkbox's displayed state.

This addendum supersedes the "Component layer" section of `spec.md` and Task 2 of `plan.md` for UI
structure; the request contract, store layer, and acceptance criteria unrelated to the menu/dialog
surface are unaffected.
