# Screen Reader Search Result Announcements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add polite `aria-live` announcements of search result counts to four async search surfaces (Marketplace, Project filter, Datasource Context, Sub-Assistants) to satisfy WCAG 4.1.3.

**Architecture:** Each owning component calls `useAnnouncementQueue()` and renders `<Announcement>` adjacent to its search UI. A `useEffect` watches the settled post-API result state (`totalCount` or options array length) and fires `announce()` only when a filter term is active, preventing spurious announcements on pagination or initial load.

**Tech Stack:** React 18, TypeScript 5, existing `useAnnouncementQueue` (`src/hooks/useAnnouncementQueue.ts`) + `Announcement` (`src/components/Announcement/Announcement.tsx`), Vitest + React Testing Library (`unit` project).

**Spec:** `docs/superpowers/tasks/2026-09-03-EPMCDME-8469-screen-reader-search-results/spec.md`

## Global Constraints

- No changes to `MultiSelect` component API or internal rendering.
- No announcements for loading/in-flight states — effects fire only on settled result state.
- No announcement on pagination when no search term is active.
- `SearchableCombobox` (LLM selector) is out of scope — do not modify it.
- No changes to `Filters.tsx` debounce timing, visual layout, or styles.
- No new npm dependencies.
- Commit per task using the repository's existing convention.

**negative-constraints:** All Non-Goals from the spec scanned. No task violates any of them: `MultiSelect` is untouched in all tasks; loading states are not announced; pagination guard is explicit in Task 1 (`hasActiveFilter`) and implicit via `filterTerm.current` checks in Tasks 2–4; `SearchableCombobox` is not modified; no style changes; no new deps.

---

### Task 1: Marketplace search announcement — AssistantGrid + AssistantList

**Test-first: yes — three unit test cases asserting `screen.getByRole('status')` content after prop changes**

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx`
- Modify: `src/pages/assistants/components/AssistantList/AssistantList.tsx`
- Modify: `src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`

**Interfaces:**
- Produces: `AssistantGridProps` gains `hasActiveFilter?: boolean`

- [ ] **Step 1: Write three failing tests in `AssistantGrid.test.tsx`**

  Import `render`, `screen` from `@testing-library/react`. For each case, render `<AssistantGrid>` with all existing required props plus the new `hasActiveFilter` and a specific `totalCount`.

  ```tsx
  it('announces totalCountInfo when hasActiveFilter is true and count > 0', () => {
    render(<AssistantGrid {...baseProps} totalCount={5} hasActiveFilter={true} />);
    expect(screen.getByRole('status')).toHaveTextContent(/5 ASSISTANTS/i);
  });

  it('announces "No assistants found" when hasActiveFilter is true and count is 0', () => {
    render(<AssistantGrid {...baseProps} totalCount={0} hasActiveFilter={true} />);
    expect(screen.getByRole('status')).toHaveTextContent('No assistants found');
  });

  it('does not announce when hasActiveFilter is false', () => {
    render(<AssistantGrid {...baseProps} totalCount={5} hasActiveFilter={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
  ```

  `baseProps` is whatever set of props the existing tests already pass. Check the existing test file for the shape.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run --project unit src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`

  Expected: FAIL — "Unable to find role 'status'" or prop type error.

- [ ] **Step 3: Add `hasActiveFilter` prop and announcement logic to `AssistantGrid.tsx`**

  Add `hasActiveFilter?: boolean` to the props interface.

  In the component body, add (after `totalCountInfo` is computed):

  ```tsx
  const { announce, text } = useAnnouncementQueue();

  useEffect(() => {
    if (!hasActiveFilter) return;
    announce(totalCount === 0 ? 'No assistants found' : totalCountInfo);
  }, [totalCount, hasActiveFilter]);
  ```

  Render `<Announcement text={text} />` as a sibling to the existing count `<h2>` — visually invisible (`sr-only` is applied inside `Announcement`). Import `useAnnouncementQueue` from `src/hooks/useAnnouncementQueue` and `Announcement` from `src/components/Announcement/Announcement`.

- [ ] **Step 4: Pass `hasActiveFilter` from `AssistantList.tsx`**

  Open `AssistantList.tsx` and locate the state or store fields it uses to track active filters (search term, selected projects, etc.). Derive:

  ```tsx
  const hasActiveFilter = !!(searchKey || selectedProjects?.length);
  ```

  Use the exact field names the file already holds — do not invent new state. Pass `hasActiveFilter={hasActiveFilter}` to `<AssistantGrid>`.

- [ ] **Step 5: Run tests to verify they pass**

  Run: `npx vitest run --project unit src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`

---

### Task 2: Project filter announcement — AssistantFilters

**Test-first: yes — two unit test cases asserting status region content after filter term + options update**

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx`
- Test: `src/pages/assistants/components/AssistantList/AssistantFilters/__tests__/AssistantFilters.announcement.test.tsx` (new file, or add to existing test file if one exists)

**Interfaces:**
- Consumes: existing `resolvedProjectOptions` array and `handleProjectFilter` function within `AssistantFilters`

- [ ] **Step 1: Write two failing tests**

  ```tsx
  it('announces result count when project filter has a term and options resolve', async () => {
    const { rerender } = render(<AssistantFilters {...requiredProps} resolvedProjectOptions={[]} />);
    // simulate the onFilter callback setting a term by calling handleProjectFilter
    // then update resolved options
    rerender(<AssistantFilters {...requiredProps} resolvedProjectOptions={[opt1, opt2, opt3]} />);
    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent('3 results found');
  });

  it('announces "No results found" when project filter options resolve empty', async () => {
    const { rerender } = render(<AssistantFilters {...requiredProps} resolvedProjectOptions={[]} />);
    rerender(<AssistantFilters {...requiredProps} resolvedProjectOptions={[]} />);
    // after setting filter term via handleProjectFilter, expect empty message
    expect(screen.getByRole('status')).toHaveTextContent('No results found');
  });
  ```

  The exact test shape depends on how `AssistantFilters` exposes props vs. state — adjust to call the `onFilter` prop of the rendered `MultiSelect` directly via `fireEvent` or by triggering the component's own `handleProjectFilter` reference if accessible. The key assertion is the `status` role text content.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run --project unit src/pages/assistants/components/AssistantList/AssistantFilters/`

- [ ] **Step 3: Add announcement logic to `AssistantFilters.tsx`**

  Add a filter term ref near the top of the component:

  ```tsx
  const projectFilterTerm = useRef('');
  ```

  In `handleProjectFilter`, before or after the existing call to `loadProjectOptions`:

  ```tsx
  projectFilterTerm.current = filterValue; // use the actual param name in the function
  ```

  Add hook and effect:

  ```tsx
  const { announce, text } = useAnnouncementQueue();

  useEffect(() => {
    if (!projectFilterTerm.current) return;
    announce(resolvedProjectOptions.length > 0
      ? `${resolvedProjectOptions.length} results found`
      : 'No results found');
  }, [resolvedProjectOptions]);
  ```

  Render `<Announcement text={text} />` adjacent to the Project `<MultiSelect>` in the JSX.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx vitest run --project unit src/pages/assistants/components/AssistantList/AssistantFilters/`

---

### Task 3: Datasource Context filter announcement — ContextSelector

**Test-first: yes — two unit test cases asserting status region content after filter + options resolve**

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/ContextSelector.tsx` (onFilter handler near lines 141–165, `contextOptions` state)
- Test: `src/pages/assistants/components/AssistantForm/components/__tests__/ContextSelector.announcement.test.tsx` (new file or add to existing)

**Interfaces:**
- Consumes: existing `contextOptions` state array and the `onFilter` callback wired to `fetchAssistantContextOptions`

- [ ] **Step 1: Write two failing tests**

  Mock `fetchAssistantContextOptions` to resolve with a controlled list. Render `<ContextSelector>`, fire the filter input, await the async options update, assert the status role.

  ```tsx
  it('announces count when context options resolve after filter', async () => {
    vi.mocked(fetchAssistantContextOptions).mockResolvedValue([opt1, opt2, opt3, opt4]);
    render(<ContextSelector {...requiredProps} />);
    // trigger onFilter on the MultiSelect
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'api' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('4 results found')
    );
  });

  it('announces "No results found" when context options resolve empty', async () => {
    vi.mocked(fetchAssistantContextOptions).mockResolvedValue([]);
    render(<ContextSelector {...requiredProps} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('No results found')
    );
  });
  ```

  Adjust the trigger to match how `ContextSelector` actually surfaces the filter input — the pattern is consistent with `MultiSelect`'s `onFilter` prop.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/`

- [ ] **Step 3: Add announcement logic to `ContextSelector.tsx`**

  Add a filter term ref:

  ```tsx
  const filterTerm = useRef('');
  ```

  Inside the `onFilter` handler (near line 141), set `filterTerm.current = term` (use the actual param name).

  Add:

  ```tsx
  const { announce, text } = useAnnouncementQueue();

  useEffect(() => {
    if (!filterTerm.current) return;
    announce(contextOptions.length > 0
      ? `${contextOptions.length} results found`
      : 'No results found');
  }, [contextOptions]);
  ```

  Render `<Announcement text={text} />` adjacent to the context `<MultiSelect>`.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/`

---

### Task 4: Sub-Assistants filter announcement — AssistantSelector

**Test-first: yes — two unit test cases asserting status region content after filter + options resolve**

**Files:**
- Modify: `src/pages/assistants/components/AssistantSelector.tsx`
- Test: `src/pages/assistants/components/__tests__/AssistantSelector.announcement.test.tsx` (new file or add to existing)

**Interfaces:**
- Consumes: `options` from `usePaginatedOptions` and the `onFilter` handler passed to `MultiSelect`

- [ ] **Step 1: Write two failing tests**

  Mock `usePaginatedOptions` to return a controllable `options` array:

  ```tsx
  const mockLoadOptions = vi.fn();
  vi.mock('path/to/usePaginatedOptions', () => ({
    usePaginatedOptions: () => ({ options: mockOptions, loadOptions: mockLoadOptions }),
  }));

  it('announces count when sub-assistant options resolve after filter', async () => {
    mockOptions = [opt1, opt2];
    render(<AssistantSelector {...requiredProps} />);
    // trigger onFilter on the rendered MultiSelect
    fireEvent.change(/* filter input */, { target: { value: 'search' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('2 results found')
    );
  });

  it('announces "No results found" when sub-assistant options resolve empty', async () => {
    mockOptions = [];
    render(<AssistantSelector {...requiredProps} />);
    fireEvent.change(/* filter input */, { target: { value: 'zzz' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('No results found')
    );
  });
  ```

  Verify the exact mock path for `usePaginatedOptions` by checking the import in `AssistantSelector.tsx`.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run --project unit src/pages/assistants/components/__tests__/AssistantSelector.announcement.test.tsx`

- [ ] **Step 3: Add announcement logic to `AssistantSelector.tsx`**

  Add a filter term ref:

  ```tsx
  const filterTerm = useRef('');
  ```

  In the `onFilter` handler passed to `<MultiSelect>`, set `filterTerm.current = value`.

  Add:

  ```tsx
  const { announce, text } = useAnnouncementQueue();

  useEffect(() => {
    if (!filterTerm.current) return;
    announce(options.length > 0
      ? `${options.length} results found`
      : 'No results found');
  }, [options]);
  ```

  Render `<Announcement text={text} />` adjacent to the sub-assistants `<MultiSelect>`.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx vitest run --project unit src/pages/assistants/components/__tests__/AssistantSelector.announcement.test.tsx`
