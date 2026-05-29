# Fix: Favorites Page Workflow "Start Chat" Opens Empty Chat

**Date:** 2026-05-29  
**Ticket:** EPMCDME-12539  
**Type:** Bug Fix

## Problem

When clicking "Start Chat" on a workflow card in the Favorites page (`/favorites/workflows` or `/workflows/favorites`), an empty chat is created instead of properly initiating a workflow chat session. The same action works correctly on the My Workflows page (`/workflows/my`).

## Root Cause

`FavoritesPage.tsx` renders `WorkflowCard` without the `onStartChat` prop. When this prop is absent, `WorkflowCard.handleChatClick` falls back to calling `chatsStore.createChat()`, which creates a new empty chat instead of properly starting a workflow chat session via `chatsStore.startNewChat()`.

## Solution

Add the `onStartChat` handler to `WorkflowCard` in `FavoritesPage.tsx` to match the working behavior from `WorkflowsList.tsx`.

## Implementation Details

### Changes to `src/pages/favorites/FavoritesPage.tsx`

1. **Add imports:**
   - Import `chatsStore` from `@/store/chats`
   - Import `useVueRouter` hook from `@/hooks/useVueRouter`

2. **Add router hook:**
   ```typescript
   const router = useVueRouter()
   ```

3. **Implement `startChat` handler:**
   ```typescript
   const startChat = async (workflow: Workflow) => {
     await chatsStore.startNewChat(String(workflow.id), workflow.name, true)
     router.push({ name: 'new-chat' })
     workflowsStore.updateRecentWorkflows(workflow as any)
   }
   ```

4. **Update `renderWorkflowGrid` function:**
   Add `onStartChat={startChat}` prop to the `WorkflowCard` component (around line 143-148).

### Component Behavior

**Before Fix:**
- `WorkflowCard` receives no `onStartChat` prop
- Falls back to `chatsStore.createChat()` which creates an empty chat
- Navigates to the new empty chat without workflow context

**After Fix:**
- `WorkflowCard` receives `onStartChat={startChat}` prop
- Calls `chatsStore.startNewChat()` which properly initiates a workflow chat session
- Navigates to `new-chat` route with workflow context
- Updates the recent workflows list

### Data Flow

1. User clicks "Start Chat" button on workflow card in Favorites page
2. `WorkflowCard.handleChatClick` event handler is triggered
3. Since `onStartChat` prop is now provided, it calls `onStartChat(workflow)`
4. `startChat` handler in `FavoritesPage` executes:
   - Calls `chatsStore.startNewChat(workflowId, workflowName, true)` to create a workflow chat
   - Navigates to the `new-chat` route
   - Updates the recent workflows list via `workflowsStore.updateRecentWorkflows()`

This matches the exact flow that works correctly in `WorkflowsList.tsx` (lines 147-151).

## Testing

### Manual Test Steps

1. Navigate to Favorites page: `/favorites/workflows` or `/workflows/favorites`
2. Find any workflow card in the list
3. Click the "Start Chat" button (chat icon)
4. **Expected:** A new workflow chat session should open with the workflow context
5. **Previously:** An empty chat would open without workflow context

### Affected Pages

- `/favorites/workflows` - Workflow filter in Favorites
- `/workflows/favorites` - Legacy route (if exists)
- All Favorites tabs that display workflow cards

### No Impact On

- `/workflows/my` - Already working correctly (uses `WorkflowsList.tsx`)
- `/workflows` - Already working correctly (uses `WorkflowsList.tsx`)
- Other workflow card locations that already provide `onStartChat`

## Alternative Approaches Considered

1. **Change WorkflowCard default behavior** - Rejected because it would change behavior across all consumers and might break intentional uses of `createChat`.
2. **Make onStartChat required** - Rejected as overkill for this bug fix; would require changes across the entire codebase.

## Dependencies

- No new dependencies required
- Uses existing `chatsStore.startNewChat()` method
- Uses existing `workflowsStore.updateRecentWorkflows()` method
- Uses existing `useVueRouter()` hook

## Acceptance Criteria

- [ ] Clicking "Start Chat" on a workflow card in Favorites opens a proper workflow chat (not empty)
- [ ] The workflow context is properly passed to the new chat
- [ ] Recent workflows list is updated after starting a chat
- [ ] Navigation works correctly to the new chat
- [ ] No regression in My Workflows page behavior
