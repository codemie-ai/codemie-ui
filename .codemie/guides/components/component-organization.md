# Component Organization

> **File structure and organization patterns for React components in CodeMie UI**

## Table of Contents
1. [Directory Structure](#directory-structure)
2. [File Naming Conventions](#file-naming-conventions)
3. [Component File Structure](#component-file-structure)
4. [Import Order](#import-order)
5. [Component Placement](#component-placement)

---

## Directory Structure

### Global Components (`src/components/`)

Reusable components used across multiple pages:

```
src/components/
├── Button/
│   ├── Button.tsx          # Main component
│   ├── index.ts            # Export
│   └── __tests__/          # Tests
│       └── Button.test.tsx
├── Card/
│   ├── Card.tsx
│   └── index.ts
├── Popup/
│   ├── Popup.tsx
│   └── index.ts
└── form/
    ├── Input/
    ├── Select/
    └── Checkbox/
```

### Page Components (`src/pages/`)

Page-specific components that are only used within a single feature:

```
src/pages/
├── assistants/
│   ├── components/
│   │   ├── AssistantList/
│   │   │   ├── AssistantCard/
│   │   │   │   ├── AssistantCard.tsx
│   │   │   │   ├── AssistantAvatar.tsx
│   │   │   │   └── StatusLabel.tsx
│   │   │   └── AssistantList.tsx
│   │   └── AssistantForm/
│   ├── AssistantsPage.tsx
│   └── AssistantDetailPage.tsx
```

---

## File Naming Conventions

### Component Files
- **PascalCase**: `MyComponent.tsx`
- **Match directory name**: `Button/Button.tsx`

### Non-Component Files
- **camelCase**: `utils.ts`, `helpers.ts`, `constants.ts`
- **kebab-case**: `api-client.ts`, `auth-service.ts`

### Test Files
- **Same name + .test**: `Button.test.tsx`
- **Location**: `__tests__/` directory or next to component

### Index Files
- **Always lowercase**: `index.ts`
- **Purpose**: Re-export main component

```ts
// src/components/Button/index.ts
export { default } from './Button'
export type { ButtonProps } from './Button'
```

---

## Component File Structure

### Standard Component Structure

```tsx
// 1. React imports
import React, { useState, useEffect } from 'react'

// 2. Third-party imports (sorted alphabetically)
import { classNames } from 'primereact/utils'

// 3. Store imports
import { useSnapshot } from 'valtio'
import { myStore } from '@/store/myStore'

// 4. Component imports (sorted by path depth)
import Button from '@/components/Button'
import Card from '@/components/Card'

// 5. Hook imports
import { useMyHook } from '@/hooks/useMyHook'

// 6. Utility imports
import { cn } from '@/utils/utils'
import { API_ENDPOINTS } from '@/constants/api'

// 7. Type imports
import { MyType } from '@/types/myType'

// 8. Asset imports
import IconSvg from '@/assets/icons/icon.svg?react'

// 9. Type definitions
interface MyComponentProps {
  title: string
  description?: string
  onAction?: () => void
}

// 10. Component definition
const MyComponent: React.FC<MyComponentProps> = ({
  title,
  description,
  onAction
}) => {
  // 11. Hooks (in order: state, refs, context, custom)
  const [isOpen, setIsOpen] = useState(false)
  const { data } = useSnapshot(myStore)

  // 12. Event handlers
  const handleClick = () => {
    setIsOpen(!isOpen)
    onAction?.()
  }

  // 13. Render helpers (if needed)
  const renderHeader = () => (
    <div>{title}</div>
  )

  // 14. Return JSX
  return (
    <div>
      {renderHeader()}
      {description && <p>{description}</p>}
      <Button onClick={handleClick}>Toggle</Button>
    </div>
  )
}

// 15. Export
export default MyComponent
```

---

## Import Order

**MANDATORY**: Follow this import order (enforced by ESLint):

1. **React imports**
2. **Third-party libraries** (alphabetically)
3. **Valtio/Store imports**
4. **Component imports** (@ aliases, sorted by depth)
5. **Hook imports**
6. **Utility/Helper imports**
7. **Type imports**
8. **Asset imports** (SVG, images)
9. **Styles** (if any SCSS)

### Example

```tsx
// ✅ Correct order
import React, { useState } from 'react'
import { classNames } from 'primereact/utils'
import { useSnapshot } from 'valtio'
import { assistantsStore } from '@/store/assistants'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { useVueRouter } from '@/hooks/useVueRouter'
import { cn } from '@/utils/utils'
import { Assistant } from '@/types/entity/assistant'
import ChatSvg from '@/assets/icons/chat.svg?react'

// ❌ Incorrect - mixed order
import { Assistant } from '@/types/entity/assistant'
import React, { useState } from 'react'
import Button from '@/components/Button'
import { cn } from '@/utils/utils'
```

---

## Component Placement

### When to Place in `src/components/`

Use global components directory when component is:
- ✅ Used in 2+ different pages/features
- ✅ Generic and reusable (Button, Input, Card)
- ✅ Part of design system
- ✅ No feature-specific logic

**Examples**: Button, Card, Input, Select, Modal, Tooltip

### When to Place in `src/pages/{feature}/components/`

Use page-specific directory when component is:
- ✅ Only used within single feature
- ✅ Contains feature-specific logic
- ✅ Tightly coupled to parent page

**Examples**: AssistantCard, WorkflowNode, ChatMessage

### Decision Tree

```
Is component used in multiple features?
├─ YES → src/components/
└─ NO → Is it generic enough to be reusable?
    ├─ YES → src/components/ (for future use)
    └─ NO → src/pages/{feature}/components/
```

---

## Sub-Component Organization

### Nested Components

**Pattern**: Keep related sub-components in same directory

```
src/components/Card/
├── Card.tsx              # Main component
├── CardHeader.tsx        # Sub-component (if substantial)
├── CardBody.tsx          # Sub-component (if substantial)
├── index.ts
└── __tests__/
    └── Card.test.tsx
```

### Small Helper Components

**Pattern**: Keep in same file if < 30 lines

```tsx
// Card.tsx

// Small helper - keep in same file ✅
const CardBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="badge">{label}</span>
)

// Main component
const Card: React.FC<CardProps> = ({ title, badge }) => (
  <div>
    <h3>{title}</h3>
    {badge && <CardBadge label={badge} />}
  </div>
)
```

### Large Helper Components

**Pattern**: Extract to separate file if > 30 lines

```tsx
// CardHeader.tsx ✅
export const CardHeader: React.FC<CardHeaderProps> = ({ ... }) => {
  // 30+ lines of complex logic
}

// Card.tsx
import CardHeader from './CardHeader'

const Card: React.FC<CardProps> = ({ ... }) => (
  <div>
    <CardHeader {...headerProps} />
    {/* ... */}
  </div>
)
```

---

## Constants and Types

### Component-Specific Constants

**Pattern**: Extract to separate file if 10+ constants

```
src/components/Card/
├── Card.tsx
├── constants.ts          # Component constants
├── types.ts              # Component types
└── index.ts
```

```ts
// constants.ts
export const CARD_VARIANTS = {
  DEFAULT: 'default',
  ELEVATED: 'elevated',
  OUTLINED: 'outlined'
} as const

export const CARD_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
} as const
```

### Global Constants

**Pattern**: Use `src/constants/` for shared constants

```
src/constants/
├── api.ts                # API endpoints
├── routes.ts             # Route paths
├── assistants.ts         # Assistant constants
└── common.ts             # Common constants
```

---

## Best Practices

### 1. One Component Per File

```tsx
// ❌ Don't: Multiple exports
export const ComponentA = () => {}
export const ComponentB = () => {}

// ✅ Do: Single default export
const MyComponent = () => {}
export default MyComponent
```

### 2. Use Index Files

```ts
// ✅ Good: Easy imports
// src/components/Button/index.ts
export { default } from './Button'

// Usage
import Button from '@/components/Button'
```

### 3. Co-locate Tests

```
Button/
├── Button.tsx
├── index.ts
└── __tests__/
    └── Button.test.tsx
```

### 4. Keep Feature Components Together

```
pages/assistants/
└── components/
    ├── AssistantCard/      # Only used in assistants
    ├── AssistantForm/      # Only used in assistants
    └── AssistantList/      # Only used in assistants
```

### 5. Group by Feature, Not Type

```
// ❌ Bad: Grouped by type
components/
├── cards/
│   ├── AssistantCard.tsx
│   ├── WorkflowCard.tsx
│   └── ChatCard.tsx
└── lists/
    ├── AssistantList.tsx
    └── WorkflowList.tsx

// ✅ Good: Grouped by feature
pages/
├── assistants/
│   └── components/
│       ├── AssistantCard/
│       └── AssistantList/
└── workflows/
    └── components/
        ├── WorkflowCard/
        └── WorkflowList/
```

---

## Quick Reference

| Scenario | Location | Example |
|----------|----------|---------|
| Generic reusable component | `src/components/` | Button, Input, Card |
| Feature-specific component | `src/pages/{feature}/components/` | AssistantCard |
| Sub-component (substantial) | Same directory, separate file | CardHeader.tsx |
| Sub-component (small) | Same file as parent | Small helpers < 30 lines |
| Shared types | `src/types/` | Global type definitions |
| Component types | Component directory | `types.ts` in component folder |
| Shared constants | `src/constants/` | API_ENDPOINTS, ROUTES |
| Component constants | Component directory | `constants.ts` in component folder |
| Tests | `__tests__/` subdirectory | Co-located with component |

---

## Common Mistakes

### ❌ Don't

```tsx
// Don't: Wrong import order
import Button from '@/components/Button'
import React from 'react'

// Don't: Multiple components in one file (unless small helpers)
export const ComponentA = () => {}
export const ComponentB = () => {}

// Don't: Generic component in page directory
pages/assistants/components/Button/  // Should be in src/components/

// Don't: Feature-specific in global
src/components/AssistantCard/  // Should be in pages/assistants/components/
```

### ✅ Do

```tsx
// Do: Correct import order
import React from 'react'
import Button from '@/components/Button'

// Do: One main component per file
const MyComponent = () => {}
export default MyComponent

// Do: Generic components in src/components/
src/components/Button/

// Do: Feature components in page directory
pages/assistants/components/AssistantCard/
```

---

**Last Updated**: 2025-12-04
**Related Guides**:
- [Component Patterns](./component-patterns.md)
- [Refactoring Patterns](../development/refactoring-patterns.md)
- [Code Organization](../development/code-organization.md)
