# Constants Usage

> Extracting and organizing magic values in CodeMie UI

---

## When to Extract

| Extract when... | Skip when... |
|-----------------|--------------|
| Value used in 2+ places | Used exactly once |
| Value has business meaning | Obviously `0`, `1`, `true`, `false` |
| Value might change | Component-specific one-off UI value |
| Value represents configuration | Would be over-abstraction |

---

## Constant Types

### Enums — related string/number values

Use TypeScript `enum` for a closed set of related values that map to strings:

```typescript
// src/constants/assistantTypes.ts
export enum AssistantTab {
  ALL = 'all',
  PROJECT = 'project',
  MARKETPLACE = 'marketplace',
}
```

Use enum members as values directly — no raw strings in JSX or logic.

### Const objects — configuration groups

Use `as const` to lock down the type to literal values:

```typescript
// src/constants/pagination.ts
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const
```

`as const` narrows the type from `number` to the exact literal value (e.g. `20`), enabling exhaustive checks.

### Function-based endpoints

Endpoint constants that accept parameters use functions to avoid string interpolation at call sites:

```typescript
// src/constants/endpoints.ts
export const API_ENDPOINTS = {
  ASSISTANTS: 'assistants',
  ASSISTANT_BY_ID: (id: string) => `assistants/${id}`,
  WORKFLOW_EXECUTE: (id: string) => `workflows/${id}/execute`,
} as const
```

Usage: `api.get(API_ENDPOINTS.ASSISTANT_BY_ID(id))` — never construct endpoint strings inline.

### Status label/color maps

Pair an enum with display maps to avoid `if/else` chains:

```typescript
// src/constants/workflowStatus.ts
export enum WorkflowStatus { DRAFT = 'draft', PUBLISHED = 'published' }

export const WORKFLOW_STATUS_LABELS = {
  [WorkflowStatus.DRAFT]: 'Draft',
  [WorkflowStatus.PUBLISHED]: 'Published',
} as const

export const WORKFLOW_STATUS_COLORS = {
  [WorkflowStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [WorkflowStatus.PUBLISHED]: 'bg-green-100 text-green-800',
} as const
```

Usage: `<span className={WORKFLOW_STATUS_COLORS[status]}>{WORKFLOW_STATUS_LABELS[status]}</span>`

---

## File Organization

```
src/constants/
├── index.ts             # barrel re-export
├── assistantTypes.ts    # AssistantTab, AssistantType enums
├── workflowStatus.ts    # WorkflowStatus enum + label/color maps
├── routes.ts            # ROUTES object
├── endpoints.ts         # API_ENDPOINTS object
├── pagination.ts        # PAGINATION config
├── validationRules.ts   # VALIDATION_RULES limits
├── timeouts.ts          # TIMEOUTS (debounce, toast, polling)
├── sizes.ts             # SIZES (file size, sidebar width)
└── featureFlags.ts      # FEATURE_FLAGS
```

**Barrel export** (`src/constants/index.ts`):
```typescript
export * from './assistantTypes'
export * from './workflowStatus'
export * from './routes'
export * from './endpoints'
export * from './pagination'
```

Import from the barrel: `import { AssistantTab, ROUTES, PAGINATION } from '@/constants'`

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Enum | PascalCase | `AssistantTab` |
| Enum member | UPPER_SNAKE_CASE | `AssistantTab.ALL` |
| Const object | UPPER_SNAKE_CASE | `PAGINATION` |
| Helper function in constants | camelCase | `isLocalAssistant` |

**Descriptive names — no abbreviations:**

| Bad | Good |
|-----|------|
| `MAX_LEN` | `MAX_ASSISTANT_NAME_LENGTH` |
| `TIMEOUT` | `TIMEOUTS.API_REQUEST` |
| `RETRIES` | `API_RETRY_ATTEMPTS` |

---

## Common Constant Groups

### Validation rules — used in Yup schemas

```typescript
// src/constants/validationRules.ts
export const VALIDATION_RULES = {
  ASSISTANT_NAME: { MIN_LENGTH: 3, MAX_LENGTH: 100 },
  SYSTEM_PROMPT: { MIN_LENGTH: 10, MAX_LENGTH: 50000 },
} as const
```

Schema usage: `yup.string().min(VALIDATION_RULES.ASSISTANT_NAME.MIN_LENGTH)`

### Timeouts — debounce, toast, polling

```typescript
// src/constants/timeouts.ts
export const TIMEOUTS = {
  DEBOUNCE_INPUT: 300,
  TOAST_DURATION: 3000,
  API_REQUEST: 30000,
  POLLING_INTERVAL: 5000,
} as const
```

### Feature flags

```typescript
// src/constants/featureFlags.ts
export const FEATURE_FLAGS = {
  ENABLE_MCP_SERVERS: true,
  ENABLE_AI_REFINE: false,
} as const
```

Guard features with `if (FEATURE_FLAGS.ENABLE_MCP_SERVERS) { ... }` — never hardcode `true`/`false` inline.

---

## Type Safety Rules

| Pattern | Why |
|---------|-----|
| `as const` on all object constants | Preserves literal types, prevents widening |
| `enum` for closed string sets | Exhaustive switch, no invalid values |
| Type guard functions alongside enums | Narrows type at call site |

Type guard example:
```typescript
export const isLocalAssistant = (type: string): type is AssistantType.LOCAL =>
  type === AssistantType.LOCAL
```

Derive union types from const objects:
```typescript
type StatusColor = typeof STATUS_COLORS[keyof typeof STATUS_COLORS]
// resolves to 'green' | 'gray', not string
```

---

## Integration with Other Layers

### Forms (Yup schemas)

`src/pages/assistants/AssistantForm.tsx` — import `VALIDATION_RULES` and `AssistantType` from `@/constants` to build the Yup schema. Never hardcode length limits in the schema file.

### Routing

`src/pages/assistants/utils/getAssistantLink.tsx` — import `ROUTES` for all path strings. Never write raw path strings in `navigate()` calls.

### API calls (stores)

`src/store/assistants.ts` — import `API_ENDPOINTS` and `TIMEOUTS`. Use `TIMEOUTS.API_REQUEST` for abort controller timeouts.

---

## DO / DON'T

| DON'T | DO |
|-------|----|
| `if (name.length < 3)` | `if (name.length < VALIDATION_RULES.ASSISTANT_NAME.MIN_LENGTH)` |
| `navigate('/assistants')` | `navigate(ROUTES.ASSISTANTS)` |
| `api.get('assistants')` | `api.get(API_ENDPOINTS.ASSISTANTS)` |
| `debounce(fn, 300)` | `debounce(fn, TIMEOUTS.DEBOUNCE_INPUT)` |
| `status === 'published'` | `status === WorkflowStatus.PUBLISHED` |
| Scatter magic numbers in components | Extract to `src/constants/` file |
| Export constants from component files | Put in `src/constants/` and barrel-export |

---

## JSDoc for Non-Obvious Constants

Add a JSDoc comment when the value's rationale is not self-evident:

```typescript
/**
 * Polling interval for workflow execution status.
 * Balances responsiveness with server load — do not lower below 1000.
 */
export const WORKFLOW_POLL_INTERVAL = 2000
```

---

## Common Pitfalls

| Problem | Fix |
|---------|-----|
| Constant object widens to `string` | Add `as const` |
| Same value defined in two files | Create single source in `src/constants/` |
| Magic number with no context | Name it descriptively, add JSDoc if needed |
| Over-abstraction of obvious values | Only extract if value has real business meaning |
| Importing from deep path | Always import from `@/constants` barrel |
