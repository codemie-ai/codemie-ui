# Spec — Restore 44px height in AssistantSelector dropdown

- **Jira Ticket:** EPMCDME-14073
- **Type:** Bug fix (presentation)
- **Branch:** `EPMCDME-14073/fix-placeholder`

## Problem

The shared assistant picker renders below the `44px` height the design system defines for
`size="medium"` form controls. The placeholder is clipped against the field border and the field is
visibly out of line with the sibling `Select Datasource Context` control. Users see a cramped,
mis-aligned field on the Create Assistant form and in the Attach to Assistants modal.

## Goal

The assistant picker renders at its specified `44px` height in every surface that uses it, with the
placeholder vertically centred, and keeps filling the available width.

## Non-goals

- Redesigning `MultiSelect` or changing how it forwards `className` to its two render targets. That
  leak is the underlying cause but its blast radius is the entire application — tracked as a
  follow-up.
- The workflow-local `src/pages/workflows/editor/configPanels/components/AssistantSelector.tsx`,
  which is a separate component and is not affected.
- Any change to option loading, filtering, pagination, selection or validation behaviour.

## Acceptance criteria

| # | Criterion |
|---|---|
| AC-1 | The picker on Create Assistant → Sub-Assistants renders at `44px`, matching the `Select Datasource Context` field above it. |
| AC-2 | The picker in the Skill Details → Attach to Assistants modal renders at `44px`. |
| AC-3 | The placeholder text is vertically centred and not clipped in both surfaces. |
| AC-4 | The control still occupies the full available width of its container. |
| AC-5 | Dropdown behaviour is unchanged: opening, filtering, scroll-to-load-more, multi-select checkboxes, single-value mode, disabled state, error display. |
| AC-6 | The remaining three consumers (`AssistantMultiSelectField`, `GuardrailAssignmentEntitySelector`, `AssistantForm`) show no layout regression. |
| AC-7 | Lint, type-check and the unit suite stay green. |

## Out of scope / accepted debt

`MultiSelect` applies the caller's `className` to both its outer wrapper and the inner PrimeReact
root (`MultiSelect.tsx:352` and `:391`). Any layout class a caller passes is therefore applied twice,
in two different flex contexts. This fix works around that; it does not remove it.
