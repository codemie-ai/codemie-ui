# API Integration

> **CRITICAL: The project uses a custom fetch wrapper, NOT Axios**

## Table of Contents
1. [Overview](#overview)
2. [API Response Pattern](#api-response-pattern)
3. [Common Operations](#common-operations)
4. [Error Handling](#error-handling)
5. [Configuration](#configuration)
6. [Best Practices](#best-practices)

---

## Overview

### ⚠️ CRITICAL INFORMATION

The project uses a **custom fetch wrapper**, not Axios!

The API client returns native **fetch Response objects**, which means you must call `.json()` to parse the response body.

### Import

```typescript
import api from '@/utils/api'
```

---

## API Response Pattern

### ✅ CORRECT: Parse Response with .json()

```typescript
import api from '@/utils/api'

// GET request
const response = await api.get('assistants', { params: { page: 1 } })
const data = await response.json()  // ⚠️ Must call .json() to get data
```

### ❌ WRONG: Using .data (Axios Pattern)

```typescript
// ❌ DO NOT DO THIS (this is Axios, not our API client!)
const response = await api.get('assistants', { params: { page: 1 } })
const data = response.data  // Will be undefined!
```

---

## Common Operations

### GET Request

```typescript
import api from '@/utils/api'

// Simple GET
const response = await api.get('assistants')
const data = await response.json()

// GET with query parameters
const response = await api.get('assistants', {
  params: {
    page: 1,
    per_page: 12,
    status: 'active'
  }
})
const data = await response.json()
```

### POST Request

```typescript
// Create new item
const response = await api.post('assistants', {
  name: 'New Assistant',
  description: 'Description'
})
const result = await response.json()
```

### PUT Request

```typescript
// Update existing item
const response = await api.put(`assistants/${id}`, {
  name: 'Updated Name',
  description: 'Updated Description'
})
const updated = await response.json()
```

### DELETE Request

```typescript
// Delete item
const response = await api.delete(`assistants/${id}`)
// Note: DELETE may not return a body, check before calling .json()

// If response has body
if (response.ok) {
  try {
    const result = await response.json()
  } catch {
    // No body returned, that's ok
  }
}
```

### Multipart Form Data

```typescript
// File upload
const formData = new FormData()
formData.append('file', file)
formData.append('name', 'File name')

const response = await api.postMultipart('upload', formData)
const result = await response.json()
```

### Streaming (for Chat/AI Responses)

```typescript
// Streaming response
const abortController = new AbortController()

const stream = await api.stream('chat/stream', {
  message: 'Hello'
}, abortController)

// Read stream
const reader = stream.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  // Process chunk
}

// Cancel stream if needed
abortController.abort()
```

---

## Error Handling

### Automatic Error Handling

The API client automatically handles errors via toaster notifications:

```typescript
try {
  const response = await api.get('endpoint')
  const data = await response.json()
} catch (error) {
  // Error already shown in toaster
  // Handle error in component if needed
}
```

### Custom Error Handling

```typescript
try {
  const response = await api.get('endpoint')
  const data = await response.json()
} catch (error) {
  if (error.name === 'AbortError') {
    // Request was aborted
    console.log('Request cancelled')
  } else {
    // Handle other errors
    console.error('API Error:', error)
  }
}
```

### Skip Automatic Error Handling

```typescript
// Skip toaster notification for this request
const response = await api.get('endpoint', {
  skipErrorHandling: true
})

if (!response.ok) {
  // Handle error manually
  const error = await response.json()
  console.error('Custom error handling:', error)
}
```

---

## Configuration

### API Base URL

Set in `.env` file:

```bash
VITE_API_URL=http://localhost:8080
```

Access via:

```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

### URL Suffix (Optional)

```bash
VITE_SUFFIX=/app
```

---

## Best Practices

### 1. Always Call .json() on Response

```typescript
// ✅ CORRECT
const response = await api.get('items')
const data = await response.json()

// ❌ WRONG
const response = await api.get('items')
const data = response.data  // undefined!
```

### 2. API Calls in Stores Only

```typescript
// ✅ CORRECT: API call in store
export const itemStore = proxy({
  items: [],

  async fetchItems() {
    const response = await api.get('items')
    this.items = await response.json()
  }
})

// ❌ WRONG: Direct API call in component
const MyComponent = () => {
  useEffect(() => {
    const fetch = async () => {
      const response = await api.get('items')
      setItems(await response.json())
    }
    fetch()
  }, [])
}
```

### 3. Handle Loading and Error States

```typescript
// ✅ CORRECT: Proper state management
async fetchItems() {
  this.loading = true
  this.error = null
  try {
    const response = await api.get('items')
    this.items = await response.json()
  } catch (error: any) {
    this.error = error.message
  } finally {
    this.loading = false
  }
}
```

### 4. Use AbortController for Cancellable Requests

```typescript
// Component with cancellable request
const MyComponent = () => {
  useEffect(() => {
    const abortController = new AbortController()

    const fetchData = async () => {
      try {
        const response = await api.get('items', {
          signal: abortController.signal
        })
        const data = await response.json()
        // ... use data
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request cancelled')
        }
      }
    }

    fetchData()

    return () => {
      abortController.abort()  // Cancel on unmount
    }
  }, [])
}
```

### 5. Check Response Status

```typescript
// Check if response is ok
const response = await api.get('items')

if (response.ok) {
  const data = await response.json()
} else {
  console.error('Request failed:', response.status)
}
```

---

## Store Pattern with API

### Complete Example

```typescript
// src/store/items.ts
import { proxy } from 'valtio'
import api from '@/utils/api'

interface ItemsStore {
  items: Item[]
  pagination: {
    page: number
    perPage: number
    totalPages: number
    totalCount: number
  }
  loading: boolean
  error: string | null
  indexItems: (filters?: any, page?: number, perPage?: number) => Promise<Item[]>
  createItem: (data: Partial<Item>) => Promise<Item>
  updateItem: (id: string, data: Partial<Item>) => Promise<Item>
  deleteItem: (id: string) => Promise<void>
}

export const itemsStore = proxy<ItemsStore>({
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
      const data = await response.json()  // ⚠️ Must call .json()!

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
  },

  async createItem(data) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post('items', data)
      const result = await response.json()  // ⚠️ Must call .json()!

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

  async updateItem(id, data) {
    this.loading = true
    this.error = null

    try {
      const response = await api.put(`items/${id}`, data)
      const result = await response.json()  // ⚠️ Must call .json()!

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

## Common Pitfalls

### ❌ PITFALL 1: Using .data (Axios Pattern)

```typescript
// ❌ WRONG
const response = await api.get('items')
const data = response.data  // undefined!

// ✅ CORRECT
const response = await api.get('items')
const data = await response.json()
```

### ❌ PITFALL 2: API Calls in Components

```typescript
// ❌ WRONG: Direct API call in component
const MyComponent = () => {
  const [items, setItems] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const response = await api.get('items')
      setItems(await response.json())
    }
    fetch()
  }, [])
}

// ✅ CORRECT: Use store
const MyComponent = () => {
  const { items } = useSnapshot(itemsStore)

  useEffect(() => {
    itemsStore.fetchItems()
  }, [])
}
```

### ❌ PITFALL 3: Missing .json() on DELETE

```typescript
// ❌ WRONG: Assuming DELETE returns body
const response = await api.delete(`items/${id}`)
const data = await response.json()  // May throw error if no body

// ✅ CORRECT: Check if response has body
const response = await api.delete(`items/${id}`)
// Don't try to parse body for DELETE
```

---

## Related Guides
- [State Management](../patterns/state-management.md) - Using stores for API calls
- [Component Patterns](../components/component-patterns.md) - Component structure
- [Store Testing](../testing/store-testing.md) - Testing API calls
