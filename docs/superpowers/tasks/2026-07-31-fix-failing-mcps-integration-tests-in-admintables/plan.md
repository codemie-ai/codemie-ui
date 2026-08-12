# Fix Failing MCPs Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 5 failing MCPs table tests in `AdminTablesPagination.integration.test.tsx` by eliminating the duplicate `{server.name}` text node introduced by the accessibility fix on this branch.

**Architecture:** `MCPServerActions.tsx` currently adds a new `<span className="sr-only">{server.name}</span>` so that `NavigationMore`'s `contextId` prop can reference it via `aria-labelledby`. The correct pattern — used by `UsersManagementPage` and `CategoriesManagementPage` on this same branch — is to add an `id` to the **existing** name element and reference that. Moving the `id` to the existing name button in `columnRenderers.tsx` removes the duplicate DOM text node without changing the ARIA semantics.

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library

## Global Constraints

- Do not weaken accessibility: `NavigationMore` button must retain `contextId` so `aria-labelledby` still provides a compound label ("More options Alpha MCP").
- No changes to test files.
- Follow the naming convention already established on this branch: `admin-mcp-name-${item.id}`.

---

### Task 1: Relocate the ARIA anchor id from a new span to the existing name button

**Files:**
- Modify: `src/pages/settings/administration/utils/columnRenderers.tsx:33`
- Modify: `src/pages/settings/administration/components/MCPServerActions.tsx:83-85`
- Test (read-only, no edits): `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `MCPConfig.id` and `MCPConfig.name` (already in scope in both files)
- Produces: `id="admin-mcp-name-{item.id}"` on the name button; `contextId="admin-mcp-name-{server.id}"` on `NavigationMore` (unchanged); no sr-only span with `server.name`

- [ ] **Step 1: Confirm test currently fails with "multiple elements"**

```bash
cd /Users/Dmytro_Pishchanetskyi/repos/codemie-dev/codemie-ui
npx vitest run "AdminTablesPagination.integration" --testNamePattern="MCPs.*renders first" 2>&1 | grep -E "Found multiple|Error|FAIL|✓|✗" | head -20
```

Expected: `TestingLibraryElementError: Found multiple elements with the text: Alpha MCP`

- [ ] **Step 2: Add `id` to the existing name button in `columnRenderers.tsx`**

In `src/pages/settings/administration/utils/columnRenderers.tsx`, change line 33:

```tsx
// BEFORE:
  name: (item: MCPConfig) => (
    <button
      onClick={() => handleViewDetails(item)}
      className="text-left text-text-primary hover:text-electric-main transition-colors cursor-pointer font-medium"
    >
      {item.name}
    </button>
  ),

// AFTER:
  name: (item: MCPConfig) => (
    <button
      id={`admin-mcp-name-${item.id}`}
      onClick={() => handleViewDetails(item)}
      className="text-left text-text-primary hover:text-electric-main transition-colors cursor-pointer font-medium"
    >
      {item.name}
    </button>
  ),
```

- [ ] **Step 3: Remove the duplicate sr-only span from `MCPServerActions.tsx`**

In `src/pages/settings/administration/components/MCPServerActions.tsx`, remove lines 83-85:

```tsx
// BEFORE (lines 79-86):
  const serverNameId = `admin-mcp-name-${server.id}`

  return (
    <div className="flex justify-end">
      <span id={serverNameId} className="sr-only">
        {server.name}
      </span>
      <NavigationMore hideOnClickInside renderInRoot items={menuActions} contextId={serverNameId} />

// AFTER (lines 79-83):
  const serverNameId = `admin-mcp-name-${server.id}`

  return (
    <div className="flex justify-end">
      <NavigationMore hideOnClickInside renderInRoot items={menuActions} contextId={serverNameId} />
```

- [ ] **Step 4: Run all 5 MCPs tests and verify they pass**

```bash
npx vitest run "AdminTablesPagination.integration" --testNamePattern="MCPs" 2>&1 | grep -E "✓|✗|FAIL|PASS|Tests" | head -20
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Run full integration test file to check for regressions**

```bash
npx vitest run "AdminTablesPagination.integration" 2>&1 | tail -10
```

Expected: All 35 tests pass (7 table configs × 5 tests each).

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/utils/columnRenderers.tsx
git add src/pages/settings/administration/components/MCPServerActions.tsx
git commit -m "EPMCDME-8420: fix duplicate sr-only span causing findByText ambiguity in MCPs tests

Move admin-mcp-name id from new sr-only span to existing name button in
columnRenderers, matching the pattern used by UsersManagementPage and
CategoriesManagementPage. NavigationMore contextId still references the
same id so aria-labelledby semantics are unchanged."
```
