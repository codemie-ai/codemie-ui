# Custom Hooks — Factory Guide

## When to Extract a Hook

| Trigger | Action |
|---------|--------|
| Component approaching 300 lines | Extract all state + effects to a hook |
| Modal has form logic + focus + ESC handling | `useXxxModal.ts` co-located with component |
| Same pattern in 2+ components | Global hook in `src/hooks/` |
| Debounced search / filter | Dedicated hook with cleanup |
| Paginated data management | `usePagination` hook |

---

## Naming & Location

| Rule | Example |
|------|---------|
| Prefix with `use` | `useSearchFilter`, `useMarketplaceModal` |
| camelCase filename = function name | `useMyModal.ts` exports `useMyModal` |
| Global / reusable | `src/hooks/useXxx.ts` |
| Component-specific | `MyModal/useMyModal.ts` |

---

## Bad / Best

| Bad | Best |
|-----|------|
| 100+ lines of state in component | Extract all to `useXxxModal` |
| Return `internalState, setInternalState` | Return only the public interface |
| Missing `useCallback` on returned handlers | Wrap handlers with `useCallback` |
| Debounce created in render | `useMemo(() => debounce(...), [deps])` |
| No `debouncedFn.cancel()` cleanup | `useEffect(() => () => debouncedFn.cancel(), [debouncedFn])` |
| Missing deps in `useEffect` | Include all used identifiers in deps array |
| Hook does focus + validation + submission | One hook, one responsibility |

---

## Available Global Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useEscapeKey(handler, active)` | ESC keydown listener; auto-removes when `active=false` |
| `useFocusOnVisible(ref, visible)` | Focus `ref.current` when `visible` flips to `true` |
| `useTheme()` | Returns `{ theme, isDark, setTheme }` |
| `useSearchParams()` | URL search params read/write |
| `useDebounceApply()` | Debounced state update utility |
| `useTableFilters()` | Table column filter state |
| `useIsTruncated(ref)` | `true` when element text is truncated |
| `useSidebarOffsetClass()` | CSS class for sidebar-aware layout |

---

## Pattern 1 — Modal State Hook

Co-located with the modal component. Handles state, focus, and close cleanup.

```ts
// useMyModal.ts
import { useState, useCallback, useRef } from 'react'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
import { useEscapeKey } from '@/hooks/useEscapeKey'

export const useMyModal = (visible: boolean, onHide: () => void) => {
  const [formData, setFormData] = useState({})
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClose = useCallback(() => { setFormData({}); onHide() }, [onHide])

  useFocusOnVisible(inputRef, visible)
  useEscapeKey(handleClose, visible)   // only if custom cleanup needed; Popup has built-in ESC

  return { formData, setFormData, inputRef, handleClose }
}
```

---

## Pattern 2 — Form Logic Hook

Wraps React Hook Form + Yup, submits to store, resets on close.

```ts
// useMyForm.ts
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useCallback } from 'react'
import { myFormSchema, MyFormData } from './formSchema'
import { myStore } from '@/store/myStore'

export const useMyForm = (visible: boolean, onHide: () => void) => {
  const form = useForm<MyFormData>({ resolver: yupResolver(myFormSchema) })
  const handleClose = useCallback(() => { form.reset(); onHide() }, [form, onHide])

  const onSubmit = form.handleSubmit(async (data) => {
    await myStore.createItem(data)
    handleClose()
  })

  return { form, handleClose, onSubmit }
}
```

---

## Pattern 3 — Debounced Search Hook

Create debounce with `useMemo`. Cancel in `useEffect` return. Update parent items via store.

```ts
// useSearchFilter.ts
import { useState, useMemo, useEffect } from 'react'
import { debounce } from 'lodash'

export const useSearchFilter = (items: Item[], fields: string[]) => {
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState(items)

  const debouncedSearch = useMemo(() => debounce((q: string) => {
    if (!q) { setFiltered(items); return }
    setFiltered(items.filter(i => fields.some(f => i[f]?.toLowerCase().includes(q.toLowerCase()))))
  }, 300), [items, fields])

  useEffect(() => () => { debouncedSearch.cancel() }, [debouncedSearch])  // MANDATORY

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    debouncedSearch(e.target.value)
  }

  return { query, filtered, handleChange }
}
```

---

## Pattern 4 — Pagination Hook

Wraps store pagination state and page-change handlers.

```ts
// usePagination.ts
import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

export const usePagination = (store: any) => {
  const { pagination } = useSnapshot(store)
  const [page, setPage] = useState(0)

  useEffect(() => { store.fetchItems(page) }, [page])

  return {
    page,
    totalPages: pagination.totalPages,
    goNext: () => setPage(p => Math.min(p + 1, pagination.totalPages - 1)),
    goPrev: () => setPage(p => Math.max(p - 1, 0)),
    goTo: setPage,
  }
}
```

---

## useEscapeKey Usage

```ts
import { useEscapeKey } from '@/hooks/useEscapeKey'
// Fires handler only when active === true
useEscapeKey(handleClose, visible)
```

Note: `Popup` already handles ESC internally. Only add `useEscapeKey` when you need extra cleanup before closing.

---

## useFocusOnVisible Usage

```ts
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
const inputRef = useRef<HTMLInputElement>(null)
useFocusOnVisible(inputRef, visible)
// Then: <Input ref={inputRef} ... />
```

---

## TypeScript Return Typing

Always type the return object explicitly when the shape is non-trivial:

```ts
export const useMyHook = (visible: boolean, onHide: () => void): {
  inputRef: React.RefObject<HTMLInputElement>
  handleClose: () => void
  formData: Record<string, unknown>
} => { /* ... */ }
```

---

## Single Responsibility Rule

Each hook does one thing:

| Good hook | Bad hook |
|-----------|----------|
| `useFocusOnVisible` — only focus | `useEverything` — focus + validation + keyboard + api |
| `useSearchFilter` — only search | Combined search + pagination + sort in one hook |

Split by concern; compose in the parent hook if needed.

---

## Pre-Delivery Checklist

- [ ] File and export name both start with `use`
- [ ] Returns only the public interface (no raw setters unless needed)
- [ ] All handlers wrapped with `useCallback`
- [ ] Debounced functions: created with `useMemo`, cancelled in `useEffect` return
- [ ] All `useEffect` deps arrays complete
- [ ] TypeScript types on params and return
- [ ] Single responsibility — no hook doing 3+ unrelated things
- [ ] Global hooks in `src/hooks/`; component-specific co-located with component
