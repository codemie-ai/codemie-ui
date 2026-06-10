# Fix CSS Selector Bug in Toolkit Component

**Date:** 2026-06-10  
**Issue:** EPMCDME-12628  
**Status:** Approved

## Problem

When assistants with MCP tools are published, the Agent Details page crashes with:
```
SyntaxError: Failed to execute 'querySelectorAll' on 'Document': 
'#Fetch ? MCP Server' is not a valid selector.
```

### Root Cause

In `src/pages/assistants/components/AssistantDetails/components/UserMapping/components/Toolkit.tsx:95`, the `tool.name` is passed directly as the `id` prop to the Hint component:

```tsx
<Hint
  id={tool.name}  // ❌ Unsafe for names with spaces/special chars
  showDelay={0}
  position="right"
  hint={toolkitToolsDescriptions?.[tool.name] || tool.user_description}
/>
```

The Hint component uses this ID in PrimeReact's Tooltip component via `target={`#${id}`}`, which then calls `document.querySelector()`. When tool names contain invalid CSS selector characters (spaces, `?`, etc.), querySelector fails.

## Solution

Create a utility function to sanitize strings into valid HTML IDs, then use it at the Toolkit.tsx call site.

### Sanitization Function

Add to `src/utils/utils.ts`:

```typescript
export const sanitizeHtmlId = (str: string): string => {
  return 'hint-' + str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace invalid chars with hyphens
    .replace(/-+/g, '-')           // Collapse consecutive hyphens
    .replace(/^-|-$/g, '')         // Trim leading/trailing hyphens
}
```

**Behavior:**
- `"Fetch ? MCP Server"` → `"hint-fetch-mcp-server"`
- `"EPAM Matching ? Relevance score"` → `"hint-epam-matching-relevance-score"`
- `"simple-name"` → `"hint-simple-name"`

### Call Site Update

In `src/pages/assistants/components/AssistantDetails/components/UserMapping/components/Toolkit.tsx:95`:

```tsx
import { sanitizeHtmlId } from '@/utils/utils'

// ... in the render:
<Hint
  id={sanitizeHtmlId(tool.name)}
  showDelay={0}
  position="right"
  hint={toolkitToolsDescriptions?.[tool.name] || tool.user_description}
/>
```

## Scope

**Files Changed:**
1. `src/utils/utils.ts` - Add `sanitizeHtmlId()` function
2. `src/pages/assistants/components/AssistantDetails/components/UserMapping/components/Toolkit.tsx` - Use sanitization at line 95

**Files NOT Changed:**
- `src/components/Hint/Hint.tsx` - Remains unchanged (keeps component simple)
- Other Hint usages - Unchanged (no evidence of issues elsewhere)

## Testing Strategy

1. **Manual verification:** Load published assistant with MCP tool names containing spaces/special characters
2. **Verify no crash:** Agent Details page renders without querySelectorAll errors
3. **Verify tooltips work:** Hint tooltips still display correctly with sanitized IDs
4. **Check DevTools:** Inspect DOM to confirm readable IDs like `hint-fetch-mcp-server`

## Alternative Approaches Considered

**Approach B: Fix inside Hint component** - Rejected because it makes Hint's behavior less predictable (id prop ≠ DOM id) and hides sanitization from callers.

**Approach C: Hash-based IDs** - Rejected because it produces opaque IDs like `hint-a3f2b9c1` that are harder to debug in DevTools.

## Success Criteria

- Published assistants with MCP tools render without querySelectorAll errors
- Hint tooltips display correctly
- DOM IDs are human-readable for debugging
- No regression in other Hint usages
