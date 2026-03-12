# Refactoring Patterns

> **Patterns for splitting and refactoring large components**

## MANDATORY: Component Size Limit

**All components MUST be under 300 lines**

## When to Refactor

Refactor when:
1. Component approaching 300 lines
2. Repeated JSX patterns
3. Complex logic that can be extracted
4. Multiple responsibilities in one component

## Refactoring Strategies

### 1. Extract to Sub-Components

```tsx
// Before: Large component (350 lines) ❌
const MyModal = () => {
  return (
    <Popup>
      {/* 100 lines of header JSX */}
      {/* 100 lines of body JSX */}
      {/* 100 lines of footer JSX */}
    </Popup>
  )
}

// After: Split into sub-components ✅
const MyModal = () => {
  return (
    <Popup>
      <MyModalHeader />
      <MyModalBody />
      <MyModalFooter />
    </Popup>
  )
}
```

### 2. Extract to Custom Hook

```tsx
// Before: Logic in component
const MyModal = ({ visible, onHide }) => {
  const [state1, setState1] = useState()
  const [state2, setState2] = useState()
  // ... 100+ lines of logic
  return <Popup>...</Popup>
}

// After: Logic in hook
const MyModal = ({ visible, onHide }) => {
  const { state, handlers } = useMyModal(visible, onHide)
  return <Popup>...</Popup>
}
```

### 3. Extract Schemas and Types

```
Before (all in one file):
MyForm.tsx (450 lines) ❌

After:
MyForm/
├── index.tsx (200 lines) ✅
├── formSchema.ts (80 lines)
├── formTypes.ts (50 lines)
└── formHelpers.ts (60 lines)
```

## Complete Refactoring Example

See [Component Organization](./code-organization.md#component-size-guidelines) for detailed file structure.

---

**Related Guides**:
- [Component Patterns](../components/component-patterns.md) - Component structure
- [Custom Hooks](../patterns/custom-hooks.md) - Extracting logic
- [Code Organization](./code-organization.md) - File organization
