# Technical Research

**Task**: MCPServerActions columnRenderers NavigationMore contextId accessibility
**Generated**: 2026-07-31T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Fix failing MCPs integration tests in AdminTablesPagination.integration.test.tsx.

ROOT CAUSE (already confirmed via test run in this session — include in findings):
The branch EPMCDME-8420_no-accessible-name-for-triple-dots-button adds a new `<span id={serverNameId} className="sr-only">{server.name}</span>` in MCPServerActions.tsx (src/pages/settings/administration/components/MCPServerActions.tsx lines 83-85) to support ARIA labeling of the triple-dots NavigationMore button via contextId. This creates DUPLICATE text in the DOM — the item name "Alpha MCP" now appears both in the name column button (from columnRenderers.tsx) AND in the new sr-only span — causing RTL's findByText('Alpha MCP') to throw "Found multiple elements with the text: Alpha MCP".

THE PATTERN USED CORRECTLY ON THIS BRANCH:
Other pages on this branch solve this WITHOUT creating duplicate text by adding id to the EXISTING name element and referencing it via contextId:
- UsersManagementPage.tsx: adds id="user-name-{item.id}" to existing user name div
- CategoriesManagementPage.tsx: adds id="category-name-{item.id}" to existing name span

KEY FILES TO RESEARCH:
1. src/pages/settings/administration/utils/columnRenderers.tsx — the name column renderer (currently has no id on the name button)
2. src/pages/settings/administration/components/MCPServerActions.tsx — adds the duplicate sr-only span
3. src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx — the failing tests
4. src/components/NavigationMore/NavigationMore.tsx — the contextId prop behavior

REQUIRED FIX:
1. Add id=admin-mcp-name-{item.id} to the existing name button in columnRenderers.tsx
2. Remove the sr-only span from MCPServerActions.tsx (keep const serverNameId and keep contextId on NavigationMore)

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/utils/columnRenderers.tsx` — `createColumnRenderers` factory; `name` renderer returns a `<button>` with `{item.name}` text content (line 33-38); currently has no `id` attribute on this button.
- `src/pages/settings/administration/components/MCPServerActions.tsx` — `MCPServerActions` component; defines `serverNameId = \`admin-mcp-name-${server.id}\`` (line 79); renders a `<span id={serverNameId} className="sr-only">{server.name}</span>` (lines 83-85) which duplicates the name text in DOM; passes `contextId={serverNameId}` to `NavigationMore` (line 86).
- `src/components/NavigationMore/NavigationMore.tsx` — when `contextId` is set: suppresses `aria-label` (line 168), applies `aria-labelledby=\`${buttonId} ${contextId}\`` (line 169), and renders `<span className="sr-only">More options</span>` inside the trigger button (line 176). The `contextId` must reference an ID already existing in the DOM.
- `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` — parameterized integration test suite; MCPs config entry (lines 218-255) uses `page0Text: 'Alpha MCP'`; `screen.findByText('Alpha MCP')` is called in all 5 test cases (lines 400, 407, 416, 430, 437). RTL `findByText` fails when two DOM nodes match the text.
- `src/pages/settings/administration/MCPManagementPage.tsx` — top-level page; calls `createColumnRenderers` and renders `Table` with configs from `mcpStore`.
- `src/pages/settings/administration/UsersManagementPage.tsx` — reference pattern: line 225 attaches `id={\`user-name-${item.id}\`}` to the existing name element; line 299 passes `contextId={\`user-name-${item.id}\`}` to the actions component. No sr-only duplicate is introduced.

### Architecture and Layers Affected

- **UI/Presentation layer**: `columnRenderers.tsx` (name cell renderer), `MCPServerActions.tsx` (action cell component).
- **Shared component layer**: `NavigationMore.tsx` — `contextId` prop already implemented; no changes needed here.
- **Test layer**: `AdminTablesPagination.integration.test.tsx` — currently failing for the MCPs suite.

### Integration Points

- `createColumnRenderers` → renders `MCPServerActions` for the `actions` column; the `name` renderer and `actions` renderer must coordinate on the ID so `contextId` in `MCPServerActions` points to the `id` on the name button in `columnRenderers`.
- `MCPServerActions` → `NavigationMore` via `contextId` prop. `NavigationMore` builds `aria-labelledby` from `\`${buttonId} ${contextId}\`` where `contextId` must resolve to a real DOM element ID.
- `MCPManagementPage` → `createColumnRenderers` (memoized via `useMemo`).

### Patterns and Conventions

- **Branch convention (EPMCDME-8420)**: Add `id` to the **existing** name element; reference it via `contextId` in the actions component. Do NOT create a new sr-only element that duplicates visible text.
- `serverNameId` constant pattern: `\`admin-mcp-name-${server.id}\`` — already defined correctly in `MCPServerActions.tsx` line 79; just the sr-only span using it must be removed.
- `UsersManagementPage.tsx` and `CategoriesManagementPage.tsx` both demonstrate the correct two-file split: `id` on the renderer side, `contextId` on the actions side.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found specifically for this accessibility pattern — conventions derived from code exploration and the branch's own established pattern across `UsersManagementPage.tsx` and `CategoriesManagementPage.tsx`.

### Architectural Decisions

- EPMCDME-8420 branch decision: use `contextId` + `aria-labelledby` on `NavigationMore` to provide an accessible name for the triple-dots button without adding new visible or duplicate text. The name element that already exists in the row provides the label.
- `NavigationMore.tsx` already implements the full `contextId` contract (lines 168-169, 176) — no changes to that component are needed.

### Derived Conventions

- The `id` must be on the DOM element that already renders the name text — not on a new sr-only clone.
- Naming scheme: `admin-{entity}-name-{item.id}` (users use `user-name-{id}`, MCP fix will use `admin-mcp-name-{id}`).
- The `contextId` value in the actions component must match the `id` on the name element exactly.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` — covers pagination for 7 admin table pages (Users, Cost Centers, Categories, MCPs, Budgets, Projects, Activity Events). Each page gets 5 parameterized tests. MCPs suite currently failing on all 5 tests because `screen.findByText('Alpha MCP')` finds 2 DOM nodes.

### Testing Framework and Patterns

- **Framework**: Vitest + `@testing-library/react`.
- **Test utilities**: `renderPage(route)` renders the full page at a given route; `mockAPI('GET', url, response)` registers mock responses; `requestRegistry` allows per-test API response overrides.
- **RTL query used**: `screen.findByText(text)` (async, throws on multiple matches) and `screen.queryByRole(role, {name})` (sync, returns null on no match).
- **Pattern**: `beforeEach` mocks the page-0 API; individual tests layer additional mocks for page-1.

### Coverage Gaps

- No unit tests for `MCPServerActions.tsx` or `createColumnRenderers` — codegraph blast-radius confirms `no covering tests found` for both.
- No ARIA/accessibility-specific assertions in the current test suite; the tests exercise pagination mechanics only.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this fix.

### Configuration Files

None relevant to this fix.

### Feature Flags and Deployment Concerns

- `useMcpEnabled` is mocked to `[true, true]` in the test file (line 29) — MCPManagementPage renders without a real feature-flag check. No deployment concern for this fix.

---

## 6. Risk Indicators

- **Duplicate text in DOM**: `MCPServerActions.tsx` lines 83-85 render `{server.name}` in an sr-only span; the same text is rendered in the name button by `columnRenderers.tsx` line 37. RTL `findByText` is strict about uniqueness — this is the direct cause of 5 failing tests.
- **No unit tests for `MCPServerActions` or `createColumnRenderers`**: changes must be validated via the integration test suite only.
- **ID coupling across two files**: the `id` added to `columnRenderers.tsx` and the `serverNameId` const in `MCPServerActions.tsx` must use identical values (`admin-mcp-name-${item.id}` / `admin-mcp-name-${server.id}`); a mismatch would silently break the ARIA labeling without a test failure.
- **`server.id` vs `item.id` naming**: `columnRenderers.tsx` receives `MCPConfig` typed as `item`; `MCPServerActions.tsx` receives it as `server`. Both have `.id` — same field, different local variable name. Must keep consistent.
- No covering tests for `NavigationMore` itself (blast-radius confirms this) — but `NavigationMore` requires no changes for this fix.

---

## 7. Summary for Complexity Assessment

This is a minimal two-file surgical fix with a fully confirmed root cause. The change surface is exactly 2 files: `src/pages/settings/administration/utils/columnRenderers.tsx` (add one `id` prop to an existing `<button>`) and `src/pages/settings/administration/components/MCPServerActions.tsx` (remove 3 lines — the sr-only span — while keeping the `serverNameId` const and `contextId` prop). No new files, no new logic, no type changes.

The task follows a pattern already established twice on this branch: `UsersManagementPage.tsx` (line 225 + 299) and `CategoriesManagementPage.tsx` show the exact same split. MCPs was incorrectly implemented by introducing a sr-only duplicate instead of annotating the existing element. The fix restores consistency with the branch's own convention.

Test coverage posture: the 5 failing integration tests in `AdminTablesPagination.integration.test.tsx` will become green immediately after the fix, because `screen.findByText('Alpha MCP')` will again resolve to exactly one DOM node (the name button). No new tests need to be written. The risk factor is the ID coupling between the two files — reviewer should confirm `admin-mcp-name-${item.id}` in `columnRenderers.tsx` matches `admin-mcp-name-${server.id}` in `MCPServerActions.tsx` exactly.
