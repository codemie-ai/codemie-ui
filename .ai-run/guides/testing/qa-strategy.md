# QA Strategy

**Last assessed**: 2026-06-08

## Test Frameworks

| Framework | Type | Config file | Test directories |
|---|---|---|---|
| Vitest 1.6.1 + React Testing Library 16.3 | unit | `vitest.workspace.ts`, `vite.config.ts` | `src/**/__tests__/` |
| Vitest 1.6.1 + React Testing Library 16.3 | integration | `vitest.workspace.ts` | `src/**/__tests__/` |
| pytest 8.4.1 + pytest-playwright | API + UI E2E | `../codemie-sdk/test-harness/pyproject.toml` | `../codemie-sdk/test-harness/codemie_test_harness/tests/` |

## Test Types in Use

### Unit Tests (current repo)

- **Location**: `src/**/__tests__/`
- **Pattern**: `*.test.ts`, `*.test.tsx` (excludes `*.integration.test.*`)
- **Run command**: `npm run test:unit`
- **Vitest project name**: `unit`
- **Setup**: `src/setupTests.tsx` + `src/setupTests.unit.ts`
- **Mocking strategy**: `@/utils/api` mocked via `vi.mock`; Valtio `useSnapshot` returns store directly (no real reactivity)
- **Example**: `src/components/Popup/__tests__/Popup.test.tsx`

### Integration Tests (current repo)

- **Location**: `src/**/__tests__/`
- **Pattern**: `*.integration.test.ts`, `*.integration.test.tsx`
- **Run command**: `npm run test:integration`
- **Vitest project name**: `integration`
- **Setup**: `src/setupTests.tsx` only (real Valtio reactivity, real stores, API layer mocked via `global.fetch` stub)
- **Utilities**: `src/test-utils/integration.tsx` — `renderPage(path)`, `mockAPI(method, url, data)`, `navigate` spy
- **Reactive flow**: Component → store method → fetch stub → proxy state update → re-render → DOM assert
- **Example**: `src/authentication/local/__tests__/SignInPage.integration.test.tsx`

### API + UI End-to-End Tests (external repo)

- **Location**: `../codemie-sdk/test-harness/codemie_test_harness/tests/`
- **Framework**: pytest 8.4.1 + pytest-playwright + pytest-reportportal
- **Run command** (from `../codemie-sdk/test-harness/`):

  ```bash
  codemie-test-harness run smoke       # 5–10 min, quick API + UI
  codemie-test-harness run sanity      # ~2 min, CI/CD sanity
  codemie-test-harness run api         # 30–45 min, full API regression
  codemie-test-harness run ui          # 20–30 min, full Playwright UI
  pytest -n 8 -m "sanity" --reruns 2   # direct pytest invocation
  pytest -n 4 -m "ui" --reruns 2
  ```

- **Markers**: `sanity` | `smoke` | `api` | `ui` | `enterprise` | `skill` | `budget` | `user`
- **Test domains by count**: workflow (75), ui/Playwright (43), assistant (39), budgets (15), vendor (10), integrations (6), skill (5), llm (5), search (4), user (3), projects (2), conversations (2), e2e/analytics/webhook/etc (1 each)
- **Architecture**: `CodeMieClient` SDK fixture → real API calls against a live environment. UI tests use Playwright with page objects in `tests/ui/pageobject/`. `CredentialsManager` resolves credentials from `.env` → AWS Parameter Store.
- **Result reporting**: pytest-reportportal (ReportPortal)

## Coverage Targets

- **Line coverage target**: not configured
- **Branch coverage target**: not configured
- **Coverage command**: `npm run test:coverage`
- **Provider**: Istanbul (`@vitest/coverage-istanbul`)
- **Reporters**: `text`, `lcov`
- **Coverage excludes**: `**/__tests__/**`, `**/assets/**`, `**/*config.ts`, `**/*.cjs`, `**/main.ts`, `**/api.ts`, `**/setupTests*`

## Conventions

### Current repo (Vitest)

- **Test file naming**: `ComponentName.test.tsx` (unit), `ComponentName.integration.test.tsx` (integration)
- **Test file location**: co-located with source in `__tests__/` subdirectory
- **Test style**: `describe` / `it` blocks with AAA (Arrange / Act / Assert)
- **Cleanup**: `afterEach(cleanup)` required in unit tests; shared `afterEach` in `setupTests.tsx` handles registry/fetch/navigate resets for integration tests
- **`vi.mock()` placement**: module level only — never inside `describe` or `it`
- **Query priority**: `getByRole` > `findByRole` > `getByPlaceholderText` > `getByLabelText` > `getByText` > `getByTestId`

### External repo (pytest)

- **Test file naming**: `test_<feature>_<scenario>.py`
- **Test function naming**: `test_<action>_<subject>_<condition>`
- **Fixtures**: session-scoped `client`, `default_llm`, `*_utils` wrappers; function-scoped for JIRA/Confluence integrations
- **Credentials**: always via `CredentialsManager.get_parameter("KEY_NAME")`, never `os.getenv()` directly
- **Parallel execution**: `pytest -n N`; tests requiring sequential execution carry `not_for_parallel_run` marker

## Anti-Patterns (observed in this codebase)

| Bad | Better | Why |
|---|---|---|
| `vi.mock()` inside `describe` or `it` | Place at module top level | Vitest hoists mocks; placement inside blocks causes unpredictable behaviour |
| Omitting `afterEach(cleanup)` in unit tests | Always call `cleanup` | Leaks DOM state between tests in the same suite |
| `mockAPI('GET', 'v1/assistants', ...)` matching `v1/assistants/user` | Use exact sub-path `v1/assistants/user` | `mockAPI` prefix-matches on path, stops at `?` not `/` |
| Assert navigation by checking rendered page | `expect(navigate).toHaveBeenCalledWith(path)` | `useNavigate` is a spy — router history does not update |
| `getByTestId` for every interactive element | Use `getByRole` / `findByRole` first | Role queries verify element type and visible label simultaneously |
| `os.getenv()` directly in harness tests | `CredentialsManager.get_parameter("KEY")` | Credentials may come from AWS Parameter Store, not env |
| `except Exception: pass` in test/page-object code | Only catch with a concrete recovery action | Silent catches hide product defects — test passes, feature is broken |

## External Sources

### Test Case Management
- **System**: none
- **Adapter**: not configured

### QA Documentation
- **System**: none
- **Adapter**: not configured
- **Paths**: n/a

### External Test Repositories
- `../codemie-sdk/test-harness` — pytest + Playwright regression suite covering API, UI, workflow, assistant, and integrations against a live environment. Always a sibling directory of this repo.
