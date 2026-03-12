# Custom Hooks

> **Creating and using custom React hooks in CodeMie UI**

## Table of Contents
1. [Overview](#overview)
2. [When to Create Custom Hooks](#when-to-create-custom-hooks)
3. [Hook Patterns](#hook-patterns)
4. [Available Hooks](#available-hooks)
5. [Best Practices](#best-practices)

---

## Overview

### Purpose

Custom hooks extract complex logic from components, making them:
- Reusable across multiple components
- Easier to test
- Easier to maintain
- Keep components under 300 lines

### Naming Convention

- **File Name**: camelCase with `use` prefix (e.g., `useMarketplaceModal.ts`)
- **Function Name**: Same as file name (e.g., `export const useMarketplaceModal`)

### Location

- `src/hooks/` - Global reusable hooks
- Component folder - Component-specific hooks (e.g., `MyModal/useMyModal.ts`)

---

## When to Create Custom Hooks

Create a custom hook when:

1. **Component approaching 300 lines** - Extract logic to hook
2. **Complex modal/form logic** - State management, effects, handlers
3. **Repeated patterns** - Logic used in multiple places
4. **Multiple effects** - Focus management, keyboard handling, cleanup
5. **Debounced operations** - Search, filtering, etc.

---

## Hook Patterns

### Pattern 1: Modal State Management

```typescript
// useMyModal.ts
import { useState, useCallback, useRef } from 'react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'

export const useMyModal = (visible: boolean, onHide: () => void) => {
  const [formData, setFormData] = useState({})
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClose = useCallback(() => {
    setFormData({})
    onHide()
  }, [onHide])

  // Auto-focus first input when modal opens
  useFocusOnVisible(inputRef, visible)

  // ESC key handling
  useEscapeKey(handleClose, visible)

  return { formData, setFormData, inputRef, handleClose }
}
```

### Pattern 2: Form Logic

```typescript
// useMyForm.ts
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useCallback } from 'react'
import { myFormSchema, MyFormData } from './formSchema'
import { myStore } from '@/store/myStore'

export const useMyForm = (visible: boolean, onHide: () => void) => {
  const form = useForm<MyFormData>({
    resolver: yupResolver(myFormSchema)
  })

  const handleClose = useCallback(() => {
    form.reset()
    onHide()
  }, [form, onHide])

  const onSubmit = async (data: MyFormData) => {
    try {
      await myStore.createItem(data)
      handleClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return {
    form,
    handleClose,
    onSubmit: form.handleSubmit(onSubmit)
  }
}
```

### Pattern 3: Search/Filter Logic

```typescript
// useSearchFilter.ts
import { useState, useMemo, useEffect } from 'react'
import { debounce } from 'lodash'

export const useSearchFilter = (items: any[], searchFields: string[]) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState(items)

  // Debounced search with cleanup
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      if (!query) {
        setFilteredItems(items)
        return
      }

      const filtered = items.filter(item =>
        searchFields.some(field =>
          item[field]?.toLowerCase().includes(query.toLowerCase())
        )
      )
      setFilteredItems(filtered)
    }, 300),
    [items, searchFields]
  )

  useEffect(() => {
    return () => {
      debouncedSearch.cancel() // MANDATORY cleanup
    }
  }, [debouncedSearch])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    debouncedSearch(query)
  }

  return {
    searchQuery,
    filteredItems,
    handleSearchChange
  }
}
```

### Pattern 4: Pagination Logic

```typescript
// usePagination.ts
import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

export const usePagination = (store: any) => {
  const { pagination } = useSnapshot(store)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    store.fetchItems(currentPage)
  }, [currentPage, store])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleNextPage = () => {
    if (currentPage < pagination.totalPages - 1) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1)
    }
  }

  return {
    currentPage,
    totalPages: pagination.totalPages,
    handlePageChange,
    handleNextPage,
    handlePrevPage
  }
}
```

---

## Available Hooks

Located in `src/hooks/`:

### Core Hooks

```typescript
import { useTheme } from '@/hooks/useTheme'
// Theme management (codemieDark / codemieLight)

import { useSearchParams } from '@/hooks/useSearchParams'
// URL search params management

import { useDebounceApply } from '@/hooks/useDebounceApply'
// Debounced state updates

import { useTableFilters } from '@/hooks/useTableFilters'
// Table filtering logic

import { useIsTruncated } from '@/hooks/useIsTruncated'
// Check if text is truncated

import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
// Sidebar responsive offset

import { useEscapeKey } from '@/hooks/useEscapeKey'
// ESC key handling

import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
// Auto-focus when visible
```

### Usage Examples

#### useTheme

```typescript
import { useTheme } from '@/hooks/useTheme'

const MyComponent = () => {
  const { theme, isDark, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(isDark ? 'codemieLight' : 'codemieDark')
  }

  return <button onClick={toggleTheme}>Toggle Theme</button>
}
```

#### useEscapeKey

```typescript
import { useEscapeKey } from '@/hooks/useEscapeKey'

const MyModal = ({ visible, onHide }) => {
  const handleClose = useCallback(() => {
    // Cleanup logic
    onHide()
  }, [onHide])

  useEscapeKey(handleClose, visible)

  return <Popup visible={visible} onHide={handleClose}>...</Popup>
}
```

#### useFocusOnVisible

```typescript
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'

const MyModal = ({ visible }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useFocusOnVisible(inputRef, visible)

  return (
    <Popup visible={visible}>
      <Input ref={inputRef} />
    </Popup>
  )
}
```

---

## Best Practices

### 1. Extract Complex Logic

```typescript
// ✅ GOOD: Complex logic in hook
const MyModal = ({ visible, onHide }) => {
  const { state, handlers } = useMyModal(visible, onHide)
  return <Popup {...props}>{content}</Popup>
}

// ❌ BAD: All logic in component
const MyModal = ({ visible, onHide }) => {
  const [state1, setState1] = useState()
  const [state2, setState2] = useState()
  // ... 100+ lines of logic
  return <Popup {...props}>{content}</Popup>
}
```

### 2. Return Only What Consumers Need

```typescript
// ✅ GOOD: Return only public interface
export const useMyHook = () => {
  const [internalState, setInternalState] = useState()

  const publicAction = () => { /* ... */ }

  return { publicAction }  // Don't expose internal state
}

// ❌ BAD: Return everything
export const useMyHook = () => {
  const [internalState, setInternalState] = useState()

  return { internalState, setInternalState }  // Too much exposure
}
```

### 3. Cleanup Debounced Functions

**MANDATORY: Always cleanup debounced functions**

```typescript
// ✅ GOOD: Cleanup in useEffect
export const useDebounced = () => {
  const debouncedFn = useMemo(
    () => debounce(() => { /* ... */ }, 300),
    []
  )

  useEffect(() => {
    return () => {
      debouncedFn.cancel()  // MANDATORY
    }
  }, [debouncedFn])

  return { debouncedFn }
}
```

### 4. Use useCallback for Functions

```typescript
// ✅ GOOD: Memoize callbacks
export const useMyHook = (onHide: () => void) => {
  const handleClose = useCallback(() => {
    // Cleanup logic
    onHide()
  }, [onHide])

  return { handleClose }
}
```

### 5. Proper Dependencies

```typescript
// ✅ GOOD: Proper dependencies
useEffect(() => {
  fetchData(id)
}, [id])  // Include all dependencies

// ❌ BAD: Missing dependencies
useEffect(() => {
  fetchData(id)
}, [])  // Missing id dependency
```

### 6. TypeScript Types

```typescript
// ✅ GOOD: Typed hook
export const useMyHook = (
  visible: boolean,
  onHide: () => void
): {
  state: State
  handlers: Handlers
} => {
  // ...
}
```

### 7. Single Responsibility

```typescript
// ✅ GOOD: Hook does one thing
export const useFocusOnVisible = (ref, visible) => {
  // Only handles focus management
}

// ❌ BAD: Hook does too much
export const useEverything = (ref, visible) => {
  // Handles focus, keyboard, validation, submission...
}
```

---

## Complete Hook Example

```typescript
// useMarketplaceModal.ts
import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { debounce } from 'lodash'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
import { marketplaceStore } from '@/store/marketplace'

export const useMarketplaceModal = (visible: boolean, onHide: () => void) => {
  const { items } = useSnapshot(marketplaceStore)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus management
  useFocusOnVisible(searchInputRef, visible)

  // Keyboard handling
  const handleClose = useCallback(() => {
    setSearchQuery('')
    setCurrentPage(0)
    onHide()
  }, [onHide])

  useEscapeKey(handleClose, visible)

  // Debounced search with cleanup
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setSearchQuery(query)
      setCurrentPage(0)
      marketplaceStore.search(query)
    }, 300),
    []
  )

  useEffect(() => {
    return () => {
      debouncedSearch.cancel() // MANDATORY cleanup
    }
  }, [debouncedSearch])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return {
    searchInputRef,
    searchQuery,
    currentPage,
    items,
    setCurrentPage,
    handleClose,
    handleSearchChange,
    handlePageChange
  }
}
```

---

## Related Guides
- [Component Patterns](../components/component-patterns.md) - Using hooks in components
- [Modal Patterns](./modal-patterns.md) - Modal-specific hooks
- [Form Patterns](./form-patterns.md) - Form-specific hooks
- [Code Organization](../development/code-organization.md) - File structure
