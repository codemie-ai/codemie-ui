# API Integration

> CRITICAL: Custom fetch wrapper only. NOT Axios. Call `.json()` on responses. API calls in Valtio stores only — never in components.

## Quick Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Import | `import api from '@/utils/api'` | importing axios |
| Parse response | `await response.json()` | `response.data` (Axios pattern — returns `undefined`) |
| Where to call | Inside a Valtio store method | Inside a component `useEffect` |
| DELETE body | Skip `.json()` unless body confirmed | Assuming body exists |

---

## Import

```typescript
import api from '@/utils/api'
```

The client returns native `fetch` `Response` objects. You **must** call `.json()` to deserialize the body.

---

## Request Methods

### GET

```typescript
const response = await api.get('assistants')
const data = await response.json()

// With query params
const response = await api.get('assistants', { params: { page: 1, per_page: 12 } })
const data = await response.json()
```

### POST

```typescript
const response = await api.post('assistants', { name: 'My Assistant' })
const result = await response.json()
```

### PUT

```typescript
const response = await api.put(`assistants/${id}`, { name: 'Updated' })
const updated = await response.json()
```

### DELETE

```typescript
await api.delete(`assistants/${id}`)
// Do NOT call .json() on DELETE — response body may be absent
```

### Multipart (file upload)

```typescript
const formData = new FormData()
formData.append('file', file)
const response = await api.postMultipart('upload', formData)
const result = await response.json()
```

### Streaming (chat / AI responses)

```typescript
const abort = new AbortController()
const stream = await api.stream('chat/stream', { message: 'Hello' }, abort)
const reader = stream.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  // process chunk
}
abort.abort()  // cancel when needed
```

---

## Store Pattern (Required Architecture)

All API calls belong in Valtio store methods. Components read from snapshots and call store methods.

```typescript
// src/store/items.ts
import { proxy } from 'valtio'
import api from '@/utils/api'

export const itemsStore = proxy({
  items: [] as Item[],
  loading: false,
  error: null as string | null,

  async fetchItems(filters = {}, page = 0, perPage = 12) {
    this.loading = true
    this.error = null
    try {
      const response = await api.get('items', { params: { ...filters, page, per_page: perPage } })
      const data = await response.json()
      this.items = data.items
    } catch (error: any) {
      this.error = error.message
    } finally {
      this.loading = false
    }
  },

  async createItem(payload: Partial<Item>) {
    this.loading = true
    try {
      const response = await api.post('items', payload)
      const result = await response.json()
      this.items.unshift(result)
      return result
    } catch (error: any) {
      this.error = error.message
      throw error
    } finally {
      this.loading = false
    }
  },
})
```

**Component usage:**
```typescript
import { useSnapshot } from 'valtio'
import { itemsStore } from '@/store/items'

const MyComponent = () => {
  const { items, loading } = useSnapshot(itemsStore)
  useEffect(() => { itemsStore.fetchItems() }, [])
  // render items
}
```

---

## Error Handling

### Default behavior

The API client shows toaster notifications automatically on errors. You do not need to display them manually unless customizing the message.

### Catching in store

```typescript
try {
  const response = await api.get('endpoint')
  const data = await response.json()
} catch (error: any) {
  if (error.name === 'AbortError') return  // request cancelled
  this.error = error.message
}
```

### Skip automatic toaster

```typescript
const response = await api.get('endpoint', { skipErrorHandling: true })
if (!response.ok) {
  const err = await response.json()
  // handle manually
}
```

### Check response status

```typescript
const response = await api.get('items')
if (response.ok) {
  const data = await response.json()
} else {
  console.error('Failed:', response.status)
}
```

---

## Cancellable Requests (AbortController)

Use in stores when a component unmounts before the request finishes. Pass `signal` through the store method or manage in a custom hook.

```typescript
// In a custom hook wrapping a store call
useEffect(() => {
  const abort = new AbortController()
  itemsStore.fetchItems({ signal: abort.signal })
  return () => abort.abort()
}, [])
```

---

## Loading & Error State Pattern

Every store action must set `loading` and `error`. Components rely on these to show spinners and error messages without managing their own state.

```typescript
// Store: always this structure
async doAction() {
  this.loading = true
  this.error = null
  try {
    // ... api call + .json()
  } catch (error: any) {
    this.error = error.message
  } finally {
    this.loading = false
  }
}
```

---

## Configuration

Set API base URL in `.env`:
```
VITE_API_URL=http://localhost:8080
VITE_SUFFIX=/app          # optional URL suffix
```

---

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| `response.data` instead of `await response.json()` | `data` is `undefined` | Always call `.json()` |
| API call inside component `useEffect` | Logic duplicated, no shared state | Move to store method |
| `.json()` on empty DELETE response | `SyntaxError: Unexpected end of JSON` | Skip `.json()` for DELETE |
| No `finally { this.loading = false }` | Spinner never stops | Always use `finally` block |
| Axios import | Runtime error or missing methods | Use `@/utils/api` only |

---

## Related

- `src/utils/api.ts` — fetch wrapper implementation
- `src/store/` — all store files follow the pattern above
- `state-management.md` — Valtio store conventions
