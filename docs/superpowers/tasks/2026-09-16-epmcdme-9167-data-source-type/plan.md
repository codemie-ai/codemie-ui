# EPMCDME-9167: Data Source Provider Type Display Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Data Source Details page so it shows the specific provider type name (e.g. "CodeAnalysisProvider") instead of the generic "Provider" label.

**Architecture:** The API response for `v1/index/{id}` likely already returns `provider_name` in its JSON body but the TypeScript interface `DataSourceDetailsResponse` doesn't declare it. Adding the optional field and using it at the render site is a 3-file change: the type, the component, and the test. No new API calls or store changes are needed.

**Tech Stack:** TypeScript · React 18 · Vitest · React Testing Library

---

## File Map

| File | Change |
|---|---|
| `src/types/entity/dataSource.ts` | Add `provider_name?: string` to `DataSourceDetailsResponse` (line ~292, after `provider_fields`) |
| `src/pages/dataSources/components/DataSourceDetails.tsx` | Update line 732 to display `dataSource.provider_name` when present, else `humanize(indexType)` |
| `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx` | Add `describe` block testing provider type display |

---

### Task 1: Extend the `DataSourceDetailsResponse` type

**Test-first: yes — failing test is written in Task 2 before this change takes effect**

**Files:**
- Modify: `src/types/entity/dataSource.ts:292`

- [ ] **Step 1: Add `provider_name` to the interface**

In `src/types/entity/dataSource.ts`, find the `DataSourceDetailsResponse` interface. After line 292 (`provider_fields: any`), add:

```ts
  provider_fields: any
  provider_name?: string
```

The complete block around the change (lines ~291–298):

```ts
  processing_info: { unique_extensions: Array<string> } & Record<string, unknown>
  provider_fields: any
  provider_name?: string
  guardrail_assignments: EntityGuardrailAssignment[]
  cron_expression?: string | null
  timezone?: string | null
  vcs_type?: string
  last_reindex_triggered_at?: string | null
```

- [ ] **Step 2: Verify type-check passes after the type addition alone**

```bash
npm run type-check
```

Expected: exits 0 with no errors. The field is optional so no existing call sites are broken.

---

### Task 2: Update the display logic in `DataSourceDetails.tsx`

**Test-first: yes — write the failing test first (Task 3, Step 1), then implement here**

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceDetails.tsx:732`

- [ ] **Step 1: Replace the generic display expression**

Find line 732:

```tsx
<DetailsProperty label="Data Source Type" value={humanize(indexType)} />
```

Replace with:

```tsx
<DetailsProperty
  label="Data Source Type"
  value={dataSource.provider_name ?? humanize(indexType)}
/>
```

`dataSource.provider_name` is the specific name like `"CodeAnalysisProvider"` returned by the API. When absent (all non-provider index types never have it), `??` falls through to `humanize(indexType)`, preserving the existing display for all other data source types.

- [ ] **Step 2: Verify type-check still passes**

```bash
npm run type-check
```

Expected: exits 0.

---

### Task 3: Add test coverage for provider type display

**Files:**
- Modify: `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`

- [ ] **Step 1: Write the failing test — add a new `describe` block at the bottom of the file**

Append to `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`:

```ts
describe('DataSourceDetails — provider data source type display', () => {
  const providerDataSource: DataSourceDetailsResponse = {
    ...dataSource,
    index_type: 'provider',
    provider_name: 'CodeAnalysisProvider',
    provider_fields: { base_params: {}, create_params: {} },
  }

  it('shows the specific provider name instead of the generic "Provider" label', () => {
    const { getByText, queryByText } = render(
      <DataSourceDetails dataSource={providerDataSource} />
    )
    expect(getByText('CodeAnalysisProvider')).toBeInTheDocument()
    expect(queryByText('Provider')).not.toBeInTheDocument()
  })

  it('falls back to humanized index type when provider_name is absent', () => {
    const { getByText } = render(
      <DataSourceDetails
        dataSource={{ ...providerDataSource, provider_name: undefined }}
      />
    )
    expect(getByText('Provider')).toBeInTheDocument()
  })
})
```

> **Note:** The base `dataSource` fixture defined at line 72 of the test file uses `index_type: 'git'` — the spread `...dataSource` inherits all required fields; only `index_type`, `provider_name`, and `provider_fields` are overridden.

- [ ] **Step 2: Run the test to confirm it fails before the implementation**

```bash
npm run test:unit -- --reporter=verbose src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx
```

Expected: the two new cases FAIL because `DataSourceDetailsResponse` does not yet declare `provider_name` (TypeScript compilation error) OR because `humanize("provider")` still returns `"Provider"`.

*(If Task 1 and Task 2 are already applied, re-order: run this step first against the original code by temporarily reverting, then applying the fix.)*

- [ ] **Step 3: Run the full test file after applying Task 1 + Task 2**

```bash
npm run test:unit -- --reporter=verbose src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx
```

Expected output includes:

```
✓ DataSourceDetails — project name display > renders project technical name
✓ DataSourceDetails — project name display > shows the display name as a react-tooltip hint on the project name
✓ DataSourceDetails — xWiki properties > renders the space and wiki rows
✓ DataSourceDetails — xWiki properties > falls back to the default wiki name when none is stored
✓ DataSourceDetails — provider data source type display > shows the specific provider name instead of the generic "Provider" label
✓ DataSourceDetails — provider data source type display > falls back to humanized index type when provider_name is absent

Test Files  1 passed (1)
Tests  6 passed (6)
```

- [ ] **Step 4: Run the broader unit suite to check for regressions**

```bash
npm run test:unit
```

Expected: all previously passing tests still pass; `Test Files` line shows the same or higher passing count.

- [ ] **Step 5: Commit**

```bash
git add src/types/entity/dataSource.ts \
        src/pages/dataSources/components/DataSourceDetails.tsx \
        src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx
git commit -m "EPMCDME-9167: Show specific provider type name on Data Source Details page"
```

---

## Verification checklist

- [ ] `npm run type-check` exits 0
- [ ] `npm run test:unit` passes with 6 cases in `DataSourceDetails.test.tsx`
- [ ] No other test files affected
- [ ] The "Data Source Type" sidebar field shows `provider_name` when the API returns it; falls back to `humanize(indexType)` otherwise
