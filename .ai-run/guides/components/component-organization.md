# Component Organization — Factory Guide

React 18.3.1 / TypeScript 5.8.3

---

## 1. Directory Placement Decision

```
Is the component used in 2+ features, or is it generic (no feature logic)?
├─ YES → src/components/<Name>/
└─ NO  → src/pages/<feature>/components/<Name>/
```

| Placement | When | Examples |
|---|---|---|
| `src/components/` | Shared across 2+ features; no feature-specific logic; part of design system | `Button`, `Input`, `Card`, `Popup`, `Spinner` |
| `src/pages/<feature>/components/` | Used only within one feature; tightly coupled to parent page | `AssistantCard`, `WorkflowNode`, `ChatMessage` |

Real reference — shared: `src/components/Button/`, `src/components/Popup/`
Real reference — page-level: `src/pages/assistants/components/AssistantForm/`, `src/pages/assistants/components/AssistantList/`

---

## 2. Standard Directory Layout

```
src/components/MyComponent/
├── MyComponent.tsx          # Main component (hard limit: 300 lines)
├── useMyComponent.ts        # Custom hook when logic is substantial
├── myComponentHelpers.ts    # Pure helper functions
├── types.ts                 # Component-local type definitions (if 3+ types)
├── constants.ts             # Component-local constants (if 10+ constants)
├── SubComponent.tsx         # Sub-component when > 30 lines of JSX
└── __tests__/
    └── MyComponent.test.tsx
```

`index.ts` re-exports the default for clean consumer imports:

```ts
// src/components/Button/index.ts
export { default } from './Button'
export type { ButtonProps } from './Button'
```

Real reference: `src/components/Button/index.ts`

---

## 3. Size Limit — 300-Line Hard Cap

Components must not exceed 300 lines. When approaching the limit, extract in this order:

1. Complex logic → `use<Name>.ts` custom hook
2. Repeated JSX blocks → `<Sub>Component.tsx` (if > 30 lines)
3. Small inline helpers → keep in same file if ≤ 30 lines
4. Validation schemas → `<name>Schema.ts`
5. Type definitions → `types.ts` (when 3+ interfaces)
6. Constants → `constants.ts` (when 10+ values)

**Container/Section components** (React Hook Form Controllers, state coordination) may reach
200–300 lines. Presentation components should stay under 100 lines.

Real reference — page over limit split into sub-components:
`src/pages/assistants/components/RemoteAssistantForm/RemoteAssistantForm.tsx` (352 lines — exceeds limit, extract sub-components)
`src/pages/assistants/components/RemoteAssistantForm/RemoteAssistantFormAccordion.tsx` (118 lines — correct extraction)
`src/pages/assistants/components/RemoteAssistantForm/RemoteAssistantFormCard.tsx` (157 lines — correct extraction)

---

## 4. File Naming Conventions

| File type | Convention | Example |
|---|---|---|
| Component | PascalCase, matches directory | `Button.tsx`, `AssistantCard.tsx` |
| Custom hook | camelCase, `use` prefix | `useMyComponent.ts`, `useMarketplaceModal.ts` |
| Helper / util | camelCase with suffix | `myComponentHelpers.ts`, `formHelpers.ts` |
| Types | camelCase | `types.ts`, `assistant.ts` |
| Constants | camelCase | `constants.ts`, `api.ts` |
| Test | Same name + `.test` | `Button.test.tsx` |
| Index | Always lowercase | `index.ts` |

Directory name matches the component's PascalCase name: `Button/Button.tsx`, not `button/Button.tsx`.

---

## 5. Sub-Component Rules

| Sub-component size | Action |
|---|---|
| ≤ 30 lines | Keep in same file as parent |
| > 30 lines | Extract to `SubName.tsx` in the same directory |
| Reused across 2+ features | Promote to `src/components/` |

Small helper kept in file:
```tsx
// Card.tsx — helper under 30 lines, no extraction needed
const CardBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className='text-xs font-medium px-2 py-0.5 rounded'>{label}</span>
)
```

---

## 6. Index File Pattern

Every component directory exposes a public `index.ts`.
This keeps consumer imports at `@/components/Button`, not `@/components/Button/Button`.

```ts
export { default } from './ComponentName'
export type { ComponentNameProps } from './ComponentName'
```

Never put component logic in `index.ts`. It is a re-export only.

---

## 7. Constants and Types Placement

| Scope | File | Location |
|---|---|---|
| App-wide constants | `api.ts`, `routes.ts`, `common.ts` | `src/constants/` |
| App-wide types | per-domain files | `src/types/` |
| Component-local constants | `constants.ts` | Component directory |
| Component-local types | `types.ts` | Component directory |

Extract to `src/constants/` or `src/types/` when the value/type is referenced from two or more
different components or pages.

---

## 8. Group by Feature, Not by Type

| DON'T | DO |
|---|---|
| `components/cards/AssistantCard.tsx` | `pages/assistants/components/AssistantCard/AssistantCard.tsx` |
| `components/lists/WorkflowList.tsx` | `pages/workflows/components/WorkflowList/WorkflowList.tsx` |
| `components/AssistantCard/` (feature logic in shared dir) | `pages/assistants/components/AssistantCard/` |

---

## 9. DO / DON'T Summary

| Scenario | DON'T | DO |
|---|---|---|
| Multiple exports per file | `export const A = ...; export const B = ...` | One `export default` per file |
| Import order | Type imports before React | React first, then third-party, then `@/` aliases |
| Placing feature component | `src/components/AssistantCard/` | `src/pages/assistants/components/AssistantCard/` |
| Placing shared component | `src/pages/foo/components/Button/` | `src/components/Button/` |
| Direct deep import | `import Button from '@/components/Button/Button'` | `import Button from '@/components/Button'` (via index) |
| Test location | Tests in `src/__tests__/` root | Co-located `__tests__/` inside component directory |
| Skip index file | No `index.ts`, consumers import deep path | Always add `index.ts` with re-export |

---

## 10. Hooks and Helper File Placement

Custom hooks that are used in only one component live in the component's own directory:

```
src/components/MyComponent/
└── useMyComponent.ts   # hook used only by MyComponent
```

Hooks shared across two or more components or pages go in `src/hooks/`:

```
src/hooks/
├── useMarketplaceModal.ts
├── useDebounce.ts
└── ...
```

Helper functions (pure transforms, formatters) follow the same rule:
- Component-local → `myComponentHelpers.ts` inside the component directory
- Shared → `src/utils/`

Never put side-effectful code (API calls, store mutations) inside a helper file.
Those belong in store action methods (`src/store/`).

---

## 11. Migrating an Over-Sized Component

When a component hits or exceeds 300 lines, apply this sequence:

1. Identify independent JSX sections → extract each to a `Sub.tsx` file in the same directory.
2. Identify complex stateful logic → extract to a `useName.ts` custom hook.
3. Identify shared validation schemas → extract to `nameSchema.ts`.
4. Identify repeated constants → move to `constants.ts` in the component directory.
5. After extraction, verify each resulting file is under 300 lines.
6. Update `index.ts` if new public types need to be exported.

Real reference showing extraction in practice:
- Over-limit: `src/pages/assistants/components/RemoteAssistantForm/RemoteAssistantForm.tsx` (352 lines)
- Extracted sub: `RemoteAssistantFormAccordion.tsx` (118 lines)
- Extracted sub: `RemoteAssistantFormCard.tsx` (157 lines)

---

## 12. Quick Reference

| Scenario | Location | Example |
|---|---|---|
| Generic, shared ≥ 2 features | `src/components/<Name>/` | `Button`, `Input`, `Popup` |
| Feature-specific | `src/pages/<feature>/components/<Name>/` | `AssistantCard`, `WorkflowNode` |
| Sub-component > 30 lines | Same directory as parent | `CardHeader.tsx` next to `Card.tsx` |
| Sub-component ≤ 30 lines | Same file as parent | Inline before parent component |
| Hook used in 1 component | Component directory | `useMyComponent.ts` |
| Hook used in 2+ components | `src/hooks/` | `useDebounce.ts` |
| Component-level types | Component directory | `types.ts` |
| Component-level constants | Component directory | `constants.ts` |
| Shared types | `src/types/` | `assistant.ts`, `user.ts` |
| Shared constants | `src/constants/` | `api.ts`, `routes.ts` |
| Tests | `__tests__/` inside component dir | `Button/__tests__/Button.test.tsx` |
