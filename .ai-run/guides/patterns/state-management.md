# State Management — Factory Guide

## Core Rule

**Component → Store → API. Never skip layers.**

Components call store methods. Stores call `api.*`. API responses are parsed with `.json()`.
Direct `api.*` calls inside components are forbidden.

---

## Bad / Best

| Bad | Best |
|-----|------|
| `api.get(...)` inside a component | `myStore.fetchItems()` from `useEffect` |
| Using `.data` (Axios pattern) | `await response.json()` |
| No `loading` / `error` state | Always include both in every async method |
| Magic numbers `perPage: 12` | Extract constant `const DEFAULT_PER_PAGE = 12` |
| `||` for defaults | `??` (nullish coalescing) |
| Forget `debouncedFn.cancel()` | `return () => { debouncedFn.cancel() }` in `useEffect` |
| Mutating snapshot directly | Call a store action — never mutate `useSnapshot` result |

---

## Store Location & Naming

- All stores live in `src/store/`
- One file per domain feature: `src/store/assistants.ts`, `src/store/chats.ts`, etc.
- Export a single named `proxy`: `export const featureStore = proxy<FeatureStore>({...})`

---

## Minimal Store Template

```ts
// src/store/feature.ts
import { proxy } from 'valtio'
import api from '@/utils/api'

interface FeatureStore {
  data: DataType[]
  loading: boolean
  error: string | null
  fetchData: () => Promise<void>
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
      this.data = await response.json()
    } catch (err: any) {
      this.error = err.message
      console.error('Store Error (fetchData):', err)
    } finally {
      this.loading = false
    }
  },
})
```

---

## Every Async Method Pattern

```
this.loading = true
this.error = null
try {
  const res = await api.<method>(...)
  const data = await res.json()   // MANDATORY
  // update this.*
} catch (err: any) {
  const msg = err.response?.data?.message ?? err.message
  this.error = `Failed to <action>: ${msg}`
  console.error('Store Error (<methodName>):', err)
  throw err  // re-throw only if component needs to react
} finally {
  this.loading = false
}
```

---

## CRUD Method Summary

| Operation | API call | Post-update |
|-----------|---------|-------------|
| Create | `api.post('items', data)` | `this.items.unshift(result)` |
| Read (list) | `api.get('items')` | `this.items = data` |
| Update | `api.put('items/${id}', data)` | replace by index |
| Delete | `api.delete('items/${id}')` | no `.json()` needed; filter array |

---

## Pagination Store Shape

```ts
interface PaginatedStore {
  items: Item[]
  pagination: { page: number; perPage: number; totalPages: number; totalCount: number }
  loading: boolean
  error: string | null
  indexItems: (filters?: Record<string, any>, page?: number) => Promise<Item[]>
}

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 12
```

---

## Computed (Derived) Values

Use a getter inside `proxy` — Valtio supports them natively:

```ts
export const selectableStore = proxy({
  items: [] as Item[],
  selectedId: null as string | null,
  get selectedItem(): Item | null {
    if (!this.selectedId) return null
    return this.items.find(i => i.id === this.selectedId) ?? null
  },
})
```

---

## Using a Store in a Component

```tsx
import { useSnapshot } from 'valtio'
import { featureStore } from '@/store/feature'

const MyComponent = () => {
  const { data, loading, error } = useSnapshot(featureStore)

  useEffect(() => { featureStore.fetchData() }, [])

  if (loading) return <Spinner />
  if (error) return <p className='text-text-error'>{error}</p>
  return <ul>{data.map(item => <li key={item.id}>{item.name}</li>)}</ul>
}
```

Rules:
- Always destructure from `useSnapshot`, not from the raw proxy
- Never mutate `snap.*` — call store actions instead
- Trigger store fetches from `useEffect`, not render

---

## Debounce Cleanup in Components

```tsx
useEffect(() => {
  const debounced = debounce(() => featureStore.fetchData(), 300)
  return () => { debounced.cancel() }   // MANDATORY
}, [])
```

---

## Existing Stores (`src/store/`)

| File | Domain |
|------|--------|
| `assistants.ts` | AI assistants |
| `user.ts` | Auth & user profile |
| `appInfo.ts` | App settings |
| `applications.ts` | Integrations |
| `projectSettings.ts` | Project config |
| `dataSources.ts` | Data sources |
| `chats.ts` | Chat sessions |
| `vendor.ts` | Vendor integrations |

---

## Pre-Delivery Checklist

- [ ] Store file in `src/store/`, exported as named `proxy`
- [ ] TypeScript interface on every `proxy<T>(...)`
- [ ] Every async method: `loading = true`, `error = null`, `finally { loading = false }`
- [ ] Every response parsed with `await response.json()` (not `.data`)
- [ ] No direct `api.*` calls in component files
- [ ] `useSnapshot` used in components, not raw proxy
- [ ] Magic numbers extracted to named constants
- [ ] Debounced calls cleaned up in `useEffect` return

---

## Filtered / Search Store Pattern

```ts
export const filteredStore = proxy({
  items: [] as Item[],
  filters: { search: '', status: '' },

  setFilter(key: string, value: string) {
    this.filters[key] = value
    this.applyFilters()
  },

  clearFilters() {
    this.filters = { search: '', status: '' }
    this.applyFilters()
  },

  async applyFilters() {
    const response = await api.get('items', { params: this.filters })
    this.items = await response.json()
  },
})
```

`setFilter` + `clearFilters` are synchronous; `applyFilters` is async and fires after each change. Components call `filteredStore.setFilter('search', query)` — never manipulate `filters` directly from a component.
