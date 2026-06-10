---
name: integration-tester
description: Write integration tests for React pages by discovering user flows (Component → Store → API → UI). Triggers when user asks to 'write integration tests', 'add integration coverage', 'test user flows', 'cover [page name]', 'improve test coverage', 'test the full flow'.
version: 0.4.0
---

# Integration Tester

Write production-ready integration tests by discovering complete user flows: **User action → Store → API → State → UI update**.

## Scope Decision

Read the target page file. Count:
- Components (imports + JSX usage)
- Custom hooks (from `@/hooks/` or page-local `hooks/`)

**≥5 components OR ≥3 hooks** → spawn discovery subagent (Step 1b)  
**<5 components AND <3 hooks** → trace flows directly (Step 1a)

### Why the subagent matters

Similar test files (like SkillsListPage) show patterns but not flows. Assistants pages may have:
- Remote assistant creation (feature-flagged)
- Different reaction/favorite APIs
- Export popup with environment variable selection
- Pin/unpin vs Skills' like/dislike

The subagent systematically traces these differences. Without it, you'll copy SkillsListPage patterns and miss assistant-specific edges.

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

- **Modals**: Test full flow (open → interact → submit → close), not just "opens"

**Write ALL tests FIRST**, then run once. Don't write-run-fix one at a time.

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

### 5. Run Tests and Fix Failures

**When tests fail, investigate systematically**:
- Element not found? → Grep component for actual aria-label
- Button not rendering? → Check feature flags (`isVisible`, `useFeatureFlag`)
- Menu item missing? → Check abilities (`canDelete`, `canEdit` in component)
- API error? → Trace store method to find required response fields
- Unexpected behavior? → Read actual handler (don't assume symmetric flows)

**Full diagnostic guide**: `references/setup.md` → "Systematic Investigation" section

**Pattern analysis first**:
- Same error in 5+ tests → investigate once, batch fix
- Different errors → fix one-by-one with `screen.debug()`

**Investigation checklist** (for EVERY failure):
- [ ] Used `screen.debug()` to see actual DOM?
- [ ] Read actual component/store implementation?
- [ ] Understand WHY failing (not just what error says)?

**Testing strategy**:
- Use `.skip()` ONLY for permanently disabled features (with comment explaining why)
- When debugging, use `.only()` to focus on specific tests:
  ```typescript
  it.only('the test I want to debug', ...)  // Run only this
  it('other test', ...)  // Skipped automatically
  ```
- DON'T use `.skip()` on working tests to focus on one - use `.only()` instead

**Every non-skipped test must pass.**

---

### 6. Cleanup

- Run coverage: `npx vitest run --coverage src/pages/[Page]/__tests__/*.integration.test.tsx`
- Target: 70%+ branch coverage, all HIGH priority flows tested
- Delete test plan: `rm .codemie/integration-test-plan-[Component].md`

---

## Anti-Patterns (AVOID THESE)

1. ❌ **Guessing aria-labels** without reading component → Read actual component for exact labels
2. ❌ **Writing tests before validating selectors exist** → Validate in Step 2a first
3. ❌ **Assuming symmetric behavior** (pin/unpin both confirm) → Read handler to see actual flow
4. ❌ **Testing toasts in every test** → Skip unless critical, follow existing test patterns
5. ❌ **Using .skip() to focus on one test** → Use .only() instead
6. ❌ **Adding obvious comments** → Remove comments that just repeat code
7. ❌ **Not grouping tests in describe blocks** → Always group by feature area
8. ❌ **Inventing test patterns** → Copy patterns from existing tests
9. ❌ **Missing required API response fields** → Trace store parsing to find required fields
10. ❌ **Not waiting for debounced actions** → Search for debounce timing first

## Gotchas

- **Large pages need discovery**. ≥5 components or ≥3 hooks → use the subagent. Pattern files teach structure, not flows.
- **Existing tests = infrastructure truth**. ALWAYS read one first - copy its fixture, patterns, what it doesn't test.
- **Never initialize stores directly**. `userStore.user = {...}` in beforeEach gets overwritten. Use `mockAPI` instead.
- **Routes come from router.tsx**. Don't guess paths - read the router config.
- **Missing fixture fields break rendering**. Copy fixture from existing tests or read entity type for ALL required fields.
- **Button aria-labels are in deepest component**. Trace hierarchy: Page → List → Card → Actions → Menu. NavigationMore has "More options", not "Export options".
- **Feature flags gate rendering**. No config mock = no button. Pin needs `features:pinnedAssistants` config. Grep `isVisible`, `useFeatureFlag` when elements missing.
- **User abilities gate menu items**. Delete needs `['read', 'write', 'delete']` in fixture. Grep `canDelete`, `canEdit` in component.
- **API response structure matters**. Store expects `like_count`, not `unique_likes_count`. Trace `.then(result => result.field)` in store method.
- **Confirmations aren't always symmetric**. Pin without confirmation, unpin with. Favorite adds directly, removal confirms. Read actual handler.
- **Toast testing is flaky**. Existing tests skip toast verification - follow their pattern unless toast is PRIMARY feedback.

---

## References (Load on Demand)

- `references/setup.md` - renderPage lifecycle, mockAPI usage, anti-patterns
- `references/discovery.md` - Subagent prompt template (large scope only)
- `references/templates.md` - Test structure examples
- `references/plan.md` - Test plan template (large scope only)
- `references/verification.md` - Complete flow verification checklist (used in Step 4)
