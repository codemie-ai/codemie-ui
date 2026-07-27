# Spec: AWS Integration Load-more Pagination Tests (EPMCDME-13483)

## Goal

Add integration tests that verify `AwsEntityList`'s cursor/nextToken "Load more" pagination behaviour
for all five AWS entity types: Agents, Flows, Knowledge Bases, Guardrails, and AgentCore Runtimes.
No production-code changes. All tests must pass under `npm run test:integration`.

## Scope

One new test file:

```
src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx
```

The file lives in `__tests__/` (double-underscore) so the vitest integration project glob
`**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)` discovers it.

## Subject Under Test

`AwsEntityList` (`src/pages/settings/components/vendor/AwsEntityList.tsx`):

- renders a "Load more..." button when `!isLoading && vendorEntities.length > 0 && vendorEntitiesPagination.nextToken`
- clicking the button calls `awsVendorStore.getVendorEntities(originType, entityType, settingId, true)`,
  which appends the next page to `vendorEntities` and passes `next_token` as a query parameter
- hides the button when `nextToken` is null

## Entity Matrix

| Label | API path (no query string) | Route | settingId source | VendorEntityType |
|---|---|---|---|---|
| assistants | `v1/vendors/aws/assistants` | `/settings/aws/assistants/test-setting` | `mockRouterState.currentRoute.value.params.settingId` | `assistant` |
| workflows | `v1/vendors/aws/workflows` | `/settings/aws/workflows/test-setting` | `mockRouterState.currentRoute.value.params.settingId` | `workflows` |
| knowledge-bases | `v1/vendors/aws/knowledgebases` | `/settings/aws/data-sources/test-setting` | `mockRouterState.currentRoute.value.params.settingId` | `knowledgebases` |
| guardrails | `v1/vendors/aws/guardrails` | `/settings/aws/guardrails/test-setting` | `mockRouterState.currentRoute.value.params.settingId` | `guardrails` |
| agentcore-runtimes | `v1/vendors/aws/agentcore-runtimes` | `/settings/aws/agentcore-runtimes/test-setting` | real `useParams` (react-router URL) | `agentcoreRuntimes` |

## Config Type and Fixture Shape

```ts
type EntityConfig = {
  label: string                   // human label for describe title
  apiPath: string                 // URL key without query string
  route: string                   // renderPage() path
  setup?: () => void              // called before renderPage()
  teardown?: () => void           // called after each test
}
```

Minimum fixture shape for `VendorEntity` items:

```ts
{ id: 'entity-p1-${label}', name: '${Label} Page-1 Entity', description: 'desc', status: 'PREPARED' }
{ id: 'entity-p2-${label}', name: '${Label} Page-2 Entity', description: 'desc', status: 'PREPARED' }
```

Items must have unique `id` and `name` values so each assertion targets only the intended entity.

## Describe Suite Name

Use `'AWS $label — Load-more pagination'` as the `describe.each` title. `$label` interpolates from
the `label` property of each `EntityConfig` object in the array passed to `describe.each`.

## Mock Registration Strategy

`beforeEach` only configures router state and resets the store. **Each individual test registers its own
`mockAPI` responses.** This eliminates ambiguity between tests that need one page (T1, T2) and tests that
need two sequential responses (T3).

```
beforeEach  → setup?.()  (router params)   + store reset
afterEach   → teardown?.() (router cleanup) + store reset
```

## Params Filtering on Mock Registration

`requestRegistry` is keyed by `'METHOD:url'` (no query string), but `mockAPI` accepts an optional
`params` object that further filters by URL query params. **All mock registrations MUST use params
filtering** so the test verifies that the frontend passes the correct query parameters:

- Page-1 registration: `mockAPI('GET', apiPath, page1Response, { setting_id: 'test-setting', per_page: 8 })`
- Page-2 registration (T3 only): `mockAPI('GET', apiPath, page2Response, { setting_id: 'test-setting', per_page: 8, next_token: 'token-page2' })`

Because `requestRegistry` can only hold one entry per URL key at a time, the two-stage approach in T3 is:
register page 1 → render → wait for page-1 items → overwrite with page-2 registration → click → assert.
The page-2 registration MUST include `next_token` in its params filter so the test would fail if the
frontend omitted or corrupted the cursor value.

## Test Cases (per entity)

### T1 – shows "Load more..." button when `next_token` is present

1. `mockAPI('GET', apiPath, { data: [page1Item], pagination: { next_token: 'token-page2' } }, { setting_id: 'test-setting', per_page: 8 })`
2. `renderPage(route)`
3. `await screen.findByText(page1Item.name)` — positive settle-anchor
4. `expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()`

### T2 – hides "Load more..." button when `next_token` is null

1. `mockAPI('GET', apiPath, { data: [page1Item], pagination: { next_token: null } }, { setting_id: 'test-setting', per_page: 8 })`
2. `renderPage(route)`
3. `await screen.findByText(page1Item.name)` — positive settle-anchor before negative assertion
4. `expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()`

### T3 – appends page-2 items on "Load more..." click

1. `mockAPI('GET', apiPath, { data: [page1Item], pagination: { next_token: 'token-page2' } }, { setting_id: 'test-setting', per_page: 8 })`
2. `renderPage(route)`
3. `await screen.findByText(page1Item.name)` — page-1 settle-anchor
4. Overwrite: `mockAPI('GET', apiPath, { data: [page2Item], pagination: { next_token: null } }, { setting_id: 'test-setting', per_page: 8, next_token: 'token-page2' })`
5. `const user = userEvent.setup()` then `await user.click(screen.getByRole('button', { name: /load more/i }))`
6. `await screen.findByText(page2Item.name)` — page-2 settle-anchor
7. `expect(screen.getByText(page1Item.name)).toBeInTheDocument()` — page-1 items still present (append)
8. `expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()` — button gone

## Key Implementation Constraints

### Import order
Use normal ESLint-compatible import order: external packages first, then internal (`@/`) imports
alphabetically. Do not add ESLint-disable comments or manual ordering workarounds.

### userEvent v14 async interactions
Always use `const user = userEvent.setup()` and `await user.click(...)`. Never use the legacy
synchronous `userEvent.click()`.

### Store reset in afterEach
```ts
awsVendorStore.vendorEntities = []
awsVendorStore.vendorEntitiesPagination = { nextToken: null, perPage: 8 }
awsVendorStore.loading.entities = false
```
(Default `perPage` for `vendorEntitiesPagination` is 8 per `src/store/vendor.ts:184`.)

### useVueRouter mock for 4 pages
```ts
// setup
mockRouterState.currentRoute.value.params = { settingId: 'test-setting' }
// teardown
mockRouterState.currentRoute.value.params = {}
```
`mockRouterState` is exported from the auto-mock at `@/hooks/__mocks__/useVueRouter`.

### AgentCore Runtimes — no manual router mock needed
`AwsAgentCoreRuntimesListPage` uses real `useParams<{settingId}>()` from react-router, so the URL
param in `/settings/aws/agentcore-runtimes/test-setting` is picked up automatically by the memory
router. No `setup` hook required.

## File Structure

```
describe('AWS %s — Load-more pagination')
  describe.each(ENTITY_CONFIGS)(label, apiPath, route, setup, teardown)
    beforeEach  → setup?.() (router params only, no mockAPI)  + store reset
    afterEach   → teardown?.() + store reset
    it('shows Load more button when next_token present')        // T1: own mockAPI
    it('hides Load more button when next_token is null')        // T2: own mockAPI
    it('appends page 2 items on Load more click')               // T3: own two-stage mockAPI
```

## Out of Scope

- Unit tests for `AwsEntityList` (no mocking of stores)
- Testing install/uninstall actions
- Testing entity-detail navigation
- Modifying any production code
