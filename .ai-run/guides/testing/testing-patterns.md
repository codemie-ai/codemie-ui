# Testing Patterns — CodeMie UI

> Vitest 1.6.1 + React Testing Library. Two workspace projects: `unit` and `integration`.

---

## Test Organization

### File Location

Tests live in `__tests__/` folders co-located with the source:

```
src/components/Popup/
├── Popup.tsx
└── __tests__/
    └── Popup.test.tsx

src/pages/settings/administration/
├── ProvidersManagementPage.tsx
└── __tests__/
    ├── ProvidersManagementPage.test.tsx
    └── ProvidersManagementPage.integration.test.tsx
```

### Naming Convention

| File pattern | Project | What it runs |
|---|---|---|
| `*.test.tsx` | `unit` | Single-component isolation |
| `*.integration.test.tsx` | `integration` | Component → Store → API → UI chain |

Workspace config: `vitest.workspace.ts` — two projects with separate setup files.

### Setup Files

- **Unit** — loads `setupTests.tsx` + `setupTests.unit.ts` (mocks `useSnapshot` and `@/utils/api`)
- **Integration** — loads `setupTests.tsx` only (valtio and real fetch are never mocked)

`SettingsLayout` and `useVueRouter` are mocked globally in `setupTests.tsx`; do not re-mock them in individual test files.

---

## Running Tests

```bash
npm run test:unit          # unit tests only
npm run test:integration   # integration tests only
npm test                   # all tests
npm test -- --watch        # watch mode
npm run test:coverage      # with coverage report
npm test -- ProvidersManagementPage.integration  # single file
```

---

## Unit Test Pattern (AAA)

Arrange / Act / Assert. Keep each `it` block focused on one behaviour.

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import MyComponent from '../MyComponent'

afterEach(cleanup)

describe('MyComponent', () => {
  it('renders label text', () => {
    render(<MyComponent label='Save' />)                    // Arrange + Act
    expect(screen.getByText('Save')).toBeInTheDocument()   // Assert
  })

  it('calls onClick handler', () => {
    const handleClick = vi.fn()                            // Arrange
    render(<MyComponent onClick={handleClick} />)
    fireEvent.click(screen.getByRole('button'))            // Act
    expect(handleClick).toHaveBeenCalledTimes(1)           // Assert
  })
})
```

Key rules:
- Always call `cleanup` in `afterEach` (prevents DOM leaks between tests)
- `vi.mock()` must be at **module level** — never inside `describe` or `it`
- One assertion focus per test; use multiple `expect` calls only when they test the same behaviour

---

## Mocking Patterns

### Mock `@/utils/api` in Unit Tests

`setupTests.unit.ts` mocks the module automatically. To control return values in a test:

```tsx
import api from '@/utils/api'
vi.mock('@/utils/api')

beforeEach(() => {
  vi.mocked(api).mockResolvedValue({
    json: () => Promise.resolve([{ id: '1', name: 'AWS' }]),
  } as Response)
})
```

Place `vi.mock('@/utils/api')` at the top of the file (module level), not inside `describe`.

### Spy on Functions

```tsx
import * as storeModule from '@/store/myStore'
vi.spyOn(storeModule, 'loadItems').mockResolvedValue(undefined)
```

### Mock a Module Partially

```tsx
vi.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn(() => true),
}))
```

### Dynamic Response (No `mockAPI` Factory)

`mockAPI` does not support factory functions. For responses computed from request body use:

```tsx
vi.spyOn(global, 'fetch').mockImplementationOnce(async (url, init) => {
  const body = JSON.parse((init as RequestInit).body as string)
  return new Response(JSON.stringify({ id: body.name }), { status: 201 })
})
```

---

## Integration Test Pattern

Integration tests use **real Valtio reactivity** — store state changes trigger actual re-renders.
`global.fetch` is stubbed once in `setupTests.tsx`; `mockAPI` registers per-test intercepts.

### Core Utilities (import from `@/test-utils/integration`)

| Export | Purpose |
|---|---|
| `renderPage(path)` | Renders full app at route via `createMemoryRouter` |
| `mockAPI(method, url, data, statusOrParams?)` | Registers fetch mock for one test |
| `navigate` | `vi.fn()` spy replacing `useNavigate` globally |

### `mockAPI` Matching Rules

| 4th argument | Matching behaviour |
|---|---|
| omitted | Prefix match: `v1/items` matches `v1/items?page=0` but not `v1/items/1` |
| HTTP status number | Prefix match + error response |
| Params object | Exact match: path equals and all specified params present |

Last `mockAPI` call for the same key wins. Registry cleared automatically in `afterEach`.

### Basic Integration Test

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { mockAPI, navigate, renderPage } from '@/test-utils/integration'

describe('MyPage — Integration', () => {
  beforeEach(() => {
    mockAPI('GET', 'v1/items', [{ id: '1', name: 'Item One' }])
  })

  it('loads and displays items', async () => {
    renderPage('/settings/my-page')
    await waitFor(() =>
      expect(screen.getByText('Item One')).toBeInTheDocument()
    )
  })

  it('navigates after delete', async () => {
    mockAPI('DELETE', 'v1/items/1', null)
    renderPage('/settings/my-page')
    const row = screen.getByText('Item One').closest('tr')!
    await userEvent.click(within(row).getByTestId('actions-menu'))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByTestId('confirm-button'))
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/settings/items')
    )
  })
})
```

### Reactive Flow

1. Component calls store method (e.g., `store.loadItems()`)
2. Store makes fetch call → stub intercepts → returns mock data → updates proxy state
3. Real `useSnapshot` detects change → triggers React re-render
4. Test asserts on updated DOM

`useNavigate` is a spy — navigate calls are captured but do **not** update router history.
Assert with `expect(navigate).toHaveBeenCalledWith(path)` instead of checking the rendered page.

---

## Query Priority

Prefer role-based queries — they verify element type AND visible label simultaneously.

| Priority | Query | When to use | Example |
|---|---|---|---|
| 1st | `getByRole` | Buttons, headings, column headers | `getByRole('button', { name: 'Add' })` |
| 2nd | `findByRole` | Same, but async (waits for element) | `findByRole('button', { name: 'Delete' })` |
| 3rd | `getByPlaceholderText` | Form inputs | `getByPlaceholderText('Category Name')` |
| 4th | `getByLabelText` | Labelled inputs | `getByLabelText('Email address')` |
| 5th | `getByText` | Table cell content, messages | `getByText('Productivity')` |
| Last | `getByTestId` | When role queries produce multiple matches | `getByTestId('confirm-button')` |

### Scoping to a Table Row

```tsx
import { within } from '@testing-library/react'
const row = screen.getByText('Item Name').closest('tr')!
await userEvent.click(within(row).getByTestId('actions-menu'))
```

---

## DO / DON'T Table

| Category | DON'T | DO |
|---|---|---|
| **Mocking** | `vi.mock()` inside `describe` or `it` | Place at module top level |
| **Cleanup** | Omit `afterEach(cleanup)` | Always call `cleanup` in `afterEach` |
| **API client** | Import Axios or raw `fetch` | Mock `@/utils/api` for unit tests |
| **Integration mock** | Use `mockRequest` (removed) | Use `mockAPI` |
| **Dynamic mock** | Pass factory to `mockAPI` | Use `vi.spyOn(global, 'fetch')` |
| **renderPage** | Pass JSX component | Pass route path string: `'/settings/providers'` |
| **Navigation assert** | Check that target page rendered | `expect(navigate).toHaveBeenCalledWith(path)` |
| **Queries** | `getByTestId` for every element | Use `getByRole` / `findByRole` first |
| **Async** | Assert immediately after action | Wrap in `waitFor(...)` |
| **Sub-resource URLs** | `v1/assistants` for `v1/assistants/1` | Use exact sub-path to avoid prefix shadowing |
| **Valtio (integration)** | `vi.unmock('valtio')` | Real valtio is used automatically |
| **SettingsLayout** | Mock in each test file | Already mocked globally in `setupTests.tsx` |

---

## Checklist: New Integration Test

- [ ] File name: `ComponentName.integration.test.tsx` inside `__tests__/`
- [ ] Imports from `@/test-utils/integration`: `mockAPI`, `navigate`, `renderPage`
- [ ] `mockAPI(...)` called **before** `renderPage(...)` with URLs matching the store file
- [ ] `renderPage('/route/path')` — string, not JSX
- [ ] Prefer `getByRole` / `findByRole` over `getByText` for interactive elements
- [ ] All async assertions wrapped in `waitFor(...)`
- [ ] Tests assert user-visible behaviour, not internal store state

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Test passes in isolation, fails in suite | Missing `afterEach(cleanup)` | Add `afterEach(cleanup)` |
| Store returns `null` instead of mocked data | Wrong URL or method in `mockAPI` | Check exact URL + method in store file |
| `v1/assistants` mock matches `v1/assistants/user` | Prefix match stops at `?`, not `/` | Use exact sub-path in `mockAPI` |
| GET with params not matching | Params object not passed as 4th arg | `mockAPI('GET', 'url', data, { page: 0 })` |
| Target page never renders after navigation | `useNavigate` is a spy, not real router | Assert `expect(navigate).toHaveBeenCalledWith(path)` |
| `NavigationMore` dropdown not found | Dropdown renders asynchronously | Use `await screen.findByRole(...)` or `waitFor` |
| "proxyState is not iterable" | SettingsLayout pulled into test | Already mocked globally — do not re-mock |
| `mockRequest` TypeScript error | Old API removed | Replace with `mockAPI` |
