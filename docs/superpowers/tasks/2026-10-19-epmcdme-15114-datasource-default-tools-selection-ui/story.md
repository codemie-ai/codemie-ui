# UI: Show, Pre-select and Deselect Datasource Default Tools — Story

**Date**: 2026-10-16
**Status**: Approved
**Ticket**: —
**Parent**: ../../story.md
**Feature**: datasource-default-tools-selection
**Depends on**: Backend story (../datasource-default-tools-selection-backend/story.md)

---

## Context

- The assistant form lists Codebase Tools ("Get Repo Tree with filtering", "Search Code with filtering", "Read Files", "Read Files with Summary", "Search Code by Paths") but not the standard "Get Repo Tree" and "Search Code", and has no Knowledge Base tools group. Nothing is pre-selected when a datasource is attached.
- The form builds its tools list from the backend tool listing, so the backend story must list the default tools first.
- The assistant form and the virtual assistant form (used for assistants defined inside workflows) both manage tool selection.
- The form shows a tool as selected when it appears in the assistant's selected tools. The default tools will instead be shown as selected unless the assistant records them as deselected.
- The tools selection component has little or no automated test coverage today.

---

## Complexity

**Size**: M (19/36) · **Recommended flow**: sdlc-standard

The tools panel, datasource selector, two forms and the store change, with shared selection logic. There is no precedent for auto-select or exclusivity, and no automated coverage near the tools component.

---

## Story

**As an** assistant author, **I want** the tools a datasource adds to be visible and pre-selected in the assistant's tools list and to be deselectable like any other tool, **so that** I can stop the assistant from using expensive tools such as the repository tree without system-prompt workarounds.

---

## Background

Authors cannot currently see or remove the tools that attaching a datasource adds. For large repositories this forces authors into fragile prompt instructions while the tool and its "call me first" description still reach the model.

---

## Acceptance Criteria

- [ ] Given an author opens the tools list of an assistant, when they view Codebase Tools, then "Get Repo Tree" and "Search Code" (standard) are listed alongside the "with filtering" variants and the other code tools.
- [ ] Given an author opens the tools list of an assistant, when they view the Knowledge Base tools, then "Search Knowledge Base" is listed.
- [ ] Given an assistant with no code datasource, when the author attaches a code datasource, then "Get Repo Tree" and "Search Code" (standard) become selected automatically.
- [ ] Given an assistant with no knowledge base datasource, when the author attaches a knowledge base datasource, then "Search Knowledge Base" becomes selected automatically.
- [ ] Given an author previously deselected a default tool, when they attach an additional datasource of the same type, then the deselected tool is not re-selected.
- [ ] Given an author selects "Get Repo Tree with filtering", when the selection changes, then standard "Get Repo Tree" is deselected, and vice versa; the same applies to "Search Code" and "Search Code with filtering". Deselecting both is allowed.
- [ ] Given an author deselects a default tool and saves, when they reopen the assistant, then the tool is shown as deselected; and given an assistant created before this change, when it is opened, then its default datasource tools are shown as selected.
- [ ] Given an author edits an assistant inside a workflow (virtual assistant form), when they attach a datasource or change default tools, then the same listing, pre-selection and exclusivity rules apply.
- [ ] Given the backend rejects a save (for example because of an unknown tool name in the deselected list), when the author saves, then the error message is shown and the form keeps the author's changes.

---

## Out of Scope

- Backend behaviour and SDK changes (separate stories).
- Per-datasource tool selection.
- New tools, or changes to provider, Git or MCP tool selection.
- Changes to the workflow YAML setting that excludes default context tools.

---

## Decisions

- D4: "Search Knowledge Base" has been absent from the UI tools list with no documented reason; is it safe to add? → Yes. Proceed; all datasource tools become visible in the list. — user
- D8: When the last datasource of a type is removed, should the form clear that type's default tools? → No. The deselected list is left as is; it is per assistant and applies again if a datasource of that type is attached. — proposed by PO: consistent with a deselected tool not being re-selected when another datasource is attached
- D9: If a stored assistant contains both the standard and the "with filtering" variant, what does the form show? → Both as stored (selected); choosing either one then deselects the other. — proposed by PO: follows parent D1, where both can coexist today
- D10: Should deselecting "Get Repo Tree" show a warning? → No. It works like deselecting any other tool. — proposed by PO: the story asks for plain deselection

---

## Open Questions

- None
