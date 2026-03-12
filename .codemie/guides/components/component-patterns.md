# Component Patterns

> **React component patterns and templates for CodeMie UI**

## Table of Contents
1. [Basic Functional Component](#basic-functional-component)
2. [Component with State](#component-with-state)
3. [Component with Valtio Store](#component-with-valtio-store)
4. [File Naming Conventions](#file-naming-conventions)
5. [Component Structure](#component-structure)

---

## Basic Functional Component

### Template

```tsx
// src/components/Example/Example.tsx
import React from 'react'
import { cn } from '@/utils/utils'

interface ExampleProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

const Example: React.FC<ExampleProps> = ({
  title,
  description,
  className,
  children
}) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <h2 className="text-h2 text-text-primary">{title}</h2>
      {description && (
        <p className="text-sm text-text-secondary">{description}</p>
      )}
      {children}
    </div>
  )
}

export default Example
```

### Key Points
- Always use TypeScript interfaces for props
- Use `React.FC<Props>` pattern
- Include `className?: string` for style flexibility
- Use `cn()` utility from `@/utils/utils` for combining classes
- Export as default

---

## Component with State

### Template

```tsx
import React, { useState, useEffect } from 'react'
import { cn } from '@/utils/utils'

interface CounterProps {
  initialValue?: number
  className?: string
}

const Counter: React.FC<CounterProps> = ({
  initialValue = 0,
  className
}) => {
  const [count, setCount] = useState(initialValue)

  useEffect(() => {
    // Cleanup if needed
    return () => {
      // Cleanup logic here
    }
  }, [])

  const increment = () => setCount(prev => prev + 1)
  const decrement = () => setCount(prev => prev - 1)

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <button
        onClick={decrement}
        className="px-4 py-2 bg-surface-specific-button-secondary rounded-lg"
      >
        -
      </button>
      <span className="text-h3 text-text-primary">{count}</span>
      <button
        onClick={increment}
        className="px-4 py-2 bg-surface-specific-primary-button rounded-lg"
      >
        +
      </button>
    </div>
  )
}

export default Counter
```

### Key Points
- Use `useState` for local component state
- Use `useEffect` for side effects and cleanup
- Always provide cleanup functions when needed
- Use functional updates for state (`prev => prev + 1`)

---

## Component with Valtio Store

### Store Definition

```typescript
// src/store/example.ts
import { proxy } from 'valtio'
import api from '@/utils/api'

interface ExampleStore {
  items: string[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
}

export const exampleStore = proxy<ExampleStore>({
  items: [],
  loading: false,
  error: null,

  async fetchItems() {
    this.loading = true
    this.error = null
    try {
      const response = await api.get('items')
      const data = await response.json()
      this.items = data
    } catch (error: any) {
      this.error = error.message
    } finally {
      this.loading = false
    }
  }
})
```

### Component Using Store

```tsx
// src/components/ExampleList/ExampleList.tsx
import React, { useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { exampleStore } from '@/store/example'
import Spinner from '@/components/Spinner'

const ExampleList: React.FC = () => {
  const { items, loading, error } = useSnapshot(exampleStore)

  useEffect(() => {
    exampleStore.fetchItems()
  }, [])

  if (loading) return <Spinner />
  if (error) return <div className="text-text-error">{error}</div>

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={index} className="p-4 bg-surface-base-secondary rounded-lg">
          {item}
        </li>
      ))}
    </ul>
  )
}

export default ExampleList
```

### Key Points
- **NEVER** make API calls directly in components
- Always use stores for API interactions
- Use `useSnapshot()` to access store data reactively
- Handle loading and error states in the UI
- Call store methods, don't try to modify store directly in components

---

## File Naming Conventions

### Components
- **File Name**: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
- **Folder Structure**:
  ```
  Button/
  ├── Button.tsx
  ├── Button.test.tsx
  └── index.ts (optional)
  ```

### Utilities
- **File Name**: camelCase (e.g., `utils.ts`, `apiHelpers.ts`)

### Helper Files
- **File Name**: camelCase with suffix (e.g., `formHelpers.ts`, `submitHelpers.ts`)

### Types
- **File Name**: camelCase (e.g., `assistant.ts`, `user.ts`, `formTypes.ts`)

### Custom Hooks
- **File Name**: camelCase with `use` prefix (e.g., `useMarketplaceModal.ts`)

### Tests
- **File Name**: `*.test.tsx` or `*.test.ts`

---

## Component Structure

### Directory Organization

```
src/components/
├── MyComponent/
│   ├── MyComponent.tsx          # Main component (<300 lines)
│   ├── useMyComponent.ts        # Custom hook (if needed)
│   ├── myComponentHelpers.ts    # Helper functions
│   ├── myComponentTypes.ts      # Type definitions
│   ├── SubComponent1.tsx        # Sub-component (if needed)
│   ├── SubComponent2.tsx        # Sub-component (if needed)
│   └── __tests__/
│       └── MyComponent.test.tsx
```

### When to Split Components

**MANDATORY: Keep components under 300 lines**

Split when:
1. Component approaching 300 lines
2. Repeated JSX patterns (extract to sub-components)
3. Complex logic (extract to custom hooks)
4. Multiple validation schemas (extract to separate files)
5. Complex type definitions (extract to separate files)

### Example: Large Component Split

**Before (562 lines ❌)**
```
MyModal.tsx (562 lines)
```

**After (All files < 300 lines ✅)**
```
MyModal/
├── index.tsx                   # Main component (269 lines)
├── useMyModal.ts              # Custom hook (103 lines)
├── modalHelpers.ts            # Helpers (48 lines)
├── MyModalHeader.tsx          # Sub-component (27 lines)
├── MyModalFooter.tsx          # Sub-component (45 lines)
└── __tests__/
    └── MyModal.test.tsx
```

---

## Import Order

Always follow this order:

```typescript
// 1. External libraries
import React from 'react'
import { useSnapshot } from 'valtio'

// 2. Absolute imports (@/ aliases)
import Button from '@/components/Button'
import { exampleStore } from '@/store/example'
import { ButtonType } from '@/constants'

// 3. Relative imports
import { helperFunction } from './helpers'
import type { MyComponentProps } from './types'
```

---

## Code Style

### TypeScript/JavaScript
- **Semicolons**: Not used (enforced by ESLint)
- **Quotes**: Single quotes preferred
- **Indentation**: 2 spaces
- **Line endings**: LF (Unix-style)

### Iteration Patterns
```typescript
// ✅ Preferred
for (const item of items) {
  processItem(item)
}

// Use .entries() when index is needed
for (const [index, item] of items.entries()) {
  console.log(index, item)
}

// ❌ Avoid
items.forEach(item => processItem(item))
for (let i = 0; i < items.length; i++) { }
```

---

## Best Practices Checklist

Before delivering a component:

- [ ] Component is under 300 lines
- [ ] TypeScript interfaces defined for all props
- [ ] Using `cn()` utility for className combinations
- [ ] Following import order (external → @ → relative)
- [ ] No semicolons (ESLint enforced)
- [ ] Using Tailwind classes only (no custom CSS)
- [ ] Proper cleanup in useEffect (if applicable)
- [ ] No magic strings/numbers (use constants)
- [ ] Using `??` for default values (not `||`)
- [ ] Accessibility attributes (ARIA) where needed
- [ ] Component is exported as default

---

## Related Guides
- [Reusable Components](./reusable-components.md) - Catalog of available components
- [Component Organization](./component-organization.md) - File structure best practices
- [Custom Hooks](../patterns/custom-hooks.md) - Extracting complex logic
- [Styling Guide](../styling/styling-guide.md) - Tailwind CSS patterns
- [Form Patterns](../patterns/form-patterns.md) - Form component patterns
