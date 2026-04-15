# Code Organization

> **Code organization and best practices for CodeMie UI**

## Table of Contents
1. [File Naming Conventions](#file-naming-conventions)
2. [Import Order](#import-order)
3. [Component Size Guidelines](#component-size-guidelines)
4. [Constants Usage](#constants-usage)
5. [Nullish Coalescing](#nullish-coalescing)
6. [Date Formatting](#date-formatting)
7. [Code Style](#code-style)

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
- **File Name**: camelCase with suffix (e.g., `formHelpers.ts`, `submitHelpers.ts`, `validators.ts`)

### Types
- **File Name**: camelCase (e.g., `assistant.ts`, `user.ts`, `formTypes.ts`)

### Schemas
- **File Name**: camelCase with Schema suffix (e.g., `formSchema.ts`, `validationSchema.ts`)

### Constants
- **File Name**: camelCase (e.g., `index.ts`, `assistant.ts`)

### Custom Hooks
- **File Name**: camelCase with `use` prefix (e.g., `useMarketplaceModal.ts`, `useMCPForm.ts`)

### Tests
- **File Name**: `*.test.tsx` or `*.test.ts`

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

### Good vs Bad Examples

```typescript
// ✅ GOOD: Proper order
import React from 'react'
import { ActorTypes } from '@/types/workflowEditor/base'

import { CommonNodeFieldValues } from '../CommonStateFields'

// ❌ BAD: Mixed order
import React from 'react'
import { CommonNodeFieldValues } from '../CommonStateFields'
import { ActorTypes } from '@/types/workflowEditor/base'
```

---

## Component Size Guidelines

### MANDATORY LIMITS

- **Components**: **< 300 lines** (strict limit - must extract sub-components/hooks if approaching)
- **Stores**: < 500 lines
- **Utilities**: < 200 lines
- **Custom Hooks**: < 200 lines
- **Helper files**: < 150 lines

### When Approaching Limits

Extract:
1. Repeated JSX into sub-components (even in same file)
2. Validation schemas to `[component]Schema.ts`
3. Types to `[component]Types.ts`
4. Helpers to `[component]Helpers.ts`
5. Complex logic to custom hooks `use[Component].ts`
6. Split large components into smaller, focused components

### Component File Structure

```
MyComplexComponent/
├── index.tsx                  # Main component (<300 lines)
├── useMyComponent.ts         # Custom hook (if needed)
├── componentHelpers.ts       # Helper functions
├── componentTypes.ts         # Type definitions
├── formSchema.ts             # Validation schemas (if form)
├── SubComponent1.tsx         # Sub-component (if needed)
├── SubComponent2.tsx         # Sub-component (if needed)
└── __tests__/
    └── MyComplexComponent.test.tsx
```

---

## Constants Usage

### NEVER Use Magic Strings or Numbers

**Always extract to constants**

### ❌ WRONG: Magic Strings

```tsx
// ❌ BAD: Magic strings everywhere
<Button size="small">Click me</Button>
<Button variant="primary">Submit</Button>
```

### ✅ CORRECT: Use Constants

```tsx
// ✅ GOOD: Use constants
import { ButtonSize, ButtonType } from '@/constants'

<Button size={ButtonSize.SMALL}>Click me</Button>
<Button variant={ButtonType.PRIMARY}>Submit</Button>
```

### Constants Location

```
src/constants/
├── index.ts           # Main exports
├── assistants.ts      # Assistant-related
├── workflows.ts       # Workflow constants
├── dataSources.ts     # Data source constants
├── chats.ts           # Chat constants
├── theme.ts           # Theme constants
├── routes.ts          # Route constants
└── ...
```

### Creating Constants

```typescript
// src/constants/myFeature.ts

export enum MyFeatureStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export const MY_FEATURE_DEFAULTS = {
  PAGE_SIZE: 12,
  DEFAULT_SORT: 'name',
  DEBOUNCE_DELAY: 300
}

export const MY_FEATURE_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  ERROR: 'Operation failed',
  LOADING: 'Loading...'
}
```

### Using Constants

```typescript
import { MyFeatureStatus, MY_FEATURE_DEFAULTS } from '@/constants/myFeature'

const MyComponent = () => {
  const [status, setStatus] = useState(MyFeatureStatus.PENDING)
  const [pageSize] = useState(MY_FEATURE_DEFAULTS.PAGE_SIZE)

  return (
    <div>
      {status === MyFeatureStatus.IN_PROGRESS && <Spinner />}
      {status === MyFeatureStatus.COMPLETED && <Success />}
    </div>
  )
}
```

---

## Nullish Coalescing

### Use `??` Instead of `||`

**CRITICAL RULE**: Use nullish coalescing (`??`) instead of logical OR (`||`) for default values

### Why?

- `||` treats `0`, `""`, `false` as falsy - use only when that's desired
- `??` only treats `null` and `undefined` as nullish - preferred for most cases

### Examples

```typescript
// ✅ CORRECT: Only replaces null/undefined
const description = config.description ?? 'No description available'
const count = data.count ?? 0
const enabled = settings.enabled ?? false

// ❌ WRONG: Also replaces empty string, 0, false
const description = config.description || 'No description available'
// If description = "", this returns 'No description available' ❌

const count = data.count || 0
// If count = 0, this returns 0 (works but ?? is clearer)

const enabled = settings.enabled || false
// If enabled = false, this returns false (works but ?? is clearer)
```

### When to Use `||`

Only use `||` when you want to treat falsy values as "missing":

```typescript
// Use || when empty string should be replaced
const name = input.trim() || 'Anonymous'

// Use || when 0 should be replaced
const positiveNumber = value || 1
```

### Rule of Thumb

- **Default**: Use `??` (nullish coalescing)
- **Special case**: Use `||` only if you explicitly want falsy behavior

---

## Date Formatting

### Always use `formatDateTime` from `@/utils/helpers`

**CRITICAL RULE**: Never use `new Date().toLocaleString()`, `toLocaleDateString()`, or `formatDate()` directly. Always use `formatDateTime`.

```typescript
import { formatDateTime } from '@/utils/helpers'
```

### Styles

| Style | Example output | Use for |
|-------|---------------|---------|
| `'default'` (omit style) | `5/10/2026, 2:12:34 PM` | General date+time display (tables, details) |
| `'short'` | `Apr 15, 2:12 PM` | Compact inline timestamps (chat, dropdowns) |
| `'day'` | `April 15, 2026` | Date-only display (version headers, release notes) |
| `'file'` | `2026-04-15_09:30:00` | Filenames and machine-readable strings |
| `'relative'` | `2 hours ago` | Recent activity (execution history) |

### Examples

```typescript
// ✅ CORRECT
formatDateTime(item.created_at)                   // '5/10/2026, 2:12:34 PM'
formatDateTime(message.createdAt, 'short')        // 'Apr 15, 2:12 PM'
formatDateTime(version.updatedAt, 'day')          // 'April 15, 2026'
formatDateTime(execution.date, 'file')            // '2026-04-15_09:30:00'
formatDateTime(execution.date, 'relative')        // '2 hours ago'

// ❌ WRONG: Never use these directly
new Date(value).toLocaleString()
new Date(value).toLocaleDateString('en-US', { ... })
formatDate(value)
formatDate(value, SHORT_DATE_FORMAT)
parseDate(value).toRelative()
```

### Null handling

`formatDateTime` returns `'-'` for falsy input — no extra null checks needed.

```typescript
// ✅ CORRECT: formatDateTime handles null/undefined
<div>{formatDateTime(item.updated_at)}</div>

// ❌ WRONG: Redundant null check
<div>{item.updated_at ? formatDateTime(item.updated_at) : '-'}</div>
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
// ✅ GOOD: Use for...of
for (const item of items) {
  processItem(item)
}

// Use .entries() when index is needed
for (const [index, item] of items.entries()) {
  console.log(index, item)
}

// ❌ AVOID: .forEach() and i++
items.forEach(item => processItem(item))
for (let i = 0; i < items.length; i++) { }
```

### Early Returns

```typescript
// ✅ GOOD: Early return reduces nesting
const processItem = (item: Item) => {
  if (!item) return null
  if (!item.isValid) return null
  if (item.processed) return item

  // Main logic here
  return processedItem
}

// ❌ BAD: Deep nesting
const processItem = (item: Item) => {
  if (item) {
    if (item.isValid) {
      if (!item.processed) {
        // Main logic here
      }
    }
  }
}
```

### Conditional Rendering

```typescript
// ✅ GOOD: Extract to variable
const isComplete = status === 'completed' && hasAllData && !hasErrors

return (
  <div>
    {isComplete && <Success />}
  </div>
)

// ❌ BAD: Complex inline condition
return (
  <div>
    {status === 'completed' && hasAllData && !hasErrors && <Success />}
  </div>
)
```

---

## Code Quality Metrics

Follow these metrics:

- **Cognitive Complexity**: < 15 per function
- **Function Length**: < 50 lines per function
- **Cyclomatic Complexity**: < 10 per function

### Reducing Complexity

```typescript
// ✅ GOOD: Extract to helper functions
const MyComponent = () => {
  const renderHeader = () => <Header />
  const renderBody = () => <Body />
  const renderFooter = () => <Footer />

  return (
    <div>
      {renderHeader()}
      {renderBody()}
      {renderFooter()}
    </div>
  )
}

// ❌ BAD: All inline (high complexity)
const MyComponent = () => {
  return (
    <div>
      {/* 50+ lines of inline JSX */}
    </div>
  )
}
```

---

## Final Checklist

Before delivering code:

- [ ] Component is under 300 lines
- [ ] Imports in correct order (external → @ → relative)
- [ ] No magic strings or numbers (use constants)
- [ ] Using `??` for default values (not `||`)
- [ ] Using `for...of` for iteration (not `.forEach()`)
- [ ] Early returns reduce nesting
- [ ] Complex logic extracted to functions/hooks
- [ ] No semicolons (ESLint enforced)
- [ ] Single quotes (ESLint enforced)
- [ ] Proper indentation (2 spaces)

---

## Related Guides
- [Component Patterns](../components/component-patterns.md) - Component structure
- [Custom Hooks](../patterns/custom-hooks.md) - Extracting logic
- [Refactoring Patterns](./refactoring-patterns.md) - Splitting large components
- [Constants Usage](./constants-usage.md) - Constants management
