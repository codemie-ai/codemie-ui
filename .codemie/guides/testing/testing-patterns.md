# Testing Patterns

> **Vitest + Testing Library patterns for CodeMie UI**

## Test Framework: Vitest + Testing Library

For complete testing guidance, refer to the existing codebase examples:

### Test Location
```
src/components/Button/
├── Button.tsx
└── __tests__/
    └── Button.test.tsx
```

### Basic Test Template

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- MyComponent.test.tsx
```

---

**Note**: This is a placeholder guide. For detailed testing patterns, check existing test files in `src/**/__tests__/` directories.

**Related Guides**:
- [Component Patterns](../components/component-patterns.md) - Component structure
- [Store Testing](./store-testing.md) - Testing stores
