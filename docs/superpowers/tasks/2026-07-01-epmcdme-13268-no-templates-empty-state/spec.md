# EPMCDME-13268: Templates empty state shows "No assistants found"

Jira: https://jiraeu.epam.com/browse/EPMCDME-13268

## Problem

The Templates page (Assistants → Templates tab) shows the generic message
"No assistants found." when no templates are available, instead of a
templates-specific message. This is misleading because the user is viewing
the Templates area, not the Assistants list.

## Root cause

`AssistantGrid` (`src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx`)
renders a hardcoded `<h2>No assistants found.</h2>` whenever the current list
is empty, regardless of the `isTemplate` prop already passed into the
component (and already used a few lines above to build the pluralized
`totalCountInfo` string).

`isTemplate` is only `true` when `AssistantsListPage` is rendering the
`AssistantTab.TEMPLATES` tab; Project Assistants (`ALL`), `Marketplace`, and
`Favorites` all pass `isTemplate={false}`.

## Fix

Make the empty-state message conditional on the existing `isTemplate` prop:

```tsx
if (assistantList.length === 0) {
  return (
    <div className="flex justify-center m-40">
      <h2>{isTemplate ? 'No templates found.' : 'No assistants found.'}</h2>
    </div>
  )
}
```

Also drop the redundant `<>...</>` fragment wrapper around the single `div`
(no longer needed once there's only one child).

## Why this satisfies the acceptance criteria

- **Templates-specific message:** `isTemplate` is scoped exactly to the
  Templates tab, so the new text only appears there.
- **No regression on other Assistants sections:** Project Assistants,
  Marketplace, and Favorites all pass `isTemplate={false}` and keep rendering
  "No assistants found." unchanged.
- **Covers both zero-results and filtered-empty-results:** the branch fires
  whenever `assistantList.length === 0`, which is the same code path for an
  empty catalog and for a filter that matches nothing — no extra logic
  needed.

## Out of scope

- No i18n/translation keys — this codebase hardcodes empty-state copy as JSX
  string literals throughout (e.g. `MCPEmptyState.tsx`); this fix follows
  that existing convention.
- No change to Marketplace or Favorites empty-state copy.
- No new shared "empty state" abstraction (message-lookup map or dedicated
  subcomponent) — not justified for a two-branch text decision.

## Testing

- New `AssistantGrid.test.tsx` (none exists today): asserts "No assistants
  found." when `isTemplate=false` and list is empty, and "No templates
  found." when `isTemplate=true` and list is empty.
- Existing `AssistantsListPage.integration.test.tsx` test `shows empty state
  when no assistants found` (PROJECT/ALL tab, `isTemplate=false`) must still
  pass unmodified.
