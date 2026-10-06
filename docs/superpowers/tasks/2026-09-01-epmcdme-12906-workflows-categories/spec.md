# EPMCDME-12906 — Workflow Categories: Form Field + Sidebar Filter

**Date:** 2026-09-01
**Scope:** Frontend only

---

## Goal

Add an optional Categories field to the Workflow create/edit form (same UX as Assistant Categories),
and expose a Categories filter in the My Workflows and All Workflows sidebar. Both surfaces reuse
existing infrastructure: the `MarketplaceCategories` component, `assistantsStore.assistantCategories`,
and the already-wired `categories` filter definition in `WorkflowsFilters`.

---

## Background

The workflow form has no categories field today. The sidebar filter definition for categories is
already declared in `WorkflowsFilters.tsx` and wired to URL sync, store dispatch, and pagination
reset — but it is hard-gated off for every scope except `'marketplace'`. Both additions are
therefore largely un-gating and wiring work rather than net-new logic.

---

## Design

### Part 1 — Categories field in the workflow form

**`WorkflowFormValues` / `baseWorkflowSchema`** (`workflowSchema.ts`)
Add `categories?: string[]` to the interface and a corresponding optional Yup array field with
`.default([])`. The `.default([])` ensures an untouched field submits an empty array rather than
`undefined`, which is consistent with how the API treats "no categories selected".

**`Workflow` type** (`src/types/entity/workflow.ts`)
Add explicit `categories?: string[]` alongside the existing index signature. This makes the
field visible to TypeScript consumers without relying on the catch-all key.

**`WorkflowFormFields.tsx`**
Add a `Controller`-wrapped `MarketplaceCategories` field immediately after the `icon_url` field.
Follow the same `Controller` pattern used by every existing field in this component. Pass
`defaultValue={[]}`. No label customisation is needed — `MarketplaceCategories` renders its own
label, loading state, and max-3 enforcement inline.

**`WorkflowForm.tsx`**
Add `categories: []` to the initial `workflowFields` state object and include `categories` in the
`getFormValues()` snapshot. Once present in the snapshot it is automatically included in every
`createWorkflow` / `updateWorkflow` call because the store passes the payload verbatim.

**Visual editor path — `ConfigPanel` / `GeneralConfigTab`**
`WorkflowFormValues` is shared with `ConfigPanel.getWorkflowFields()`. Extending the interface
makes `categories` structurally available, but the `GeneralConfigTab` form must also render the
`MarketplaceCategories` field so the value actually populates. This is the same `Controller` +
`MarketplaceCategories` addition as in `WorkflowFormFields`, placed after `icon_url`.
Without this update the visual editor will silently discard categories on save.

**Persisted value on reopen / edit**
The form initialises from the workflow object passed as `defaultValues`. Because `categories` will
now appear in `WorkflowFormValues`, `react-hook-form` will populate the field from
`workflow.categories` on edit — no extra wiring is needed beyond adding the field.

### Part 2 — Categories filter in My Workflows / All Workflows sidebar

**`WorkflowsFilters.tsx`**
Two changes:

1. In the `.filter()` predicate that builds the visible filter list, remove the guard
   (`if (definition.name === 'categories') { return false }`) for the `'my'` and `'all'` scopes.
   The `'favorites'` scope stays gated — it is not named in the ticket and enabling it there is
   out of scope.

2. In the `useEffect` that loads category data, extend the condition so
   `assistantsStore.getAssistantCategories()` is also called when `scope === 'my'` or
   `scope === 'all'`. Without this call `assistantCategories` stays empty and the filter renders
   with no choices — a silent runtime failure.

No changes to `workflowsStore.indexWorkflows`: it already serialises `workflowsFilters` (including
the `categories` key from `INITIAL_WORKFLOWS_FILTERS`) and passes it to the API.

---

## Acceptance Criteria

1. The Workflow Configuration section of both the create and edit workflow forms contains a
   Categories multi-select field positioned immediately below the Icon URL field.
2. The field is optional (zero selections permitted) and enforces a maximum of 3 selected categories.
3. On edit, the field is pre-populated with the workflow's saved categories.
4. Submitting the form includes `categories` in the POST/PUT payload (empty array when none selected).
5. The My Workflows sidebar shows a Categories filter containing the same options as the
   Marketplace categories list.
6. The All Workflows sidebar shows the same Categories filter.
7. Selecting one or more category values in the filter narrows the workflow list to workflows that
   carry at least one of the selected categories; workflows with no categories are excluded.
8. Clearing the filter (deselecting all values) restores the unfiltered list.
9. The visual editor's Config Panel persists categories on save with identical behaviour to the
   text-editor path.

---

## Non-Goals

- Adding a Categories filter to the Favorites (`favorites` scope) workflow view.
- Creating a new categories store or any workflow-specific categories API — `assistantsStore` is
  the sole data source.
- Displaying category labels/chips anywhere outside the form field and sidebar filter (e.g., on
  workflow cards or the workflow detail header).
- AI-generated category suggestion (the `isAIGenerated` prop on `CategoriesField` is assistant-only).
- Server-side changes — the API contract (POST/PUT accepting `categories: string[]`;
  GET accepting `filters={categories:[...]}`) is assumed complete.
- Migrating existing workflows to add default categories.

---

## Files Touched

| File | Change |
|---|---|
| `src/types/entity/workflow.ts` | Add `categories?: string[]` |
| `src/pages/workflows/components/workflowSchema.ts` | Add to interface + Yup schema with `.default([])` |
| `src/pages/workflows/components/WorkflowFormFields.tsx` | Add `Controller` + `MarketplaceCategories` after `icon_url` |
| `src/pages/workflows/components/WorkflowForm.tsx` | Add `categories: []` to state; include in `getFormValues()` |
| `src/pages/workflows/editor/ConfigPanel.tsx` (GeneralConfigTab) | Render `MarketplaceCategories` field after `icon_url` |
| `src/pages/workflows/components/WorkflowsFilters.tsx` | Remove `my`/`all` guard; add `getAssistantCategories()` call |
| `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` | Assert categories field renders |
| `src/pages/workflows/components/__tests__/WorkflowsFilters.test.tsx` | Assert categories filter visible for `my`/`all` scopes |

---

## Decisions

- **`MarketplaceCategories` directly over `CategoriesField` wrapper** — `CategoriesField` adds only
  the `isAIGenerated` prop which is irrelevant for workflows.
- **`favorites` scope stays gated** — the ticket names only My Workflows and All Workflows;
  un-gating `favorites` would be scope creep.
- **`.default([])` on Yup schema** — ensures empty-selection submits `[]` not `undefined`,
  consistent with API semantics and with how the filter initial state already works.
- **No new categories store** — `assistantsStore` is already the shared source used by both
  assistant and workflow surfaces.
