# Spec: Show, Pre-select and Deselect Datasource Default Tools (UI)

**Date**: 2026-10-19
**Status**: Draft
**Depends on**: Backend story (datasource-default-tools-selection-backend) — adds the standard
"Get Repo Tree"/"Search Code" and "Search Knowledge Base" entries to the tool listing, and the
deselected-default-tools persisted field. This spec assumes that contract exists.

## Intent

Authors cannot currently see or remove the tools a datasource attachment adds (e.g. "Get Repo
Tree" over a large repository). This forces fragile system-prompt workarounds while the tool stays
callable. Make default datasource tools visible, pre-selected on attach, and deselectable like any
other tool — consistently in the assistant form and the virtual assistant form (workflow-embedded
assistants).

## Behavior

**Listing.** Codebase Tools gains standard "Get Repo Tree" and "Search Code" alongside the
existing "with filtering" variants and other code tools. A new Knowledge Base group lists "Search
Knowledge Base". Both come from the backend tool listing (`assistantsStore.availableToolkits`) —
no new grouping logic beyond rendering what the listing returns.

**Selection source of truth.** A tool's checked state is "selected" unless it is a default tool
named in the assistant's deselected-default-tools list. This list is additive context on top of
the existing `AssistantToolkit[]` selection (`src/types/entity/assistant.ts`), not a replacement
for it — the existing "selected means present in `AssistantToolkit.tools`" rule still governs
non-default tools. Absence of the list (legacy assistants, assistants with no author decision)
means nothing has been deselected; its default tools render selected.

**Auto-select on attach.** When a datasource of a given type (code vs knowledge-base) transitions
from "none attached" to "one attached" on the form, the form selects that type's default tool(s) —
unless the deselected-default-tools list already names them, in which case they stay deselected
(D5/D8). Removing the last datasource of a type does not clear anything from the deselected list
(D8): the list is a standing author decision, re-applied the next time a datasource of that type
is attached.

**Exclusivity.** "Get Repo Tree" and "Get Repo Tree with filtering" are mutually exclusive;
likewise "Search Code" and "Search Code with filtering". Selecting one through the existing
toggle path deselects the other going forward. A stored assistant that already has both selected
(pre-existing data) displays both as selected — exclusivity is enforced only on the next change,
not retroactively on load (D9). Both may be deselected simultaneously; no minimum-one-selected
rule applies (D10 — deselecting a default tool is plain deselection, no warning).

**Persistence.** The deselected-default-tools list travels with the assistant payload through
both forms: read on load, updated on toggle/auto-select, and written on save. The assistant form
and the virtual assistant form must derive and mutate it through the same logic (see
Implementation notes) so the two surfaces cannot drift.

**Save errors.** When the backend rejects a save (e.g. an unknown tool name in the deselected
list), the form surfaces the returned error message using the form's existing save-error display
and does not reset or discard the author's in-progress changes — the author can correct and retry
without re-entering unrelated edits.

## Implementation notes (non-binding on the plan, binding on intent)

`src/hooks/useToolkitSelection.ts` is the existing shared selection primitive behind
`ToolsConfiguration.tsx`, `Toolkit.tsx` and `ExternalToolsSection.tsx` — the natural integration
point for exclusivity and auto-select so both forms inherit one implementation rather than two.
Extend it; do not fork a parallel selection path for default tools.

## Acceptance Criteria

- Codebase Tools lists "Get Repo Tree" and "Search Code" (standard) alongside the "with
  filtering" variants and other code tools.
- A Knowledge Base group lists "Search Knowledge Base".
- Attaching a code datasource to an assistant with none auto-selects standard "Get Repo Tree" and
  "Search Code".
- Attaching a knowledge-base datasource to an assistant with none auto-selects "Search Knowledge
  Base".
- A default tool previously deselected by the author is not re-selected when another datasource
  of the same type is attached.
- Selecting "Get Repo Tree with filtering" deselects standard "Get Repo Tree" and vice versa; same
  for "Search Code" / "Search Code with filtering". Deselecting both is allowed.
- A deselected default tool stays deselected after save and reopen. A pre-existing assistant with
  no deselected-default-tools list shows its default datasource tools as selected.
- The virtual assistant form (workflow-embedded assistants) applies the same listing,
  pre-selection, auto-select and exclusivity rules.
- A backend validation error on save is shown to the author, and the form retains the author's
  unsaved changes.

## Non-goals

- Backend and SDK changes — covered by the dependent backend story.
- Per-datasource tool selection (selection is per assistant, not per attached datasource).
- New tools, or changes to provider, Git, or MCP tool selection/UI.
- Changes to the workflow YAML setting that excludes default context tools.
- Retroactively enforcing exclusivity on assistants loaded with both variants already selected
  (D9) — enforcement is forward-only, on the next change.

## Open Risks

- The exact field name/shape of the deselected-default-tools field on the assistant payload is
  owned by the backend story; this spec assumes it exists but does not name it, since that
  contract was not available to read at spec time.
- No automated test coverage exists today near `Toolkit.tsx`; `useToolkitSelection.test.ts`
  establishes the pattern (Vitest + RTL `renderHook`) the plan should extend.
