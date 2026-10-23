# Technical Research

**Task**: accessibility screen-reader aria-live search marketplace combobox
**Generated**: 2026-09-03T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8469 [4.1.3] The screen reader does not announce number of search results. Precondition: Screen reader is turned on. Steps to reproduce: 1. Open https://codemie.lab.epam.com/#/assistants. 2. Press Marketplace button. 3. Navigate using Tab key to the search field and type some characters. 4. Listen to the screen reader announcement and observe the text with found results. Actual result: The number of search results changes dynamically, but the screen reader does not announce the updated number. Expected result: The screen reader should announce the updated number of search results. The announcement should also occur when no results are found. Notes/Reproduce: Also reproduces in: 1. Search field in the Project combobox. 2. Search field in the Datasource Context and Sub Assistants comboboxes.

---

## 2. Codebase Findings

### Existing Implementations

Three distinct search surfaces are in scope:

**Surface 1 — Marketplace / Assistants list full-text search**
- `src/components/Filters/Filters.tsx` — sidebar filter panel; owns the text search `<Input>` (line 183–196) with a 1-second debounce via `useDebouncedApply`; triggers `onApply` which propagates to `AssistantFilters` and then to the store
- `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` — wires `Filters` to the store; the `searchKey` value flows into `AssistantFilters`
- `src/pages/assistants/components/AssistantList/AssistantList.tsx` — computes `totalCount` from `pagination.totalCount` and passes it to `AssistantGrid`
- `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx` — renders `totalCountInfo` (e.g., "5 ASSISTANTS") in a plain `<h2>` and "No assistants found." in a `<div>`; no live region, no `Announcement` in scope

**Surface 2 — Project combobox filter input (inside MultiSelect)**
- `src/components/form/MultiSelect/MultiSelect.tsx` — wraps PrimeReact's `<MultiSelect>`; `onFilter` prop fires with the current filter string; `filter={typeof onFilter === 'function'}` enables PrimeReact's built-in search input; result count announcement absent
- `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` — passes `onFilter: handleProjectFilter` which triggers `loadProjectOptions` (async, backend-driven); filtered option list is returned as `resolvedProjectOptions`

**Surface 3 — Datasource Context combobox filter input**
- `src/pages/assistants/components/AssistantForm/components/ContextSelector.tsx` — renders `MultiSelect` with `onFilter={fetchAssistantContextOptions}` in paginated mode; async backend call returns updated `contextOptions` (line 141–165); no announcement of result count

**Surface 4 — Sub-Assistants combobox filter input**
- `src/pages/assistants/components/AssistantSelector.tsx` — renders `MultiSelect` with `onFilter={loadOptions}` backed by `usePaginatedOptions`; paginated, server-side search; no announcement

**Shared announcement infrastructure (already exists)**
- `src/components/Announcement/Announcement.tsx` — `<output aria-live="polite" aria-atomic="true" className="sr-only">`; paired with `useAnnouncementQueue`
- `src/hooks/useAnnouncementQueue.ts` — serializes a queue of messages 1 s apart; clears text before each message so repeated identical text is re-announced
- `src/components/SearchableCombobox/SearchableCombobox.tsx` — custom combobox used for the LLM selector; receives already-filtered `items` from caller; no `items.length` announcement

### Architecture and Layers Affected

| Layer | Components |
|-------|-----------|
| Shared presentation | `src/components/Announcement/Announcement.tsx`, `src/hooks/useAnnouncementQueue.ts` |
| Shared form component | `src/components/form/MultiSelect/MultiSelect.tsx` |
| Shared combobox | `src/components/SearchableCombobox/SearchableCombobox.tsx` |
| Shared filter panel | `src/components/Filters/Filters.tsx` |
| Feature — assistants list | `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx`, `AssistantList.tsx` |
| Feature — datasource context | `src/pages/assistants/components/AssistantForm/components/ContextSelector.tsx` |
| Feature — sub-assistants | `src/pages/assistants/components/AssistantSelector.tsx` |

### Integration Points

- `AssistantsListPage` → `AssistantFilters` → `Filters` (search text) → debounced `onApply` → `assistantsStore.indexAssistants` (API) → `pagination.totalCount` → `AssistantList` → `AssistantGrid` (visual-only `<h2>`)
- `AssistantFilters` → `Filters` (Project `MultiSelect`) → PrimeReact's internal filter input + `onFilter` → `loadProjectOptions` (API) → `resolvedProjectOptions` updated
- `ContextSelector` → `MultiSelect` (onFilter) → `fetchAssistantContextOptions` (API) → `contextOptions` state updated
- `AssistantSelector` → `MultiSelect` (onFilter) → `usePaginatedOptions.loadOptions` (API) → `options` state updated
- All four surfaces update visible item counts asynchronously; screen readers are not notified of these updates

### Patterns and Conventions

- `Announcement` + `useAnnouncementQueue` is the project-standard pattern for polite live-region announcements (used in `ToasterAnnouncer`, `RecordInput`, `FilesDropzone`)
- Tailwind `sr-only` for visually hidden announcement text
- `aria-live='polite'` with `aria-atomic='true'` is the prescribed pattern for non-urgent status updates per `accessibility-patterns.md`
- `useAnnouncementQueue` sets text to empty string before each message to guarantee re-announcement of identical text (e.g., searching returns the same count twice)

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — covers screen reader live regions, `aria-live='polite'` pattern with `aria-atomic='true'`, the `Announcement` component, `sr-only` text, and a full ARIA quick-reference table; directly relevant to this task
- `.ai-run/guides/components/component-patterns.md` — referenced but not separately read; lower priority for this task

### Architectural Decisions

- The guide (§ Screen Reader Patterns) specifies `aria-live='polite'` for non-urgent status messages and `role='alert'`/`aria-live='assertive'` for errors; result count is non-urgent, so polite is correct
- WCAG 4.1.3 is explicitly referenced in the ticket title and in `ToasterAnnouncer` comments, confirming the project targets that success criterion

### Derived Conventions

- An `Announcement` region is rendered inline with or as a sibling of the component that owns the live state (see `RecordInput`, `FilesDropzone`)
- The `useAnnouncementQueue` hook is called at the component level; `announce(message)` is called in `useEffect` triggered by the state that changes (e.g., `items.length`, `totalCount`)
- Message format observed in `ToasterAnnouncer`: short descriptive phrase (not HTML); the `AssistantGrid` already produces `totalCountInfo` in the correct format ("5 ASSISTANTS", "1 TEMPLATE") — same text can be fed to `announce()`

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/Announcement/__tests__/Announcement.test.tsx` — covers: role `status`, `aria-live='polite'`, `aria-atomic='true'`, `sr-only` class, text content, empty region
- `src/components/SearchableCombobox/__tests__/SearchableCombobox.test.tsx` — covers keyboard navigation, `aria-activedescendant`, `aria-selected`, ARIA roles; does NOT test result-count announcement
- `src/components/form/MultiSelect/__tests__/MultiSelect.test.tsx` — covers only controlled-input regression; no filter/search announcement test
- `src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx` — exists (not read in full); likely covers rendering; no known live-region test
- `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` — integration test; likely tests basic rendering and navigation

### Testing Framework and Patterns

- Vitest with React Testing Library (`render`, `screen`, `fireEvent`)
- Two projects: `unit` (fast, Valtio mocked) and `integration` (real Valtio + mocked API)
- Live-region tests use `screen.getByRole('status')` to find `<output aria-live="polite">`
- Announcement tests assert `.toHaveTextContent()` and `.toHaveClass('sr-only')`
- Unit project is appropriate for new announcement tests (no store/API dependency)

### Coverage Gaps

- No test verifies that typing into the Marketplace search field triggers a screen-reader announcement of the result count
- No test verifies that the Project, Datasource Context, or Sub-Assistants `MultiSelect` filter inputs announce filtered result counts
- No test verifies that `AssistantGrid` announces "No assistants found" to screen readers
- No test verifies that `SearchableCombobox` announces item count changes

---

## 5. Configuration and Environment

### Environment Variables

No environment variables specific to this accessibility feature. Search behavior is driven by API responses.

### Configuration Files

No configuration file changes expected for this task.

### Feature Flags and Deployment Concerns

No feature flags govern accessibility live-region behavior. Change is purely additive HTML/ARIA attributes and a React state hook; no deployment concerns beyond normal build and bundle.

---

## 6. Risk Indicators

- **PrimeReact MultiSelect internal filter**: PrimeReact's filter input is rendered inside the component internals. `MultiSelect.tsx` does not have direct access to the count of items after PrimeReact applies its own client-side filter. For non-paginated mode (Project combobox with `filter=true` but no `onFilter`), the count must be estimated by re-filtering `sortedOptions` against the filter string at the `onFilter` callback. For paginated callers (`ContextSelector`, `AssistantSelector`), the count is the length of updated `options` / `contextOptions` after the async call resolves — the announcement must fire after the async update settles, not at the moment `onFilter` fires.
- **Async timing in Marketplace search**: The debounce in `Filters.tsx` is 1 second; the API call adds additional latency. `totalCount` only becomes correct after the API response. The announcement must be triggered by `totalCount` or `assistants.length` stabilising (i.e., in a `useEffect` watching those values), not on the search input change itself. Announcing during loading would produce incorrect counts.
- **"No results" edge case**: `AssistantGrid` renders "No assistants found." in a plain `<div>` (not an `Announcement`). This path requires explicit handling — the announcement must also fire when `totalCount === 0` or `assistantList.length === 0`.
- **Duplicate announcement risk**: `totalCount` is updated on every page change, not only on search. An effect that announces on every `totalCount` change would announce on pagination clicks too. A guard (e.g., only announce when a search/filter term is active, or always announce but accept this behaviour) should be deliberate.
- **`useAnnouncementQueue` gapMs default is 1 000 ms**: If the debounce + API round-trip is under 1 second, announcements may queue rather than fire promptly. The default gap is appropriate for toast messages but may feel delayed for search results; callers can override `gapMs`.
- **No existing test for announcement on search**: A test will require either a shallow render with a mocked debounce or a fake timer. `AssistantsListPage.integration.test.tsx` may need updating if it asserts the exact DOM of the grid.

---

## 7. Summary for Complexity Assessment

The task touches three architectural layers: a shared reusable form component (`MultiSelect`), a shared combobox (`SearchableCombobox`), and a feature-level list view (`AssistantGrid`/`AssistantList`). The fix in each location follows the same well-established project pattern — `useAnnouncementQueue` + `Announcement` — which is already documented in the accessibility guide and used in three other components. The infrastructure requires no new dependencies and no new files; only additive changes to existing components.

The primary technical complexity is **async timing**: all four search surfaces trigger asynchronous operations before a result count is available. The announcement must be wired to the state that reflects settled results (`totalCount`, `options.length`, `contextOptions.length`), not to the search input event. For `MultiSelect` in paginated mode, the parent component holds the options state post-API-call, so the child cannot self-announce without a prop (e.g., an `announcementText` prop surfaced from the caller, or a `resultCount` prop) or an effect in the owning component. This creates a design choice: announce inside `MultiSelect`/`ContextSelector`/`AssistantSelector` by watching option arrays, or add a generic `resultAnnouncement` prop to `MultiSelect` that callers populate after their async calls complete.

Test coverage for this feature is absent. Three new unit-test files (or additions to existing files) are needed: one for `AssistantGrid` announcing the total count, one for `MultiSelect` filter result announcement, and one for `SearchableCombobox` item-count change announcement. The tests are straightforward with React Testing Library and `getByRole('status')`.

---

## 8. External References

None named by the task.
