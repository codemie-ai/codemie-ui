# Error Handling Patterns

> Error handling strategy for CodeMie UI — stores, boundaries, forms, and notifications.

---

## Layer Responsibilities

| Layer | Responsibility | What it does |
|-------|---------------|--------------|
| **API Client** | Detect HTTP errors | Throw on non-2xx responses |
| **Store** | Handle errors, update state | `catch` → set `error`, show toaster |
| **Component** | Display error UI | Read `error` from snapshot, show retry |
| **Error Boundary** | Catch render crashes | Show fallback UI, log to console |

Never bypass a layer — components must not catch API errors directly.

---

## Error Boundaries

`src/components/ErrorBoundary/ErrorBoundary.tsx` — class component implementing `getDerivedStateFromError` and `componentDidCatch`.

Key implementation points:
- `state: { hasError: boolean; error: Error | null }`
- `getDerivedStateFromError` sets `hasError: true`.
- `componentDidCatch` calls `console.error` for debugging.
- Fallback UI: red-tinted container, error message, "Try Again" button that resets state.
- Accept optional `fallback?: ReactNode` prop for custom fallback.

Usage patterns:
```tsx
// Wrap risky sections
<ErrorBoundary>
  <WorkflowEditor />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary fallback={<ErrorMessage />}>
  <ComplexComponent />
</ErrorBoundary>
```

**When to add boundaries**: workflow editor canvas, complex data visualizations, any third-party widget that may throw during render.

---

## API Error Handling in Stores

`src/store/assistants.ts` — standard store error pattern:

```typescript
export const assistantsStore = proxy({
  loading: false,
  error: null as string | null,

  async fetchAssistants() {
    this.loading = true
    this.error = null
    try {
      const response = await api.get('assistants')
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`)
      this.assistants = await response.json()
    } catch (error: any) {
      this.error = error.message
      toaster.error('Failed to load assistants')
      console.error('fetchAssistants error:', error)
    } finally {
      this.loading = false
    }
  },
})
```

Rules:
- Always reset `error = null` at the start of an action.
- Always use `finally` to reset `loading` — never leave it stuck on `true`.
- For mutation actions (`create`, `update`, `delete`): `toaster.error` in the store, then `throw error` so the component can respond (e.g. keep form open).

### DO / DON'T

| DON'T | DO |
|-------|----|
| `.data` (Axios pattern) | `await response.json()` |
| Show `error.stack` in toaster | Show user-friendly string |
| Leave `loading = true` on error | Use `finally` block |
| Catch API errors in components | Handle in store, expose `error` field |
| Generic `'Error'` message | `'Failed to create assistant: name already exists'` |

---

## Component Error Display

Components read `error` from `useSnapshot` and render error state:

```tsx
function AssistantsList() {
  const { assistants, loading, error } = useSnapshot(assistantsStore)

  if (error) {
    return (
      <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
        <p className='text-red-800'>{error}</p>
        <button onClick={() => assistantsStore.fetchAssistants()}
          className='mt-2 text-red-600 underline'>
          Retry
        </button>
      </div>
    )
  }
  if (loading) return <Spinner />
  return <AssistantGrid assistants={assistants} />
}
```

**Render order**: error → loading → empty → data. Always handle all four states.

---

## Form Validation Errors

`src/pages/assistants/utils/validation.ts` — Yup schema:

```typescript
export const assistantSchema = yup.object({
  name: yup.string().required('Name is required')
    .min(VALIDATION_RULES.ASSISTANT_NAME.MIN_LENGTH, 'Name must be at least 3 characters'),
  systemPrompt: yup.string().required('System prompt is required'),
})
```

In the form component, wire up `react-hook-form` with `yupResolver`:

```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(assistantSchema),
})
```

Display inline error below each field:
```tsx
<input {...register('name')} className={cn('input', errors.name && 'border-red-500')} />
{errors.name && <p className='mt-1 text-sm text-red-600'>{errors.name.message}</p>}
```

Form submit error handling — store throws, component catches and logs (toaster already shown by store):
```typescript
const onSubmit = async (data: AssistantData) => {
  try {
    await assistantsStore.createAssistant(data)
    navigate('/assistants')
  } catch {
    // toaster already shown in store — do not double-notify
  }
}
```

---

## Toast Notifications

`src/utils/toaster.ts` — wraps `react-hot-toast`:

| Method | Duration | Position | Use for |
|--------|----------|----------|---------|
| `toaster.success(msg)` | 3000ms | top-right | Completed mutations |
| `toaster.error(msg)` | 5000ms | top-right | Failures |
| `toaster.info(msg)` | 3000ms | top-right | Neutral status updates |

Toasts are called from **stores only** (never from components). Components handle navigation/state transitions after success.

---

## Common Async Patterns

### Standard async action

```typescript
const handleAction = async () => {
  try {
    setLoading(true)
    await performAction()
    toaster.success('Action completed')
  } catch (error: any) {
    toaster.error(error.message || 'Action failed')
    console.error(error)
  } finally {
    setLoading(false)
  }
}
```

### Graceful degradation (non-critical data)

```typescript
const getData = async () => {
  try {
    return await api.get('data').then(r => r.json())
  } catch {
    console.warn('Failed to fetch, using fallback')
    return getDefaultData()
  }
}
```

### Retry with exponential back-off

```typescript
const fetchWithRetry = async (endpoint: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await api.get(endpoint)
      if (r.ok) return r
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}
```

---

## Error Message Quality

| Bad | Good |
|-----|------|
| `'Error'` | `'Failed to save assistant. Please try again.'` |
| `'POST /assistants returned 500'` | `'Server error — please try again later.'` |
| Show `error.stack` to user | Log stack to console, show friendly string |
| Generic across all errors | Specific to the failed operation |

---

## Common Pitfalls

| Problem | Fix |
|---------|-----|
| Entire page crashes on render error | Wrap section in `<ErrorBoundary>` |
| `loading` stuck on `true` after error | Add `finally { this.loading = false }` |
| No user feedback on failure | Always `toaster.error` + set `error` in store |
| Double-notification on form errors | `toaster` in store only; component just logs |
| Error swallowed silently | Always `console.error` even for non-critical |
| Rethrowing when caller won't handle | Only rethrow if component needs to react |
