# Integration Tester Skill

AI skill that writes integration tests for React pages following the Testing Trophy approach.

---

## What is an integration test here?

An integration test verifies the full **Component → Store → API → UI** chain from the user's perspective:

```
renderPage('/auth/sign-in')
  → user fills form and clicks submit
  → authStore.login() is called (real Valtio store)
  → global fetch is intercepted (mocked via mockAPI)
  → store updates state
  → component re-renders
  → assert: navigate('/') was called / error toast shown
```

**What runs for real:** the page component, all child components, custom hooks, Valtio store logic.

**What is mocked:** global `fetch` (intercepts both `@/utils/api` wrapper and raw `fetch` calls), `useNavigate`, `SettingsLayout`, `toaster`, `useVueRouter`, `localStorage`.

**What tests do NOT touch:** store internals, store state, store methods — only HTTP responses and router calls.

---

## How to invoke

```
# Coverage-driven — measures branch coverage on changed files, writes tests where Branch < 70%
/integration-tester

# Explicit target — skip coverage, write tests for a specific page
/integration-tester SignInPage
/integration-tester ProvidersManagementPage
```

---

## File naming

Tests live next to the component in `__tests__/`:

```
src/pages/settings/administration/
├── ProvidersManagementPage.tsx
└── __tests__/
    ├── ProvidersManagementPage.test.tsx              ← unit test (don't touch)
    └── ProvidersManagementPage.integration.test.tsx  ← integration test (this skill writes)
```

---

## Infrastructure

| File | Purpose |
|------|---------|
| `src/test-utils/_mock-state.ts` | Shared `requestRegistry` Map and `navigate` vi.fn() singleton |
| `src/setupTests.tsx` | Global setup — stubs `global.fetch`, mocks `useNavigate`, browser globals |
| `src/test-utils/integration.tsx` | `mockAPI()`, `navigate`, `renderPage()` — everything tests import |

### `mockAPI` — mock API calls per test

```tsx
import { mockAPI, navigate, renderPage } from '@/test-utils/integration'

// Standard response (status 200)
mockAPI('GET', 'v1/providers', [{ id: '1', name: 'AWS' }])
mockAPI('POST', 'v1/providers', { id: 'new', name: 'GCP' })
mockAPI('PUT', 'v1/providers/1', { id: '1', name: 'Updated' })
mockAPI('DELETE', 'v1/providers/1', null)

// Error response — pass HTTP status as 4th argument
mockAPI('POST', 'v1/local-auth/login', { error: { message: 'Invalid credentials' } }, 401)

// GET with specific query params — exact match (order-insensitive)
mockAPI('GET', 'v1/providers', [{ id: '1' }], { page: 0, active: 'true' })
```

**Matching rules:**
- No params → prefix match: `v1/providers` matches `v1/providers?page=0&...` but NOT `v1/providers/user`
- Object 4th arg → exact match: path + all specified params must match

> ⚠️ **Factory functions removed.** The old `mockRequest(method, url, (body) => computed)` pattern no longer exists. For dynamic responses, use `vi.spyOn(global, 'fetch')` in that specific test.

Registry is cleared automatically in `afterEach` — no manual cleanup needed.

### `navigate` — assert router calls

```tsx
import { navigate } from '@/test-utils/integration'

// After user action:
await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'))
await waitFor(() => expect(navigate).toHaveBeenCalledWith('/auth/sign-in'))
```

`navigate` is the same `vi.fn()` that replaces `useNavigate` globally — all calls from components and hooks are captured. Cleared automatically in `afterEach`.

### `renderPage` — render with full router context

```tsx
import { renderPage } from '@/test-utils/integration'

// Pass the route path — uses real route config (createMemoryRouter)
renderPage('/settings/providers')
renderPage('/auth/sign-in')
renderPage('/assistants')
```

`useNavigate` is mocked globally — no real navigation happens, but all `navigate(path)` calls are recorded on the `navigate` spy.

---

## Minimal test structure

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { mockAPI, navigate, renderPage } from '@/test-utils/integration'

describe('MyPage — Integration', () => {
  const user = userEvent.setup()

  it('loads and displays items on mount', async () => {
    mockAPI('GET', 'v1/my-endpoint', [{ id: '1', name: 'Item 1' }])
    renderPage('/settings/my-page')
    await waitFor(() => expect(screen.getByText('Item 1')).toBeInTheDocument())
  })

  it('shows empty state when no items', async () => {
    mockAPI('GET', 'v1/my-endpoint', [])
    renderPage('/settings/my-page')
    await waitFor(() => expect(screen.getByText(/no items/i)).toBeInTheDocument())
  })

  it('navigates after creating item', async () => {
    mockAPI('GET', 'v1/my-endpoint', [])
    mockAPI('POST', 'v1/my-endpoint', { id: 'new', name: 'New Item' })
    renderPage('/settings/my-page')

    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/my-page')
    })
  })
})
```

---

## Run tests

```bash
# All tests
npm test

# Integration tests only
npm run test:integration

# Specific file
npm test -- ProvidersManagementPage.integration

# Coverage on changed files (vs main)
npx vitest run --coverage --changed main

# Coverage on a specific test file (for pages already merged to main)
npx vitest run --coverage src/pages/PATH/__tests__/Page.integration.test.tsx
```
