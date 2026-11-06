# Testing Patterns

**Project**: CodeMie UI · **Stack**: TypeScript React · **Scope**: where unit and integration tests go, the shared setup they inherit, how integration tests mock the backend and how CI timeouts are handled; gate commands live in `.ai-run/guides/quality-gates.md`

## Organization and naming

### Rules
- R1. Write a `*.test.tsx` for the `unit` project (setup mocks `@/utils/api`, `@/utils/storage` and valtio `useSnapshot`) and a `*.integration.test.tsx` for `integration` (real valtio, global `fetch` stub); both load `src/setupTests.tsx` first. Evidence: `vite.config.ts::setupFiles`

## Test shape

### Rules
- R4. When a test times out only under CI coverage, raise `CI_COVERAGE_TEST_TIMEOUT_MS` instead of rewriting the test; it is the `testTimeout` of both projects. Evidence: `vite.config.ts::CI_COVERAGE_TEST_TIMEOUT_MS`

## Fixtures and factories

### Rules
- R2. Do not add `afterEach(cleanup)` or re-mock `@/utils/toaster`, `SettingsLayout` or `useVueRouter` in a test file; `src/setupTests.tsx` already does both for every test. Evidence: `src/setupTests.tsx::cleanup`

## Mocking

### Rules
- R3. In an integration test register responses with `mockAPI(method, url, data, status?)` and render with `renderPage(path)` from `@/test-utils/integration`. Evidence: `src/test-utils/integration.tsx::mockAPI`
