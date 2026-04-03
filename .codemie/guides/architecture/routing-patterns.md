# Routing Patterns

> **React Router patterns for CodeMie UI navigation**

## Table of Contents
1. [Overview](#overview)
2. [Route Structure](#route-structure)
3. [Navigation](#navigation)
4. ["Go Back" Navigation](#go-back-navigation)
5. [Route Parameters](#route-parameters)
6. [Protected Routes](#protected-routes)
7. [Common Patterns](#common-patterns)

---

## Overview

### General Guidelines

- Use **React Router 6.x** for all routing
- Route configuration in `src/router.tsx`
- Use hash-based routing (`createHashRouter`)
- Never hardcode paths - use constants
- Always provide route IDs for important routes

---

## Route Structure

### Router Configuration

```typescript
// src/router.tsx
import { createHashRouter, RouteObject } from 'react-router'

const routes: RouteObject[] = [
  {
    path: '/',
    Component: App,
    children: [
      {
        id: 'assistants',
        path: 'assistants',
        Component: AssistantsListPage,
      },
      {
        id: 'assistant-details',
        path: 'assistants/:id',
        Component: AssistantDetailsPage,
      },
    ],
  },
]

export const router = createHashRouter(routes)
```

### Route Groups

Organize routes by feature:

```typescript
// Group related routes
const assistantRoutes: RouteObject[] = [
  { path: 'assistants', Component: AssistantsListPage },
  { path: 'assistants/:id', Component: AssistantDetailsPage },
  { path: 'assistants/new', Component: NewAssistantPage },
  { path: 'assistants/:id/edit', Component: EditAssistantPage },
]

const workflowRoutes: RouteObject[] = [
  { path: 'workflows', Component: WorkflowsListPage },
  { path: 'workflows/:id', Component: ViewWorkflowPage },
  { path: 'workflows/new', Component: NewWorkflowPage },
  { path: 'workflows/:id/edit', Component: EditWorkflowPage },
]
```

---

## Navigation

### Using Link Component

```typescript
import { Link } from 'react-router'

// ✅ DO - Use Link component
<Link to="/assistants/123">View Assistant</Link>

// ✅ DO - Build dynamic paths
<Link to={`/assistants/${assistantId}`}>View</Link>

// ❌ DON'T - Use anchor tags for internal navigation
<a href="#/assistants/123">View Assistant</a>
```

### Programmatic Navigation

```typescript
import { useNavigate } from 'react-router'

function MyComponent() {
  const navigate = useNavigate()

  const handleSave = async () => {
    await saveData()
    navigate('/assistants') // Navigate after action
  }

  const handleCancel = () => {
    navigate(-1) // Go back
  }

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleCancel}>Cancel</button>
    </div>
  )
}
```

### Navigation with State

```typescript
// Pass state during navigation
navigate('/assistants/new', {
  state: { from: 'marketplace' }
})

// Access state in target component
import { useLocation } from 'react-router'

const location = useLocation()
const from = location.state?.from
```

---

## "Go Back" Navigation

Use **feature-specific `goBack` utilities** instead of `navigate(-1)` on create/edit pages — ensures correct fallback after page refresh or direct link.

### Two Patterns

**History-first** — single list destination (see `src/pages/skills/utils/goBackSkills.ts`):

```typescript
export const goBackMyFeature = (router: RouterState) => {
  const prevRoute = history.stack[history.currentIndex - 1]

  if (prevRoute) {
    router.back()
    return
  }

  router.push({ name: MY_FEATURE_LIST }) // fallback when no history
}
```

**Path-matching** — multiple possible destinations, e.g. project / marketplace / templates (see `src/pages/assistants/utils/goBackAssistants.ts`):

```typescript
export const goBackMyFeature = () => {
  navigateBack(
    MY_FEATURE_ALL,      // first = default fallback
    MY_FEATURE_PROJECT,
    MY_FEATURE_MARKETPLACE,
  )
}
```

`navigateBack` resolves in order: in-memory history → `matchPath` on current URL → first allowed route.

### Usage

```typescript
// ✅ DO
function NewAssistantPage() {
  return <button onClick={() => goBackAssistants()}>Cancel</button>
}

// ❌ DON'T — breaks on refresh / direct link
navigate(-1)
```

---

## Route Parameters

### URL Parameters

```typescript
import { useParams } from 'react-router'

function AssistantDetailsPage() {
  const { id } = useParams<{ id: string }>()

  // Use parameter to fetch data
  useEffect(() => {
    if (id) {
      assistantsStore.fetchAssistant(id)
    }
  }, [id])
}
```

### Query Parameters

```typescript
import { useSearchParams } from 'react-router'

function AssistantsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read query params
  const tab = searchParams.get('tab') ?? 'all'
  const page = Number(searchParams.get('page') ?? '1')

  // Update query params
  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab, page: '1' })
  }

  return (
    <div>
      <Tabs value={tab} onChange={handleTabChange}>
        <Tab value="all">All</Tab>
        <Tab value="marketplace">Marketplace</Tab>
      </Tabs>
    </div>
  )
}
```

### Custom Search Params Hook

```typescript
// src/hooks/useSearchParams.ts
import { useSearchParams as useRouterSearchParams } from 'react-router'

export const useSearchParams = () => {
  const [searchParams, setSearchParams] = useRouterSearchParams()

  const getParam = (key: string, defaultValue?: string) => {
    return searchParams.get(key) ?? defaultValue
  }

  const setParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set(key, value)
    setSearchParams(newParams)
  }

  return { getParam, setParam, searchParams, setSearchParams }
}
```

---

## Protected Routes

### Authentication Check

```typescript
// Check if user is authenticated before accessing route
const router = createHashRouter([
  {
    path: '/',
    Component: App,
    children: [
      {
        path: 'assistants',
        loader: () => {
          if (!userStore.isAuthenticated) {
            return redirect('/login')
          }
          return null
        },
        Component: AssistantsListPage,
      },
    ],
  },
])
```

### Role-Based Access

```typescript
// Check user permissions
const adminRoutes: RouteObject[] = [
  {
    path: 'settings/administration',
    loader: () => {
      if (!userStore.isAdmin) {
        return redirect('/')
      }
      return null
    },
    Component: AdministrationPage,
  },
]
```

---

## Common Patterns

### Redirect Pattern

```typescript
// Redirect from old path to new path
{
  path: 'old-assistants',
  loader: () => redirect('/assistants'),
}

// Redirect based on condition
{
  path: 'assistants',
  loader: () => {
    // Redirect to first assistant if only one exists
    if (assistantsStore.assistants.length === 1) {
      return redirect(`/assistants/${assistantsStore.assistants[0].id}`)
    }
    return null
  },
}
```

### Nested Routes

```typescript
// Parent route with child routes
{
  path: 'settings',
  Component: SettingsLayout,
  children: [
    {
      index: true,
      Component: SettingsProfilePage,
    },
    {
      path: 'profile',
      Component: SettingsProfilePage,
    },
    {
      path: 'administration',
      Component: AdministrationPage,
    },
  ],
}
```

### Dynamic Route Building

```typescript
// src/pages/assistants/utils/getAssistantLink.tsx
export const getAssistantLink = (assistantId: string, tab?: string) => {
  const base = `/assistants/${assistantId}`
  if (tab) {
    return `${base}?tab=${tab}`
  }
  return base
}

// Usage
<Link to={getAssistantLink(assistant.id, 'details')}>
  View Details
</Link>
```

### 404 Handling

```typescript
// Catch-all route for 404
{
  path: '*',
  Component: NotFoundPage,
}
```

---

## Best Practices

| ✅ DO | ❌ DON'T |
|-------|----------|
| Use constants for route paths | Hardcode path strings everywhere |
| Use React Router's Link component | Use anchor tags for internal nav |
| Handle loading states during navigation | Navigate without feedback |
| Validate route params | Assume params are always valid |
| Use query params for filters/pagination | Store filter state only in component |
| Build dynamic paths with utility functions | Concatenate strings manually |
| Provide fallback for missing params | Let app crash on undefined params |

---

## Integration with Stores

### Loading Data on Route Change

```typescript
function AssistantDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { assistant } = useSnapshot(assistantsStore)

  useEffect(() => {
    if (id) {
      // Load data when route changes
      assistantsStore.fetchAssistant(id)
    }
  }, [id])

  if (!assistant) {
    return <Spinner />
  }

  return <AssistantDetails assistant={assistant} />
}
```

### Navigating After Store Actions

```typescript
// In store
async createAssistant(data: AssistantData) {
  const response = await api.post('assistants', data)
  const newAssistant = await response.json()
  this.assistants.push(newAssistant)
  return newAssistant.id // Return ID for navigation
}

// In component
const navigate = useNavigate()

const handleCreate = async () => {
  const id = await assistantsStore.createAssistant(formData)
  navigate(`/assistants/${id}`) // Navigate to new item
}
```

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Route params are undefined | Check route definition and useParams usage |
| Navigation doesn't update UI | Ensure using React Router's Link/navigate |
| Query params lost on navigation | Preserve existing params when updating |
| Stale data after navigation | Add route params to useEffect deps |
| Back button doesn't work | Use navigate(-1) instead of custom history |

---

**Related Guides**:
- [State Management](../patterns/state-management.md) - Store integration
- [Component Patterns](../components/component-patterns.md) - Page components
- [Custom Hooks](../patterns/custom-hooks.md) - useSearchParams hook

**Last Updated**: 2026-02-03
