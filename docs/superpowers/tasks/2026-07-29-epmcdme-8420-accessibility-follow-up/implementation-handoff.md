# EPMCDME-8420 Accessibility Follow-up — Implementation Handoff

## Purpose

Use this document as the starting point for a code-change session following the review of GitLab MR 1595.

This document intentionally contains only remaining change recommendations and verification work. It does not summarize completed work.

## Context and assumptions

- The affected shared control is `src/components/NavigationMore/NavigationMore.tsx`.
- A contextual menu trigger is intended to have an accessible name in the form `More options <context>` when a meaningful entity context exists.
- Action-specific controls may use a direct accessible label such as `Export diagram`, `Export message`, or `Remove execution`.
- Jira EPMCDME-8420 could not be retrieved through the Jira datasource during review. Confirm the exact naming convention with the ticket or product/accessibility owner if its acceptance criteria differ from the convention above.
- Do not change React `useId()` IDs merely because they contain colons. They are valid HTML IDs and valid ARIA ID references. If a CSS selector is ever built from one, escape it with `CSS.escape()`; prefer `document.getElementById()` for ID lookup.

## Required change 1: repair the `AssistantMenu` accessibility test fixture

### File

`src/pages/assistants/AssistantActions/components/__tests__/AssistantMenu.test.tsx`

### Problem

The contextual test passes `contextId="test-context-id"` without rendering an element whose `id` is `test-context-id`. The test validates only the raw `aria-labelledby` string, so it permits a dangling ARIA reference.

### Change

Render a real context target alongside `AssistantMenu`:

```tsx
render(
  <>
    <span id="test-context-id">Test Assistant</span>
    <AssistantMenu actions={mockActions} contextId="test-context-id" />
  </>
)
```

Then assert all of the following:

```tsx
const trigger = screen.getByRole('button', {
  name: 'More options Test Assistant',
})

expect(document.getElementById('test-context-id')).toBeInTheDocument()
expect(trigger).not.toHaveAttribute('aria-label')
expect(trigger).toHaveAttribute(
  'aria-labelledby',
  `${trigger.id} test-context-id`
)
```

Use the exact capitalization produced by the component if it differs from the example.

### Definition of done

- The test renders the referenced target.
- The test verifies the computed accessible name through `getByRole`.
- The test verifies exact `aria-labelledby` token order.
- The test verifies that contextual mode does not retain `aria-label`.

## Required change 2: standardize contextual menu-trigger naming

### Decision to confirm

Choose and apply one convention for entity action menus:

```text
More options <entity name>
```

If EPMCDME-8420 requires only a unique name and explicitly permits an entity name without the action, document that decision before retaining the mixed implementation.

### Callers to review

The following callers currently use entity text through `data-tooltip-content` and should be evaluated for migration to `contextId`:

- `src/pages/workflows/components/WorkflowsList.tsx`
- `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerCard.tsx`
- `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerDetail.tsx`
- `src/pages/integrations/components/UserSettings/UserSettings.tsx`
- `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx`

### Preferred implementation

When an existing entity-name element is present, assign it a stable unique ID and pass the same value to `NavigationMore`:

```tsx
const contextId = `entity-name-${entity.id}`

<span id={contextId}>{entity.name}</span>
<NavigationMore contextId={contextId} items={items} />
```

When the visible name is truncated, do not make the truncated text the only accessible context. Either:

1. add a visually hidden element containing the full name and reference it; or
2. ensure the referenced element exposes the full accessible text without duplicating the spoken name.

When the name and action are rendered in separate table-cell callbacks, derive the same ID from a stable row identifier in both callbacks. Do not use the array index when a stable entity ID is available.

### Fallback behavior

Keep direct `data-tooltip-content` labels for controls whose label describes the action itself, for example:

```tsx
<NavigationMore data-tooltip-content="Export diagram" ... />
<NavigationMore data-tooltip-content="Export message" ... />
<NavigationMore data-tooltip-content="Remove execution" ... />
```

Do not replace a clear action label with `More options` plus unrelated context.

### Empty-value handling

Any generated context must be non-empty. Use a domain-appropriate fallback where entity names can be absent, for example:

```tsx
const accessibleName = item.name?.trim() || 'Data source'
```

Do not create an empty target referenced by `aria-labelledby`.

### Definition of done

- Every entity action menu follows the agreed naming convention.
- Every `contextId` resolves to exactly one mounted element when the trigger is mounted.
- Context IDs are unique among simultaneously rendered rows/cards.
- Stable entity identifiers are used instead of list indexes where available.
- Truncated visible labels do not cause truncated accessible names.
- Action-specific fallback labels remain descriptive and non-empty.

## Required change 3: add caller-level accessibility coverage

Shared `NavigationMore` tests do not detect caller typos between an element `id` and its `contextId`. Add representative integration tests for each caller-wiring pattern below.

### Pattern A: component-local hidden or visible context

Add or update tests for at least one component from this group:

- `src/pages/assistants/AssistantActions/AssistantActions.tsx`
- `src/pages/workflows/components/WorkflowActions.tsx`
- `src/pages/skills/components/SkillActions.tsx`
- `src/pages/skills/components/SkillDetailsActions.tsx`
- `src/pages/katas/components/KataActions.tsx`
- `src/pages/dataSources/components/DataSourceActions.tsx`
- `src/pages/settings/administration/components/ProviderActions.tsx`
- `src/pages/settings/administration/components/MCPServerActions.tsx`

The test must use the real `NavigationMore` component and verify:

```tsx
const trigger = screen.getByRole('button', {
  name: `More options ${entityName}`,
})
const labelledBy = trigger.getAttribute('aria-labelledby')
const [, contextId] = labelledBy!.split(/\s+/)

expect(document.getElementById(contextId)).toBeInTheDocument()
expect(trigger).not.toHaveAttribute('aria-label')
```

Also assert the exact two-token order where the IDs are deterministic enough to do so.

### Pattern B: name and action in separate table columns

Add or update tests for representative pages from this group:

- `src/pages/settings/administration/BudgetsManagementPage.tsx`
- `src/pages/settings/administration/CostCentersManagementPage.tsx`
- `src/pages/settings/administration/UsersManagementPage.tsx`
- `src/pages/settings/administration/CategoriesManagementPage.tsx`
- `src/pages/integrations/components/UserSettings/UserSettings.tsx`
- `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx`

Render at least two rows and verify for each menu trigger:

- the computed accessible name contains the correct row entity;
- the `aria-labelledby` target exists;
- the target belongs to the same row/entity as the trigger;
- context IDs are unique;
- one row never references another row’s name.

Prefer role/name queries over selectors such as `button[aria-haspopup]` when a computed accessible name is available.

### Pattern C: direct action-label fallback

Add or update tests for at least one direct action label, such as:

- Mermaid diagram export;
- AI-message export;
- workflow-execution removal.

Verify the trigger by role and accessible name:

```tsx
expect(
  screen.getByRole('button', { name: 'Export diagram' })
).toBeInTheDocument()
```

Also verify that fallback mode does not set `aria-labelledby` unless a real context target is supplied.

### Pattern D: multiple contextual instances

In at least one list/card test, render two entities and verify:

```tsx
const first = screen.getByRole('button', {
  name: 'More options First entity',
})
const second = screen.getByRole('button', {
  name: 'More options Second entity',
})

expect(first.id).not.toBe(second.id)
expect(first.getAttribute('aria-labelledby')).not.toBe(
  second.getAttribute('aria-labelledby')
)
```

Resolve both context IDREFs with `document.getElementById()` and assert their text belongs to the corresponding entity.

### Definition of done

- Tests cover component-local context, separate table-cell context, direct action fallback, and multiple instances.
- Contextual tests use the real `NavigationMore` for final accessible-name verification.
- No test passes a `contextId` without mounting its target unless the test explicitly verifies invalid input handling.
- Tests verify computed names with `getByRole` in addition to raw ARIA attributes.
- Tests fail for a missing target, swapped target, duplicate ID, reversed IDREF order, retained contextual `aria-label`, or empty fallback label.

## Optional hardening: folder relationship tests

### Files

- `src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderList.test.tsx`
- `src/pages/chat/components/ChatSidebar/__tests__/FolderList.test.tsx`

### Add coverage for

1. Two folder names that normalize to the same slug, for example `A/B` and `A-B`.
2. Unique folder-name IDs and group IDs for all rendered folders.
3. Every `aria-labelledby` target exists and contains the expected folder name.
4. Every `aria-owns` target exists and corresponds to the same folder.
5. Insertion/reordering behavior, if stable identity across reordering is an acceptance criterion.

### Important ambiguity

The current composite key includes `folderIndex`. It therefore changes when an earlier folder is inserted, removed, or reordered. If stable identity across those operations is required, replace the index-based key with a stable folder identifier from the data model. If no folder ID exists and folder names are guaranteed unique, use a collision-safe encoding of the complete folder name rather than a lossy slug. Do not introduce a generated ID in a map loop unless component boundaries and React keys preserve the association correctly.

## Verification commands

Run the repository’s existing commands for:

1. targeted unit tests for every modified test file;
2. the complete unit-test suite;
3. type checking;
4. linting;
5. any configured accessibility or UI sanity suite.

Record the exact commands and results in the implementation session or merge request. Do not claim passing gates without executing them.

## Final acceptance checklist

- [ ] The intended accessible-name convention is confirmed.
- [ ] Entity menu triggers expose `More options <full entity name>` where that convention applies.
- [ ] Action-specific triggers retain direct action labels.
- [ ] Every contextual `aria-labelledby` IDREF resolves to a mounted, unique target.
- [ ] Contextual triggers do not retain `aria-label`.
- [ ] Context IDREF token order is trigger ID first, context ID second.
- [ ] Empty and truncated entity names are handled accessibly.
- [ ] At least two simultaneous menu instances are tested.
- [ ] Separate table-column wiring is tested.
- [ ] Direct fallback labeling is tested.
- [ ] The `AssistantMenu` test no longer uses a dangling context target.
- [ ] Targeted and full validation commands have been executed and recorded.
