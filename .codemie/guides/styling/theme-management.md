# Theme Management

> **Theme colors and customization for CodeMie UI**

## Overview

The project uses a custom Tailwind theme with two modes:
- `codemieDark` (default)
- `codemieLight`

## Using Theme Hook

```tsx
import { useTheme } from '@/hooks/useTheme'

const MyComponent = () => {
  const { theme, isDark, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(isDark ? 'codemieLight' : 'codemieDark')
  }

  return (
    <button onClick={toggleTheme}>
      {isDark ? 'Switch to Light' : 'Switch to Dark'}
    </button>
  )
}
```

## Theme Colors

All theme colors are documented in [Styling Guide](./styling-guide.md#theme-colors).

Always use semantic color names:
- `text-text-primary` - Primary text
- `bg-surface-base-secondary` - Panels and cards
- `border-border-primary` - Primary border color

**Note**: This is a placeholder guide. For complete theme color list, see [Styling Guide](./styling-guide.md).

**Related Guides**:
- [Styling Guide](./styling-guide.md) - Complete styling reference
