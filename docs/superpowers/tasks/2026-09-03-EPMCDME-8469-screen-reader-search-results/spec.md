# Spec: EPMCDME-8469 — Screen Reader Search Result Announcements

**Status**: Draft  
**Generated**: 2026-09-03  
**Ticket**: EPMCDME-8469 [WCAG 4.1.3]

---

## Problem

Four search surfaces update result counts asynchronously but never notify screen readers of the change, violating WCAG 4.1.3 (Status Messages). The count text is visible but lives in a plain `<h2>` or `<div>` — no live region, no `Announcement` — so assistive technology receives no signal.

Affected surfaces:
1. Marketplace / Assistants full-text search (`AssistantGrid`)
2. Project filter combobox (`MultiSelect` inside `AssistantFilters`)
3. Datasource Context combobox (`ContextSelector`)
4. Sub-Assistants combobox (`AssistantSelector`)

---

## Approach

Use the existing `useAnnouncementQueue` + `Announcement` pattern, which is already in use in `ToasterAnnouncer`, `RecordInput`, and `FilesDropzone`. No new dependencies. No new files.

Announcements are wired at each surface's **owning component**, not inside the shared `MultiSelect`. This follows the project convention (announcement logic lives with the state that drives it) and avoids changing the API of a widely-used shared component.

Each announcement is triggered by a `useEffect` that watches the **settled result state** (post-API `totalCount` or options array length), not the raw input event. This naturally handles async timing for all four surfaces.

---

## Per-Surface Design

### Surface 1 — Marketplace / AssistantGrid

`AssistantGrid` receives a new optional boolean prop `hasActiveFilter` from `AssistantList`. `AssistantList` derives this from whether any search term or filter is currently active in the store state it already holds.

Inside `AssistantGrid`:
- Call `useAnnouncementQueue()`.
- Render `<Announcement>` as a sibling to the existing count `<h2>`.
- `useEffect` watches `[totalCount, hasActiveFilter]`. When `hasActiveFilter` is true and `totalCount` updates, call `announce(totalCountInfo)` (the string already computed, e.g. `"5 ASSISTANTS"`). When `totalCount` is 0 and `hasActiveFilter` is true, announce `"No assistants found"`.
- When `hasActiveFilter` is false (no search active), the effect returns early — no announcement fires on pagination.

Reference: `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx` (totalCountInfo at render, `<h2>` with no live region); `AssistantList.tsx` (totalCount from pagination).

### Surface 2 — Project Filter (AssistantFilters)

`AssistantFilters` already has access to `resolvedProjectOptions` (the post-API filtered list) and fires `handleProjectFilter` on every filter keystroke.

Add to `AssistantFilters`:
- A `projectFilterTerm` ref that stores the current filter string, updated inside `handleProjectFilter`.
- `useAnnouncementQueue()` + `<Announcement>` adjacent to the Project `MultiSelect`.
- `useEffect` watching `resolvedProjectOptions`. When `projectFilterTerm.current` is non-empty, announce `"${resolvedProjectOptions.length} results found"` or `"No results found"`.

Reference: `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx`.

### Surface 3 — Datasource Context (ContextSelector)

`ContextSelector` holds `contextOptions` in state and updates it after each `fetchAssistantContextOptions` call. A `filterTerm` state variable (or ref) already tracks or can track the current filter string from the `onFilter` callback.

Add to `ContextSelector`:
- `useAnnouncementQueue()` + `<Announcement>` adjacent to the context `MultiSelect`.
- `useEffect` watching `contextOptions`. When `filterTerm` is non-empty, announce count or "No results found".

Reference: `src/pages/assistants/components/AssistantForm/components/ContextSelector.tsx` (contextOptions state, onFilter at line 141–165).

### Surface 4 — Sub-Assistants (AssistantSelector)

`AssistantSelector` uses `usePaginatedOptions`; the resolved `options` array updates after each `loadOptions` call.

Add to `AssistantSelector`:
- A `filterTerm` ref updated in the `onFilter` handler passed to `MultiSelect`.
- `useAnnouncementQueue()` + `<Announcement>` adjacent to the sub-assistants `MultiSelect`.
- `useEffect` watching `options`. When `filterTerm.current` is non-empty, announce count or "No results found".

Reference: `src/pages/assistants/components/AssistantSelector.tsx`.

---

## Announcement Message Format

| Surface | Found message | Empty message |
|---------|--------------|---------------|
| Marketplace | reuse `totalCountInfo` (e.g. `"5 ASSISTANTS"`) | `"No assistants found"` |
| Project filter | `"N results found"` | `"No results found"` |
| Datasource Context | `"N results found"` | `"No results found"` |
| Sub-Assistants | `"N results found"` | `"No results found"` |

All announcements use `aria-live="polite"` / `aria-atomic="true"` via `Announcement`, consistent with the project accessibility guide.

---

## Acceptance Criteria

1. Typing into the Marketplace search field causes the screen reader to announce the result count (e.g. "5 ASSISTANTS") after the API response settles, with no announcement before the API responds.
2. When the Marketplace search yields zero results, the screen reader announces "No assistants found".
3. Paginating the Assistants list when no search term is active does NOT trigger any announcement.
4. Typing into the Project combobox filter causes the screen reader to announce the count of matching project options after the async call resolves.
5. Typing into the Datasource Context combobox filter causes the screen reader to announce the count of matching context options.
6. Typing into the Sub-Assistants combobox filter causes the screen reader to announce the count of matching sub-assistant options.
7. When any combobox filter yields zero results, the screen reader announces "No results found".
8. Searching for the same term twice in sequence causes two announcements (guaranteed by `useAnnouncementQueue` clearing text before re-announce).
9. The visual appearance of all four surfaces is unchanged.

---

## Non-Goals

- Changing the `MultiSelect` component's public API or internal rendering.
- Announcing "loading" or "searching" spinner states during the async fetch.
- Announcing result counts in surfaces outside the four named (e.g. `SearchableCombobox` LLM selector).
- Changing debounce timing in `Filters.tsx`.
- Any announcement on pagination (page-forward, page-back).
- Announcing filter state changes for filter chips or category toggles.
- Adding new npm dependencies.
- Changing any visual styles or layout.

---

## Testing

New tests use the `unit` Vitest project with React Testing Library. Live-region assertions use `screen.getByRole('status')` (matching `<output aria-live="polite">`).

| File | Scenarios to add |
|------|-----------------|
| `AssistantGrid/__tests__/AssistantGrid.test.tsx` | (a) `hasActiveFilter=true`, `totalCount=5` → `getByRole('status')` contains totalCountInfo; (b) `hasActiveFilter=false` → no status text; (c) `hasActiveFilter=true`, `totalCount=0` → "No assistants found" |
| `AssistantFilters/__tests__/` (new or existing) | Project filter: simulate `onFilter("term")` + resolve options → status announces count; empty options → "No results found" |
| `ContextSelector/__tests__/` (new or existing) | Simulate onFilter + async resolve → status announces count; zero options → "No results found" |
| `AssistantSelector/__tests__/` (new or existing) | Simulate onFilter + async resolve → status announces count; zero options → "No results found" |

Tests do not require store or API integration — mock the options arrays directly.
