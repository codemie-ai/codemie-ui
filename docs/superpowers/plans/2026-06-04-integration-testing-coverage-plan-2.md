# Integration Testing Coverage Implementation Plan

**Goal:** Achieve comprehensive integration test coverage across all CodeMie UI pages using existing test infrastructure (Vitest + Testing Library)

**Architecture:** Two-layer coverage strategy — Layer 1 applies standard patterns by page type (list/CRUD/form/detail/modal), Layer 2 covers page-specific features (toolkits, workflows, chat streaming). Each page gets integration tests following Component → Store → API → UI flow.

**Tech Stack:** Vitest, React Testing Library, custom test utilities (`renderPage`, `mockAPI`, `navigate`), Valtio stores (real reactivity in tests)

**Spec Reference:** [docs/superpowers/specs/2026-06-04-integration-testing-coverage-design.md](../specs/2026-06-04-integration-testing-coverage-design.md)

---

## How to Use This Plan

### Invocation Patterns

**Pattern 1: Single Page**
```
User: "Implement integration tests for NewAssistantPage"
Agent: 1. Invoke /integration-tester NewAssistantPage
       2. Verify ALL integration tests pass (npm run test:integration)
       3. Update progress in plan (mark ✅)
```

**Pattern 2: Multiple Pages (Batch)**
```
User: "Implement integration tests for all Assistants pages"
Agent: For each page in Assistants domain:
       1. Invoke /integration-tester PageName
       2. Verify ALL integration tests pass (npm run test:integration)
       3. Update progress (mark ✅)
       4. Continue to next page
       After all pages: Final verification (npm run test:integration)
```

**Pattern 3: Entire Phase**
```
User: "Implement Phase 1 integration tests"
Agent: Same as Pattern 2, but for all pages in Phase 1
```

### Critical Rules

**DO NOT implement tests manually. Always use the integration-tester skill.**

```bash
# For each page:
/integration-tester PageName
```

**After completing EACH page:**
```bash
npm run test:integration
```

**Expected:** ALL integration tests pass (new + existing). This catches regressions immediately.

### What the Skill Handles

**The integration-tester skill follows this flow for each page:**

1. **Analyze** - Identify page type (list/CRUD/form/detail/modal) and unique features
2. **Layer 1** - Apply standard patterns for the page type:
   - List pages: render list, pagination, filters, sorting, empty state, API error
   - Create pages: form validation, successful creation, API errors, cancel navigation
   - Edit pages: load entity, pre-filled form, validation, update, API errors
   - Detail pages: load and display data, navigation actions, API error
   - Modal workflows: open modal, validation, confirm/cancel, API success/error
3. **Layer 2** - Add page-specific features identified during analysis
   - **Note:** Examples below are non-exhaustive - identify ALL actual features by analyzing the page code
   - Assistants examples: toolkits, MCP servers, AI generation, marketplace publish
   - Workflows examples: visual editor, YAML editor, execution with HITL, templates
   - Chat examples: streaming responses, file attachments, configuration panel
   - Analytics examples: dashboard widgets, custom metrics, date filters
4. **Coverage** - Run coverage report, identify gaps, add missing tests
5. **Structure** - Create helper functions, proper describe blocks, clean code

### What This Plan Provides

- Which pages to test (task breakdown)
- Progress tracking (✅ done, 🔄 in progress, ⏸️ blocked)
- Phase organization
- Estimated time and features for each page

---

## Progress Tracking Format

```
✅ PageName - 2026-06-05 (All tests pass ✓)
🔄 PageName - In progress
⏸️ PageName - Blocked (reason)
❌ PageName - Skipped (reason)
⏳ PageName - Not started
```

---

## Overall Estimate & Summary

### Total Scope
- **Total Pages:** 61 pages requiring integration tests
- **Total Steps:** 61 (one per page)
- **Test Files:** 61 new integration test files to create

### Time Estimates

| Estimate Type | Hours | Days (8h/day) | Notes |
|---------------|-------|---------------|-------|
| **Total Time** | ~35 hours | ~4.5 days | Based on actual AssistantsListPage session (26 min) |
| **With Buffer (+25%)** | ~44 hours | ~5.5 days | Recommended for planning |

### Breakdown by Complexity

| Complexity | Pages | Time Range | Total Time | % of Total |
|------------|-------|------------|------------|------------|
| **Simple** | 14 | 10-20 min | ~210 min (3.5h) | 10% |
| **Medium** | 22 | 25-35 min | ~660 min (11h) | 31% |
| **High** | 18 | 40-50 min | ~810 min (13.5h) | 38% |
| **Very High** | 7 | 65-80 min | ~505 min (8.4h) | 24% |
| **TOTAL** | **61** | - | **~2,185 min (36.4h)** | **100%** |

### Breakdown by Phase

| Phase | Pages | Est. Time | Notes |
|-------|-------|-----------|-------|
| **Phase 1:** Assistants, Workflows, Data Sources | 16 | 7-9 hours | Includes complex workflow editor pages |
| **Phase 2:** Skills, Integrations, Katas | 13 | 6-7 hours | Multiple integration OAuth flows |
| **Phase 3:** Chat & Favorites | 3 | 2-3 hours | ChatPage is very high complexity (streaming) |
| **Phase 4:** Misc Pages | 10 | 3-4 hours | Mostly simple/medium pages |
| **Phase 5:** Administration | 13 | 8-9 hours | Complex user/budget management pages |
| **Phase 6:** Analytics & AWS | 6 | 3-4 hours | Dashboard and AWS pages |

### Key Complexity Drivers

**Most Complex Pages (65-80 minutes each):**
1. **UsersManagementPage** (80 min) - 411 lines, 3 modals, bulk selection
2. **WorkflowDetailsPage** (80 min) - 10 sub-components, HITL resume, resizable panels
3. **ChatPage** (75 min) - Streaming responses, 7 sub-components, auth callbacks
4. **BudgetsManagementPage** (65 min) - Role-based UI, budget sync, 306 lines
5. **ProjectDetailsPage** (65 min) - Complex spending display, member management
6. **ProvidersManagementPage** (65 min) - Table management with multiple actions
7. **CategoriesManagementPage** (50 min) - Assignment counts, filtered navigation

**Calibration Baseline:**
- **AssistantsListPage**: Estimated 3-4 hours → **Actual 26 minutes** (real session 2026-06-05)
- This confirms estimates are realistic when using `/integration-tester` skill

### Recommended Approach

**Option 1: Sequential (One Developer)**
- **Duration:** 5-6 days (with buffer)
- **Approach:** Execute phases in order, high-complexity pages first within each phase
- **Pros:** Full context, consistent quality, no coordination overhead

**Option 2: By Priority (Incremental Value)**
- **Week 1:** High-priority pages (Chat, Assistants, Workflows, Integrations) - ~15 pages, 12-15 hours
- **Week 2:** Medium-priority pages - ~25 pages, 15-18 hours  
- **Week 3:** Low-priority pages - ~21 pages, 8-10 hours
- **Pros:** Deliver business value quickly, can stop at any milestone

**Option 3: Parallel (Two Developers)**
- **Duration:** 3-4 days per developer
- **Split:** By domain or by complexity
- **Pros:** Faster completion, but requires coordination

### Success Criteria

- ✅ All 61 pages have integration test files
- ✅ All tests pass (`npm run test:integration`)
- ✅ Layer 1 standard patterns covered for each page type
- ✅ Layer 2 page-specific features covered
- ✅ 70%+ branch coverage for complex pages
- ✅ Tests follow naming conventions (`*.integration.test.tsx`)
- ✅ Files co-located in `__tests__` directories

---

## Overall Progress Tracking

### Overall Progress: 0/61 pages complete (0%)

### Phase Progress Summary
```
Phase 1: Assistants, Workflows, Data Sources - 0/16 pages (0%)
Phase 2: Skills, Integrations, Katas - 0/13 pages (0%)
Phase 3: Chat & Favorites - 0/3 pages (0%)
Phase 4: Misc Pages - 0/10 pages (0%)
Phase 5: Administration - 0/13 pages (0%)
Phase 6: Analytics & AWS - 0/6 pages (0%)
```

### Execution Notes

**All features are equally important.** Phases can be executed in any order, or pages can be selected individually based on current needs.

**Suggested approach:**
- Execute pages within a phase together (maintains related context)
- Or pick individual pages across phases based on current development priorities
- Or execute phases in numerical order (1 → 6)

### Blockers & Dependencies
- ❌ None identified - all phases can proceed independently
- ⚠️ MCP mock utilities may need enhancement for MCP-heavy pages

### Important Notes
- **Always use integration-tester skill** - never implement tests manually
- **Update progress markers** after each page completion
- **Run full suite periodically** to catch regressions
- **Phases are independent** - can be parallelized across multiple sessions/agents

---

## Plan Maintenance

### When to Update This Plan
- ✏️ After completing each page (mark ✅ with date/commit)
- ✏️ When blocking issues arise (mark ⏸️ with reason)
- ✏️ If pages are added/removed from scope
- ✏️ If execution strategy changes

### Cross-References
- **Spec:** [docs/superpowers/specs/2026-06-04-integration-testing-coverage-design.md](../specs/2026-06-04-integration-testing-coverage-design.md)
- **Test Utils:** `src/test-utils/integration.tsx`
- **Reference Tests:** `src/authentication/local/__tests__/SignInPage.integration.test.tsx`
- **Testing Guide:** `.codemie/guides/testing/testing-patterns.md`

---

## Phase 1: Assistants, Workflows, Data Sources

### Task 1: Assistants Domain

**Files to create:**
- `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx`
- `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx`
- `src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx`
- `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx`
- `src/pages/assistants/__tests__/NewRemoteAssistantPage.integration.test.tsx`
- `src/pages/assistants/__tests__/EditRemoteAssistantPage.integration.test.tsx`
- `src/pages/assistants/__tests__/AssistantChatStartPage.integration.test.tsx`

- [x] **Step 1: AssistantsListPage** - 2026-06-05 (11 tests pass, 3 skipped ✓)

**Estimated Time:** 25-30 minutes (Actual: ~35 minutes including fixes)

**Overall Features:**
1. Browse assistants by tab (All, Marketplace, Templates, Favorites)
2. Filter assistants via sidebar filters
3. Create new assistant
4. Create remote assistant (feature-flagged)
5. Paginate through assistants list
6. Export assistant to file
7. View assistant card interactions
8. Tab-based navigation (scoped lists)
9. Loading state display

**Complexity Notes:** Actual calibration baseline: 26 min real session.

- [ ] **Step 2: NewAssistantPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. Create new assistant from scratch
2. Clone existing assistant
3. Create from template
4. Generate assistant with AI popup
5. Integration creation popup (inline)
6. Pre-fill from URL query params
7. Form validation and submission
8. Back navigation with history awareness
9. Loading state during clone/template fetch

**Complexity Notes:** Three distinct creation modes (new/clone/template), 2 modals (AI gen + integration), complex form delegation.

- [ ] **Step 3: EditAssistantPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. Load and display existing assistant in form
2. Edit assistant fields
3. Refine with AI feature
4. Save updated assistant
5. Cancel and navigate back
6. Integration creation popup
7. Loading state while fetching assistant

- [ ] **Step 4: AssistantDetailsPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. View assistant details (local vs remote)
2. Start chat with assistant
3. Export assistant
4. Create new integration from details
5. Handle A2A (remote) assistant type
6. Back navigation with history stack awareness
7. Error handling on load
8. Loading spinner state

**Complexity Notes:** Dual rendering path (local AssistantDetails vs RemoteAssistantDetails), 2 modals, complex back nav.

- [ ] **Step 5: NewRemoteAssistantPage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. Create new remote assistant via form
2. Form validity state controls Save button
3. Cancel and navigate back
4. Error handling on create
5. Loading state on submit

- [ ] **Step 6: EditRemoteAssistantPage**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. Load remote assistant data
2. Edit remote assistant fields via form
3. Save remote assistant updates
4. Cancel and navigate back
5. Permission guard (edit forbidden state)
6. Loading state display

- [ ] **Step 7: AssistantChatStartPage**

**Estimated Time:** 10-20 minutes

**Overall Features:**
1. Redirect page: look up assistant by slug
2. Start new chat with assistant
3. Forward initial prompt query param
4. Handle not found / error states
5. Show loading spinner during redirect

**Complexity Notes:** Pure redirect/orchestration page, no UI interactions.

**Progress:** Assistants 0/7 complete (0%)

---

### Task 2: Workflows Domain

**Files to create:**
- `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`
- `src/pages/workflows/__tests__/NewWorkflowPage.integration.test.tsx`
- `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`
- `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx`
- `src/pages/workflows/__tests__/ViewWorkflowTemplatePage.integration.test.tsx`

- [ ] **Step 8: WorkflowsListPage**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. Browse workflows by scope (All, My, Templates, Favorites)
2. Filter workflows via sidebar
3. Create new workflow
4. Paginated workflow list
5. Workflow template gallery
6. Favorites workflow list

- [ ] **Step 9: NewWorkflowPage**

**Estimated Time:** 45-55 minutes

**Overall Features:**
1. Create workflow from scratch
2. Clone existing workflow
3. Create workflow from template
4. Save workflow (YAML/visual editor)
5. Save and Run workflow
6. Workflow validation with issues panel
7. Backend error handling with issue annotations
8. Start execution popup after save
9. Loading states for clone/template fetch

**Complexity Notes:** Three creation modes, visual vs YAML editor path, complex error handling with backend issue parsing.

- [ ] **Step 10: EditWorkflowPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. Load and edit existing workflow
2. Save workflow changes
3. Save and run workflow
4. Workflow validation
5. Backend issue annotation in editor
6. Issues panel toggle
7. Start execution popup after save
8. Error handling on load/save

**Complexity Notes:** Similar to NewWorkflowPage but simpler (no creation modes).

- [ ] **Step 11: WorkflowDetailsPage**

**Estimated Time:** 75-85 minutes

**Overall Features:**
1. View workflow execution status
2. Visual workflow editor (execution view)
3. Execution list and selection
4. Execution state details in drawer
5. Resume interrupted execution
6. Resume with message (HITL)
7. Auth callback handling for integrations
8. Resizable panel layout
9. Execution configuration panel
10. Real-time execution state updates

**Complexity Notes:** Most complex workflow page: resizable panels, 10 sub-components, execution context provider, HITL resume flow, auth callbacks.

- [ ] **Step 12: ViewWorkflowTemplatePage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. View workflow template details
2. Create workflow from this template
3. Back navigation
4. Loading and not found states
5. Template YAML/config display

**Progress:** Workflows 0/5 complete (0%)

---

### Task 3: Data Sources Domain

**Files to create:**
- `src/pages/dataSources/__tests__/DataSourcesPage.integration.test.tsx`
- `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`
- `src/pages/dataSources/__tests__/DataSourceEditPage.integration.test.tsx`
- `src/pages/dataSources/__tests__/DataSourceDetailsPage.integration.test.tsx`

- [ ] **Step 13: DataSourcesPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. List all data sources in table
2. Filter data sources via sidebar
3. Sort by columns (date, update date)
4. Paginate data source list
5. Create new data source
6. Auto-refresh status every 5 seconds
7. Inline status display per row
8. Inline actions per row (edit, delete, etc.)
9. Visibility and type columns

**Complexity Notes:** Auto-refresh polling, sortable table, filter sidebar, multiple custom column renderers.

- [ ] **Step 14: DataSourceCreatePage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. Create new data source via form
2. Save data source
3. Cancel navigation
4. Submitting state disables save button
5. Form type selection (multiple data source types)

**Complexity Notes:** DataSourceForm component handles multi-type complexity.

- [ ] **Step 15: DataSourceEditPage**

**Estimated Time:** 30-40 minutes

**Overall Features:**
1. Load existing data source
2. Edit data source fields
3. Save changes
4. Save and reindex (conditional button)
5. Cancel navigation
6. Full reindex eligibility detection
7. Loading state

**Complexity Notes:** Conditional 'Save & Reindex' button based on datasource type checks.

- [ ] **Step 16: DataSourceDetailsPage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. View data source details
2. Loading and not found states
3. Back navigation

**Progress:** Data Sources 0/4 complete (0%)

---

## Phase 2: Skills, Integrations, Katas

### Task 4: Skills Domain

**Files to create:**
- `src/pages/skills/__tests__/SkillsListPage.integration.test.tsx`
- `src/pages/skills/__tests__/NewSkillPage.integration.test.tsx`
- `src/pages/skills/__tests__/EditSkillPage.integration.test.tsx`
- `src/pages/skills/__tests__/SkillDetailsPage.integration.test.tsx`

- [ ] **Step 17: SkillsListPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. Browse skills by tab (Project, Marketplace, Favorites)
2. Filter skills via sidebar
3. Create new skill
4. View skill details
5. Export skill as markdown
6. Paginate skills grid
7. Tab-specific visibility filtering
8. Favorites pagination separate from main

**Complexity Notes:** Three tabs with different scope/visibility logic, dual pagination state (favorites vs main), export functionality.

- [ ] **Step 18: NewSkillPage**

**Estimated Time:** 45-55 minutes

**Overall Features:**
1. Create new skill via form
2. Generate skill with AI popup
3. Import skill from markdown file
4. Import skill bundle from zip file
5. Download example skill file
6. Create integration (inline popup)
7. Companion files and bundle folders management
8. Cancel and navigate back

**Complexity Notes:** 5 header action buttons, file import (md+zip), AI generation popup, integration popup.

- [ ] **Step 19: EditSkillPage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. Load skill for editing
2. Delegate to EditSkillForm component
3. Not found and error states
4. Loading spinner state

**Complexity Notes:** Thin wrapper; complexity in EditSkillForm sub-component.

- [ ] **Step 20: SkillDetailsPage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. View skill details
2. Export skill as markdown
3. Reload skill data
4. Not found and error states
5. Loading state

**Progress:** Skills 0/4 complete (0%)

---

### Task 5: Integrations Domain

**Files to create:**
- `src/pages/integrations/__tests__/IntegrationsPage.integration.test.tsx`
- `src/pages/integrations/__tests__/NewUserIntegrationPage.integration.test.tsx`
- `src/pages/integrations/__tests__/EditUserIntegrationPage.integration.test.tsx`
- `src/pages/integrations/__tests__/NewProjectIntegrationPage.integration.test.tsx`
- `src/pages/integrations/__tests__/EditProjectIntegrationPage.integration.test.tsx`

- [ ] **Step 21: IntegrationsPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. Toggle between User and Project integration tabs
2. Create User integration
3. Create Project integration (admin only)
4. Dropdown button for create actions
5. Dynamic sidebar filter portal
6. Permission-based UI (hide project tab for non-admins)

- [ ] **Step 22: NewUserIntegrationPage**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. Create user integration via dynamic form
2. Pre-fill credential type from query params
3. Test integration (conditional)
4. Save integration
5. Cancel and navigate back
6. Default alias from current user

- [ ] **Step 23: EditUserIntegrationPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. Load existing user integration
2. Edit integration fields
3. Test integration (conditional)
4. Save updated integration
5. Cancel and navigate back
6. Loading state

- [ ] **Step 24: NewProjectIntegrationPage**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. Create project integration via dynamic form
2. Test integration (conditional button)
3. Save integration
4. Cancel and navigate back
5. Credential type detection

- [ ] **Step 25: EditProjectIntegrationPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. Load existing project integration
2. Edit integration fields
3. Test integration (conditional)
4. Save updated integration
5. Cancel and navigate back
6. Loading state

**Progress:** Integrations 0/5 complete (0%)

---

### Task 6: Katas Domain

**Files to create:**
- `src/pages/katas/__tests__/KatasPage.integration.test.tsx`
- `src/pages/katas/__tests__/NewKataPage.integration.test.tsx`
- `src/pages/katas/__tests__/EditKataPage.integration.test.tsx`
- `src/pages/katas/__tests__/KataDetailView.integration.test.tsx`

- [ ] **Step 26: KatasPage**

**Estimated Time:** 35-45 minutes

**Overall Features:**
1. Browse katas by category (All, In Progress, Completed, Leaderboard)
2. Filter katas via sidebar
3. Create kata (admin only)
4. Paginate kata list
5. Track category view metrics
6. Clear URL filters on navigate away

**Complexity Notes:** Metrics tracking on category change, admin-gated create button.

- [ ] **Step 27: NewKataPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. Create new kata (admin only)
2. Clone existing kata
3. Save as draft
4. Publish kata
5. Tags and roles multi-select from API
6. Kata form with validation (Yup schema)
7. Admin permission guard
8. Loading state for reference data

**Complexity Notes:** Dual submit action (draft vs publish), clone from store data, admin permission enforcement.

- [ ] **Step 28: EditKataPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. Load kata for editing
2. Edit kata fields with validation
3. Save kata changes
4. Cancel and navigate back
5. Tags and roles multi-select from API
6. Admin permission guard (redirect non-admins)
7. Not found state

**Complexity Notes:** Parallel data loading (kata + tags + roles), admin permission check, form reset from loaded data.

- [ ] **Step 29: KataDetailView**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. View kata details
2. Loading and not found states
3. Navigation actions

**Progress:** Katas 0/4 complete (0%)

---

## Phase 3: Chat & Favorites

### Task 7: Chat Domain

**Files to create:**
- `src/pages/chat/__tests__/ChatPage.integration.test.tsx`
- `src/pages/chat/__tests__/SharedChatPage.integration.test.tsx`

- [ ] **Step 30: ChatPage**

**Estimated Time:** 70-80 minutes

**Overall Features:**
1. Send and receive chat messages
2. Chat history display
3. Chat sidebar with history list
4. Chat configuration panel (assistant settings)
5. Real-time streaming responses
6. Auth callback handling
7. Initial prompt from URL
8. Navigation handling (new chat vs existing)
9. Integration creation popup
10. Context provider for chat state

**Complexity Notes:** Core feature page with 7 sub-components, complex streaming logic, multi-hook architecture. Low line count belies complexity delegated to sub-components.

- [ ] **Step 31: SharedChatPage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. View shared (read-only) chat conversation
2. Display assistant avatars in header
3. Navigate to assistant details from avatar click
4. Load shared chat by token
5. Cleanup on unmount

**Complexity Notes:** Read-only view, no interactions beyond navigation.

**Progress:** Chat 0/2 complete (0%)

---

### Task 8: Favorites Domain

**Files to create:**
- `src/pages/favorites/__tests__/FavoritesPage.integration.test.tsx`

- [ ] **Step 32: FavoritesPage**

**Estimated Time:** 45-55 minutes

**Overall Features:**
1. Browse all favorites (assistants, skills, workflows combined)
2. Filter by type (assistants, skills, workflows)
3. Dynamic sidebar filters per type
4. Favorite assistant actions (view, unfavorite, etc.)
5. Favorite skill actions (view, export, unfavorite)
6. Favorite workflow actions (start chat, unfavorite)
7. Section grouping in all-tab view
8. Refresh on action

**Complexity Notes:** Three entity types with separate filter state and rendering logic in one page, 7 sub-components.

**Progress:** Favorites 0/1 complete (0%)

---

## Phase 4: Misc Pages

### Task 9: Miscellaneous Pages

**Files to create:**
- `src/pages/__tests__/HelpPage.integration.test.tsx`
- `src/pages/__tests__/ReleaseNotesPage.integration.test.tsx`
- `src/pages/__tests__/ApplicationsPage.integration.test.tsx`
- `src/pages/__tests__/ApplicationFederationPage.integration.test.tsx`
- `src/pages/__tests__/ApplicationIframePage.integration.test.tsx`
- `src/pages/__tests__/ProfilePage.integration.test.tsx`
- `src/pages/__tests__/SettingsPage.integration.test.tsx`
- `src/pages/__tests__/AdministrationPage.integration.test.tsx`
- `src/pages/__tests__/ErrorPage.integration.test.tsx`
- `src/pages/__tests__/LoginSuccessPage.integration.test.tsx`

- [ ] **Step 33: HelpPage**

**Estimated Time:** 30-40 minutes

**Overall Features:**
1. Display AI help assistant links
2. Display learning resources (feature-configured)
3. Display release notes link
4. Display feedback/survey links (conditional)
5. Onboarding tours section
6. Config-driven content sections
7. External link support

**Complexity Notes:** Config-driven dynamic sections, multiple assistant lookups.

- [ ] **Step 34: ReleaseNotesPage**

**Estimated Time:** 10-20 minutes

**Overall Features:**
1. Display list of releases with versions and dates
2. Categorized issues (BUG, STORY)
3. Mark current version as viewed
4. Theme-aware background image

- [ ] **Step 35: ApplicationsPage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. List available applications in grid
2. Open application (link, iframe, or module federation)
3. Loading state

- [ ] **Step 36: ApplicationFederationPage**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. Load micro-frontend via Module Federation
2. Mount remote component in shadow DOM
3. Style isolation via shadow root
4. Unmount on navigate away
5. Error handling on load failure

**Complexity Notes:** Module federation and shadow DOM usage is technically complex.

- [ ] **Step 37: ApplicationIframePage**

**Estimated Time:** 10-20 minutes

**Overall Features:**
1. Load application in iframe
2. Append path query param to URL
3. Back navigation
4. Error on app not found

- [ ] **Step 38: ProfilePage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. View user profile card
2. View spending card (enterprise only)
3. Conversation settings card
4. Theme toggle
5. Enterprise edition feature gating

- [ ] **Step 39: SettingsPage**

**Estimated Time:** 5-15 minutes

**Overall Features:**
1. Empty settings index page (license header only)

**Complexity Notes:** File is essentially empty (license header only, no component code).

- [ ] **Step 40: AdministrationPage**

**Estimated Time:** 10-20 minutes

**Overall Features:**
1. View admin tools card (admin only)
2. Admin permission check

- [ ] **Step 41: ErrorPage**

**Estimated Time:** 5-15 minutes

**Overall Features:**
1. Display 404 Not Found error
2. Display runtime error with stack
3. Navigate to home

- [ ] **Step 42: LoginSuccessPage**

**Estimated Time:** 5-15 minutes

**Overall Features:**
1. Post MCP login success message to opener
2. Auto-close tab
3. Display success message

**Progress:** Misc Pages 0/10 complete (0%)

---

## Phase 5: Administration

### Task 10: Providers Domain

**Files to create:**
- `src/pages/administration/providers/__tests__/ProvidersManagementPage.integration.test.tsx`
- `src/pages/administration/providers/__tests__/ProvidersCreatePage.integration.test.tsx`
- `src/pages/administration/providers/__tests__/ProvidersEditPage.integration.test.tsx`
- `src/pages/administration/providers/__tests__/ProvidersViewPage.integration.test.tsx`

- [ ] **Step 43: ProvidersManagementPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. List providers in table
2. Add new provider
3. View provider details
4. Edit provider
5. Delete provider
6. Loading state

- [ ] **Step 44: ProvidersCreatePage**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. Create provider via JSON editor
2. JSON validation before submit
3. Save provider
4. Cancel and navigate back

- [ ] **Step 45: ProvidersEditPage**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. Load provider data
2. Edit provider via JSON editor
3. JSON validation
4. Save updated provider
5. Cancel and navigate back
6. Loading state

- [ ] **Step 46: ProvidersViewPage**

**Estimated Time:** 15-25 minutes

**Overall Features:**
1. View provider JSON configuration
2. Code block display with download
3. Loading and not found states
4. Back navigation

**Progress:** Providers 0/4 complete (0%)

---

### Task 11: Categories, Users, Projects

**Files to create:**
- `src/pages/administration/categories/__tests__/CategoriesManagementPage.integration.test.tsx`
- `src/pages/administration/users/__tests__/UsersManagementPage.integration.test.tsx`
- `src/pages/administration/projects/__tests__/ProjectsManagementPage.integration.test.tsx`
- `src/pages/administration/projects/__tests__/ProjectDetailsPage.integration.test.tsx`

- [ ] **Step 47: CategoriesManagementPage**

**Estimated Time:** 45-55 minutes

**Overall Features:**
1. List categories with assignment counts
2. Add category (modal)
3. Edit category (modal)
4. Delete category with confirmation
5. Delete disabled when category has assignments
6. View project/marketplace assistant counts
7. Navigate to filtered assistant list by category
8. Paginate categories

**Complexity Notes:** Two modals, delete guard logic, navigation to filtered assistant lists, 316 lines.

- [ ] **Step 48: UsersManagementPage**

**Estimated Time:** 75-85 minutes

**Overall Features:**
1. List users with roles, projects, and budgets
2. Filter users by various criteria
3. Bulk selection of users (admin only)
4. Bulk actions on selected users
5. View user details popup
6. Assign budgets to user (modal)
7. Reset user budget (popup)
8. Select all with loading state
9. Paginate users
10. Role-based column visibility

**Complexity Notes:** Most complex settings page: 3 modals, bulk select logic, 411 lines, 6 sub-components, custom column renderers.

- [ ] **Step 49: ProjectsManagementPage**

**Estimated Time:** 30-40 minutes

**Overall Features:**
1. Switch between Default and Full projects management view
2. User management feature flag determines view
3. Full table view: list, paginate, add/edit/delete projects
4. Default view: simplified project list

**Complexity Notes:** Thin switch; complexity in sub-components ProjectsManagementDefault and ProjectsManagementFull.

- [ ] **Step 50: ProjectDetailsPage**

**Estimated Time:** 60-70 minutes

**Overall Features:**
1. View project details (users, admins, spending)
2. Edit project (modal)
3. Manage project members
4. Manage project budgets (maintainer only)
5. View cost center with link
6. Budget section (conditional)
7. Member budget tracking toggle
8. Loading and not found states

**Complexity Notes:** Multiple conditional sections based on role/feature flags, complex spending display, 271 lines.

**Progress:** Categories/Users/Projects 0/4 complete (0%)

---

### Task 12: Cost Centers, Budgets, MCP, AI Adoption

**Files to create:**
- `src/pages/administration/costCenters/__tests__/CostCentersManagementPage.integration.test.tsx`
- `src/pages/administration/costCenters/__tests__/CostCenterDetailsPage.integration.test.tsx`
- `src/pages/administration/budgets/__tests__/BudgetsManagementPage.integration.test.tsx`
- `src/pages/administration/mcp/__tests__/MCPManagementPage.integration.test.tsx`
- `src/pages/administration/aiAdoption/__tests__/AiAdoptionConfigPage.integration.test.tsx`

- [ ] **Step 51: CostCentersManagementPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. List cost centers in table
2. Create cost center (modal)
3. Edit cost center (modal)
4. Delete cost center with confirmation
5. Delete disabled when linked projects exist
6. Navigate to cost center details
7. Paginate cost centers

**Complexity Notes:** Two modals (create + edit/delete), delete guard, 263 lines.

- [ ] **Step 52: CostCenterDetailsPage**

**Estimated Time:** 35-45 minutes

**Overall Features:**
1. View cost center info (description, project count, metadata)
2. Edit cost center (popup modal)
3. Delete cost center with confirmation
4. Manage linked projects
5. Loading and not found states
6. Back navigation

**Complexity Notes:** Two modals (edit + confirm delete), project manager sub-component.

- [ ] **Step 53: BudgetsManagementPage**

**Estimated Time:** 60-70 minutes

**Overall Features:**
1. List budgets with limits and duration info
2. Filter budgets by category dropdown
3. Create budget (modal)
4. Edit budget (modal)
5. Sync budgets with LiteLLM
6. Role-based access (admin view, maintainer manage)
7. Paginate budgets
8. Format currency amounts

**Complexity Notes:** Role-based column/action visibility, budget sync, 306 lines, complex column renderers.

- [ ] **Step 54: MCPManagementPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. List MCP servers in table
2. Add MCP server
3. Edit MCP server (modal)
4. Delete MCP server
5. View MCP server details sidebar
6. Edit from details sidebar
7. Paginate MCP server list
8. Feature flag gating
9. Redirect if feature disabled

**Complexity Notes:** Dual-entry edit (table + details sidebar), feature flag check, 2 modals.

- [ ] **Step 55: AiAdoptionConfigPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. View AI adoption framework configuration
2. Edit maturity config section
3. Edit user engagement config section
4. Edit asset reusability config section
5. Edit expertise distribution config section
6. Edit feature adoption config section
7. Reset config to defaults
8. Confirmation modal for reset
9. Validation error display

**Complexity Notes:** Complex multi-section config with separate save handlers per section, reset confirmation modal.

**Progress:** Admin Misc 0/5 complete (0%)

---

## Phase 6: Analytics & AWS

### Task 13: Analytics Domain

**Files to create:**
- `src/pages/analytics/__tests__/AnalyticsPage.integration.test.tsx`
- `src/pages/analytics/__tests__/AnalyticsDashboardFormPage.integration.test.tsx`

- [ ] **Step 56: AnalyticsPage**

**Estimated Time:** 40-50 minutes

**Overall Features:**
1. View analytics dashboard (Insights/Adoption/Leaderboard tabs)
2. Filter analytics data
3. Manage custom dashboards
4. Edit custom dashboard
5. AI adoption framework configuration
6. Feature flag gating per feature
7. Role-based action visibility

**Complexity Notes:** Multiple dashboard types, feature flags, role-based actions, config modal.

- [ ] **Step 57: AnalyticsDashboardFormPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. Create custom analytics dashboard
2. Edit existing dashboard
3. Dashboard limit enforcement
4. Save and navigate to new dashboard
5. Cancel navigation

**Progress:** Analytics 0/2 complete (0%)

---

### Task 14: AWS Domain

**Files to create:**
- `src/pages/aws/__tests__/AwsAssistantsPage.integration.test.tsx`
- `src/pages/aws/__tests__/AwsWorkflowsPage.integration.test.tsx`
- `src/pages/aws/__tests__/AwsDataSourcesPage.integration.test.tsx`
- `src/pages/aws/__tests__/AwsGuardrailsPage.integration.test.tsx`

- [ ] **Step 58: AwsAssistantsPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. List AWS settings entries (credentials table)
2. List AWS agents for a setting
3. View AWS agent details
4. Three-level navigation (settings > agents > detail)
5. Back navigation between levels

**Complexity Notes:** Three rendering states based on URL params (settings list, entity list, entity detail).

- [ ] **Step 59: AwsWorkflowsPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. List AWS settings entries for flows
2. List AWS flows for a setting
3. View flow details
4. Three-level navigation (settings > flows > detail)
5. Back navigation between levels

- [ ] **Step 60: AwsDataSourcesPage**

**Estimated Time:** 20-30 minutes

**Overall Features:**
1. List AWS settings entries for knowledge bases
2. List AWS knowledge bases for a setting
3. Two-level navigation (settings > KB list)
4. Back navigation

- [ ] **Step 61: AwsGuardrailsPage**

**Estimated Time:** 25-35 minutes

**Overall Features:**
1. List AWS settings entries for guardrails
2. List AWS guardrails for a setting
3. View guardrail details
4. Three-level navigation (settings > guardrails > detail)
5. Back navigation between levels

**Progress:** AWS 0/4 complete (0%)

---

**Plan Complete and Saved**
