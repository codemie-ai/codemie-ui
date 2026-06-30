# Test Plan Refinement - Subagent Prompt

**When to use**: Step 1.6 only - when user requests additions to test plan after initial discovery.

---

## Subagent Invocation

When user identifies missing flows or requests additions in Step 1.5, spawn this focused discovery subagent:

```typescript
Agent({
  description: "Investigate [feature] for test plan addition",
  prompt: `**Context**: We're adding integration tests for [ComponentName]. The initial test plan is complete, but the user requested we add test coverage for: [user's request].

**Your task**: Investigate ONLY this specific feature and document flows in the same format as the existing test plan.

**Existing test plan location**: .codemie/integration-test-plan-[ComponentName].md

**Instructions**:
1. Read the existing test plan to understand the format and avoid duplication
2. Find the component(s) implementing [requested feature]:
   - Grep for feature name/keywords
   - Read relevant component files
3. Trace the complete flow(s) for this feature:
   - Entry point (exact selectors)
   - Data path (handler → store → API)
   - State changes
   - UI updates
   - Error paths
4. Document in TEST-READY FORMAT (see existing plan for examples):
   - Priority, Preconditions, Trigger, Data Path, Assertions, Error Path
   - Copy-paste-ready test code snippets
5. Return ONLY the new flow(s) to add, formatted exactly like existing plan flows

**Output format**:
\`\`\`
#### Flow X: [Feature Name]
- **Priority**: [High/Medium/Low]
- **Preconditions**: 
  - [Setup needed]
- **Trigger**: 
  - \`getByRole(...)\` → exact selector
- **Data Path**: 
  1. [Step-by-step data flow]
- **Assertions**:
  - [Copy-paste ready assertions]
- **Error Path**:
  - [Error scenarios]
\`\`\`

Keep your investigation focused and avoid polluting the main context. Return only the new flows to add.`
})
```

**Fill in placeholders**:
- `[ComponentName]`: The page being tested (e.g., "WorkflowsListPage")
- `[user's request]`: Exact user quote (e.g., "add test for project filter", "cover publishing categories")
- `[requested feature]`: Extracted feature name (e.g., "project filter", "publishing categories")

---

## After Subagent Completes

1. **Extract new flows** from subagent response
2. **Update test plan file**:
   - Read current plan
   - Find appropriate subsystem section (or create new one)
   - Insert new flow(s) in same format as existing
   - Update "Total Flows Discovered" count
   - Update priority breakdown
3. **Generate brief summary** for user:
   ```
   Updated test plan:
   - Added Flow(s): [flow title from subagent]
   - New total: Y flows (was X)
   - Priority: [High/Medium/Low]
   
   [Show 1-2 line description of what was added]
   
   Please review the updated plan.
   ```
4. **Return to Step 1.5** for re-approval

---

## Why Lightweight?

This subagent is focused and context-efficient:
- ✅ Reads only relevant components (not full discovery)
- ✅ Returns only new flows (not full report)
- ✅ Doesn't pollute main agent context with investigation details
- ✅ Fast iteration for multiple additions

Contrast with full discovery (Step 1b): reads 30+ components, 5000+ lines, generates complete report.
