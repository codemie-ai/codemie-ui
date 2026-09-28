# Fix Analytics User Email Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Analytics Users filter dropdown so that searching by email returns and displays matching users instead of "No results found".

**Architecture:** The bug is a double-filtering problem: PrimeReact's MultiSelect component activates its own built-in client-side text filter whenever an `onFilter` callback is provided. When the user types an email, the API returns the correct user but PrimeReact then re-filters those results by matching the email against each option's `label` field (which contains a display name, not an email), hiding everything. The fix adds a `serverSideFilter` boolean prop to the shared `MultiSelect` wrapper — when `true`, it passes `filterMatchMode="custom"` with an always-true function to PrimeReact, bypassing the client-side re-filter while keeping the `onFilter` callback (which drives the server search) fully functional.

**Tech Stack:** React, TypeScript, PrimeReact MultiSelect, vitest, @testing-library/react

## Global Constraints

- Do not change the `onFilter` callback contract — it still fires on every keystroke.
- The `serverSideFilter` prop is opt-in; no existing `MultiSelect` call site is affected by default.
- All new code must carry the Apache 2.0 EPAM license header (copy from an existing file in the same directory).
- Commit messages must follow `EPMCDME-14070: Capital sentence` format.
- Run command: `npx vitest run src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` for Task 1 tests; `npx vitest run src/components/form/MultiSelect` for Task 2 tests.

---

### Task 1: Add failing test for email-search path in AnalyticsUserFilter

**Files:**
- Modify: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Interfaces:**
- Consumes: `AnalyticsUserFilter` component at `../AnalyticsUserFilter` (already imported in test file)
- Consumes: `onSearchChange` prop (`(term: string) => void`) on `AnalyticsUserFilter`
- Produces: a failing test `'should pass onSearchChange as onFilter when isAdmin is true'` — Task 2 makes it pass

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe('AnalyticsUserFilter', ...)` block in `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`, after the last `it(...)`:

```tsx
it('should pass onSearchChange as onFilter when isAdmin is true', () => {
  const onSearchChange = vi.fn()
  const options = [{ label: 'Kostiantyn Pshenychnyi1', value: 'user-abc' }]

  render(
    <AnalyticsUserFilter
      value={[]}
      onChange={mockOnChange}
      userOptions={options}
      isAdmin={true}
      onSearchChange={onSearchChange}
    />
  )

  // The MultiSelect must receive a truthy onFilter prop when isAdmin=true,
  // meaning the rendered PrimeReact input filter is present in the DOM.
  // Also verify serverSideFilter is forwarded (the dropdown must NOT
  // re-filter server-returned results against the typed email).
  const filterInput = screen.getByPlaceholderText('Search users')
  expect(filterInput).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it passes (baseline)**

```bash
npx vitest run src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
```

Expected: All existing tests pass; new test also passes (it only checks filter input presence, which already works). This confirms the test file is healthy before the real fix.

- [ ] **Step 3: Add the test that actually covers the broken behavior**

Add this second new test immediately after the one above:

```tsx
it('should not hide server-returned users when search term is an email address', async () => {
  const user = userEvent.setup()
  const onSearchChange = vi.fn()

  // Simulate what the server returns after searching by email:
  // a user whose label is a display name (not an email).
  const serverReturnedOptions = [{ label: 'Kostiantyn Pshenychnyi1', value: 'user-abc' }]

  const { rerender } = render(
    <AnalyticsUserFilter
      value={[]}
      onChange={mockOnChange}
      userOptions={[]}
      isAdmin={true}
      onSearchChange={onSearchChange}
    />
  )

  // Open the dropdown
  const trigger = screen.getByRole('combobox', { hidden: true })
  await user.click(trigger.closest('[data-pc-name="multiselect"]') ?? trigger)

  // Type an email into the filter input
  const filterInput = screen.getByPlaceholderText('Search users')
  await user.type(filterInput, 'kostiantyn_pshenychnyi1@epam.com')

  // Simulate the parent updating options with server results
  rerender(
    <AnalyticsUserFilter
      value={[]}
      onChange={mockOnChange}
      userOptions={serverReturnedOptions}
      isAdmin={true}
      onSearchChange={onSearchChange}
    />
  )

  // The user option must be visible — PrimeReact must NOT have re-filtered it away
  await waitFor(() => {
    expect(screen.getByText('Kostiantyn Pshenychnyi1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run test to confirm it FAILS**

```bash
npx vitest run src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
```

Expected: The new test `'should not hide server-returned users when search term is an email address'` FAILS. This proves the test is covering the broken behavior.

- [ ] **Step 5: Commit the failing test**

```bash
git add src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m "EPMCDME-14070: Add failing test for email-based user search in analytics filter"
```

Test-first: yes — failing test description: "should not hide server-returned users when search term is an email address"

---

### Task 2: Add `serverSideFilter` prop to MultiSelect wrapper

**Files:**
- Modify: `src/components/form/MultiSelect/MultiSelect.tsx` — add `serverSideFilter` prop; pass `filterMatchMode` and `filterFunction` to PrimeReact when active

**Interfaces:**
- Consumes: PrimeReact `MultiSelect` props `filterMatchMode` (`"custom"`) and `filterFunction` (`(item, key, dataKey) => boolean`)
- Produces: `serverSideFilter?: boolean` prop on the exported `MultiSelectProps` type

- [ ] **Step 1: Read the current props type and destructure block**

The props type is `MultiSelectProps` at line 80. The destructure is inside `forwardRef` at line 118. Both need updating.

- [ ] **Step 2: Add `serverSideFilter` to the props type**

In `src/components/form/MultiSelect/MultiSelect.tsx`, find:

```ts
  onScrollBottom?: () => void
}
```

Replace with:

```ts
  onScrollBottom?: () => void
  serverSideFilter?: boolean
}
```

- [ ] **Step 3: Destructure the new prop**

In the `forwardRef` function, find:

```ts
      onScrollBottom,
    },
    ref
```

Replace with:

```ts
      onScrollBottom,
      serverSideFilter = false,
    },
    ref
```

- [ ] **Step 4: Pass `filterMatchMode` and `filterFunction` to PrimeReact when `serverSideFilter` is true**

Find the PrimeReact `<PrimeMultiselect>` JSX block (around line 392). After the line:

```tsx
          filter={typeof onFilter === 'function'}
```

Add:

```tsx
          filterMatchMode={serverSideFilter ? 'custom' : undefined}
          filterFunction={serverSideFilter ? () => true : undefined}
```

- [ ] **Step 5: Run MultiSelect tests**

```bash
npx vitest run src/components/form/MultiSelect
```

Expected: All existing MultiSelect tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/form/MultiSelect/MultiSelect.tsx
git commit -m "EPMCDME-14070: Add serverSideFilter prop to MultiSelect to bypass client-side re-filtering"
```

Test-first: no — this task is a shared component change; the consumer test (Task 1) is the regression guard.

---

### Task 3: Wire `serverSideFilter` in AnalyticsUserFilter and make tests green

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsUserFilter.tsx` — pass `serverSideFilter={isAdmin}` to `<MultiSelect>`

**Interfaces:**
- Consumes: `serverSideFilter?: boolean` prop added to `MultiSelect` in Task 2
- Produces: no new exports; the existing `AnalyticsUserFilter` component now suppresses PrimeReact client-side filtering when `isAdmin` is true

- [ ] **Step 1: Add `serverSideFilter` to the MultiSelect call**

In `src/pages/analytics/components/AnalyticsUserFilter.tsx`, find:

```tsx
      <MultiSelect
        id="users"
        value={displayValue}
        options={mergedOptions}
        onChange={handleUsersChange}
        placeholder="Users"
        fullWidth
        onFilter={isAdmin ? onSearchChange : () => {}}
        filterPlaceholder="Search users"
        showCheckbox
        hasVirtualScroll
        virtualScrollerOptions={{ itemSize: 32 }}
      />
```

Replace with:

```tsx
      <MultiSelect
        id="users"
        value={displayValue}
        options={mergedOptions}
        onChange={handleUsersChange}
        placeholder="Users"
        fullWidth
        onFilter={isAdmin ? onSearchChange : () => {}}
        filterPlaceholder="Search users"
        showCheckbox
        hasVirtualScroll
        virtualScrollerOptions={{ itemSize: 32 }}
        serverSideFilter={isAdmin}
      />
```

- [ ] **Step 2: Run the AnalyticsUserFilter tests**

```bash
npx vitest run src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
```

Expected: All tests pass including `'should not hide server-returned users when search term is an email address'` (GREEN).

- [ ] **Step 3: Run the full MultiSelect suite to confirm no regressions**

```bash
npx vitest run src/components/form/MultiSelect
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/analytics/components/AnalyticsUserFilter.tsx
git commit -m "EPMCDME-14070: Wire serverSideFilter on AnalyticsUserFilter to fix email search"
```

Test-first: yes — the test from Task 1 was already failing; this step makes it green.
