# Testing Patterns

> **Vitest + Testing Library patterns for CodeMie UI**

## Test Framework: Vitest + Testing Library

| Library | Purpose |
|---------|---------|
| `vitest` | Test runner. Finds `*.test.tsx` files and executes them |
| `@testing-library/react` | Renders components in tests: `render(<Button />)` |
| `@testing-library/user-event` | Simulates user interactions: `user.click(button)` |
| `@testing-library/jest-dom` | DOM assertions: `expect(element).toBeInTheDocument()` |
| `jsdom` | Fake browser — tests run without Chrome |

---

## Test Location

Tests live next to the code they test in `__tests__/` folders:

```
src/components/Popup/
├── Popup.tsx                    <- component
└── __tests__/
    └── Popup.test.tsx           <- unit test

src/pages/settings/administration/
├── ProvidersManagementPage.tsx  <- page component
└── __tests__/
    ├── ProvidersManagementPage.test.tsx              <- unit test
    └── ProvidersManagementPage.integration.test.tsx  <- integration test
```

**Naming convention**:
- Unit tests: `ComponentName.test.tsx`
- Integration tests: `ComponentName.integration.test.tsx`

---

## Running Tests

```bash
# Run ALL tests (unit + integration)
npm test

# Run only unit tests (excludes integration)
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage

# Run a specific test file
npm test -- ProvidersManagementPage.integration
```

---

## Unit Tests vs Integration Tests

| Aspect | Unit Test | Integration Test |
|--------|-----------|-----------------|
| **Scope** | Single component in isolation | Component + Store + API chain |
| **Valtio** | Mocked (`useSnapshot` returns store as-is) | Real (valtio is not mocked) |
| **API** | Mocked via `vi.mock('@/utils/api')` | Mocked via global `fetch` stub |
| **What it tests** | Rendering, props, events | Full user flow: click → API → store → UI update |
| **Speed** | Fast | Slightly slower |
| **When to use** | Every component | Pages with CRUD operations or filters |

### Unit Test — tests rendering in isolation

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Integration Test — tests Component → Store → API → UI

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { mockAPI, navigate, renderPage } from '@/test-utils/integration'

describe('MyPage — Integration', () => {
  it('loads and displays items from API', async () => {
    mockAPI('GET', 'v1/my-endpoint', [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ])

    renderPage('/settings/my-page')

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })
})
```

---

## Integration Test Utilities

Import from `@/test-utils/integration`:

### `renderPage(path)`

Renders the full app at the given route using the real route config (`createMemoryRouter`). No wrapper options needed — the router is set up automatically.

```tsx
renderPage('/settings/providers')
renderPage('/auth/sign-in')
renderPage('/assistants')
```

> **Note:** `useNavigate` is mocked globally — navigate calls are captured by the spy but do **not** update the router history. Use `expect(navigate).toHaveBeenCalledWith(...)` to assert navigation; the target page will not render after navigation.

### `mockAPI(method, url, data, statusOrParams?)`

Registers a per-test API mock. The registry is cleared automatically in `afterEach`.

```tsx
import { mockAPI } from '@/test-utils/integration'

// Standard response (status 200)
mockAPI('GET', 'v1/providers', [{ id: '1', name: 'AWS' }])
mockAPI('POST', 'v1/providers', { id: 'new', name: 'GCP' })
mockAPI('DELETE', 'v1/providers/1', null)

// Error response — pass HTTP status as 4th argument
mockAPI('POST', 'v1/local-auth/login', { error: { message: 'Invalid credentials' } }, 401)
mockAPI('POST', 'v1/providers', { error: { message: 'Conflict' } }, 422)

// GET with specific query params — matches only when all params match (order-insensitive)
mockAPI('GET', 'v1/providers', [{ id: '1' }], { page: 0, active: true })
// matches:     v1/providers?page=0&active=true  ✅
// not matches: v1/providers?page=1&active=true  ❌
```

**Matching rules:**
- No 4th arg (or number status) → **prefix match**: `v1/providers` matches `v1/providers?page=0&...` but **not** `v1/providers/user`
- Object 4th arg → **exact match**: path must equal and all specified params must be present
- Last `mockAPI` call for the same key wins (Map overwrites)

> **Factory functions are not supported.** The old `mockRequest(method, url, (body) => computed)` pattern is removed. For dynamic responses based on request body, use `vi.spyOn(global, 'fetch')` in that specific test.

### `navigate`

The shared `vi.fn()` spy that replaces `useNavigate` globally. Import it to assert navigation calls:

```tsx
import { navigate } from '@/test-utils/integration'

await waitFor(() => {
  expect(navigate).toHaveBeenCalledWith('/dashboard')
})
```

Cleared automatically in `afterEach`.

---

## Key Concepts

### Valtio reactivity in integration tests

Integration tests use **real Valtio reactivity** — no `vi.unmock('valtio')` needed. The project uses a Vitest workspace (`vitest.workspace.ts`) with two separate projects:

- **`unit`** — loads `setupTests.tsx` + `setupTests.unit.ts` (which mocks `useSnapshot` and `@/utils/api`)
- **`integration`** — loads `setupTests.tsx` only (valtio and the real fetch path are never mocked)

This means integration tests get real store reactivity out of the box:

1. Component calls store method (e.g., `store.loadItems()`)
2. Store makes API call → fetch mock intercepts → receives data → updates its state
3. Real `useSnapshot` detects the change → triggers React re-render
4. Component shows the new data

### How API mocking works

`setupTests.tsx` stubs `global.fetch` once via `vi.stubGlobal`. The stub intercepts **all** fetch calls — both the `@/utils/api` wrapper and raw `fetch` calls in stores. Per-test mocks registered via `mockAPI` take priority; unregistered endpoints fall back to `globalDefaults`.

Unit tests are insulated via `vi.mock('@/utils/api')` in `setupTests.unit.ts` — the module mock intercepts before fetch is reached, so unit tests are unaffected by the global fetch stub.

```tsx
// beforeEach for common setup
beforeEach(() => {
  mockAPI('GET', 'v1/providers', [{ id: '1', name: 'AWS' }])
})

// per-test override for specific scenarios
it('shows error state', async () => {
  mockAPI('GET', 'v1/providers', { error: 'Service unavailable' }, 503)
  ...
})
```

### Query Priority (Prefer `getByRole`)

Use role-based queries over text queries. They test what the user sees AND verify the correct element type:

| Priority | Query | When to Use | Example |
|----------|-------|-------------|---------|
| 1st | `getByRole` | Buttons, headings, column headers | `getByRole('button', { name: 'Add Category' })` |
| 2nd | `findByRole` | Same as above, but async (waits for element) | `findByRole('button', { name: 'Delete' })` |
| 3rd | `getByPlaceholderText` | Form inputs | `getByPlaceholderText('Category Name')` |
| 4th | `getByLabelText` | Labelled form inputs | `getByLabelText('Email address')` |
| 5th | `getByText` | Data content (table cells, messages) | `getByText('Productivity')` |
| Last | `getByTestId` | When role/text queries conflict | `getByTestId('confirm-button')` |

**Common role mappings:**
```tsx
// Buttons
screen.getByRole('button', { name: 'Add Category' })

// Headings (<h1>–<h6>)
screen.getByRole('heading', { name: 'Categories management' })

// Table column headers (<th>)
screen.getByRole('columnheader', { name: 'Name' })

// Async — wait + get reference in one step (useful for dropdown items)
const editBtn = await screen.findByRole('button', { name: 'Edit' })
await user.click(editBtn)
```

**When `getByRole` conflicts (multiple matches):** Use `getByTestId` as fallback. Example: dropdown "Delete" button and modal "Delete" button are both in the DOM — use `getByTestId('confirm-button')` for the modal button.

### Finding Action Buttons in Rows

Use `within()` from testing library to scope queries to a specific table row:

```tsx
import { within } from '@testing-library/react'

// Find the row containing "Item Name"
const row = screen.getByText('Item Name').closest('tr')!
const rowScope = within(row)

// Find the NavigationMore (three-dot menu) button within that row
const actionButton = rowScope.getByTestId('actions-menu')
await user.click(actionButton)
```

### Mocking SettingsLayout

`SettingsLayout` and `useVueRouter` are mocked globally in `setupTests.tsx` — no need to mock them in individual test files. The SettingsLayout mock avoids pulling in the Layout → Sidebar → SidebarNavigation dependency chain.

---

## Gotchas (Common Pitfalls)

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Using `mockRequest` (old API) | TypeScript error, test fails | Replace with `mockAPI` — factory functions are removed |
| Passing JSX to `renderPage` | TypeScript error | Pass a route path string: `renderPage('/settings/providers')` |
| Wrong API URL in mock | Store returns `null` instead of expected data | Check exact URL + method in store file |
| GET with query params not matching | Mock returns null | Use `mockAPI('GET', 'v1/endpoint', data, { param: value })` for exact match |
| Sub-path shadowing | `v1/assistants` mock matches `v1/assistants/user` | Prefix match stops at `?`, not `/` — use exact path for sub-resources |
| `SettingsLayout` crashes | "proxyState is not iterable" | Already mocked globally in `setupTests.tsx` |
| `NavigationMore` dropdown not found | Assertions fail after clicking action button | Use `waitFor()` — dropdown renders asynchronously |
| Confirmation modal button confusion | Wrong "Delete" button clicked | Use `getByTestId('confirm-button')` to find modal confirm button |
| Post-navigation page not rendered | Target page never appears after `navigate(path)` | Expected — `useNavigate` is a spy, not real router. Assert `expect(navigate).toHaveBeenCalledWith(path)` instead |

---

## Checklist: Writing a New Integration Test

1. [ ] File name: `ComponentName.integration.test.tsx` in `__tests__/` folder
2. [ ] Import `{ mockAPI, navigate, renderPage }` from `@/test-utils/integration`
3. [ ] `mockAPI(...)` called before `renderPage(...)` with correct URLs from the store file
4. [ ] `renderPage('/route/path')` — path string, not JSX
5. [ ] Prefer `getByRole`/`findByRole` over `getByText` for interactive elements
6. [ ] Use `waitFor()` for async assertions
7. [ ] Test user-visible behavior, not internal store state

---

**Related Guides**:
- [Component Patterns](../components/component-patterns.md) - Component structure
- [State Management](../patterns/state-management.md) - Valtio store patterns
- [API Integration](../development/api-integration.md) - API client usage
