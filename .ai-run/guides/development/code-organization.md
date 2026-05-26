# Code Organization

> Single quotes. No semicolons. `??` not `||`. Components under 300 lines. Constants over magic strings.

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UserProfile.tsx`, `Button.tsx` |
| Utilities | camelCase | `utils.ts`, `apiHelpers.ts` |
| Helper files | camelCase + suffix | `formHelpers.ts`, `submitHelpers.ts` |
| Types | camelCase | `assistant.ts`, `formTypes.ts` |
| Schemas | camelCase + `Schema` suffix | `formSchema.ts`, `validationSchema.ts` |
| Constants | camelCase | `assistants.ts`, `routes.ts` |
| Custom hooks | camelCase with `use` prefix | `useMarketplaceModal.ts`, `useMCPForm.ts` |
| Tests | `*.test.tsx` / `*.test.ts` | `Button.test.tsx` |

### Component folder structure

```
MyComplexComponent/
├── index.tsx               Main component (<300 lines)
├── useMyComponent.ts       Custom hook (extract complex logic)
├── componentHelpers.ts     Pure helper functions
├── componentTypes.ts       Local type definitions
├── formSchema.ts           Yup validation schema (if form)
├── SubComponent1.tsx       Focused sub-component
└── __tests__/
    └── MyComplexComponent.test.tsx
```

---

## Import Order

Always three groups, in this order:

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

| DO | DON'T |
|----|-------|
| External → `@/` → relative | Mixing `@/` and relative in any order |
| Blank line between groups | No separation between groups |

---

## Component Size Limits

| File type | Hard limit |
|-----------|-----------|
| Components | **300 lines** (must extract if approaching) |
| Stores | 500 lines |
| Custom hooks | 200 lines |
| Utilities | 200 lines |
| Helper files | 150 lines |

When approaching limits, extract in this priority:
1. Repeated JSX → sub-components (can live in same folder)
2. Validation → `[name]Schema.ts`
3. Types → `[name]Types.ts`
4. Pure helpers → `[name]Helpers.ts`
5. Complex stateful logic → `use[Name].ts`

---

## Constants — No Magic Strings or Numbers

**All repeated or meaningful string/number values belong in `src/constants/`.**

### Constants location

```
src/constants/
├── index.ts          Re-exports
├── assistants.ts
├── workflows.ts
├── dataSources.ts
├── chats.ts
├── theme.ts
├── routes.ts
└── …
```

### Defining constants

```typescript
// src/constants/myFeature.ts
export enum MyFeatureStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const MY_FEATURE_DEFAULTS = {
  PAGE_SIZE: 12,
  DEBOUNCE_DELAY: 300,
  DEFAULT_SORT: 'name',
}
```

### Using constants

```typescript
import { ButtonSize, ButtonType } from '@/constants'

// ✅ correct
<Button size={ButtonSize.SMALL} variant={ButtonType.PRIMARY}>Submit</Button>

// ❌ wrong
<Button size='small' variant='primary'>Submit</Button>
```

---

## Nullish Coalescing — `??` not `||`

**Default rule: use `??` for all default value assignments.**

| Operator | Treats as "missing" | When to use |
|----------|--------------------|----|
| `??` | `null`, `undefined` only | Default — for most cases |
| `\|\|` | `null`, `undefined`, `0`, `''`, `false` | Only when falsy values should also trigger the default |

```typescript
// ✅ correct — empty string is preserved
const description = config.description ?? 'No description'
const count = data.count ?? 0
const enabled = settings.enabled ?? false

// ❌ wrong — empty string '' becomes 'No description'
const description = config.description || 'No description'
```

Use `||` only intentionally:
```typescript
const name = input.trim() || 'Anonymous'   // empty string → default: intentional
```

---

## Date Formatting

**Always use `formatDateTime` from `@/utils/helpers`. Never use native date methods directly.**

```typescript
import { formatDateTime } from '@/utils/helpers'
```

| Style | Output example | Use for |
|-------|---------------|---------|
| (default) | `5/10/2026, 2:12:34 PM` | Tables, detail views |
| `'short'` | `Apr 15, 2:12 PM` | Chat timestamps, dropdowns |
| `'day'` | `April 15, 2026` | Date-only headers |
| `'file'` | `2026-04-15_09:30:00` | Filenames, exports |
| `'relative'` | `2 hours ago` | Recent activity |

```typescript
// ✅ correct
formatDateTime(item.created_at)
formatDateTime(message.createdAt, 'short')
formatDateTime(version.updatedAt, 'day')

// ❌ wrong
new Date(value).toLocaleString()
new Date(value).toLocaleDateString('en-US', { … })
```

`formatDateTime` returns `'-'` for falsy input. No null check needed:
```typescript
// ✅ correct
<td>{formatDateTime(item.updated_at)}</td>

// ❌ redundant
<td>{item.updated_at ? formatDateTime(item.updated_at) : '-'}</td>
```

---

## Code Style

| Rule | Setting |
|------|---------|
| Quotes | **Single quotes** (ESLint enforced — `"string"` will lint-fail) |
| Semicolons | **None** (ESLint enforced) |
| Indentation | 2 spaces |
| Line endings | LF (Unix) |

### Iteration patterns

```typescript
// ✅ use for…of
for (const item of items) { processItem(item) }
for (const [index, item] of items.entries()) { … }

// ❌ avoid
items.forEach(item => processItem(item))
for (let i = 0; i < items.length; i++) { … }
```

### Early returns (reduce nesting)

```typescript
// ✅ early return
const process = (item: Item) => {
  if (!item) return null
  if (!item.isValid) return null
  return doWork(item)
}

// ❌ deep nesting
const process = (item: Item) => {
  if (item) { if (item.isValid) { return doWork(item) } }
}
```

### Conditional rendering

```typescript
// ✅ extract to named variable
const isComplete = status === 'completed' && hasAllData && !hasErrors
return <div>{isComplete && <Success />}</div>

// ❌ complex inline
return <div>{status === 'completed' && hasAllData && !hasErrors && <Success />}</div>
```

---

## Complexity Targets

| Metric | Limit |
|--------|-------|
| Function length | < 50 lines |
| Cognitive complexity | < 15 per function |
| Cyclomatic complexity | < 10 per function |

Extract sub-render helpers to reduce complexity:
```typescript
// ✅ named render helpers
const renderHeader = () => <Header title={title} />
const renderBody = () => <Body items={items} />
return <div>{renderHeader()}{renderBody()}</div>
```

---

## Pre-Delivery Checklist

- [ ] Component under 300 lines
- [ ] Imports: external → `@/` → relative, blank line between groups
- [ ] No magic strings or numbers — use constants
- [ ] `??` for default values (not `||` unless falsy behavior is intentional)
- [ ] `for…of` for iteration (not `.forEach`)
- [ ] Early returns reduce nesting
- [ ] Complex logic extracted to functions or custom hooks
- [ ] Single quotes throughout (no double quotes)
- [ ] No semicolons
- [ ] `formatDateTime` for all date display (not native Date methods)

---

## Related

- `src/constants/` — all project constants
- `src/utils/helpers.ts` — `formatDateTime` and other utilities
- `src/hooks/` — custom hook examples
- `refactoring-patterns.md` — how to split large components
- `custom-hooks.md` — hook extraction patterns
