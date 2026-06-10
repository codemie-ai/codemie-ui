# Subagent Discovery Prompt Template

**When to use**: Large scope tasks (full pages, 5+ components) in Step 1.1 of the workflow.

**How to use**: Copy this entire template and fill in the placeholders marked with `[...]`.

---

## Agent Tool Call Template

```typescript
Agent({
  description: "Full [ComponentName] flow discovery",
  prompt: `**Mission**: Full flow discovery for [ComponentName] integration tests.

**Phase 1: Complete Component Graph (DO NOT SKIP)**
1. Start with [ComponentPath]
2. Read EVERY local import (components, hooks, stores, utilities)
3. For each import, read its imports recursively
4. Continue until you find NO NEW components
5. Read FULL files - if a store has 700 lines, read all 700

**Validation checkpoint**: Before proceeding, count:
- Total components read: [X]
- Total line count across all files: [Y]
- Components in your "missing" list: MUST BE ZERO

If any imports remain unread, STOP and read them.

**Phase 2: Extract ALL Interactive Patterns**
For EACH component (including already-read ones):
- Find ALL: onClick, onSubmit, onChange, onKeyDown, onToggle, onHide, onShow, onConfirm, onCancel, href
- Find ALL: useEffect with API/store calls, router.push/replace, navigate()
- Find ALL: Conditional rendering: {flag && <Element>}, isEnabled(), can*(), feature flags
- Find ALL: State mutations: store.field = value, setState, localStorage.setItem

**Phase 2b: Trace Component Hierarchies (for menus/modals/nested interactions)**

For each menu, modal, or complex nested interaction found in Phase 2:

1. **Identify the render location** in the Page component
   - Look for props like: \`navigation={...}\`, \`actions={...}\`, \`menu={...}\`, modal triggers
   
2. **Follow the import chain** from Page to the deepest component:
   - Track each intermediate component
   - Document props passed at each level
   - Note conditions (feature flags, abilities, visibility checks)
   
3. **Read the FINAL/deepest component** for:
   - Exact \`aria-label\` values (source of truth for test selectors)
   - Button text and roles
   - DOM structure
   - Event handlers
   
4. **Document in your report**:
   - Component chain: Page → ComponentA → ComponentB → FinalComponent
   - Props flow at each level
   - Conditions at each level (feature flags, user abilities)
   - Exact aria-labels from the final component

**Why this matters**: Button aria-labels are defined at the deepest component. AssistantActions doesn't define "More options" - NavigationMore does. Tests fail if aria-labels are guessed from intermediate components.

**Phase 3: Trace Complete Data Paths (TEST-READY FORMAT)**

For each handler, extract details needed to write tests WITHOUT re-reading files:

1. **Trigger (Query Selector)**:
   - Exact role: \`getByRole('button', { name: 'exact aria-label or text' })\`
   - Or: \`getByLabelText('exact label')\` for inputs
   - Include element type and identifying text

2. **Handler Chain**:
   - Component.handlerName(params) → store.method(params) → API call

3. **API Mock (Copy-Paste Ready)**:
   - \`mockAPI('METHOD', 'v1/exact/path', responseBody, queryParams?, statusCode?)\`
   - Include full request body shape: \`{ field1, field2, ... }\`
   - Include full response shape: \`{ id, name, count, ... }\`

4. **State Changes (Field-Level)**:
   - \`storeName.fieldName = newValue\`
   - \`localStorage.setItem('key', value)\`
   - Be specific: "assistantsStore.assistants array grows by 1" NOT just "assistants updated"

5. **UI Changes (Assertion-Ready - COMPLETE OUTCOME)**:
   - Navigation: \`expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'route-name', params: { id: 'value' } })\`
   - Toast: \`expect(screen.getByText('exact toast message')).toBeInTheDocument()\`
   - Modal opened/closed: \`expect(screen.getByRole('dialog')).toBeInTheDocument()\` or \`expect(screen.queryByRole('dialog')).not.toBeInTheDocument()\`
   - Count updated: "Like count changes from 5 to 6" → \`expect(screen.getByText('6')).toBeInTheDocument()\` AND \`expect(screen.queryByText('5')).not.toBeInTheDocument()\`
   - Button state changed: "Like button becomes Unlike" → \`expect(screen.getByRole('button', { name: 'Remove like 6' })).toBeInTheDocument()\` AND \`expect(screen.queryByRole('button', { name: 'Like 5' })).not.toBeInTheDocument()\`
   - Icon changed: "Star icon becomes filled" → \`expect(button).toHaveAttribute('aria-label', 'Remove from favorites')\`
   - Badge/visibility changed: "Skill becomes PUBLIC" → \`expect(screen.getByText('PUBLIC')).toBeInTheDocument()\`
   - List updated: "Item removed from list" → \`expect(screen.queryByText('Deleted Item')).not.toBeInTheDocument()\`

6. **Error Paths**:
   - Same detail level: mock error response, expected toast, state unchanged

**Phase 4: Report Structure (TEST-READY FORMAT)**

## Components Read (with line counts)
[List all files + line counts]

## Flows Discovered

### [Subsystem Name]
#### Flow X: [User Action Name]
- **Priority**: [High/Medium/Low]
- **Preconditions**: 
  - Feature flags: \`appInfo.configs.featureName = true\`
  - Mocks: \`mockAPI('GET', 'v1/user', { id: 'user-123', name: 'Test User', ... })\`
- **Trigger**: 
  - \`getByRole('button', { name: 'Exact Button Text' })\`
  - File: \`ComponentName.tsx:123\`
- **Data Path**: 
  1. \`handleClickName(param)\` → \`storeName.methodName(param)\`
  2. \`mockAPI('POST', 'v1/endpoint', requestBody, responseBody)\`
  3. \`storeName.field = newValue\`
  4. \`router.push({ name: 'route-name' })\`
- **Assertions**:
  - \`expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'route-name' })\`
  - \`expect(screen.getByText('Success message')).toBeInTheDocument()\`
  - \`expect(screen.queryByText('Old State')).not.toBeInTheDocument()\`
- **Error Path (422)**:
  - Mock: \`mockAPI('POST', 'v1/endpoint', { error: 'message' }, 422)\`
  - Assertion: \`expect(screen.getByText('Error message')).toBeInTheDocument()\`

[Repeat for EVERY flow]

## Analysis: Coverage Confidence
- Total components analyzed: [X]
- Total flows discovered: [Y]
- Confidence I found 90%+: [Yes/No with reasoning]
- If No: [What areas need more investigation]

**Quality bar**: Every flow includes copy-paste-ready test code snippets. No abstractions.`
})
```

---

---

## IMPORTANT: Output Interpretation

**Your output shows what the component DOES, not how to test it.**

The main agent will translate your output to test infrastructure:

| You Report | Main Agent Writes |
|------------|-------------------|
| `mockAPI('GET', 'v1/assistants?page=0&per_page=12&scope=visible_to_user&filters={}')` | `mockAPI('GET', 'v1/assistants', {...})` ← no query params |
| "Component at route `/assistants`" | Reads `router.tsx` to find actual route |
| `{ id, name }` fixture | Reads type definition to add required fields |
| `getByRole('article')` assumed | Reads component to verify actual DOM structure |

**Your job**: Document data flows accurately — show the full query string the component sends, show the complete API request/response shapes.

**Main agent's job**: Validate contracts (routes, types, mocks, DOM) and translate to correct test syntax.

**DO NOT simplify or guess**. Report exactly what you see in the code, even if it seems verbose. The main agent needs complete information to validate.

---

## Placeholders to Fill

| Placeholder | Example | Description |
|-------------|---------|-------------|
| `[ComponentName]` | `AssistantsListPage` | Name of the page/feature being tested |
| `[ComponentPath]` | `src/pages/assistants/AssistantsListPage.tsx` | Full path to main component file |

---

## Output Location

Save the final report to `.codemie/integration-test-plan-[ComponentName].md`.

This is a temporary working file. It will be deleted after tests are complete.

## After Spawning

The subagent will return a report. Proceed to Step 1.2 (Validate Subagent Completeness) in the main workflow.
