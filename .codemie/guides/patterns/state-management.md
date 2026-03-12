# State Management

> **Valtio state management patterns for CodeMie UI**

## Table of Contents
1. [Overview](#overview)
2. [Store Creation](#store-creation)
3. [Using Stores in Components](#using-stores-in-components)
4. [API Integration](#api-integration)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)
7. [Existing Stores](#existing-stores)

---

## Overview

### General Guidelines

- Use **Valtio** for React state management
- Define stores in `src/store/`
- All global states should be in this directory
- Each store should manage a specific feature/domain
- **All API interactions should go through stores**
- **Never make API calls directly in components**
- Use `useSnapshot` to access store data in components
- Keep stores focused and modular
- Use async/await for API calls
- Handle loading and error states in stores
- Use TypeScript interfaces for store state
- Make all necessary data transformations in the store, not in components

---

## Store Creation

### Basic Store Template

```typescript
// src/store/[feature].ts
import { proxy } from 'valtio'
import api from '@/utils/api'

interface FeatureStore {
  data: DataType[]
  loading: boolean
  error: string | null
  fetchData: () => Promise<void>
  updateItem: (id: string, data: Partial<DataType>) => Promise<void>
}

export const featureStore = proxy<FeatureStore>({
  data: [],
  loading: false,
  error: null,

  async fetchData() {
    this.loading = true
    this.error = null
    try {
      const response = await api.get('endpoint')
      const data = await response.json()  // ⚠️ Must call .json()!
      this.data = data
    } catch (error: any) {
      this.error = error.message
    } finally {
      this.loading = false
    }
  },

  async updateItem(id, data) {
    try {
      const response = await api.put(`endpoint/${id}`, data)
      const result = await response.json()  // ⚠️ Must call .json()!

      const index = this.data.findIndex(item => item.id === id)
      if (index !== -1) {
        this.data[index] = result
      }
    } catch (error: any) {
      this.error = error.message
      throw error
    }
  }
})
```

### Store with Pagination

```typescript
interface PaginatedStore {
  items: Item[]
  pagination: {
    page: number
    perPage: number
    totalPages: number
    totalCount: number
  }
  loading: boolean
  error: string | null
  indexItems: (filters?: Record<string, any>, page?: number, perPage?: number) => Promise<Item[]>
}

export const paginatedStore = proxy<PaginatedStore>({
  items: [],
  pagination: {
    page: 0,
    perPage: 12,
    totalPages: 0,
    totalCount: 0
  },
  loading: false,
  error: null,

  async indexItems(filters = {}, page = 0, perPage = 12) {
    this.loading = true
    this.error = null

    try {
      const params = { ...filters, page, per_page: perPage }
      const response = await api.get('items', { params })
      const data = await response.json()

      this.items = data.items
      this.pagination = {
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages,
        totalCount: data.total_count
      }

      return data.items
    } catch (error: any) {
      const contextualError = error.response?.data?.message || error.message
      this.error = `Failed to fetch items: ${contextualError}`
      console.error('Store Error (indexItems):', error)
      throw error
    } finally {
      this.loading = false
    }
  }
})
```

---

## Using Stores in Components

### Basic Usage

```tsx
import React, { useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { featureStore } from '@/store/feature'

const MyComponent: React.FC = () => {
  const { data, loading, error } = useSnapshot(featureStore)

  useEffect(() => {
    featureStore.fetchData()
  }, [])

  if (loading) return <Spinner />
  if (error) return <div className="text-text-error">{error}</div>

  return (
    <ul>
      {data.map((item, index) => (
        <li key={index}>{item.name}</li>
      ))}
    </ul>
  )
}
```

### ⚠️ CRITICAL: Never Call API Directly in Components

```tsx
// ❌ WRONG: Direct API call in component
const BadComponent = () => {
  const [data, setData] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const response = await api.get('items')
      const data = await response.json()
      setData(data)
    }
    fetchData()
  }, [])

  return <div>{data.map(...)}</div>
}

// ✅ CORRECT: Use store
const GoodComponent = () => {
  const { items, loading } = useSnapshot(itemStore)

  useEffect(() => {
    itemStore.fetchItems()
  }, [])

  return <div>{items.map(...)}</div>
}
```

---

## API Integration

### CRUD Operations

```typescript
export const crudStore = proxy({
  items: [],
  loading: false,
  error: null,

  // CREATE
  async createItem(data) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post('items', data)
      const result = await response.json()

      this.items.unshift(result)
      this.pagination.totalCount += 1

      return result
    } catch (error: any) {
      this.error = `Failed to create item: ${error.message}`
      throw error
    } finally {
      this.loading = false
    }
  },

  // READ
  async fetchItems() {
    this.loading = true
    this.error = null

    try {
      const response = await api.get('items')
      const data = await response.json()
      this.items = data
    } catch (error: any) {
      this.error = `Failed to fetch items: ${error.message}`
      throw error
    } finally {
      this.loading = false
    }
  },

  // UPDATE
  async updateItem(id, data) {
    this.loading = true
    this.error = null

    try {
      const response = await api.put(`items/${id}`, data)
      const result = await response.json()

      const index = this.items.findIndex(item => item.id === id)
      if (index !== -1) {
        this.items[index] = result
      }

      return result
    } catch (error: any) {
      this.error = `Failed to update item: ${error.message}`
      throw error
    } finally {
      this.loading = false
    }
  },

  // DELETE
  async deleteItem(id) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`items/${id}`)
      // Note: DELETE may not return a body, so no .json() call needed

      this.items = this.items.filter(item => item.id !== id)
      this.pagination.totalCount -= 1
    } catch (error: any) {
      this.error = `Failed to delete item: ${error.message}`
      throw error
    } finally {
      this.loading = false
    }
  }
})
```

---

## Best Practices

### 1. Always Include Loading and Error States

Every async operation should manage `loading` and `error` states. This enables proper UI feedback and error handling.

```typescript
// ✅ GOOD: Includes loading and error
async fetchData() {
  this.loading = true
  this.error = null
  try {
    // ... fetch logic
  } catch (error: any) {
    this.error = error.message
  } finally {
    this.loading = false
  }
}

// ❌ BAD: Missing states
async fetchData() {
  const response = await api.get('endpoint')
  this.data = await response.json()
}
```

### 2. Use Try-Catch-Finally Pattern

```typescript
// ✅ GOOD: Proper error handling
async fetchData() {
  this.loading = true
  this.error = null
  try {
    const response = await api.get('endpoint')
    this.data = await response.json()
  } catch (error: any) {
    this.error = error.message
    console.error('Store Error:', error)
    throw error  // Re-throw if component needs to handle it
  } finally {
    this.loading = false  // Always reset loading
  }
}
```

### 3. Consistent Error Logging

```typescript
// ✅ GOOD: Contextual error logging
async fetchItems() {
  try {
    // ...
  } catch (error: any) {
    const contextualError = error.response?.data?.message || error.message
    this.error = `Failed to fetch items: ${contextualError}`
    console.error('Store Error (fetchItems):', error)
    throw error
  }
}
```

### 4. Memory Management

Clean up subscriptions, timers, and debounced functions:

```typescript
// In component using store
useEffect(() => {
  const debouncedFetch = debounce(() => {
    myStore.fetchData()
  }, 300)

  return () => {
    debouncedFetch.cancel()  // MANDATORY cleanup
  }
}, [])
```

### 5. Constants Extraction

```typescript
// ✅ GOOD: Extract magic numbers
const DEFAULT_PER_PAGE = 12
const DEFAULT_PAGE = 0

export const store = proxy({
  pagination: {
    page: DEFAULT_PAGE,
    perPage: DEFAULT_PER_PAGE,
    // ...
  }
})

// ❌ BAD: Magic numbers
export const store = proxy({
  pagination: {
    page: 0,
    perPage: 12,
    // ...
  }
})
```

---

## Common Patterns

### Pattern 1: Single Item Store

```typescript
interface ItemStore {
  item: Item | null
  loading: boolean
  error: string | null
  fetchItem: (id: string) => Promise<void>
  updateItem: (data: Partial<Item>) => Promise<void>
}

export const itemStore = proxy<ItemStore>({
  item: null,
  loading: false,
  error: null,

  async fetchItem(id) {
    this.loading = true
    this.error = null
    try {
      const response = await api.get(`items/${id}`)
      this.item = await response.json()
    } catch (error: any) {
      this.error = error.message
    } finally {
      this.loading = false
    }
  },

  async updateItem(data) {
    if (!this.item) return

    try {
      const response = await api.put(`items/${this.item.id}`, data)
      this.item = await response.json()
    } catch (error: any) {
      this.error = error.message
      throw error
    }
  }
})
```

### Pattern 2: Filtered List Store

```typescript
interface FilteredStore {
  items: Item[]
  filters: {
    search: string
    status: string
    tags: string[]
  }
  applyFilters: () => void
  setFilter: (key: string, value: any) => void
  clearFilters: () => void
}

export const filteredStore = proxy<FilteredStore>({
  items: [],
  filters: {
    search: '',
    status: '',
    tags: []
  },

  setFilter(key, value) {
    this.filters[key] = value
    this.applyFilters()
  },

  clearFilters() {
    this.filters = {
      search: '',
      status: '',
      tags: []
    }
    this.applyFilters()
  },

  async applyFilters() {
    const response = await api.get('items', {
      params: this.filters
    })
    this.items = await response.json()
  }
})
```

### Pattern 3: Store with Selected Item

```typescript
interface SelectableStore {
  items: Item[]
  selectedId: string | null
  selectedItem: Item | null
  selectItem: (id: string) => void
  clearSelection: () => void
}

export const selectableStore = proxy<SelectableStore>({
  items: [],
  selectedId: null,

  get selectedItem() {
    if (!this.selectedId) return null
    return this.items.find(item => item.id === this.selectedId) ?? null
  },

  selectItem(id) {
    this.selectedId = id
  },

  clearSelection() {
    this.selectedId = null
  }
})
```

---

## Existing Stores

Located in `src/store/`:

| Store | Purpose |
|-------|---------|
| `assistants.ts` | AI assistants management |
| `user.ts` | User data and authentication |
| `appInfo.ts` | Application info and settings |
| `applications.ts` | Application integrations |
| `projectSettings.ts` | Project configuration |
| `dataSources.ts` | Data sources management |
| `chats.ts` | Chat functionality |
| `vendor.ts` | Vendor integrations |

---

## Store Template (Complete)

```typescript
// src/store/newFeature.ts
import { proxy } from 'valtio'
import api from '@/utils/api'

interface NewFeatureStore {
  data: any[]
  loading: boolean
  error: string | null
  fetchData: () => Promise<void>
}

export const newFeatureStore = proxy<NewFeatureStore>({
  data: [],
  loading: false,
  error: null,

  async fetchData() {
    this.loading = true
    this.error = null
    try {
      const response = await api.get('endpoint')
      this.data = await response.json()
    } catch (error: any) {
      this.error = error.message
      console.error('Store Error (fetchData):', error)
    } finally {
      this.loading = false
    }
  }
})
```

---

## Related Guides
- [API Integration](../development/api-integration.md) - API client usage
- [Component Patterns](../components/component-patterns.md) - Using stores in components
- [Store Testing](../testing/store-testing.md) - Testing stores
