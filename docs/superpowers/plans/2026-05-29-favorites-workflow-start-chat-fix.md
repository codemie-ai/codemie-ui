# Favorites Workflow Start Chat Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bug where clicking "Start Chat" on a workflow card in Favorites opens an empty chat instead of a proper workflow chat session.

**Architecture:** Add the missing `onStartChat` prop to `WorkflowCard` in `FavoritesPage.tsx` to match the working implementation in `WorkflowsList.tsx`. The fix involves importing the necessary dependencies (`chatsStore`, `useVueRouter`), implementing the `startChat` handler, and passing it to `WorkflowCard`.

**Tech Stack:** React 18.3.x, TypeScript 5.4.x, Valtio 2.1.x, React Router 7.x

---

## File Structure

**Modified Files:**
- `src/pages/favorites/FavoritesPage.tsx` - Add `startChat` handler and pass `onStartChat` prop to `WorkflowCard`

**No New Files:**
This is a single-file bug fix that adds missing functionality to an existing component.

---

## Task 1: Add Required Imports to FavoritesPage

**Files:**
- Modify: `src/pages/favorites/FavoritesPage.tsx:16-42`

**Test-first:** No - This is an import addition with no testable behavior

- [ ] **Step 1: Add chatsStore import**

Add this import after line 34 (after `favoritesStore` import):

```typescript
import { chatsStore } from '@/store/chats'
```

- [ ] **Step 2: Add useVueRouter import**

Add to the existing import from `@/hooks/useVueRouter` on line 34. Change:

```typescript
import { useVueRouter } from '@/hooks/useVueRouter'
```

Note: Check if `useVueRouter` is already imported. If it is, skip this step. If not, add it as a new import line.

- [ ] **Step 3: Add workflowsStore import**

Check if `workflowsStore` is already imported. If not, add after the `chatsStore` import:

```typescript
import { workflowsStore } from '@/store/workflows'
```

- [ ] **Step 4: Verify imports compile**

Run: `npm run typecheck`
Expected: No type errors related to FavoritesPage.tsx imports

- [ ] **Step 5: Commit**

```bash
git add src/pages/favorites/FavoritesPage.tsx
git commit -m "EPMCDME-12539: Add required imports for workflow chat functionality"
```

---

## Task 2: Add Router Hook and startChat Handler

**Files:**
- Modify: `src/pages/favorites/FavoritesPage.tsx:53-102`

**Test-first:** No - This adds internal component logic; behavior will be tested manually in Task 3

- [ ] **Step 1: Add router hook after line 54**

After the line `const { favorites, assistants, skills, workflows, loading } = useSnapshot(favoritesStore)`, add:

```typescript
const router = useVueRouter()
```

- [ ] **Step 2: Add startChat handler after the router hook**

Add the complete `startChat` handler after the router hook and before the `handleViewAssistant` line:

```typescript
const startChat = async (workflow: Workflow) => {
  await chatsStore.startNewChat(String(workflow.id), workflow.name, true)
  router.push({ name: 'new-chat' })
  workflowsStore.updateRecentWorkflows(workflow as any)
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run typecheck`
Expected: No type errors in FavoritesPage.tsx

- [ ] **Step 4: Verify build succeeds**

Run: `npm run build`
Expected: Build completes successfully without errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/favorites/FavoritesPage.tsx
git commit -m "EPMCDME-12539: Add startChat handler to FavoritesPage"
```

---

## Task 3: Pass onStartChat Prop to WorkflowCard

**Files:**
- Modify: `src/pages/favorites/FavoritesPage.tsx:140-150`

**Test-first:** No - Manual testing will verify the fix

- [ ] **Step 1: Update renderWorkflowGrid function**

Locate the `renderWorkflowGrid` function around line 140. Modify the `WorkflowCard` component to add the `onStartChat` prop:

```typescript
const renderWorkflowGrid = (items: readonly FavoriteItem[]) => (
  <div className={GRID_CLASS}>
    {items.map((item) => (
      <WorkflowCard
        key={item.id}
        workflow={item as unknown as Workflow}
        onStartChat={startChat}
        reloadWorkflows={handleRefresh}
      />
    ))}
  </div>
)
```

The only change is adding the line `onStartChat={startChat}` to the `WorkflowCard` component.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 4: Commit**

```bash
git add src/pages/favorites/FavoritesPage.tsx
git commit -m "EPMCDME-12539: Pass onStartChat prop to WorkflowCard in Favorites"
```

---

## Task 4: Manual Testing and Verification

**Files:**
- None (manual testing only)

**Test-first:** No - This is end-to-end manual verification

- [ ] **Step 1: Start development server**

Run: `npm run dev`
Expected: Dev server starts on http://localhost:5173

- [ ] **Step 2: Navigate to Favorites page**

Open browser to: http://localhost:5173/favorites/workflows
OR: http://localhost:5173/workflows/favorites

Expected: Favorites page loads with workflow cards

- [ ] **Step 3: Test Start Chat button**

Click the "Start Chat" button (chat icon) on any workflow card.

Expected:
- A new chat is created with the workflow context
- Browser navigates to the new chat page
- The chat is NOT empty - it should be a workflow chat session
- The workflow appears in the recent workflows list

- [ ] **Step 4: Verify no regression on My Workflows page**

Navigate to: http://localhost:5173/workflows/my

Click "Start Chat" on any workflow card.

Expected: Same behavior as before (this should already work correctly)

- [ ] **Step 5: Test the "all" favorites view**

Navigate to: http://localhost:5173/favorites/all

If workflows are shown, click "Start Chat" on a workflow card.

Expected: Same correct behavior as in the workflow-specific favorites view

- [ ] **Step 6: Document test results**

Create a simple test report noting:
- ✓ Favorites workflow chat works correctly
- ✓ My Workflows page not affected (no regression)
- ✓ "All" favorites view works correctly

---

## Self-Review Checklist

**Spec Coverage:**
- ✓ Add `chatsStore` import - Task 1, Step 1
- ✓ Add `useVueRouter` import - Task 1, Step 2
- ✓ Add `workflowsStore` import - Task 1, Step 3
- ✓ Add router hook - Task 2, Step 1
- ✓ Implement `startChat` handler - Task 2, Step 2
- ✓ Pass `onStartChat` to `WorkflowCard` - Task 3, Step 1
- ✓ Manual testing - Task 4

**Placeholder Scan:**
- ✓ No "TBD", "TODO", or "implement later"
- ✓ No "add appropriate" or "handle edge cases" without specifics
- ✓ All code blocks contain actual implementation
- ✓ All commands specify exact expected output

**Type Consistency:**
- ✓ `Workflow` type used consistently (from existing import)
- ✓ `startChat` function signature matches `onStartChat` prop type
- ✓ Method calls match existing API: `startNewChat`, `updateRecentWorkflows`

---

## Execution Notes

**Estimated Time:** 10-15 minutes

**Risk Level:** Low - Single file change, matching proven working pattern

**Dependencies:** None - all required functions and types already exist

**Testing Strategy:** Manual testing only (no automated tests for this UI interaction bug fix)

**Rollback Plan:** If issues arise, simply revert the commits from Tasks 1-3
