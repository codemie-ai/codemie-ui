---
name: integration-tester
description: Write integration tests for React pages by discovering user flows (Component → Store → API → UI). Triggers when user asks to 'write integration tests', 'add integration coverage', 'test user flows', 'cover [page name]', 'improve test coverage', 'test the full flow'.
version: 0.5.0
---

# Integration Tester

Write production-ready integration tests by discovering complete user flows: **User action → Store → API → State → UI update**.

## Scope: One Page = One Test File

**Integration tests cover ENTIRE PAGES, not page fragments.**

- **Target**: A complete page component (e.g., `UserListPage`, `DashboardPage`)
- **Output**: One test file per page: `[PageName].integration.test.tsx`
- **Coverage**: All user flows within that page (navigation, CRUD operations, filters, modals, etc.)

**Do NOT**:
- Split one page into multiple test files
- Test individual components in isolation (that's unit testing)
- Test shared components separately (test them through page usage)

**Example**:
- ✅ `UserListPage.integration.test.tsx` covers: list loading, tabs, create, edit, delete, filters, modals
- ❌ `UserCard.test.tsx`, `UserFilters.test.tsx`, `UserActions.test.tsx` (too granular)

**Why**: Integration tests validate complete user journeys. Splitting by component breaks the flow and misses integration bugs.

---

## Scope Decision

Read the target page file. Count:
- Components (imports + JSX usage)
- Custom hooks (from `@/hooks/` or page-local `hooks/`)

**≥5 components OR ≥3 hooks** → spawn discovery subagent (Step 1b)  
**<5 components AND <3 hooks** → trace flows directly (Step 1a)

## Workflow

### 1a. Discovery (small scope)

Read 2-3 components, trace flows, write tests.

### 1b. Discovery (large scope)

Spawn discovery subagent using `references/discovery.md`. It will:
1. Read all components
2. Trace every flow: Component → Store → API → UI
3. **Trace component hierarchies** for menus/modals/nested interactions (Phase 2b)
   - Follows import chain from Page to deepest component
   - Documents exact aria-labels from final component
   - Notes conditions at each level (feature flags, abilities)
4. Write test plan to `.codemie/integration-test-plan-[Component].md`

**Note**: The subagent handles both flow discovery AND hierarchy tracing - no separate step needed.

---

### 1.5. Review Test Plan with User (MANDATORY CHECKPOINT)

**This step is REQUIRED. Do not skip.**

After discovery completes:

1. **Extract summary from discovery output**:
   - If subagent was used: The subagent's final response includes a "Summary for User Review" section
   - If direct tracing: Generate similar summary yourself from the test plan
   
2. **Present the summary to user**:
   - Show the summary (already formatted for user consumption)
   - Add: "Please review the full plan at: `.codemie/integration-test-plan-[Component].md`"
   - Add: "Would you like to proceed, or are there specific flows/features you'd like me to add?"

3. **Wait for user response**. The user may:
   - **Approve**: "Looks good, proceed" → Continue to Step 2
   - **Request additions**: "Add tests for X" or "You missed Y" → Go to Step 1.6
   - **Ask questions**: Answer them, then repeat this step

**Do not proceed to Step 2 without explicit user approval.**

---

### 1.6. Refine Test Plan (If User Requests Additions)

**Skip this step if user approved plan in 1.5.**

If user identifies missing flows or requests additions:

1. **Parse the user's request**:
   - What feature/flow to add? (e.g., "test project filter", "add publishing categories")
   - Any specific scenarios? (e.g., "test error case", "test with no permissions")
   - Priority level? (if user says "critical" → High priority)

2. **Spawn focused discovery subagent**: See `references/refinement.md` for subagent prompt template
   - Pass user's request to subagent
   - Subagent investigates ONLY requested feature
   - Returns only new flows (not full discovery)

3. **Update test plan** with subagent's output:
   - Read current plan
   - Insert new flow(s) in appropriate subsystem section
   - Update counts (total flows, priority breakdown)
   - Save updated plan

4. **Present updated summary** to user:
   - Show what was added (flow title, priority)
   - New total count
   - Ask for re-review

5. **Return to Step 1.5** (review checkpoint)

**Repeat 1.5 → 1.6 loop until user approves.**

---

### 2. Learn Test Patterns (CRITICAL)

**Before writing ANY test**, understand how this project's tests work:

1. **Find similar tests FIRST**: `ls src/pages/[similar]/__tests__/*.integration.test.tsx`
   - Read ONE existing test (first 100 lines)
   - Copy its patterns - don't invent new ones
   - Note what it DOESN'T test (e.g., toast messages)
   - **Use its fixture as template** - it has all required fields

2. **If no similar tests exist**: Read `references/setup.md`

**Critical rules**:
- ❌ NEVER: `userStore.user = {...}` in beforeEach
- ✅ ALWAYS: `mockAPI('GET', 'endpoint', {...})` only
- Why: `renderPage` → `<App />` → `useInitialDataFetch()` → API calls populate stores

**BEFORE WRITING ANY TEST CODE**:
1. Open `.codemie/integration-test-plan-[Component].md` - this is your source of truth
2. For each test you write, find its corresponding flow in the plan
3. **Use EXACT selectors from the plan's "Trigger" and "Assertions" sections**
   - Copy aria-labels, button text, placeholders EXACTLY as documented
   - Don't guess, don't modify, don't copy from old tests blindly
4. The discovery subagent already read all components and documented real selectors - trust the plan

---

### 3. Write Tests

**Organization**:
1. Group tests into logical `describe` blocks by feature area:
   - "Initial Page Load"
   - "Tab Navigation"
   - "Create Actions"
   - "Card Interactions"
   - "Context Menu Actions"
   - "Reactions and Preferences"
   - "Filters and Pagination"

2. **Minimize comments** - remove obvious ones:
   - ❌ `// Open context menu` before `user.click(menuButton)`
   - ❌ `// Verify API called` before `expect(fetch).toHaveBeenCalled`
   - ✅ `// Wait for debounced filter (1000ms delay)` for timing-specific waits
   - ✅ `// No confirmation modal - adds directly` for non-obvious UX

Use `references/templates.md` for test structure. Each test must verify the **complete user-observable outcome**:

```typescript
describe('PageName - Integration', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
  })
  
  describe('Feature Area', () => {
    it('action description', async () => {
      mockAPI('GET', 'v1/endpoint', responseData)
      
      renderPage('/actual-route-from-router-tsx')
      
      await user.click(screen.getByRole('button', { name: 'Exact Text' }))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/endpoint'),
          expect.anything()
        )
      })
      
      await waitFor(() => {
        expect(screen.getByText('New State')).toBeInTheDocument()
      })
      
      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'route-name' })
      )
    })
  })
})
```

**Special cases**:

- **Debounced filters**: 
  ```typescript
  await user.type(input, 'text')
  await new Promise(resolve => setTimeout(resolve, 1100)) // Wait debounce
  ```
  Search component for debounce timing first.

- **Toast messages**: DON'T test unless critical. Existing tests skip toast verification - follow their pattern.

- **Modals and popups**: Test the full flow in a single test — trigger → content verification → interaction → close. Never split the trigger and the content into separate tests (`opens popup` + `shows popup content` are always one test).

**Don't write standalone tests for structural labels.** A test asserting only that `'Overview'` or `'Project:'` appears in the DOM adds no signal — those labels are unconditional. Assert structural labels alongside the content they label: when verifying a field value, assert its label in the same `waitFor`. A test whose only assertion is a heading is noise, not behavior.

**Write ALL tests FIRST**, then run once. Don't write-run-fix one at a time.

**Mini-checklist for each test you write**:
- [ ] Used exact selector from test plan (not guessed)
- [ ] API assertion present (if flow calls API)
- [ ] UI outcome assertion present (button state, text change, navigation, etc.)
- [ ] For PUT/POST that submit user-entered data: request body verified (`expect.stringContaining(userValue)`)

---

### 3.5. Cross-Check: Did You Write Tests for ALL Flows?

**MANDATORY: Before Step 4, verify coverage.**

This is where most incomplete test suites happen - you write tests for the "interesting" flows (modals, complex interactions) but skip "boring" flows (simple filters, display-only assertions).

**Coverage verification steps:**

1. **Open test plan**: `.codemie/integration-test-plan-[Component].md`
2. **Count total flows**: Grep for `^#### Flow ` headers → note the highest flow number (e.g., "Flow 35" means 35 flows)
3. **List all flow numbers**: 1, 2, 3, ... N
4. **For each flow number, find the corresponding test**:
   - Open your test file
   - Search for the test that covers that flow (match by test description or behavior)
   - Mark it as ✓ covered
5. **Identify missing flows**: Which flow numbers have no corresponding test?
6. **Write tests for missing flows NOW** (don't defer to "later")

**Common gaps to watch for:**
- Simple filter flows (project filter, shared filter) - often in plan but not tested
- Display-only assertions (description shown, badge shown) - less "interesting" so often skipped
- Error paths (API errors, validation errors) - tedious but necessary
- Edge cases at end of plan (pagination, URL query params) - easy to forget

**Quality gate**: Every flow number in the plan must have a test. Count(tests) ≥ Count(flows).

If you have 35 flows in the plan, you need at least 35 tests (some flows may need multiple tests for error paths).

**If you find missing flows**: Write them now before proceeding to Step 4. Do not rationalize ("that flow is covered by another test") - write explicit tests.

---

### 4. Verify Test Completeness

**MANDATORY CHECKPOINT: You must complete this step for EVERY test before running any tests.**

Read `references/verification.md` and check each test against this rule:

**Core Rule:** If a test verifies an API was called, it MUST also verify the UI outcome (not one or the other - BOTH).

**For each test, verify the complete flow:**
- [ ] If API called → UI updated (button state, count, text, element appeared/disappeared)
- [ ] If navigation expected → Route/params verified
- [ ] If toast/modal expected → Message/dialog verified

**At least one error test per feature** (API returns 4xx/5xx → error message shown)

**If ANY test stops after `expect(fetch).toHaveBeenCalled` without checking UI, fix it before Step 5.**

**Common incomplete patterns to fix:**
- Test stops after checking `expect(fetch).toHaveBeenCalled` → Add UI verification
- Modal test only checks dialog opened → Complete the submission flow
- No error path tests → Add at least one 4xx/5xx scenario

---

### 5. Run Tests and Fix Failures (MANDATORY LOOP)

**CRITICAL: This step MUST repeat until ALL tests pass. You cannot proceed to Step 6 with failing tests.**

**Loop until all tests pass**:

---

**Phase 0: Pattern Analysis (FIRST THING AFTER EVERY TEST RUN)**

Before investigating individual failures:

1. **Run test suite** → capture all output
2. **Group errors by pattern**:
   - Same error message in 5+ tests? → Common root cause
   - Same component/selector failing across tests? → Systematic issue
   - Different errors per test? → Individual investigation needed
3. **Fix pattern groups FIRST** (biggest impact):
   - Wrong selector used in 10 tests? → Read component once, fix all 10
   - Missing API mock field in 5 tests? → Trace store method once, fix all 5
4. **Then fix remaining individual failures**

**Example pattern**:
- 13 tests fail with "element not found" for different buttons → Read all mentioned components, extract actual aria-labels, fix all selectors at once
- 5 tests fail with API error → Trace store method to find expected response shape, update all mocks

---

**Phase 1: Investigation Checklist** (for each failure or pattern):

| Symptom | Investigation Steps | Common Fixes |
|---------|-------------------|--------------|
| **Element not found** | 1. Add `screen.debug()` before the failing query<br>2. Grep component for actual aria-label<br>3. Check if element is conditionally rendered | Update selector to match actual aria-label/role |
| **Button not rendering** | 1. Check feature flags: `isVisible`, `useFeatureFlag`<br>2. Check abilities: `canDelete`, `canEdit`<br>3. Check props: button depends on prop value | Add feature flag mock or ability in fixture |
| **Menu item missing** | 1. Check abilities in fixture<br>2. Check feature flags<br>3. Read NavigationMore actions config | Add required ability/flag to test setup |
| **API error** | 1. Trace store method to find required response fields<br>2. Check mockAPI response structure<br>3. Check if endpoint URL is correct | Add missing fields to mockAPI response |
| **Unexpected behavior** | 1. Read actual handler (don't assume)<br>2. Check for async timing issues<br>3. Check for missing waitFor | Add waitFor, fix async timing, update expectations |

**Full diagnostic guide**: `references/setup.md` → "Systematic Investigation" section

---

**Pattern Analysis** (do this FIRST before fixing):

1. **Run all tests**, capture output
2. **Group errors**:
   - Same error in 5+ tests → common root cause, fix once
   - Different errors → individual investigation needed
3. **Prioritize**:
   - Fix common patterns first (biggest impact)
   - Then fix individual failures

**Testing Strategy**:
- **Never use `.skip()`** - all tests must pass
- When debugging, use `.only()` to focus on specific tests:
  ```typescript
  it.only('the test I want to debug', ...)  // Run only this
  it('other test', ...)  // Temporarily not running
  ```
- Remove all `.only()` before final run

**Efficient Test Iteration** (avoid redundant test runs):

Integration tests are slow. During investigation, save output to a temp file instead of re-running unchanged tests:

```bash
# Unix/Mac - save output with tee
npx vitest run src/pages/[Page]/__tests__/*.test.tsx 2>&1 | tee /tmp/test-output.txt

# Windows PowerShell - save output with Tee-Object
npx vitest run src/pages/[Page]/__tests__/*.test.tsx 2>&1 | Tee-Object -FilePath C:\temp\test-output.txt
```

**Workflow**:
1. **First run** → save to temp file
2. **Analyze failures** from saved file (read it, no re-run needed)
3. **Fix all related issues** (pattern fixes + individual fixes)
4. **Second run** → verify all fixes work
5. **Delete temp file** when complete

**When to use**: During Phase 1 (pattern analysis & investigation). Don't re-run tests just to read error messages you already captured.

**Note from user request**: "It takes quite a time. Just if you need output - save it somewhere in temp location and then delete when not needed."

---

**Phase 2: Apply Fixes and Re-run**

Fix the identified issues and run tests again. Continue pattern analysis → fix → re-run loop until all tests pass.

**No escape hatch. You must keep investigating until all tests pass.**

When stuck on a failure:
1. Add `screen.debug()` to see actual DOM at point of failure
2. Read the actual component source (grep for the element you're looking for)
3. Trace the actual handler code (don't assume behavior - read it)
4. Check for async timing issues (add `waitFor` or longer timeouts)
5. Verify API mocks match what the code actually expects (read store methods)

**Keep iterating through the investigation checklist. There is no "ask for help" option.**

---

**Quality Gate Before Step 6**:

All tests must pass before proceeding. No exceptions. If tests are failing, you haven't investigated deeply enough - return to Phase 1 investigation checklist.

---

### 6. Cleanup and Completion

**Final Quality Check**:

Before marking complete, verify this checklist:

- [ ] **All tests pass** (100% pass rate, no failures)
- [ ] **No `.only()` remaining** (all tests run in final suite)
- [ ] **Coverage target met**: Run `npx vitest run --coverage src/pages/[Page]/__tests__/*.integration.test.tsx`
  - Target: 70%+ branch coverage
  - All HIGH priority flows from test plan covered
- [ ] **Test file organized**: Proper `describe` blocks, minimal comments
- [ ] **Cleanup temp files**: `rm .codemie/integration-test-plan-[Component].md` (if no longer needed)

**Final Report to User**:

```
Integration tests complete for [Component]:

✅ All tests passing: X tests
📊 Coverage: Y% branch coverage
📁 File: src/pages/[Component]/__tests__/[Component].integration.test.tsx
```

**If ANY checklist item fails, DO NOT report completion. Return to the appropriate step.**

---

## Anti-Patterns (AVOID THESE)

1. ❌ **Guessing aria-labels instead of using test plan** → Use exact selectors from test plan
2. ❌ **Writing tests without reading test plan** → Test plan has all correct selectors already
3. ❌ **Assuming symmetric behavior** (pin/unpin both confirm) → Read handler to see actual flow
4. ❌ **Testing toasts in every test** → Skip unless critical, follow existing test patterns
5. ❌ **Using .skip() at all** → Never skip tests; fix them or ask user for help
6. ❌ **Adding obvious comments** → Remove comments that just repeat code
7. ❌ **Not grouping tests in describe blocks** → Always group by feature area
8. ❌ **Creating failure analysis reports** → Just keep fixing tests until green
9. ❌ **Missing required API response fields** → Trace store parsing to find required fields
10. ❌ **Not waiting for debounced actions** → Search for debounce timing first
11. ❌ **Fixing individual tests before pattern analysis** → Group errors first, fix patterns, then individuals
12. ❌ **Using `Record<string, any>` in fixture overrides** → Use `Partial<EntityType>` for type safety and IDE completion
13. ❌ **Section comment decorators** (`// ─── Section Name ───`) → Use `describe()` blocks for grouping instead

**Technical gotchas**: See `references/setup.md` → "Common Pitfalls" for technical details (fixtures, store initialization, component hierarchy, etc.)

---

## References (Load on Demand)

- `references/setup.md` - **Load in Step 2** (if no similar tests exist) OR **Step 5** (during investigation). Covers: renderPage lifecycle, mockAPI usage, systematic investigation, common pitfalls.
- `references/discovery.md` - **Load in Step 1b** for full discovery subagent prompt template.
- `references/refinement.md` - **Load in Step 1.6** for focused discovery subagent prompt (test plan additions).
- `references/templates.md` - **Load in Step 3** for test structure examples and patterns.
- `references/plan.md` - Test plan template (used by discovery subagent, not loaded by main agent).
- `references/verification.md` - **Load in Step 4** for complete flow verification checklist.
