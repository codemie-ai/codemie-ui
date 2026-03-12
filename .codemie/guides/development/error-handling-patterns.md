# Error Handling Patterns

> **Error handling strategies for CodeMie UI**

## Table of Contents
1. [Overview](#overview)
2. [Error Boundaries](#error-boundaries)
3. [API Error Handling](#api-error-handling)
4. [Form Validation Errors](#form-validation-errors)
5. [User Notifications](#user-notifications)
6. [Common Patterns](#common-patterns)

---

## Overview

### Error Handling Strategy

- **API Errors**: Catch in stores, display with toaster
- **Validation Errors**: Handle with React Hook Form + Yup
- **Component Errors**: Catch with Error Boundaries
- **User Errors**: Show inline error messages
- **Silent Errors**: Log to console, don't crash app

---

## Error Boundaries

### Creating Error Boundary

```typescript
// src/components/ErrorBoundary/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-red-600">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Usage

```typescript
// Wrap risky components
<ErrorBoundary>
  <WorkflowEditor />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary fallback={<ErrorMessage />}>
  <ComplexComponent />
</ErrorBoundary>
```

---

## API Error Handling

### Store-Level Error Handling

```typescript
// src/store/assistants.ts
export const assistantsStore = proxy({
  assistants: [],
  loading: false,
  error: null as string | null,

  async fetchAssistants() {
    this.loading = true
    this.error = null

    try {
      const response = await api.get('assistants')

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }

      this.assistants = await response.json()
    } catch (error: any) {
      this.error = error.message
      toaster.error('Failed to load assistants')
      console.error('fetchAssistants error:', error)
    } finally {
      this.loading = false
    }
  },

  async createAssistant(data: AssistantData) {
    try {
      const response = await api.post('assistants', data)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create assistant')
      }

      const newAssistant = await response.json()
      this.assistants.push(newAssistant)
      toaster.success('Assistant created successfully')
      return newAssistant.id
    } catch (error: any) {
      toaster.error(error.message || 'Failed to create assistant')
      throw error // Re-throw for component to handle
    }
  },
})
```

### Component-Level Error Display

```typescript
function AssistantsList() {
  const { assistants, loading, error } = useSnapshot(assistantsStore)

  useEffect(() => {
    assistantsStore.fetchAssistants()
  }, [])

  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => assistantsStore.fetchAssistants()}
          className="mt-2 text-red-600 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (loading) {
    return <Spinner />
  }

  return <AssistantGrid assistants={assistants} />
}
```

---

## Form Validation Errors

### Schema Validation

```typescript
// src/pages/assistants/utils/validation.ts
import * as yup from 'yup'

export const assistantSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(3, 'Name must be at least 3 characters'),

  description: yup
    .string()
    .max(500, 'Description must be less than 500 characters'),

  systemPrompt: yup
    .string()
    .required('System prompt is required'),
})
```

### Form with Validation

```typescript
function AssistantForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(assistantSchema),
  })

  const onSubmit = async (data: AssistantData) => {
    try {
      await assistantsStore.createAssistant(data)
      navigate('/assistants')
    } catch (error) {
      // Error already shown by toaster in store
      console.error(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('name')}
          className={cn(
            'input',
            errors.name && 'border-red-500'
          )}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <textarea
          {...register('systemPrompt')}
          className={cn(
            'input',
            errors.systemPrompt && 'border-red-500'
          )}
        />
        {errors.systemPrompt && (
          <p className="mt-1 text-sm text-red-600">
            {errors.systemPrompt.message}
          </p>
        )}
      </div>

      <button type="submit">Create Assistant</button>
    </form>
  )
}
```

---

## User Notifications

### Toaster Service

```typescript
// src/utils/toaster.ts
import { toast } from 'react-hot-toast'

export const toaster = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
    })
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
    })
  },

  info: (message: string) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
    })
  },
}
```

### Usage Patterns

```typescript
// Success notification
try {
  await assistantsStore.createAssistant(data)
  toaster.success('Assistant created successfully')
  navigate('/assistants')
} catch (error) {
  // Error notification already shown in store
}

// Info notification
toaster.info('Workflow saved as draft')

// Error notification
toaster.error('Failed to connect to server')
```

---

## Common Patterns

### Async Action Pattern

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

### Graceful Degradation

```typescript
// Try operation, fall back on error
const getData = async () => {
  try {
    const response = await api.get('data')
    return await response.json()
  } catch (error) {
    console.warn('Failed to fetch data, using fallback')
    return getDefaultData()
  }
}
```

### Retry Pattern

```typescript
const fetchWithRetry = async (
  endpoint: string,
  retries: number = 3
): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await api.get(endpoint)
      if (response.ok) return response
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}
```

### Loading State with Error

```typescript
function DataComponent() {
  const { data, loading, error } = useSnapshot(dataStore)

  if (error) {
    return <ErrorState message={error} onRetry={dataStore.fetchData} />
  }

  if (loading) {
    return <Spinner />
  }

  if (!data || data.length === 0) {
    return <EmptyState />
  }

  return <DataList data={data} />
}
```

---

## Best Practices

### Error Handling Layers

| Layer | Responsibility | Action |
|-------|---------------|--------|
| **API Client** | Detect HTTP errors | Throw on non-2xx |
| **Store** | Handle errors, update state | Catch, store error, show toaster |
| **Component** | Display error UI | Show error state, retry button |
| **Error Boundary** | Catch render errors | Show fallback UI |

### Error Messages

```typescript
// ✅ DO - User-friendly messages
toaster.error('Failed to save assistant. Please try again.')

// ❌ DON'T - Technical jargon
toaster.error('POST /assistants returned 500')

// ✅ DO - Provide context
throw new Error('Failed to create assistant: name already exists')

// ❌ DON'T - Generic messages
throw new Error('Error')
```

### Logging Strategy

```typescript
// ✅ DO - Log for debugging
catch (error) {
  console.error('Detailed error:', error)
  toaster.error('User-friendly message')
}

// ❌ DON'T - Show technical details to user
catch (error) {
  toaster.error(error.stack)
}
```

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Errors crash entire app | Add Error Boundaries |
| No feedback on error | Always show toaster or inline message |
| Generic error messages | Provide specific, actionable messages |
| Errors not logged | Always console.error for debugging |
| Loading state stuck on error | Use finally block to reset loading |
| Rethrowing errors unnecessarily | Only rethrow if caller needs to handle |

---

**Related Guides**:
- [State Management](../patterns/state-management.md) - Store error handling
- [Form Patterns](../patterns/form-patterns.md) - Validation errors
- [API Integration](./api-integration.md) - API errors

**Last Updated**: 2026-02-03
