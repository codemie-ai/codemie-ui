# Performance Patterns

> **Optimization patterns and best practices for CodeMie UI performance**

## Table of Contents
1. [Performance Principles](#performance-principles)
2. [React Optimization](#react-optimization)
3. [Valtio Store Optimization](#valtio-store-optimization)
4. [Code Splitting](#code-splitting)
5. [Asset Optimization](#asset-optimization)
6. [Network Optimization](#network-optimization)
7. [Rendering Optimization](#rendering-optimization)
8. [Profiling and Monitoring](#profiling-and-monitoring)

---

## Performance Principles

### Core Principles

1. **Measure First**: Profile before optimizing
2. **Lazy Load**: Load code and data when needed
3. **Memoize Expensive**: Cache expensive calculations
4. **Minimize Re-renders**: Prevent unnecessary React re-renders
5. **Optimize Bundle**: Keep bundle size small

### When to Optimize

✅ **Do optimize**:
- Components rendering slowly (> 16ms)
- Large lists (100+ items)
- Expensive calculations
- Heavy network requests
- Large bundle sizes (> 500KB)

❌ **Don't optimize prematurely**:
- Small, fast components
- One-time calculations
- Simple components (< 50 lines)

---

## React Optimization

### React.memo

Prevent unnecessary re-renders for components with same props:

```tsx
// ✅ Good: Memoize expensive pure component
interface CardProps {
  title: string
  description: string
  onClick: () => void
}

const Card: React.FC<CardProps> = ({ title, description, onClick }) => {
  return (
    <div onClick={onClick}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

// Memoize with custom comparison
export default React.memo(Card, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description
  )
})

// ❌ Don't: Memoize everything
const SimpleText = React.memo(({ text }: { text: string }) => (
  <span>{text}</span>
))  // Overhead not worth it for simple component
```

### useMemo

Cache expensive calculations:

```tsx
import { useMemo } from 'react'

const MyComponent: React.FC<{ items: Item[] }> = ({ items }) => {
  // ✅ Good: Memoize expensive calculation
  const sortedItems = useMemo(() => {
    return items
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(item => item.active)
  }, [items])  // Only recalculate when items change

  // ❌ Bad: Memoize cheap calculation
  const count = useMemo(() => items.length, [items])  // Not worth it

  return (
    <div>
      {sortedItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

### useCallback

Memoize callback functions to prevent child re-renders:

```tsx
import { useCallback, useState } from 'react'

const ParentComponent: React.FC = () => {
  const [count, setCount] = useState(0)
  const [text, setText] = useState('')

  // ✅ Good: Memoize callback passed to memoized child
  const handleClick = useCallback(() => {
    setCount(count + 1)
  }, [count])

  // Alternative: Use functional update (no dependencies)
  const handleClickBetter = useCallback(() => {
    setCount(c => c + 1)
  }, [])  // Never changes - more efficient

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <MemoizedChild onClick={handleClickBetter} />
    </>
  )
}

const MemoizedChild = React.memo<{ onClick: () => void }>(({ onClick }) => {
  return <button onClick={onClick}>Click me</button>
})
```

### Lazy Loading Components

Split code and load components on demand:

```tsx
import { lazy, Suspense } from 'react'

// ✅ Good: Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))
const DataTable = lazy(() => import('./DataTable'))

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
      </Suspense>

      <Suspense fallback={<div>Loading table...</div>}>
        <DataTable />
      </Suspense>
    </div>
  )
}
```

### Key Props for Lists

Use stable, unique keys for lists:

```tsx
// ✅ Good: Use stable unique ID
{items.map(item => (
  <Card key={item.id} {...item} />
))}

// ⚠️ Acceptable: Use index only if list is static
{staticItems.map((item, index) => (
  <Card key={index} {...item} />
))}

// ❌ Bad: Use index for dynamic list
{items.map((item, index) => (
  <Card key={index} {...item} />
))}  // Causes issues on reorder/add/delete

// ❌ Bad: Random or generated key
{items.map(item => (
  <Card key={Math.random()} {...item} />
))}  // Re-renders everything every time
```

---

## Valtio Store Optimization

### Use useSnapshot Efficiently

```tsx
import { useSnapshot } from 'valtio'
import { assistantsStore } from '@/store/assistants'

// ✅ Good: Only subscribe to what you need
const MyComponent: React.FC = () => {
  const { assistants } = useSnapshot(assistantsStore)

  return (
    <div>
      {assistants.map(a => <div key={a.id}>{a.name}</div>)}
    </div>
  )
}

// ❌ Bad: Subscribe to entire store when only need one field
const MyComponent: React.FC = () => {
  const state = useSnapshot(assistantsStore)  // Re-renders on ANY store change

  return (
    <div>
      {state.assistants.map(a => <div key={a.id}>{a.name}</div>)}
    </div>
  )
}
```

### Batch Store Updates

```tsx
import { assistantsStore } from '@/store/assistants'

// ✅ Good: Batch multiple updates
const updateMultiple = () => {
  // All changes in one function = one re-render
  assistantsStore.loading = true
  assistantsStore.error = null
  assistantsStore.assistants = newAssistants
}

// ❌ Bad: Multiple separate updates
const updateMultipleBad = () => {
  assistantsStore.loading = true      // Triggers re-render
  assistantsStore.error = null        // Triggers re-render
  assistantsStore.assistants = newAssistants  // Triggers re-render
}
```

### Derived State

```tsx
import { derive } from 'valtio/utils'
import { assistantsStore } from '@/store/assistants'

// ✅ Good: Use derived for computed values
export const derivedAssistantsStore = derive({
  activeAssistants: (get) => {
    const { assistants } = get(assistantsStore)
    return assistants.filter(a => a.status === 'active')
  },
  assistantCount: (get) => {
    const { assistants } = get(assistantsStore)
    return assistants.length
  }
})

// Usage - only re-renders when derived value changes
const { activeAssistants } = useSnapshot(derivedAssistantsStore)
```

---

## Code Splitting

### Route-Based Splitting

```tsx
// router.tsx
import { lazy } from 'react'

// ✅ Good: Split by route
const AssistantsPage = lazy(() => import('@/pages/assistants/AssistantsPage'))
const WorkflowsPage = lazy(() => import('@/pages/workflows/WorkflowsPage'))
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'))

export const router = createBrowserRouter([
  {
    path: '/assistants',
    element: <Suspense fallback={<Loading />}><AssistantsPage /></Suspense>
  },
  {
    path: '/workflows',
    element: <Suspense fallback={<Loading />}><WorkflowsPage /></Suspense>
  }
])
```

### Component-Based Splitting

```tsx
// ✅ Good: Split large, rarely-used components
const PdfViewer = lazy(() => import('@/components/PdfViewer'))
const CodeEditor = lazy(() => import('@/components/CodeEditor'))

const DocumentView: React.FC = ({ type }) => {
  if (type === 'pdf') {
    return (
      <Suspense fallback={<Spinner />}>
        <PdfViewer />
      </Suspense>
    )
  }
  // ...
}
```

### Dynamic Imports

```tsx
// ✅ Good: Load heavy library only when needed
const handleExport = async () => {
  const { exportToPdf } = await import('@/utils/pdfExport')
  await exportToPdf(data)
}

// ❌ Bad: Import heavy library at top level
import { exportToPdf } from '@/utils/pdfExport'  // Loaded on page load
```

---

## Asset Optimization

### SVG Optimization

```tsx
// ✅ Good: Import SVG as React component (smaller bundle)
import ChatSvg from '@/assets/icons/chat.svg?react'

const MyComponent = () => (
  <ChatSvg className="w-6 h-6" />
)

// ⚠️ Acceptable: Import as URL for large/complex SVGs
import logoUrl from '@/assets/images/logo.svg'

const MyComponent = () => (
  <img src={logoUrl} alt="Logo" />
)
```

### Image Optimization

```tsx
// ✅ Good: Use WebP with fallback
<picture>
  <source srcSet="/avatar.webp" type="image/webp" />
  <img src="/avatar.png" alt="Avatar" />
</picture>

// ✅ Good: Lazy load images below fold
<img
  src="/large-image.jpg"
  alt="Large image"
  loading="lazy"
/>

// ✅ Good: Provide width/height to prevent layout shift
<img
  src="/avatar.png"
  alt="Avatar"
  width={48}
  height={48}
/>
```

### Icon Optimization

```tsx
// ✅ Good: Use icon system, not individual imports
// Create icon sprite or use icon library

// icons.tsx
export const icons = {
  chat: <ChatSvg />,
  user: <UserSvg />,
  settings: <SettingsSvg />
}

// Usage
<Icon name="chat" />

// ❌ Bad: Import every icon separately
import Icon1 from './icon1.svg?react'
import Icon2 from './icon2.svg?react'
// ... hundreds of icons
```

---

## Network Optimization

### API Request Optimization

```tsx
// ✅ Good: Debounce search requests
import { useMemo } from 'react'
import debounce from 'lodash/debounce'

const SearchComponent: React.FC = () => {
  const [query, setQuery] = useState('')

  const debouncedSearch = useMemo(
    () => debounce(async (q: string) => {
      const results = await api.get('/search', { params: { q } })
      setResults(await results.json())
    }, 300),
    []
  )

  useEffect(() => {
    if (query) {
      debouncedSearch(query)
    }
    return () => debouncedSearch.cancel()
  }, [query, debouncedSearch])

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}
```

### Request Deduplication

```tsx
// ✅ Good: Deduplicate identical requests
const requestCache = new Map<string, Promise<any>>()

export const fetchWithCache = async (url: string) => {
  if (requestCache.has(url)) {
    return requestCache.get(url)
  }

  const promise = api.get(url).then(r => r.json())
  requestCache.set(url, promise)

  try {
    const result = await promise
    return result
  } finally {
    // Clear cache after 5 seconds
    setTimeout(() => requestCache.delete(url), 5000)
  }
}
```

### Pagination

```tsx
// ✅ Good: Load data in pages
const useAssistants = (page: number, pageSize: number = 20) => {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchAssistants = async () => {
      setLoading(true)
      const response = await api.get('/assistants', {
        params: { page, pageSize }
      })
      setAssistants(await response.json())
      setLoading(false)
    }
    fetchAssistants()
  }, [page, pageSize])

  return { assistants, loading }
}

// ❌ Bad: Load everything at once
const fetchAllAssistants = async () => {
  const response = await api.get('/assistants')  // Could be thousands
  return response.json()
}
```

### Infinite Scroll

```tsx
import { useRef, useCallback } from 'react'

const useInfiniteScroll = (callback: () => void) => {
  const observer = useRef<IntersectionObserver>()

  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (observer.current) observer.current.disconnect()

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        callback()
      }
    })

    if (node) observer.current.observe(node)
  }, [callback])

  return lastElementRef
}

// Usage
const InfiniteList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([])
  const [page, setPage] = useState(1)

  const loadMore = useCallback(() => {
    setPage(p => p + 1)
  }, [])

  const lastItemRef = useInfiniteScroll(loadMore)

  return (
    <div>
      {items.map((item, index) => {
        if (index === items.length - 1) {
          return <div ref={lastItemRef} key={item.id}>{item.name}</div>
        }
        return <div key={item.id}>{item.name}</div>
      })}
    </div>
  )
}
```

---

## Rendering Optimization

### Virtual Scrolling

For large lists (1000+ items), use virtual scrolling:

```tsx
import { FixedSizeList } from 'react-window'

// ✅ Good: Virtual list for large datasets
const VirtualList: React.FC<{ items: Item[] }> = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  )

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}

// ❌ Bad: Render 10,000 items at once
const RegularList: React.FC<{ items: Item[] }> = ({ items }) => (
  <div>
    {items.map(item => (
      <div key={item.id}>{item.name}</div>
    ))}  {/* All 10,000 rendered */}
  </div>
)
```

### Conditional Rendering

```tsx
// ✅ Good: Don't render hidden content
const Tabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      <TabButtons active={activeTab} onChange={setActiveTab} />

      {/* Only render active tab */}
      {activeTab === 0 && <Tab1Content />}
      {activeTab === 1 && <Tab2Content />}
      {activeTab === 2 && <Tab3Content />}
    </div>
  )
}

// ❌ Bad: Render all tabs, hide with CSS
const TabsBad: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      <TabButtons active={activeTab} onChange={setActiveTab} />

      {/* All tabs rendered, just hidden */}
      <div className={activeTab !== 0 ? 'hidden' : ''}>
        <Tab1Content />
      </div>
      <div className={activeTab !== 1 ? 'hidden' : ''}>
        <Tab2Content />
      </div>
      <div className={activeTab !== 2 ? 'hidden' : ''}>
        <Tab3Content />
      </div>
    </div>
  )
}
```

### Windowing

```tsx
// ✅ Good: Only render visible items
const WindowedList: React.FC<{ items: Item[] }> = ({ items }) => {
  const [scrollTop, setScrollTop] = useState(0)
  const itemHeight = 50
  const containerHeight = 600

  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight)

  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight }}>
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map(item => (
            <div key={item.id} style={{ height: itemHeight }}>
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Profiling and Monitoring

### React DevTools Profiler

```tsx
import { Profiler } from 'react'

const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) => {
  if (actualDuration > 16) {  // Slower than 60fps
    console.warn(`Slow render in ${id}: ${actualDuration}ms`)
  }
}

const App = () => (
  <Profiler id="App" onRender={onRenderCallback}>
    <MyComponent />
  </Profiler>
)
```

### Performance Monitoring

```tsx
// Track component render time
const useRenderTime = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      if (renderTime > 16) {
        console.warn(`${componentName} render took ${renderTime}ms`)
      }
    }
  })
}

// Usage
const MyComponent = () => {
  useRenderTime('MyComponent')
  // ...
}
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build -- --mode=production
npx vite-bundle-visualizer

# Check what's in the bundle
# Look for:
# - Large dependencies (> 100KB)
# - Duplicate dependencies
# - Unused code
```

---

## Performance Checklist

### Before Shipping

- [ ] Components under 300 lines (split if larger)
- [ ] Large lists use virtualization (1000+ items)
- [ ] Expensive calculations memoized with `useMemo`
- [ ] Callbacks memoized with `useCallback` when passed to memoized children
- [ ] Heavy components lazy loaded
- [ ] Routes code-split
- [ ] Images lazy loaded below fold
- [ ] Images have width/height to prevent layout shift
- [ ] SVGs optimized and imported as components
- [ ] API requests debounced/throttled where appropriate
- [ ] Long lists paginated or use infinite scroll
- [ ] No unnecessary re-renders (checked with React DevTools)
- [ ] Bundle size reasonable (< 500KB initial)
- [ ] No console warnings in production
- [ ] Profiled with React DevTools Profiler

### Red Flags

🚨 **Investigate immediately**:
- Component taking > 16ms to render
- Bundle size > 1MB
- > 100 items rendered at once (no virtualization)
- API called on every keystroke (no debounce)
- Entire store subscribed when only need one field
- Re-renders on every state change
- Heavy library loaded but rarely used

---

## Performance Budget

### Target Metrics

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| **Initial Bundle** | < 500KB | Code split, lazy load |
| **Component Render** | < 16ms | Profile, optimize, memoize |
| **API Response** | < 1s | Cache, optimize backend |
| **Time to Interactive** | < 3s | Code split, defer non-critical |
| **First Contentful Paint** | < 1.5s | Optimize critical path |

---

## Common Optimizations

### Quick Wins

1. **Add `React.memo` to list items**
   ```tsx
   const ListItem = React.memo(({ item }) => <div>{item.name}</div>)
   ```

2. **Use functional setState updates**
   ```tsx
   setCount(c => c + 1)  // No dependency on count
   ```

3. **Lazy load heavy components**
   ```tsx
   const Chart = lazy(() => import('./Chart'))
   ```

4. **Debounce search inputs**
   ```tsx
   const debouncedSearch = useMemo(() => debounce(search, 300), [])
   ```

5. **Use `key` prop correctly in lists**
   ```tsx
   {items.map(item => <Card key={item.id} {...item} />)}
   ```

---

## Resources

- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Web Vitals](https://web.dev/vitals/)
- [react-window for virtualization](https://github.com/bvaughn/react-window)

---

**Last Updated**: 2025-12-04
**Related Guides**:
- [Component Patterns](../components/component-patterns.md)
- [State Management](../patterns/state-management.md)
- [Refactoring Patterns](./refactoring-patterns.md)
