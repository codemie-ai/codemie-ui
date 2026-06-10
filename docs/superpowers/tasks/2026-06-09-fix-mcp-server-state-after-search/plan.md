# Fix MCP Server State After Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bug where searching in MCP catalog causes existing servers to incorrectly show as unavailable

**Architecture:** Change `mcpStore.indexConfigs()` from replace-all to merge strategy, preserving previously-fetched catalog entries while updating with new search results

**Tech Stack:** TypeScript, Valtio (state management), Vitest (testing)

---

## Task 1: Write failing test for catalog merge behavior

**Test-first: yes** — Test that indexConfigs merges new results with existing configs instead of replacing

**Files:**
- Create: `src/store/__tests__/mcp.test.ts`

- [ ] **Step 1: Write the failing test**

Create test file demonstrating the bug where search results clobber existing catalog entries:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mcpStore } from '@/store/mcp'

const mockApiGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('mcpStore.indexConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    mcpStore.configs = []
    mcpStore.loading = false
    mcpStore.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should merge new configs with existing ones instead of replacing', async () => {
    // Step 1: Simulate existing catalog entries fetched via getConfig()
    const existingConfig = {
      id: 'existing-1',
      name: 'Existing Server',
      description: 'Already added to assistant',
      categories: ['Development'],
      config: { command: 'npx', args: ['existing-server'] },
      required_env_vars: [],
      user_id: 'user-1',
      project: 'project-1',
      is_public: true,
      is_system: false,
      usage_count: 5,
      is_active: true,
    }
    mcpStore.configs = [existingConfig]

    // Step 2: Mock search API response with different configs
    const searchResults = [
      {
        id: 'search-1',
        name: 'Search Result 1',
        description: 'Found via search',
        categories: ['AI'],
        config: { command: 'npx', args: ['search-server-1'] },
        required_env_vars: [],
        user_id: 'user-2',
        project: 'project-1',
        is_public: true,
        is_system: false,
        usage_count: 10,
        is_active: true,
      },
      {
        id: 'search-2',
        name: 'Search Result 2',
        description: 'Also found via search',
        categories: ['API'],
        config: { command: 'npx', args: ['search-server-2'] },
        required_env_vars: [],
        user_id: 'user-3',
        project: 'project-1',
        is_public: true,
        is_system: false,
        usage_count: 3,
        is_active: true,
      },
    ]

    mockApiGet.mockResolvedValueOnce({
      json: async () => ({
        configs: searchResults,
        page: 0,
        per_page: 20,
        total: 2,
      }),
    })

    // Step 3: Call indexConfigs (simulating marketplace search)
    await mcpStore.indexConfigs({ search: 'test' })

    // Step 4: Assert existing config is preserved alongside new results
    expect(mcpStore.configs).toHaveLength(3)
    expect(mcpStore.configs.find((c) => c.id === 'existing-1')).toBeDefined()
    expect(mcpStore.configs.find((c) => c.id === 'search-1')).toBeDefined()
    expect(mcpStore.configs.find((c) => c.id === 'search-2')).toBeDefined()
  })

  it('should update existing config when re-fetched with same ID', async () => {
    // Step 1: Set up existing config
    const oldVersion = {
      id: 'config-1',
      name: 'Old Name',
      description: 'Old description',
      categories: ['Development'],
      config: { command: 'npx', args: ['old-args'] },
      required_env_vars: [],
      user_id: 'user-1',
      project: 'project-1',
      is_public: true,
      is_system: false,
      usage_count: 5,
      is_active: true,
    }
    mcpStore.configs = [oldVersion]

    // Step 2: Mock API with updated version
    const updatedVersion = {
      id: 'config-1',
      name: 'New Name',
      description: 'Updated description',
      categories: ['AI'],
      config: { command: 'npx', args: ['new-args'] },
      required_env_vars: [],
      user_id: 'user-1',
      project: 'project-1',
      is_public: true,
      is_system: false,
      usage_count: 10,
      is_active: true,
    }

    mockApiGet.mockResolvedValueOnce({
      json: async () => ({
        configs: [updatedVersion],
        page: 0,
        per_page: 20,
        total: 1,
      }),
    })

    // Step 3: Fetch again
    await mcpStore.indexConfigs()

    // Step 4: Assert updated version replaced old one
    expect(mcpStore.configs).toHaveLength(1)
    expect(mcpStore.configs[0].name).toBe('New Name')
    expect(mcpStore.configs[0].description).toBe('Updated description')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/store/__tests__/mcp.test.ts`

Expected: FAIL — first test fails because `indexConfigs()` replaces configs instead of merging

- [ ] **Step 3: Commit the failing test**

```bash
git add src/store/__tests__/mcp.test.ts
git commit -m "EPMCDME-12640: Add failing test for MCP catalog merge behavior"
```

---

## Task 2: Implement merge logic in indexConfigs

**Test-first: yes** — Implementation to make the test pass

**Files:**
- Modify: `src/store/mcp.ts:116`

- [ ] **Step 1: Implement merge logic**

Replace line 116 in `src/store/mcp.ts`:

```typescript
// OLD (line 116):
this.configs = data.configs ?? []

// NEW (replace with):
// Merge new configs into existing ones, preserving previously-fetched catalog entries
const incomingConfigs = data.configs ?? []
const incomingIds = new Set(incomingConfigs.map((c) => c.id))

// Keep existing configs that aren't in the new result set
const preservedConfigs = this.configs.filter((c) => !incomingIds.has(c.id))

// Merge: preserved entries + incoming entries
this.configs = [...preservedConfigs, ...incomingConfigs]
```

Complete context for the change (lines 111-122):

```typescript
      const response = await api.get(url)
      const data = await response.json()

      console.log('[MCP Store] Received response:', data)

      // Merge new configs into existing ones, preserving previously-fetched catalog entries
      const incomingConfigs = data.configs ?? []
      const incomingIds = new Set(incomingConfigs.map((c) => c.id))

      // Keep existing configs that aren't in the new result set
      const preservedConfigs = this.configs.filter((c) => !incomingIds.has(c.id))

      // Merge: preserved entries + incoming entries
      this.configs = [...preservedConfigs, ...incomingConfigs]

      this.pagination = {
        page: data.page ?? 0,
        perPage: data.per_page ?? 20,
        totalPages: Math.ceil((data.total ?? 0) / (data.per_page ?? 20)),
        totalCount: data.total ?? 0,
      }
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test src/store/__tests__/mcp.test.ts`

Expected: PASS — both tests pass

- [ ] **Step 3: Run full test suite**

Run: `npm test`

Expected: All tests pass (no regressions)

- [ ] **Step 4: Commit the implementation**

```bash
git add src/store/mcp.ts
git commit -m "EPMCDME-12640: Merge catalog configs instead of replacing to preserve existing entries"
```

---

## Task 3: Manual verification

**Test-first: no** — Manual testing to verify bug fix in UI

**Files:**
- None (manual testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

Expected: Dev server starts on configured port

- [ ] **Step 2: Reproduce original bug (before fix)**

If running with old code:
1. Navigate to assistant edit form
2. Add an MCP server (without searching first) - note it shows as available
3. Click "Browse Catalog"
4. Search for a different MCP server
5. Click "Add" on search result, then "Next", wait for error, click "Cancel"
6. **Bug**: Previously-added server now shows red "unavailable" message

- [ ] **Step 3: Verify fix (with merge logic)**

With merge logic in place:
1. Navigate to assistant edit form
2. Add an MCP server (without searching first)
3. Click "Browse Catalog"
4. Search for a different MCP server  
5. Click "Add" on search result, then "Next", wait for error, click "Cancel"
6. **Expected**: Previously-added server still shows as available (green/normal state)

- [ ] **Step 4: Verify search results still work correctly**

1. Click "Browse Catalog" again
2. Search for "github"
3. **Expected**: Search results appear correctly
4. Clear search, search for "filesystem"
5. **Expected**: Different search results appear (not cached from previous search)

- [ ] **Step 5: Verify legitimate unavailable detection still works**

This requires access to catalog admin:
1. If possible, mark a catalog entry as `is_active: false` or `is_public: false`
2. Add that server to an assistant
3. **Expected**: Server shows as unavailable with red warning

(If catalog admin not accessible, skip this step - existing tests verify the is_active/is_public logic is untouched)

- [ ] **Step 6: Document manual test results**

Add comment to Jira ticket EPMCDME-12640 documenting:
- Bug reproduced before fix: ✓
- Bug fixed after implementation: ✓
- Search functionality still works: ✓
- Legitimate unavailable detection works: ✓ (or skipped if no admin access)

---

## Self-Review

**Spec coverage:**
- ✓ Root cause addressed: indexConfigs() now merges instead of replaces (Task 2)
- ✓ Test coverage: Merge behavior tested, update behavior tested (Task 1)
- ✓ Manual verification: UI testing covers reproduction steps from spec (Task 3)
- ✓ Edge cases: Test covers updates to existing IDs (deduplication logic)

**Placeholder scan:**
- ✓ No TBD/TODO/placeholders
- ✓ All code blocks complete
- ✓ All commands include expected output

**Type consistency:**
- ✓ `mcpStore.configs` used consistently
- ✓ `MCPConfig` type from existing codebase
- ✓ Test mocks match actual API response shape

**Dependencies:**
- ✓ Task 1 must complete before Task 2 (TDD order)
- ✓ Task 2 must complete before Task 3 (implementation before manual test)
