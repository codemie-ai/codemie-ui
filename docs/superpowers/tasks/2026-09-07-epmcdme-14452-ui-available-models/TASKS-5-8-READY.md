# Tasks 5-8: Remaining UI Implementation (Auto-Execute Ready)

## Quick Reference

**When to run:** After Stage 1 summary commit review  
**How to run:** Use `/executing-plans` skill OR dispatch subagent per task with `superpowers:subagent-driven-development`  
**Time estimate:** 30-45 minutes total

---

## Task 5: Component Tests

**Files:**
- Create: `src/pages/settings/administration/projectsManagement/__tests__/AvailableModelsSection.test.tsx`
- Test: 8 scenarios covering load, select, validate, save, auth, unavailability, errors

**Key Test Scenarios:**
1. Load chat and image models from endpoints
2. Initialize selected models from currentAllowedModels prop
3. Validation error when zero chat models remain
4. Successful save calls store method
5. Authorization disabled UI when canManageModels=false
6. Unavailable models rendered with disabled state
7. API error handling (display error toast)
8. Success toast on successful save

**Mock Setup Required:**
```typescript
jest.mock('@/utils/api')
jest.mock('@/utils/toaster')
jest.mock('@/store/projects', () => ({
  projectsStore: { updateAllowedModels: jest.fn() }
}))
```

**Test Structure:**
- Setup: render component with props, mock API responses
- Act: trigger interactions (checkbox click, save button)
- Assert: verify UI state + API calls + store calls + toasts

---

## Task 6: ProjectDetailsPage Integration

**Files:**
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx`

**Changes:**
1. Import `AvailableModelsSection` component
2. Compute `canManageAllowedModels` flag:
   - True if user is `isAdmin` OR `isMaintainer` OR `applicationsAdmin`
   - False otherwise
3. Gate component rendering:
   - Skip for personal projects (`project_type === 'personal'`)
   - Pass: `projectName`, `currentAllowedModels`, `canManageAllowedModels`, `onSuccess`
4. Position after "Project Members" section (or appropriate location in layout)

**Authorization Check Example:**
```typescript
const canManageAllowedModels = 
  user?.is_admin || 
  project?.members?.find(m => m.user_id === user?.id)?.is_project_admin ||
  user?.applications_admin
```

---

## Task 7: ProjectDetailsPage Integration Tests

**Files:**
- Modify: `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`

**Test Scenarios:**
1. AvailableModelsSection visible for shared projects
2. AvailableModelsSection hidden for personal projects
3. canManageModels=true when user is admin
4. canManageModels=false when user is not authorized
5. onSuccess callback refreshes project data

**Setup:**
- Use existing test utilities (render ProjectDetailsPage, mock API)
- Test with both `project_type: 'shared'` and `project_type: 'personal'`
- Test with different user roles (admin, maintainer, member, non-member)

---

## Task 8: End-to-End Validation

**Checklist:**
- [ ] Run `npm test` — all tests pass (including Tasks 5 & 7)
- [ ] Run `npm run type-check` — no TypeScript errors
- [ ] Run `npm run lint` — no linter violations
- [ ] Manual: Start dev server, navigate to project settings
- [ ] Manual: Verify component displays in ProjectDetailsPage
- [ ] Manual: Test checkbox interactions (select/deselect models)
- [ ] Manual: Test save flow (should succeed or show error message)
- [ ] Manual: Test authorization gate (switch user role, verify UI state)
- [ ] Manual: Test personal project gating (switch to personal project, component hidden)

**Commands:**
```bash
npm test                # Run full test suite
npm run type-check      # TypeScript strict mode check
npm run lint            # Linter check (ESLint/Prettier)
npm run dev             # Start dev server
```

---

## Execution Recommendations

**Option A: Subagent-Driven (Recommended for Complex Tasks)**
- Fresh subagent per task
- Two-stage review between tasks
- Use `superpowers:subagent-driven-development`

**Option B: Inline with Checkpoints**
- Use `/executing-plans` skill
- Batch execute with checkpoints
- Manual review before Task 6

**Option C: Manual**
- Copy tasks above, execute in IDE
- Run tests after each task
- Commit per task

---

## Known Dependencies

- ✅ Task 5 depends on Task 4 (AvailableModelsSection created)
- ✅ Task 6 depends on Task 5 (component tests establish behavior)
- ✅ Task 7 depends on Task 6 (integration exists)
- ✅ Task 8 depends on Tasks 5-7 (all code exists)

All dependencies met. Tasks 5-8 are ready to execute.
