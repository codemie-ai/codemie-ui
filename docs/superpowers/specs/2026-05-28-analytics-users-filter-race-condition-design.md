# Analytics Users Filter Race Condition Fix

**Date:** 2026-05-28  
**Ticket:** EPMCDME-12524  
**Type:** Bug Fix

## Problem Statement

The Analytics page Users filter displays stale data when users quickly change the time period selector. When switching rapidly from "Last 60 days" to "Last hour", the slower "Last 60 days" request may complete after the "Last hour" request, causing the Users filter to display users from the wrong time period.

**Root Cause:** No request cancellation or generation tracking exists for the `userStore.getAnalyticsUsers()` API call in `AnalyticsFilters.tsx`. Multiple concurrent requests complete out of order, and the last response to arrive (not necessarily the most recent request) wins.

**Current Behavior:**
1. User selects "Last 60 days" → API request A starts (slow)
2. User quickly selects "Last hour" → API request B starts (fast)
3. Request B completes first → Users filter shows "Last hour" users ✓
4. Request A completes second → Users filter shows "Last 60 days" users ✗

## Solution Overview

Create a reusable `useAbortController` hook that manages AbortController lifecycle and generation tracking. This hook can be used by any component to prevent race conditions in async requests.

The solution:
1. Cancels in-flight requests when a new request starts
2. Tracks request generations to ignore stale responses
3. Provides automatic cleanup on component unmount
4. Is reusable across the codebase (LeaderboardFilters, search components, etc.)

## Architecture

### Component: `useAbortController` Hook

**Location:** `src/hooks/useAbortController.ts`

**Purpose:** Provide reusable request cancellation and stale response prevention for any component with rapid async operations.

**API:**
```typescript
interface UseAbortControllerResult {
  execute: <T>(requestFn: (signal: AbortSignal) => Promise<T>) => Promise<T | null>
  cancel: () => void
  isActive: boolean
}

function useAbortController(): UseAbortControllerResult
```

**State Management:**
- `abortControllerRef: MutableRefObject<AbortController | null>` - Current request's abort controller
- `generationRef: MutableRefObject<number>` - Monotonic counter for request generations
- `isActiveRef: MutableRefObject<boolean>` - Whether a request is currently in flight

**Behavior:**

1. **`execute<T>(requestFn: (signal: AbortSignal) => Promise<T>): Promise<T | null>`**
   - Aborts previous request if one exists: `abortControllerRef.current?.abort()`
   - Increments generation: `generationRef.current++`
   - Creates new AbortController and stores it
   - Captures current generation: `const requestGeneration = generationRef.current`
   - Sets `isActive = true`
   - Calls `requestFn(signal)` with the new AbortController's signal
   - On response:
     - Checks if `requestGeneration === generationRef.current`
     - If match: returns data
     - If mismatch: returns `null` (request was superseded)
   - On error:
     - If `error.name === 'AbortError'`: returns `null` (expected)
     - Otherwise: rethrows error
   - Finally: sets `isActive = false`

2. **`cancel(): void`**
   - Aborts current request: `abortControllerRef.current?.abort()`
   - Clears controller ref
   - Sets `isActive = false`

3. **`isActive: boolean`**
   - Indicates whether a request is currently in flight

4. **Cleanup on unmount:**
   - `useEffect(() => () => cancel(), [])`
   - Ensures no memory leaks from in-flight requests

### Integration with AnalyticsFilters

**File:** `src/pages/analytics/components/AnalyticsFilters.tsx`

**Changes:**

1. Import and initialize hook:
```typescript
import { useAbortController } from '@/hooks/useAbortController'

const { execute: executeCancellableRequest } = useAbortController()
```

2. Update `loadUsers` callback:
```typescript
const loadUsers = useCallback(async () => {
  setIsLoadingUsers(true)
  try {
    const { users: _users, ...filtersWithoutUsers } = localFilters
    
    const options = await executeCancellableRequest((signal) =>
      userStore.getAnalyticsUsers(filtersWithoutUsers, signal)
    )
    
    if (options === null) {
      // Request was canceled or superseded
      return
    }
    
    setUserOptions(options)
  } catch (error) {
    if (error.name === 'AbortError') {
      // Expected when request is canceled
      return
    }
    console.error('Error loading users:', error)
    setUserOptions([])
  } finally {
    setIsLoadingUsers(false)
  }
}, [localFilters, executeCancellableRequest])
```

**Why this pattern:**
- `executeCancellableRequest` receives a function that accepts `signal: AbortSignal`
- The function passes `signal` to the API call
- Returns `null` for canceled/stale requests (easy null check)
- Existing error handling remains intact

### Store Enhancement: userStore.getAnalyticsUsers

**File:** `src/store/user.ts`

**Change:** Add optional `signal` parameter and pass to API call:

```typescript
getAnalyticsUsers(
  filters?: AnalyticsQueryParams,
  signal?: AbortSignal
) {
  return api
    .get('v1/analytics/users', {
      params: filters,
      queryParamArrayHandling: 'compact',
      skipErrorHandling: true,
      signal, // Pass AbortSignal to fetch
    })
    .then((response) => response.json())
    .then((data) => {
      const users = data.data.users.sort((a, b) => a.name.localeCompare(b.name))
      return formatUserOptions(users)
    })
}
```

**Backward compatibility:** The `signal` parameter is optional, so existing callers without cancellation support continue to work.

## Data Flow

### Request Lifecycle

```
Time Period Change
  ↓
localFilters updated in AnalyticsFilters
  ↓
useEffect(loadUsers, [loadUsers]) triggers
  ↓
loadUsers calls executeCancellableRequest
  ↓
Hook aborts previous request (if exists)
  ↓
Hook increments generation (N → N+1)
  ↓
Hook creates new AbortController
  ↓
Hook calls requestFn(signal)
  ↓
userStore.getAnalyticsUsers(filters, signal)
  ↓
api.get with AbortSignal attached
  ↓
API request sent to backend
  ↓
Response arrives
  ↓
Hook checks: requestGeneration === currentGeneration?
  ┌─────────┴─────────┐
  YES               NO
  ↓                 ↓
Return data     Return null
  ↓                 ↓
loadUsers updates state   loadUsers returns early
```

### Race Condition Resolution

**Before fix:**
```
t=0ms:  User selects "Last 60 days"
t=10ms: Request A sent (slow backend query)
t=50ms: User selects "Last hour"
t=60ms: Request B sent (fast backend query)
t=100ms: Request B completes → setUserOptions([...lastHourUsers])
t=500ms: Request A completes → setUserOptions([...last60DaysUsers]) ❌ STALE!
```

**After fix:**
```
t=0ms:  User selects "Last 60 days"
t=10ms: Request A sent (generation=1)
t=50ms: User selects "Last hour"
t=60ms: Request A aborted, Request B sent (generation=2)
t=100ms: Request B completes → generation check (2 === 2) ✓ → setUserOptions([...lastHourUsers])
t=500ms: Request A completes → generation check (1 === 2) ✗ → return null → ignored
```

## Error Handling

### AbortError (Expected)

When a request is aborted via `abortController.abort()`, fetch throws a `DOMException` with `name: 'AbortError'`.

**Handling:**
```typescript
catch (error) {
  if (error.name === 'AbortError') {
    return // Expected, do nothing
  }
  // Handle other errors
}
```

**Why:** AbortError indicates intentional cancellation, not a failure condition.

### Generation Mismatch (Stale Response)

When `useAbortController`'s `execute` method detects a generation mismatch, it returns `null` without throwing.

**Handling:**
```typescript
const result = await executeCancellableRequest(...)
if (result === null) {
  return // Request was canceled or superseded
}
```

**Why:** Returning `null` is cleaner than throwing an error for stale data.

### Network/API Errors

Errors other than AbortError propagate normally:
```typescript
catch (error) {
  if (error.name === 'AbortError') return
  console.error('Error loading users:', error)
  setUserOptions([])
}
```

### Edge Cases

1. **Component unmounts during request:**
   - Hook's cleanup effect calls `cancel()`
   - Request is aborted
   - No memory leaks

2. **Multiple rapid filter changes:**
   - Each change aborts the previous request
   - Only the most recent request updates state
   - Intermediate requests are safely ignored

3. **API doesn't support AbortSignal:**
   - Request isn't actually canceled on the wire
   - Generation check still prevents stale data from updating state
   - Graceful degradation

4. **Request completes synchronously:**
   - Generation check happens immediately
   - Works correctly (no special handling needed)

## Testing Strategy

### Unit Tests: `useAbortController.test.ts`

1. **Test: Second request cancels first**
   - Execute first request with slow mock
   - Execute second request with fast mock
   - Assert first request's AbortController.abort() was called
   - Assert second request completes successfully

2. **Test: Stale response ignored**
   - Execute first request (generation=1)
   - Execute second request (generation=2)
   - Complete first request
   - Assert first request returns null
   - Complete second request
   - Assert second request returns data

3. **Test: Cleanup on unmount**
   - Execute request
   - Unmount component
   - Assert AbortController.abort() was called

4. **Test: AbortError returns null**
   - Execute request that throws AbortError
   - Assert execute() returns null (doesn't throw)

5. **Test: Other errors propagate**
   - Execute request that throws network error
   - Assert execute() rethrows the error

6. **Test: isActive flag**
   - Assert isActive is false initially
   - Execute request
   - Assert isActive is true during request
   - Complete request
   - Assert isActive is false after completion

### Integration Tests: `AnalyticsFilters.test.tsx`

1. **Test: Rapid time period changes show correct users**
   - Mock slow response for "Last 60 days"
   - Mock fast response for "Last hour"
   - Change time period: "Last 60 days" → "Last hour"
   - Assert final userOptions match "Last hour" data

2. **Test: Loading state during cancellation**
   - Start slow request
   - Assert isLoadingUsers is true
   - Start second request (cancels first)
   - Assert isLoadingUsers remains true
   - Complete second request
   - Assert isLoadingUsers is false

3. **Test: Error handling**
   - Mock network error in getAnalyticsUsers
   - Change filter
   - Assert error is logged
   - Assert userOptions is set to empty array
   - Assert isLoadingUsers is false

### Regression Test Scenario

**Manual Test (QA):**
1. Open Analytics page
2. Select "Last 60 days" time period
3. Wait 100ms
4. Quickly switch to "Last hour"
5. Wait for both requests to complete
6. Verify Users filter displays only users from "Last hour" data

**Acceptance Criteria:**
- Users filter matches currently selected time period
- No stale data appears after rapid switching
- Loading state behaves correctly (no flickering)
- Error handling works as expected

## Implementation Files

### New Files
- `src/hooks/useAbortController.ts` - Reusable hook
- `src/hooks/__tests__/useAbortController.test.ts` - Hook unit tests

### Modified Files
- `src/pages/analytics/components/AnalyticsFilters.tsx` - Use hook in loadUsers
- `src/store/user.ts` - Add signal parameter to getAnalyticsUsers
- `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx` - Add integration tests (if file doesn't exist, create it)

## Future Reusability

This hook can be adopted by other components with similar race condition risks:

**Candidates for adoption:**
- `LeaderboardFilters` - Same pattern as AnalyticsFilters
- `ChatSearchPanel` - Rapid search queries
- Any component with debounced filters + API calls
- Any autocomplete/typeahead components

**Adoption pattern:**
```typescript
const { execute } = useAbortController()

const fetchData = async () => {
  const result = await execute((signal) => 
    someStore.someMethod(params, signal)
  )
  if (result === null) return
  setState(result)
}
```

## Acceptance Criteria (from Jira)

- [x] Users filter always reflects the latest selected time period
- [x] Older in-flight responses do not overwrite state for newest selection
- [x] Rapid switching between time periods does not cause stale filter values
- [x] Analytics page filter state remains consistent after all requests complete
- [x] Regression coverage added for quick switching scenarios

## Technical Debt / Follow-up

**Future Improvements:**
1. Extract AbortController + generation pattern to analytics/user stores directly (mirror `analyticsStore.fetchTabularData`)
2. Add request retry logic for transient failures
3. Consider adding request deduplication (cache identical concurrent requests)

**Out of Scope:**
- Optimizing backend query performance (separate concern)
- Global request queue/throttling (premature optimization)
- Store-level cancellation infrastructure (already exists in analyticsStore, but userStore refactor is a separate task)
