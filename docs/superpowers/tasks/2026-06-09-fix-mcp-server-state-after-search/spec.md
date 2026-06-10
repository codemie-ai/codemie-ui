# Fix MCP Server State After Search

**Issue**: [EPMCDME-12640](https://jiraeu.epam.com/browse/EPMCDME-12640)

## Problem

When users search for MCP servers in the catalog modal before adding one, all previously-added MCP servers incorrectly display as unavailable (red highlight with "This MCP server is no longer available" message) after canceling the add flow.

### Reproduction Steps

1. Edit assistant
2. Click "Browse Catalog"
3. Search for an MCP server in the search bar
4. Click "Add" on a server card
5. Click "Next" in Step 1: Configure MCP Server
6. Wait for "Could not retrieve MCP tools from" error
7. Click "Cancel"
8. **Bug**: All existing MCP servers show red with "This MCP server is no longer available. You can safely delete it."

### Key Observation

Bug only occurs when adding after search. Adding directly from catalog (without searching) works correctly.

## Root Cause

The MCP store's `indexConfigs()` method **replaces** the entire `configs` array with search results:

```typescript
// Line 116 in src/store/mcp.ts
this.configs = data.configs ?? []
```

**Flow causing the bug**:

1. MCPToolkit loads existing servers' catalog entries via `getConfig()` → store contains `[catalogA, catalogB, catalogC]`
2. User searches in marketplace modal → `indexConfigs()` replaces entire array with search results → store now contains only `[searchResult1, searchResult2]`
3. MCPToolkit's `catalogMap` (line 83-86) rebuilds from store → missing catalogA, catalogB, catalogC
4. Unavailability check (lines 88-96) can't find catalog entries for existing servers → marks them unavailable
5. Red warning appears incorrectly

## Solution

Convert the store from "search results holder" to "additive catalog cache" by **merging** new entries instead of replacing all.

### Changes to `src/store/mcp.ts`

**In `indexConfigs()` method (line 116)**:

Replace:
```typescript
this.configs = data.configs ?? []
```

With:
```typescript
// Merge new configs into existing ones, preserving previously-fetched catalog entries
const incomingConfigs = data.configs ?? []
const incomingIds = new Set(incomingConfigs.map(c => c.id))

// Keep existing configs that aren't in the new result set
const preservedConfigs = this.configs.filter(c => !incomingIds.has(c.id))

// Merge: preserved entries + incoming entries
this.configs = [...preservedConfigs, ...incomingConfigs]
```

**Reasoning**: This preserves catalog entries fetched via `getConfig()` while still updating with fresh search results. The catalogMap in MCPToolkit never loses entries, preventing false "unavailable" states.

### No Other Changes Required

- **MCPToolkit.tsx**: Current unavailability logic works correctly once store stops losing data
- **useMarketplaceModal.ts**: No changes needed, continues calling `indexConfigs()` as before
- **getConfig() method**: Already appends without replacing, continues working

## Edge Cases

| Scenario | Behavior |
|---|---|
| User searches, adds, cancels before config | Entry stays in cache (harmless - catalog is public data) |
| Catalog entry becomes inactive | `is_active` check (line 93 MCPToolkit.tsx) still catches it |
| Store grows unbounded | Catalog is finite (~hundreds entries), grows only during active session |
| Same server re-fetched with updates | Incoming entry replaces old one (by ID deduplication) |

## Testing

1. **Reproduce original bug** → verify it exists
2. **Apply fix** → search in catalog, add/cancel → existing servers remain available
3. **Verify legitimate unavailable detection** → deactivate catalog entry → server shows as unavailable
4. **Verify search results update** → search different terms → results change correctly

## Files Changed

- `src/store/mcp.ts` - Change `indexConfigs()` to merge instead of replace
