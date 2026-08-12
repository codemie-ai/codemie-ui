# EPMCDME-8420 Accessibility Follow-up — Spec

## Context

A post-review continuation of the EPMCDME-8420 accessibility branch. The MR
review identified four categories of remaining work after the initial `contextId`
wiring was merged:

1. The `AssistantMenu` test had a dangling `aria-labelledby` reference — no mounted
   context target in the test fixture.
2. Five callers still used `data-tooltip-content` for entity names instead of the
   `contextId` pattern.
3. The Pattern B and C accessibility tests were synthetic (testing `NavigationMore`
   directly) rather than testing real production wiring.
4. `FolderList` used an index-prefixed, lossy-slug key that changed on
   reorder/insertion and collided for names like "A/B" and "A-B".

## Acceptance criteria

### AssistantMenu test

- The contextual test renders `<span id="test-context-id">Test Assistant</span>`
  alongside `<AssistantMenu contextId="test-context-id" />`.
- Assertions verify the full computed accessible name via `getByRole`.
- Assertions verify `aria-label` is absent and `aria-labelledby` token order is
  trigger-id first, context-id second.

### Caller migration

Five callers migrated from `data-tooltip-content` entity name to `contextId`:

- `WorkflowsList.tsx` — sr-only span + `workflow-name-${workflow.id}`
- `MCPServerCard.tsx` — `useId()` wired to existing `<h4>` element
- `MCPServerDetail.tsx` — `useId()` + sr-only span inside `!isUnavailable` branch
- `UserSettings.tsx` — sr-only span + `user-setting-name-${item.id}`
- `ProjectSettings.tsx` — sr-only span + `project-setting-name-${item.id}`

Action-specific labels (e.g. "Export diagram", "Export message") are not migrated
and retain their `data-tooltip-content` direct label.

### Real caller tests

**Pattern B** replaced by `UserSettings.accessibility.test.tsx`:
- Mocks `Table` to invoke the production `actions` column renderer for two rows;
  uses real `NavigationMore`.
- Verifies "More options GitHub Token" and "More options jira" computed names.
- Verifies unique context targets, no retained `aria-label`, exact token order,
  no cross-row referencing.

**Pattern C** replaced by `MermaidDiagram.accessibility.test.tsx`:
- Mocks `filesStore.getMermaidFile`; uses fake timers past the 300 ms debounce.
- Uses real `NavigationMore`; verifies "Export diagram" accessible name.
- Verifies `aria-label`, no `aria-labelledby`, `aria-haspopup=menu`.

### FolderList ID hardening

`folderKey` changed from `${folderIndex}-${lossy-slug}` to `encodeURIComponent(folder)`:
- Collision-safe: "A/B" → `A%2FB`, "A-B" → `A-B`.
- Stable across folder insertion and reordering (key does not include array index).
- Production ID scheme:
  - `folder-name-${encodeURIComponent(folder)}`
  - `chat-tree-folder-group-${encodeURIComponent(folder)}`

`getElementById` resolves encoded IDs correctly. `querySelector` with `%` in
attribute values is unreliable in JSDOM; tests use `getAllByTestId + getAttribute`
to avoid that selector.

### FolderList tests

**Lower-level test** (`FolderList/__tests__/FolderList.test.tsx`):
- Stubs `primereact/accordion` to always render content; stubs `ChatList` with
  `({ id }) => <ul id={id} role="group" />` to keep group elements in DOM.
- Collision tests: exact `aria-labelledby` token order, context target text,
  group existence and `role="group"`, unique IDs, no cross-folder referencing.
- Stability tests: Work folder retains `folder-name-Work` and
  `chat-tree-folder-group-Work` across insert and reorder rerenders, verified via
  `getByRole` and `getElementById`.

**Higher-level test** (`ChatSidebar/__tests__/FolderList.test.tsx`):
- Updated `aria-owns` assertions to encoded-name format.
- Added A/B vs A-B encoded `aria-owns` uniqueness assertion.

## Non-goals

- No change to `NavigationMore` component logic or props.
- No `contextId` migration for action-specific labels.
- No changes to other EPMCDME-8420 callers that were already correctly wired.
