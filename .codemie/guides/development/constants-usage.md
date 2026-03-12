# Constants Usage Guide

> **Extracting and organizing magic values in CodeMie UI**

## Table of Contents
1. [Overview](#overview)
2. [When to Extract Constants](#when-to-extract-constants)
3. [Constant Types](#constant-types)
4. [File Organization](#file-organization)
5. [Naming Conventions](#naming-conventions)
6. [Common Patterns](#common-patterns)

---

## Overview

### Why Extract Constants

- **Maintainability**: Change value in one place
- **Type Safety**: TypeScript enums and const assertions
- **Discoverability**: Easy to find and reuse
- **Consistency**: Same values used everywhere
- **Documentation**: Self-documenting code

---

## When to Extract Constants

### Extract When

✅ Value used in 2+ places
✅ Value has business meaning
✅ Value might change
✅ Value is not obvious
✅ Value represents a configuration

### Don't Extract When

❌ Value used only once
❌ Value is obvious (0, 1, true, false)
❌ Value is component-specific UI
❌ Over-abstraction

---

## Constant Types

### Enums for Related Values

```typescript
// src/constants/assistantTypes.ts
export enum AssistantTab {
  ALL = 'all',
  PROJECT = 'project',
  MARKETPLACE = 'marketplace',
  TEMPLATES = 'templates',
}

// Usage
<TabPanel value={AssistantTab.ALL}>...</TabPanel>
```

### Const Objects for Configuration

```typescript
// src/constants/pagination.ts
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const

// Usage
const [pageSize, setPageSize] = useState(PAGINATION.DEFAULT_PAGE_SIZE)
```

### String Constants

```typescript
// src/constants/routes.ts
export const ROUTES = {
  ASSISTANTS: '/assistants',
  ASSISTANT_DETAILS: '/assistants/:id',
  NEW_ASSISTANT: '/assistants/new',
  WORKFLOWS: '/workflows',
  WORKFLOW_EDIT: '/workflows/:id/edit',
} as const

// Usage
navigate(ROUTES.ASSISTANTS)
```

### API Endpoints

```typescript
// src/constants/endpoints.ts
export const API_ENDPOINTS = {
  ASSISTANTS: 'assistants',
  ASSISTANT_BY_ID: (id: string) => `assistants/${id}`,
  WORKFLOWS: 'workflows',
  WORKFLOW_BY_ID: (id: string) => `workflows/${id}`,
  WORKFLOW_EXECUTE: (id: string) => `workflows/${id}/execute`,
} as const

// Usage
await api.get(API_ENDPOINTS.ASSISTANTS)
await api.get(API_ENDPOINTS.ASSISTANT_BY_ID(assistantId))
```

### Status Values

```typescript
// src/constants/workflowStatus.ts
export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export const WORKFLOW_STATUS_LABELS = {
  [WorkflowStatus.DRAFT]: 'Draft',
  [WorkflowStatus.PUBLISHED]: 'Published',
  [WorkflowStatus.ARCHIVED]: 'Archived',
} as const

export const WORKFLOW_STATUS_COLORS = {
  [WorkflowStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [WorkflowStatus.PUBLISHED]: 'bg-green-100 text-green-800',
  [WorkflowStatus.ARCHIVED]: 'bg-red-100 text-red-800',
} as const

// Usage
<span className={cn('badge', WORKFLOW_STATUS_COLORS[status])}>
  {WORKFLOW_STATUS_LABELS[status]}
</span>
```

---

## File Organization

### Constants Directory Structure

```
src/constants/
├── index.ts                  # Re-export all constants
├── assistantTypes.ts         # Assistant-related constants
├── workflowStatus.ts         # Workflow statuses
├── routes.ts                 # Route paths
├── endpoints.ts              # API endpoints
├── pagination.ts             # Pagination config
├── permissions.ts            # Permission constants
└── validationRules.ts        # Validation limits
```

### Barrel Export

```typescript
// src/constants/index.ts
export * from './assistantTypes'
export * from './workflowStatus'
export * from './routes'
export * from './endpoints'
export * from './pagination'

// Usage - single import
import { AssistantTab, ROUTES, PAGINATION } from '@/constants'
```

---

## Naming Conventions

### Naming Rules

| Type | Convention | Example |
|------|-----------|---------|
| Enum | PascalCase | `AssistantTab` |
| Enum Member | UPPER_SNAKE_CASE | `AssistantTab.ALL` |
| Const Object | UPPER_SNAKE_CASE | `PAGINATION` |
| Const Function | camelCase | `getEndpoint` |

### Examples

```typescript
// ✅ DO - Clear, descriptive names
export const MAX_ASSISTANT_NAME_LENGTH = 100
export const DEFAULT_WORKFLOW_TIMEOUT = 3000
export const API_RETRY_ATTEMPTS = 3

// ❌ DON'T - Unclear abbreviations
export const MAX_LEN = 100
export const TIMEOUT = 3000
export const RETRIES = 3
```

---

## Common Patterns

### Feature Flags

```typescript
// src/constants/featureFlags.ts
export const FEATURE_FLAGS = {
  ENABLE_MCP_SERVERS: true,
  ENABLE_WORKFLOW_TEMPLATES: true,
  ENABLE_ASSISTANT_MARKETPLACE: true,
  ENABLE_AI_REFINE: false,
} as const

// Usage
import { FEATURE_FLAGS } from '@/constants'

if (FEATURE_FLAGS.ENABLE_MCP_SERVERS) {
  // Show MCP servers feature
}
```

### Validation Rules

```typescript
// src/constants/validationRules.ts
export const VALIDATION_RULES = {
  ASSISTANT_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  SYSTEM_PROMPT: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 50000,
  },
  WORKFLOW_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
} as const

// Usage in Yup schema
yup.string()
  .min(VALIDATION_RULES.ASSISTANT_NAME.MIN_LENGTH)
  .max(VALIDATION_RULES.ASSISTANT_NAME.MAX_LENGTH)
```

### Time Constants

```typescript
// src/constants/timeouts.ts
export const TIMEOUTS = {
  DEBOUNCE_INPUT: 300,
  TOAST_DURATION: 3000,
  API_REQUEST: 30000,
  POLLING_INTERVAL: 5000,
} as const

// Usage
const debouncedSearch = debounce(
  handleSearch,
  TIMEOUTS.DEBOUNCE_INPUT
)
```

### Size Constants

```typescript
// src/constants/sizes.ts
export const SIZES = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_UPLOAD_FILES: 5,
  PREVIEW_IMAGE_MAX_WIDTH: 800,
  SIDEBAR_WIDTH: 280,
} as const
```

### Type Guards with Constants

```typescript
// src/constants/assistantTypes.ts
export enum AssistantType {
  LOCAL = 'local',
  REMOTE = 'remote',
  TEMPLATE = 'template',
}

export const isLocalAssistant = (type: string): type is AssistantType.LOCAL => {
  return type === AssistantType.LOCAL
}

export const isRemoteAssistant = (type: string): type is AssistantType.REMOTE => {
  return type === AssistantType.REMOTE
}

// Usage
if (isLocalAssistant(assistant.type)) {
  // TypeScript knows this is a local assistant
}
```

---

## Integration Examples

### With Forms

```typescript
// src/pages/assistants/AssistantForm.tsx
import { VALIDATION_RULES, AssistantType } from '@/constants'

const schema = yup.object({
  name: yup.string()
    .required()
    .min(VALIDATION_RULES.ASSISTANT_NAME.MIN_LENGTH)
    .max(VALIDATION_RULES.ASSISTANT_NAME.MAX_LENGTH),
  type: yup.string()
    .oneOf(Object.values(AssistantType))
    .required(),
})
```

### With Routing

```typescript
// src/pages/assistants/utils/getAssistantLink.tsx
import { ROUTES } from '@/constants'

export const getAssistantLink = (id: string) => {
  return ROUTES.ASSISTANT_DETAILS.replace(':id', id)
}
```

### With API Calls

```typescript
// src/store/assistants.ts
import { API_ENDPOINTS, TIMEOUTS } from '@/constants'

export const assistantsStore = proxy({
  async fetchAssistants() {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      TIMEOUTS.API_REQUEST
    )

    try {
      const response = await api.get(API_ENDPOINTS.ASSISTANTS, {
        signal: controller.signal,
      })
      return await response.json()
    } finally {
      clearTimeout(timeout)
    }
  }
})
```

---

## Best Practices

### Type Safety

```typescript
// ✅ DO - Use const assertions for literal types
export const STATUS_COLORS = {
  active: 'green',
  inactive: 'gray',
} as const

type StatusColor = typeof STATUS_COLORS[keyof typeof STATUS_COLORS]
// StatusColor = 'green' | 'gray'

// ❌ DON'T - Lose type information
export const STATUS_COLORS = {
  active: 'green',
  inactive: 'gray',
}
// Status colors are just 'string'
```

### Documentation

```typescript
// ✅ DO - Add JSDoc comments for complex constants
/**
 * Maximum number of concurrent workflow executions.
 * Backend limit is 10, but we throttle at 5 for better UX.
 */
export const MAX_CONCURRENT_WORKFLOWS = 5

/**
 * Polling interval for checking workflow execution status.
 * Balances responsiveness with server load.
 */
export const WORKFLOW_POLL_INTERVAL = 2000
```

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Hardcoded values in components | Extract to constants file |
| Duplicated values across files | Create single source of truth |
| Magic numbers without context | Use descriptive constant names |
| Constants not typed | Use enums or const assertions |
| Constants scattered everywhere | Organize in constants/ directory |
| Over-abstraction | Only extract when value has meaning |

---

## Migration Strategy

### Before

```typescript
// ❌ Magic values scattered
function AssistantForm() {
  const [name, setName] = useState('')

  const handleSubmit = () => {
    if (name.length < 3) {
      toaster.error('Name too short')
    }
    if (name.length > 100) {
      toaster.error('Name too long')
    }
  }
}
```

### After

```typescript
// ✅ Constants extracted
import { VALIDATION_RULES } from '@/constants'

function AssistantForm() {
  const [name, setName] = useState('')

  const handleSubmit = () => {
    if (name.length < VALIDATION_RULES.ASSISTANT_NAME.MIN_LENGTH) {
      toaster.error('Name too short')
    }
    if (name.length > VALIDATION_RULES.ASSISTANT_NAME.MAX_LENGTH) {
      toaster.error('Name too long')
    }
  }
}
```

---

**Related Guides**:
- [Code Organization](./code-organization.md) - File structure
- [Form Patterns](../patterns/form-patterns.md) - Validation with constants
- [API Integration](./api-integration.md) - Endpoint constants

**Last Updated**: 2026-02-03
