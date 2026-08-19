# Datasource Unsaved-Changes Popup Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the "Unsaved Changes" popup from appearing when a user navigates away from a freshly opened datasource create form without making any edits.

**Architecture:** `compareFormData.ts` normalizes async-populated fields so they are excluded from dirty comparison when their initial snapshot value is empty. The `name` field was simply missing from that list. Adding it is a one-line-pattern extension, consistent with how `embeddingsModel`, `summarizationModel`, `projectName`, and `setting_id` are already handled.

**Tech Stack:** TypeScript, React, react-hook-form, lodash `isEqual`, Vitest + RTL

## Global Constraints

- Commit format: `EPMCDME-14129: Capital sentence` (enforced by CI).
- Do NOT change `useUnsavedChangesWarning.tsx` — Option A (comparator fix only).
- Do NOT change `DataSourceForm.tsx` or `DataSourceCreatePage.tsx`.
- New tests go in the exact paths listed below — do not create test files anywhere else.
- Run `npm run test:unit` and `npm run test:integration` before committing; both must pass.

---

## File Map

| Action | Path |
|---|---|
| Create | `src/pages/dataSources/utils/__tests__/compareFormData.test.ts` |
| Modify | `src/pages/dataSources/utils/compareFormData.ts` |
| Modify | `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` |

---

### Task 1: Unit tests and fix for `compareFormData`

**Files:**
- Create: `src/pages/dataSources/utils/__tests__/compareFormData.test.ts`
- Modify: `src/pages/dataSources/utils/compareFormData.ts`

**Interfaces:**
- Consumes: `compareFormData(initial: any, current: any): boolean` from `../compareFormData`
- Produces: nothing (test-only task)

**Test-first:** yes — write failing test for `name` normalization, run RED, then add fix, run GREEN

- [ ] **Step 1: Create the unit test file**

Create `src/pages/dataSources/utils/__tests__/compareFormData.test.ts` with this content:

```typescript
import { describe, it, expect } from 'vitest'

import { compareFormData } from '../compareFormData'

const base = {
  name: '',
  embeddingsModel: '',
  summarizationModel: '',
  projectName: '',
  setting_id: '',
  indexType: 'google-docs',
  description: '',
  indexMetadata: { version: 1 },
}

describe('compareFormData', () => {
  describe('name normalization (regression: EPMCDME-14129)', () => {
    it('returns false when initial name is empty and current name is auto-generated', () => {
      expect(
        compareFormData(
          { ...base, name: '' },
          { ...base, name: 'google-docs-2026-08-18_10-30' },
        ),
      ).toBe(false)
    })

    it('returns true when initial name is non-empty and current name differs', () => {
      expect(
        compareFormData(
          { ...base, name: 'my-source' },
          { ...base, name: 'changed-name' },
        ),
      ).toBe(true)
    })

    it('returns false when name is unchanged', () => {
      expect(
        compareFormData(
          { ...base, name: 'my-source' },
          { ...base, name: 'my-source' },
        ),
      ).toBe(false)
    })
  })

  describe('existing normalizations', () => {
    it('returns false when initial embeddingsModel is empty and current has a value', () => {
      expect(
        compareFormData(
          { ...base },
          { ...base, embeddingsModel: 'gpt-4o' },
        ),
      ).toBe(false)
    })

    it('returns true when initial embeddingsModel is non-empty and current differs', () => {
      expect(
        compareFormData(
          { ...base, embeddingsModel: 'gpt-3.5' },
          { ...base, embeddingsModel: 'gpt-4o' },
        ),
      ).toBe(true)
    })

    it('returns false when initial summarizationModel is empty and current has a value', () => {
      expect(
        compareFormData(
          { ...base },
          { ...base, summarizationModel: 'claude-3' },
        ),
      ).toBe(false)
    })

    it('returns false when initial projectName is empty and current has a value', () => {
      expect(
        compareFormData(
          { ...base },
          { ...base, projectName: 'my-project' },
        ),
      ).toBe(false)
    })

    it('returns false when initial setting_id is empty and current has a value', () => {
      expect(
        compareFormData(
          { ...base },
          { ...base, setting_id: 's-42' },
        ),
      ).toBe(false)
    })

    it('ignores indexMetadata differences', () => {
      expect(
        compareFormData(
          { ...base, indexMetadata: { a: 1 } },
          { ...base, indexMetadata: { b: 2 } },
        ),
      ).toBe(false)
    })
  })

  describe('guard clauses', () => {
    it('returns false when initial is null', () => {
      expect(compareFormData(null, base)).toBe(false)
    })

    it('returns false when current is null', () => {
      expect(compareFormData(base, null)).toBe(false)
    })

    it('returns false when both objects are identical', () => {
      const values = { ...base, name: 'my-source', embeddingsModel: 'gpt-4o' }
      expect(compareFormData(values, { ...values })).toBe(false)
    })

    it('returns true when a non-normalised field changes', () => {
      expect(
        compareFormData(
          { ...base, description: 'original' },
          { ...base, description: 'changed' },
        ),
      ).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run the new test file — expect RED on the `name` normalization tests**

```bash
npm run test:unit -- --reporter=verbose src/pages/dataSources/utils/__tests__/compareFormData.test.ts
```

Expected: 3 tests in `name normalization` describe block fail (`returns false when initial name is empty and current name is auto-generated` and the two passing-but-meaningful ones). The two failing tests in `name normalization` should fail because `compareFormData` currently returns `true` (dirty) for `{ name: '' }` vs `{ name: 'google-docs-...' }`.

- [ ] **Step 3: Add `name` normalization to `compareFormData.ts`**

Open `src/pages/dataSources/utils/compareFormData.ts`. After the `setting_id` block (line 42–44), add:

```typescript
  if (!initial.name || initial.name === '') {
    normalizedInitial.name = normalizedCurrent.name
  }
```

Full file after change:

```typescript
import isEqual from 'lodash/isEqual'

/**
 * Compares initial and current data source form data to detect changes
 * @param initial - Initial form data
 * @param current - Current form data
 * @returns True if data has changed, false otherwise
 */
export const compareFormData = (initial: any, current: any) => {
  if (!initial || !current) return false

  const normalizedInitial = { ...initial }
  const normalizedCurrent = { ...current }

  if (!initial.embeddingsModel || initial.embeddingsModel === '') {
    normalizedInitial.embeddingsModel = normalizedCurrent.embeddingsModel
  }

  if (!initial.summarizationModel || initial.summarizationModel === '') {
    normalizedInitial.summarizationModel = normalizedCurrent.summarizationModel
  }

  if (!initial.projectName || initial.projectName === '') {
    normalizedInitial.projectName = normalizedCurrent.projectName
  }

  if (!initial.setting_id || initial.setting_id === '') {
    normalizedInitial.setting_id = normalizedCurrent.setting_id
  }

  if (!initial.name || initial.name === '') {
    normalizedInitial.name = normalizedCurrent.name
  }

  delete normalizedInitial.indexMetadata
  delete normalizedCurrent.indexMetadata

  return !isEqual(normalizedInitial, normalizedCurrent)
}
```

- [ ] **Step 4: Run the unit tests — expect GREEN**

```bash
npm run test:unit -- --reporter=verbose src/pages/dataSources/utils/__tests__/compareFormData.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit the fix and its unit tests**

```bash
git add src/pages/dataSources/utils/compareFormData.ts src/pages/dataSources/utils/__tests__/compareFormData.test.ts
git commit -m "EPMCDME-14129: Exclude auto-generated name from datasource form dirty comparison"
```

---

### Task 2: Integration regression test

**Files:**
- Modify: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Interfaces:**
- Consumes: `createMemoryRouter`, `RouterProvider` from `react-router`; `render`, `act` from `@testing-library/react`; `routes` from `@/router`; existing helpers `waitForFormReady`, `selectGoogleDocsType`, `mockFormInitAPIs`, `mockAPI`
- Produces: a new `describe` block — no API changes

**Test-first:** yes — write test first (GREEN because fix is already committed), but the test would have been RED on the unfixed code

- [ ] **Step 1: Add imports to `DataSourceCreatePage.integration.test.tsx`**

The file currently imports `screen, waitFor` from `@testing-library/react`. Add `render` and `act`:

```typescript
import { screen, waitFor, render, act } from '@testing-library/react'
```

Also add after the existing imports:

```typescript
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/router'
```

- [ ] **Step 2: Append the new describe block at the end of the file**

```typescript
describe('DataSourceCreatePage — Unsaved Changes Guard', () => {
  beforeEach(() => {
    mockFormInitAPIs()
    mockAPI('GET', 'v1/settings/user/available', [])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not show unsaved-changes popup when navigating away from an untouched form', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(routes, {
      initialEntries: ['/data-sources/create'],
    })
    render(<RouterProvider router={router} />)

    await waitForFormReady()
    await selectGoogleDocsType(user)

    // Wait for the auto-generated name to appear — signals initialization + name-fill complete
    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveValue('')
      },
      { timeout: 10000 },
    )

    // Navigate away without touching any form field
    await act(async () => {
      await router.navigate('/chats')
    })

    // The "Unsaved Changes" popup must NOT have appeared
    expect(
      screen.queryByRole('heading', { name: 'Unsaved Changes' }),
    ).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the integration test file — expect GREEN**

```bash
npm run test:integration -- --reporter=verbose src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx
```

Expected: all existing tests pass; new test also passes.

- [ ] **Step 4: Run full gate suites to confirm no regressions**

```bash
npm run test:unit
npm run test:integration
```

Expected: both show only `X passed`, no failures.

- [ ] **Step 5: Commit the integration test**

```bash
git add src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx
git commit -m "EPMCDME-14129: Add regression test — no unsaved-changes popup on fresh datasource form"
```
