# Integration Testing Coverage Specification

**Date:** 2026-06-04  
**Project:** codemie-ui-next  
**Purpose:** Comprehensive integration test coverage across all CodeMie UI pages

---

## 1. Scope & Goals

### Goal
Achieve comprehensive integration test coverage across all CodeMie UI domains using the existing test infrastructure (Vitest + Testing Library, `renderPage`, `mockAPI`, Component → Store → API → UI flow).

### Coverage Approach

**Two-layer coverage strategy:**

**Layer 1 - Standard patterns by page type:**
- **List/Management pages** → load list, pagination, filters, sorting, empty state, error state
- **CRUD pages** → create, read, update, delete operations + validation + error handling
- **Detail/View pages** → load entity, display data, navigation, error state
- **Form pages** → field validation, submission, API errors, cancel/back navigation
- **Modal workflows** → open modal, form validation, confirm/cancel, API success/error

**Layer 2 - Page-specific features:**
- Unique functionality per page (e.g., assistants: toolkits/MCP servers, workflows: visual editor, categories: assignments count)
- Domain-specific flows (e.g., chat: streaming responses, analytics: dashboard widgets)
- Complex interactions (e.g., workflow execution with HITL, assistant publish to marketplace)

### Sane Coverage Definition

1. **All critical user paths covered** - happy path for main functionality must work (create, read, update, delete for CRUD pages)

2. **Key error states covered** - API failures, validation errors, empty states (not every edge case, but common failure modes)

3. **Branch coverage metric** - 70%+ branch coverage for pages with complex logic, may be lower for simple view-only pages but all pages have at least basic coverage

4. **No redundant tests** - don't test what the framework/libraries already test (e.g., React Router internals, PrimeReact component rendering)

5. **Tests verify user-visible behavior** - not internal implementation details (test "user sees error message" not "store.error property is set")

**Not sane coverage:**
- 100% coverage at any cost
- Testing internal state instead of UI outcomes
- Testing every possible combination of inputs
- Duplicating what unit tests already cover

### Quality Target
High overall integration test coverage with sane coverage per page determined by Layer 1 patterns + Layer 2 specific features.

### Out of Scope
- Unit tests (separate layer, already exist)
- E2E browser tests (Playwright/Cypress automation)
- Performance/load testing
- Visual regression testing

---

## 2. Domain Breakdown & Phasing

### Reference (Already Complete)
- **Authentication:** SignInPage, SignUpPage ✅
- **Purpose:** Use as reference for test structure, patterns, and best practices

### Phase 1: Assistants, Workflows, Data Sources

**Assistants:**
- AssistantsListPage
- NewAssistantPage
- EditAssistantPage
- AssistantDetailsPage (partial ✅ - needs completion)
- NewRemoteAssistantPage
- EditRemoteAssistantPage
- AssistantChatStartPage

**Workflows:**
- WorkflowsListPage
- NewWorkflowPage
- EditWorkflowPage
- WorkflowDetailsPage
- ViewWorkflowTemplatePage

**Data Sources:**
- DataSourcesPage
- DataSourceCreatePage
- DataSourceEditPage
- DataSourceDetailsPage

### Phase 2: Skills, Integrations, Katas

**Skills:**
- SkillsListPage
- NewSkillPage
- EditSkillPage
- SkillDetailsPage

**Integrations:**
- IntegrationsPage
- NewUserIntegrationPage
- EditUserIntegrationPage
- NewProjectIntegrationPage
- EditProjectIntegrationPage

**Katas:**
- KatasPage
- NewKataPage
- EditKataPage
- KataDetailView

### Phase 3: Chat & Favorites

**Chat:**
- ChatPage
- SharedChatPage

**Favorites:**
- FavoritesPage

### Phase 4: Misc Pages

- HelpPage
- ReleaseNotesPage
- ApplicationsPage
- ApplicationFederationPage
- ApplicationIframePage
- ProfilePage
- SettingsPage
- AdministrationPage
- ErrorPage
- LoginSuccessPage

### Phase 5: Administration

**Providers:**
- ProvidersManagementPage
- ProvidersCreatePage
- ProvidersEditPage
- ProvidersViewPage

**Categories:**
- CategoriesManagementPage

**Users:**
- UsersManagementPage

**Projects:**
- ProjectsManagementPage
- ProjectDetailsPage

**Cost Centers:**
- CostCentersManagementPage
- CostCenterDetailsPage

**Budgets:**
- BudgetsManagementPage

**MCP:**
- MCPManagementPage

**AI Adoption:**
- AiAdoptionConfigPage

### Phase 6: Analytics & AWS

**Analytics:**
- AnalyticsPage
- AnalyticsDashboardFormPage

**AWS:**
- AwsAssistantsPage
- AwsWorkflowsPage
- AwsDataSourcesPage
- AwsGuardrailsPage

---

## 3. Test Infrastructure & Patterns

### Existing Infrastructure (Use As-Is)

- **Vitest workspace** with separate `unit` and `integration` projects
- **`src/test-utils/integration.tsx`** - provides `renderPage`, `mockAPI`, `navigate`
- **`src/setupTests.tsx`** - global mocks (fetch, localStorage, SettingsLayout, useNavigate, toaster, ResizeObserver, matchMedia, etc.)
- **Real Valtio reactivity** in integration tests (not mocked)
- **Component → Store → API → UI** flow testing

### Standard Test Structure

```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { mockAPI, navigate, renderPage } from '@/test-utils/integration'

describe('PageName — Integration', () => {
  const user = userEvent.setup()
  
  // Helper functions for common operations
  const fillAndSubmit = async (data) => { /* ... */ }
  
  it('renders page with all required elements', () => {
    renderPage('/route/path')
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
  })
  
  // Use nested describe for each complex operation/feature
  describe('Creating assistant', () => {
    it('creates assistant with basic fields', async () => { /* ... */ })
    it('creates assistant with toolkits', async () => { /* ... */ })
    it('shows validation errors', async () => { /* ... */ })
  })
  
  describe('Editing assistant', () => {
    it('loads existing data', async () => { /* ... */ })
    it('updates successfully', async () => { /* ... */ })
  })
})
```

### File Naming & Location

- **Location:** `src/pages/[domain]/__tests__/PageName.integration.test.tsx`
- **Naming:** `PageName.integration.test.tsx` (not `.test.tsx`)
- **Co-location:** Next to the page under test

### Layer 1 Patterns by Page Type

| Page Type | Standard Tests |
|-----------|----------------|
| **List/Management** | Render with data, pagination, empty state, API error, filters (if exist), sorting (if exist) |
| **Create/New** | Render form elements, validation, successful creation with navigation, API errors with toast, cancel/back navigation |
| **Edit** | Load entity, render pre-filled form, validation, successful update, API errors, cancel navigation |
| **Detail/View** | Load and display entity data, render all fields, navigation actions, API error |
| **Modal CRUD** | Open modal, form validation, confirm/save with API success, cancel closes modal, API errors |

### Key Patterns from Auth Tests (Reference)

- **Helper functions** for repeated actions (e.g., `fillAndSubmit`)
- **Test render before interaction** - verify elements exist first
- **Use `waitFor`** for async assertions (`navigate`, `toaster`, API responses)
- **Query priority:** `getByRole` > `getByLabelText` > `getByText`
- **Mock API before `renderPage`** when testing specific responses

### Nested Describe Blocks

- **Use one nested `describe` block per complex operation/feature area**
- **Examples:** "Creating assistant", "Editing workflow", "Executing workflow", "Publishing to marketplace"
- **Purpose:** Each describe block groups related test cases for that specific operation
- **When to use:** When a single operation requires multiple test cases (happy path, validation, errors, edge cases)

### Layer 2 - Page-Specific Features

- **Identified during implementation** by analyzing actual page code and features
- **Examples:**
  - **Assistants:** toolkits, MCP servers, nested assistants, AI generation, marketplace publish/unpublish, categories
  - **Workflows:** visual editor, YAML editor, execution with HITL, templates, cloning
  - **Chat:** streaming responses, file attachments, assistant selection, configuration panel
  - **Categories:** assignments count, marketplace filtering
  - **Analytics:** dashboard widgets, custom metrics, date range filters
- **Each feature** gets its own nested `describe` block if it requires multiple test cases

### Test Utilities Reference

**`renderPage(path: string)`**
- Renders the full app at the given route
- Uses real route config (`createMemoryRouter`)
- Example: `renderPage('/settings/providers')`

**`mockAPI(method, url, data, statusOrParams?)`**
- Registers per-test API mock
- Auto-cleared in `afterEach`
- Examples:
  - `mockAPI('GET', 'v1/providers', [{ id: '1', name: 'AWS' }])`
  - `mockAPI('POST', 'v1/providers', { error: 'Conflict' }, 422)`
  - `mockAPI('GET', 'v1/providers', data, { page: 0 })` (exact query params)

**`navigate`**
- Spy for `useNavigate` calls
- Import from `@/test-utils/integration`
- Example: `expect(navigate).toHaveBeenCalledWith('/dashboard')`

---

## 4. Implementation Guidelines

### For Each Page

1. **Analyze the page** - identify what it does (CRUD, list, form, detail, etc.)
2. **Apply Layer 1 patterns** - add standard tests for the page type
3. **Identify Layer 2 features** - read page code, find unique features
4. **Group related tests** - use nested `describe` blocks for complex operations
5. **Create helper functions** - extract repeated setup/actions
6. **Verify coverage** - ensure sane coverage achieved

### When Writing Tests

- **Start with render test** - verify page loads and shows expected elements
- **Test happy paths first** - main user flows should pass
- **Add error states** - API failures, validation errors, empty states
- **Use `waitFor`** for async operations
- **Mock APIs before rendering** - ensures predictable test data
- **Don't test implementation** - test what the user sees and can do

### Anti-Patterns to Avoid

- ❌ Testing internal store state instead of UI
- ❌ Not using `waitFor` for async assertions
- ❌ Testing framework/library internals
- ❌ Duplicating unit test coverage
- ❌ Writing tests without helper functions (leads to duplication)
- ❌ Not grouping related tests in describe blocks
- ❌ Testing every edge case at integration level (unit tests handle those)

---

## 5. Success Criteria

### Per Phase

- ✅ All pages in phase have integration test files
- ✅ All Layer 1 standard patterns covered
- ✅ All Layer 2 page-specific features covered
- ✅ Tests follow naming conventions and file structure
- ✅ Sane coverage achieved per page (as defined in Section 1)
- ✅ All tests pass (`npm run test:integration`)

### Overall Project

- ✅ All 6 phases completed
- ✅ High overall integration test coverage
- ✅ Tests serve as documentation for page behavior
- ✅ Regression protection for critical user flows
- ✅ Foundation for future feature development

---

## 6. Dependencies & Prerequisites

### Technical Prerequisites

- ✅ Vitest workspace configured (`vitest.workspace.ts`)
- ✅ Test utilities available (`src/test-utils/integration.tsx`)
- ✅ Global test setup configured (`src/setupTests.tsx`)
- ✅ Auth tests as reference implementation

### Knowledge Prerequisites

- Understanding of Component → Store → API → UI flow
- Familiarity with Testing Library query priorities
- Knowledge of Valtio reactivity (real in integration tests)
- Understanding of `mockAPI` and `renderPage` utilities

### Implementation Dependencies

- **Phase 1** can start immediately (reference tests exist)
- **Phases 2-6** are independent and can be parallelized
- **Each phase** is a vertical slice (complete coverage for that domain)

---

## 7. Notes for Implementation

### CRITICAL: Delegation of Responsibility

**This spec defines WHAT to test. The HOW is delegated to the `integration-tester` skill.**

| Responsibility | Owner | Location |
|----------------|-------|----------|
| **WHAT to test** | This spec | `docs/superpowers/specs/2026-06-04-integration-testing-coverage-design.md` |
| **WHICH pages** | This spec (Section 2) | Phase breakdown lists all pages |
| **WHAT patterns to apply** | This spec (Section 3) | Layer 1 + Layer 2 approach |
| **HOW to implement tests** | `integration-tester` skill | `.claude/skills/integration-tester/SKILL.md` |
| **HOW to structure test files** | `integration-tester` skill | Follows its own patterns and cycles |
| **HOW to write test cases** | `integration-tester` skill | Uses its own incremental approach |
| **HOW to mock APIs** | `integration-tester` skill | References `testing-patterns.md` guide |

### For Agents

**Do NOT implement tests directly from this spec. Use the integration-tester skill instead.**

**Workflow (Single Page):**
1. Read this spec to understand WHAT pages need coverage
2. Read the implementation plan to see progress and next page to implement
3. **Invoke `integration-tester` skill** with the target page name
4. Let the skill handle all implementation details (HOW)
5. **CRITICAL: Verify ALL integration tests pass** after completing the page
6. Update progress tracking in the plan after verification

**Workflow (Multiple Pages):**
1. Read this spec to understand scope
2. For each page in the batch:
   - Invoke `integration-tester` skill with the page name
   - Let the skill complete the test file
   - **Verify ALL integration tests pass** after each page
   - Update progress tracking
3. After completing all pages in batch, run full integration suite one final time

**Verification Command:**
```bash
npm run test:integration
```

**Expected:** All tests pass (including both new and existing tests)

**Example (Single Page):**
```
User: "Implement integration tests for NewAssistantPage"
Agent: [Reads spec to confirm page is in scope]
Agent: [Invokes: /integration-tester NewAssistantPage]
Agent: [Skill handles: analyze page, identify features, write tests incrementally, run coverage]
Agent: [Runs: npm run test:integration]
Agent: [Verifies: All tests pass]
Agent: [Updates plan: mark NewAssistantPage as ✅]
```

**Example (Multiple Pages):**
```
User: "Implement integration tests for all Assistants pages"
Agent: [Reads spec - identifies 7 pages in Assistants domain]
Agent: [For each page: invoke skill → verify all tests pass → update plan]
Agent: [After all 7 pages: run full integration suite → confirm all pass]
```

**This spec provides context to the integration-tester skill:**
- Which pages to test (Section 2)
- Coverage expectations (Section 1 - sane coverage definition)
- Standard patterns to apply (Section 3 - Layer 1)
- Page-specific features to identify (Section 3 - Layer 2)

**The integration-tester skill decides:**
- Exact test cases to write
- Test structure and describe blocks
- Helper function extraction
- API mock setup
- Query selector strategy
- Coverage measurement and gaps


---

## 8. Resumability & Document Maintenance

### Resuming Work from This Spec

Any agent session can resume integration test implementation by:

1. **Read this spec** to understand scope, phasing, and patterns (WHAT to test)
2. **Read the implementation plan** (created from this spec via `writing-plans` skill)
3. **Check progress tracking** in the plan (which phases/pages are complete)
4. **Identify next incomplete page** from the phase list
5. **Invoke `integration-tester` skill** with the target page name (skill handles HOW)
6. **Verify ALL integration tests pass** after skill completes
7. **Update progress tracking** in plan after verification

**IMPORTANT:** Do NOT implement tests manually. Always use the `integration-tester` skill - it knows HOW to write tests, structure files, mock APIs, and measure coverage. This spec only defines WHAT to test.

**CRITICAL:** After completing each page's test file, run `npm run test:integration` to verify ALL integration tests pass (not just the new ones). This catches regressions immediately.

### Cross-Referencing Spec and Plan

**Spec → Plan relationship:**
- **This spec** defines WHAT to test (scope, coverage approach, page lists, patterns)
- **The plan** defines HOW to execute (task breakdown, sequence, technical steps, estimated effort)

**When reading together:**
1. Plan references this spec for coverage requirements and patterns
2. Plan maintains progress tracking (✅ done, 🔄 in progress, ⏸️ blocked)
3. Plan may break phases into smaller tasks/subtasks
4. Plan includes links back to relevant spec sections

**Cross-reference locations:**
- Plan header links to this spec file
- This spec notes plan file location: `docs/superpowers/plans/2026-06-04-integration-testing-coverage-plan.md`
- Each phase in plan references corresponding phase in spec Section 2

### Updating the Spec

**When to update this spec:**
- ✏️ **Scope changes** - pages added/removed, phases reorganized
- ✏️ **Coverage approach changes** - new patterns identified, Layer 1/2 definition adjusted
- ✏️ **Infrastructure changes** - new test utilities, setup changes
- ✏️ **Success criteria changes** - coverage targets adjusted

**How to update:**
1. Edit this spec file directly
2. Update the "Date" field at the top
3. Add update note in commit message: "Update integration testing spec: [reason]"
4. If plan exists, add note in plan referencing spec update

**Do NOT update spec for:**
- ❌ Progress tracking (belongs in plan)
- ❌ Completed pages (track in plan)
- ❌ Technical implementation details (plan handles execution)

### Updating the Plan

**When to update the plan:**
- ✏️ **Progress updates** - mark pages complete, in progress, blocked
- ✏️ **Task breakdown changes** - subtasks added, reordered, or removed
- ✏️ **Effort estimates** - update based on actual implementation experience
- ✏️ **Blockers or dependencies** - document issues, dependencies discovered

**How to update:**
1. Edit the plan file directly
2. Update progress markers (✅ 🔄 ⏸️ ❌)
3. Add notes on changes or issues discovered
4. Keep spec reference accurate if spec was updated

**Do NOT update plan for:**
- ❌ Coverage approach (belongs in spec)
- ❌ Phase organization (belongs in spec)
- ❌ Pattern definitions (belongs in spec)

### Progress Tracking Format (for Plan)

```markdown
## Phase 1: Assistants, Workflows, Data Sources

### Assistants
- ✅ AssistantsListPage - 2026-06-05 (Branch: feat/integration-tests-assistants)
- ✅ NewAssistantPage - 2026-06-05
- 🔄 EditAssistantPage - In progress (Agent: session-123)
- ⏸️ AssistantDetailsPage - Blocked (waiting for MCP mock utilities)
- ⏳ NewRemoteAssistantPage - Not started
- ⏳ EditRemoteAssistantPage - Not started
- ⏳ AssistantChatStartPage - Not started

### Progress: 2/7 pages complete (28%)
```

**Legend:**
- ✅ Complete
- 🔄 In progress
- ⏸️ Blocked
- ❌ Skipped/Deferred
- ⏳ Not started

---

## 9. Appendix: Example Page Analysis

### Example: NewAssistantPage

**Page Type:** Create/New (Form page)

**Layer 1 Tests (Standard Form Page Patterns):**
- Render form elements (name, description, model selection)
- Field validation (required fields, format validation)
- Successful creation navigates to assistant details
- API error shows toast
- Cancel/back navigation works

**Layer 2 Tests (Page-Specific Features):**

*Toolkits:*
- Add toolkit to assistant
- Remove toolkit from assistant
- Configure toolkit parameters

*MCP Servers:*
- Add MCP server
- Configure MCP server environment variables
- Test MCP connection

*AI Generation:*
- Generate assistant with AI prompt
- Refine assistant with AI
- AI popup on first visit

*Template/Clone Modes:*
- Create from template pre-fills fields
- Clone existing assistant copies data
- URL params populate form fields

**Nested Describe Blocks:**
```tsx
describe('NewAssistantPage — Integration', () => {
  it('renders form with all required elements', () => { /* ... */ })
  
  describe('Creating assistant with basic fields', () => {
    it('creates successfully and navigates to details', async () => { /* ... */ })
    it('shows validation errors for required fields', async () => { /* ... */ })
    it('shows API error toast on failure', async () => { /* ... */ })
  })
  
  describe('Toolkits', () => {
    it('adds toolkit to assistant', async () => { /* ... */ })
    it('removes toolkit from assistant', async () => { /* ... */ })
    it('configures toolkit parameters', async () => { /* ... */ })
  })
  
  describe('MCP servers', () => {
    it('adds MCP server', async () => { /* ... */ })
    it('configures environment variables', async () => { /* ... */ })
    it('tests MCP connection', async () => { /* ... */ })
  })
  
  describe('AI generation', () => {
    it('generates assistant from prompt', async () => { /* ... */ })
    it('shows AI popup on first visit', async () => { /* ... */ })
  })
  
  describe('Template and clone modes', () => {
    it('creates from template with pre-filled data', async () => { /* ... */ })
    it('clones existing assistant', async () => { /* ... */ })
  })
})
```

---

**End of Specification**
