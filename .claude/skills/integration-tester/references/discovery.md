# Subagent Discovery Prompt Template

**When to use**: Large scope tasks (full pages, 5+ components) in Step 1b of the workflow.

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

**Phase 2a: Extract ALL Display Elements (NOT JUST INTERACTIONS)**

**CRITICAL**: Tests must verify not just that actions work, but that DATA IS SHOWN. Most bugs are display bugs.

For EACH component that RENDERS data (cards, lists, tables, detail views, forms):

1. **Identify the data source**:
   - Props passed in: `interface CardProps { workflow: Workflow }`
   - Store fields: `workflowsStore.workflows[0].name`
   - API response: `GET /workflows → { name, description, created_at, ... }`

2. **Find the JSX template** that renders each field:
   - Look for `{workflow.name}`, `{item.description}`, `{formatDate(created_at)}`
   - Look for conditional display: `{description && <Text>{description}</Text>}`
   - Look for badges/chips: `{is_global && <Badge>MARKETPLACE</Badge>}`

3. **Document EVERY field that gets displayed**:
   - Field name from data model
   - Where it appears in UI (card title, subtitle, badge, meta text, tooltip)
   - Conditional display logic (shown only if field exists, or based on ability/flag)
   - Format/transform (date formatted, number with commas, text truncated)
   - CSS/styling that affects visibility (hidden class, opacity, display:none)

4. **Create a flow for each displayed field**:

```
Flow X: [Entity] Card Displays [Field Name]
- Priority: Medium (display bugs are common)
- Preconditions: Card rendered with [entity].[field] = 'expected value'
- Trigger: Component mount (no user interaction needed)
- Assertions: expect(screen.getByText('expected value')).toBeInTheDocument()
- Error Path: If field is null/undefined → either not rendered, or shows placeholder
```

**Example - WorkflowCard Component:**

After reading WorkflowCard.tsx, you find it displays:
- `workflow.name` (always shown - card title)
- `workflow.description` (shown if exists - card subtitle)  
- `workflow.created_at` (formatted as "2 days ago" - card footer)
- `workflow.is_global ? 'MARKETPLACE' : null` (badge if true)
- `workflow.user_abilities` (shown as badges: 'CAN EDIT', 'CAN DELETE')

Then create flows:
- Flow X: Workflow card displays workflow name
- Flow X+1: Workflow card displays description when present
- Flow X+2: Workflow card does NOT display description when null
- Flow X+3: Workflow card displays created date in relative format
- Flow X+4: Workflow card shows MARKETPLACE badge for global workflows
- Flow X+5: Workflow card does NOT show MARKETPLACE badge for private workflows
- Flow X+6: Workflow card shows ability badges based on user_abilities array

**Why this matters:**
- A card that loads data but doesn't display the description is a BUG
- A badge that should appear based on a flag but doesn't is a BUG
- These are NOT covered by interaction tests (click, submit, navigate)

**This adds 5-15 flows per page** but catches the most common bugs.

---

**Phase 2b: Deep Dive on Complex Components (CRITICAL)**

Some component patterns require special analysis beyond basic handler discovery. Recognize these patterns and apply the corresponding deep dive:

#### Pattern 1: Configurable Filter/Search Components

**How to recognize**: Component accepts a configuration prop (e.g., `fields`, `filtersConfig`, `schema`) that defines what filter fields to render.

**Examples**: Any component that renders multiple filter inputs dynamically based on configuration.

**When found**:

1. **Trace the filter configuration**:
   - Find the prop that defines filter fields (common names: `fields`, `filtersConfig`, `schema`, `config`)
   - Read the PARENT component to see what configuration is passed
   - This reveals the COMPLETE set of filters available

2. **Enumerate ALL filter fields**:
   - For each field in the config, document:
     - Field name (API param name)
     - Field type (text input, select dropdown, multi-select, date picker, custom component)
     - Options source (if select/multi-select): static array, API call, store
   - Check for custom filter components (pattern: component prop or render function in config)

3. **Document each filter's complete flow**:
   - User interaction: type, select, click
   - Debounce timing: grep for `debounce(` or `useDebouncedValue` 
   - State update pattern: local state → apply callback
   - Apply trigger: immediate, debounced, or button-based
   - API call: query params format, encoding
   - URL sync: does filter state persist in URL query params?

4. **Document filter combinations**:
   - Multi-filter support (AND/OR logic)
   - Clear mechanism (button, individual clears)
   - Reset behavior (on tab/scope change)

#### Pattern 2: Form Modal/Dialog Components

**How to recognize**: Component renders a dialog/modal with form inputs and submission.

**Examples**: Any modal that collects user input and submits to API.

**When found**:

1. **Trace ALL submission paths**:
   - **Success path**: Fill form → submit → API success → modal closes → success toast/navigation
   - **Validation path**: Missing required field → validation error shown → modal stays open
   - **API error path**: Submit → API error (4xx/5xx) → error message shown → modal stays open

2. **Document ALL ways to close**:
   - Close button (X in corner)
   - Cancel button
   - Backdrop/overlay click (if enabled)
   - Escape key (if enabled)
   - After successful submission

3. **Document modal state management**:
   - Opening trigger (button click, state change, URL param)
   - State persistence (form data retained on close/reopen, or reset)
   - Loading states (validation spinner, submission loading, async data fetch)

#### Pattern 3: Multi-Selection Components

**How to recognize**: Component allows selecting multiple items (checkboxes, chips, tag picker).

**Examples**: Any component with selection state for multiple items.

**When found**:

1. **Document selection states**:
   - Empty state (none selected): validation error, disabled state, or allowed
   - Single selection: valid state
   - Multiple selections: valid (check for max limit)
   - Bulk actions: select all, clear all (if present)

2. **Trace API contract**:
   - Read the submission handler to see actual payload format
   - Common formats: array of IDs, comma-separated, array of objects
   - Don't assume - verify in code

3. **Document UI feedback**:
   - Selection display (chips, badges, list)
   - Count indicators
   - Overflow handling (truncation, "and N more")

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

---

**Phase 3.5: Quality Check - Complete vs Incomplete Flows**

Before writing Phase 4 report, review your flows against these examples:

#### ❌ INCOMPLETE Flow (Don't do this)
```
Flow 5: Search Filter
- User types in search box
- API called with search param
- Results update
```

**Problems**:
- What's the exact selector for the search box? (`getByRole('textbox')`? `getByPlaceholderText('Search')`?)
- What's the actual API endpoint? (`v1/workflows`? something else?)
- What's the query param name? (`search=`? `name=`? `filters=`?)
- Is there debounce? How long?
- How do you assert "results update"? (specific text? count? empty state?)
- What about error case? (no results? API failure?)

**This flow is NOT test-ready. The main agent will have to re-read files to fill gaps.**

#### ✅ COMPLETE Flow (Do this)
```
Flow 5: Search Filter Applied
- **Priority**: High
- **Preconditions**:
  - `WorkflowsFilters` component rendered (scope="all")
  - Mock: `mockAPI('GET', 'v1/workflows', { data: [{id: '1', name: 'Matching Workflow', ...}], pagination: {...} })`
- **Trigger**:
  - `getByPlaceholText('Search')` → text input in Filters component
  - Type: "test"
  - Debounce: 1000ms (found in `Filters.tsx:189` → `debounce(applyFilters, 1000)`)
- **Data Path**:
  1. `handleInputChange('name', 'test')` → `setFilters({ ...filters, name: 'test' })`
  2. After 1000ms debounce: `onApply({ name: 'test' })` → `WorkflowsFilters.handleApply()`
  3. `workflowsStore.setWorkflowsFilters({ name: 'test' })`
  4. `workflowsStore.indexWorkflows()` → `GET v1/workflows?filter_by_user=false&page=0&per_page=12&filters=%7B%22name%22%3A%22test%22%7D`
     (filters param is URL-encoded JSON: `{"name":"test"}`)
  5. `router.push({ path: '/workflows/all', query: { page: '1', name: 'test' } })`
- **Assertions**:
  - Wait for debounce: `await new Promise(r => setTimeout(r, 1100))`
  - API called: `expect(fetch).toHaveBeenCalledWith(expect.stringContaining('filters=%7B%22name%22%3A%22test%22%7D'), ...)`
  - URL updated: `expect(mockRouterState.push).toHaveBeenCalledWith(expect.objectContaining({ query: { name: 'test', page: '1' } }))`
  - Results rendered: `expect(screen.getByText('Matching Workflow')).toBeInTheDocument()`
- **Error Path** (no results):
  - Mock: `mockAPI('GET', 'v1/workflows', { data: [], pagination: { total: 0 } })`
  - Assertion: `expect(screen.getByText('No workflows found.')).toBeInTheDocument()`
```

**Why this is complete**:
- ✅ Exact selectors (getByPlaceholderText)
- ✅ Exact API endpoint and query params (including URL encoding)
- ✅ Debounce timing with file reference
- ✅ Complete data path (every step from input to API to UI)
- ✅ Copy-paste-ready assertions (including debounce wait)
- ✅ Error path documented
- ✅ Main agent can write test without re-reading components

#### ❌ INCOMPLETE Modal Flow
```
Flow 12: Publish Modal
- Click "Publish to Marketplace"
- Modal opens
- Select category
- Submit
```

**Problems**:
- What's the exact button selector?
- How does modal open? (immediate? validation call first?)
- How to select category? (checkbox? dropdown? aria-label?)
- What if no category selected? (validation?)
- What API is called on submit?
- What's the success outcome? (modal closes? toast? navigation?)

#### ✅ COMPLETE Modal Flow
```
Flow 12: Publish Workflow Through Modal
- **Priority**: Medium
- **Preconditions**:
  - Workflow card rendered with `id: '42'`, `is_global: false`
  - Validation mock: `mockAPI('POST', 'v1/workflows/42/marketplace/publish/validate', { inline_credentials: [] })`
  - Categories mock: `assistantsStore.assistantCategories = [{id: 'cat-1', name: 'AI Tools'}, {id: 'cat-2', name: 'Data'}]`
  - Publish mock: `mockAPI('POST', 'v1/workflows/42/marketplace/publish', {})`
- **Trigger**:
  1. `getByRole('button', { name: 'More options' })` → opens NavigationMore menu
  2. `getByRole('menuitem', { name: 'Publish to Marketplace' })` → triggers modal
- **Data Path**:
  1. Menu click → `setWorkflowToPublish(workflow)` in WorkflowsList
  2. Modal opens: `PublishWorkflowToMarketplaceModal` with `open=true`
  3. Auto-validation: `POST v1/workflows/42/marketplace/publish/validate` (on mount)
  4. User selects category: `getByRole('checkbox', { name: 'AI Tools' })` → click
  5. Submit: `getByRole('button', { name: 'Publish' })` within dialog → click
  6. `handlePublish()` → `workflowsStore.publishWorkflowToMarketplace('42', ['cat-1'])`
  7. `POST v1/workflows/42/marketplace/publish` with body `{ categories: ['cat-1'] }`
  8. Success: `toaster.info('Workflow has been published to marketplace successfully!')`
  9. Modal closes: `setWorkflowToPublish(null)`
  10. Refresh: `workflowsStore.indexWorkflows()`
- **Assertions**:
  - Modal opens: `expect(screen.getByRole('dialog')).toBeInTheDocument()`
  - Validation text shown: `expect(screen.getByText('Validating your workflow configuration...')).toBeInTheDocument()`
  - After validation: Publish button enabled
  - After submit:
    - API called: `expect(fetch).toHaveBeenCalledWith(expect.stringContaining('marketplace/publish'), expect.objectContaining({ method: 'POST', body: expect.stringContaining('cat-1') }))`
    - Toast shown: `expect(screen.getByText('Workflow has been published to marketplace successfully!')).toBeInTheDocument()`
    - Modal closed: `await waitFor(() => { expect(screen.queryByRole('dialog')).not.toBeInTheDocument() })`
- **Error Paths**:
  1. **No category selected**:
     - Click Publish without selecting category
     - Validation error: `expect(screen.getByText('Please select at least one category')).toBeInTheDocument()`
     - Modal stays open
  2. **API error (422)**:
     - Mock: `mockAPI('POST', 'v1/workflows/42/marketplace/publish', { message: 'Workflow contains invalid credentials' }, 422)`
     - Error toast: `expect(screen.getByText('Workflow contains invalid credentials')).toBeInTheDocument()`
     - Modal stays open
```

**Review your flows**: Do they match the COMPLETE examples? If any flow looks like the INCOMPLETE examples, go back and add the missing details.

---

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

**Quality bar**: Every flow includes copy-paste-ready test code snippets. No abstractions.

---

## Summary for User Review

**CRITICAL: Generate this summary at the END of your report. The main agent will present it to the user.**

After writing the full test plan, create a concise summary:

\`\`\`
Test Plan Summary for [ComponentName]:

📊 Coverage:
- Total flows discovered: X
- Priority breakdown:
  - High: Y flows (critical user paths, primary actions)
  - Medium: Z flows (secondary features, conditional flows)
  - Low: W flows (edge cases, rarely-used features)

🎯 Key flows covered:
1. [Most important flow 1 - one line description]
2. [Most important flow 2 - one line description]
3. [Most important flow 3 - one line description]
4. [Most important flow 4 - one line description]
5. [Most important flow 5 - one line description]

📁 Subsystems:
- [Subsystem 1]: X flows
  - [Flow 1 brief description]
  - [Flow 2 brief description]
  - ...
- [Subsystem 2]: Y flows
  - [Flow 1 brief description]
  - [Flow 2 brief description]
  - ...

⚠️ Known complexity/limitations (if any):
- [Note anything that might be tricky or require special attention]
- [Note any flows intentionally excluded and why]

Full plan: .codemie/integration-test-plan-[ComponentName].md
\`\`\`

**This summary will be shown to the user for review approval.**`
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
